from __future__ import annotations

import importlib.metadata
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import modal


APP_NAME = "copy-singer-catalog-analyzer"
GPU_TYPE = "L4"
DEFAULT_BENCHMARK_SONGS = 3
MAX_BATCH_SONGS = 100
MAX_CONTAINERS = 8
LOCAL_DOWNLOAD_WORKERS = 4
SEPARATOR_MODEL = "htdemucs"

REPO_ROOT = Path(__file__).resolve().parents[2] if modal.is_local() else Path("/root")
ARTIFACT_PATH = REPO_ROOT / "data" / "catalogs" / "tj-2607-song-profiles.json"
REMOTE_ANALYZER_PACKAGE = Path("/opt/vocal_profile_app")
REMOTE_CATALOG_PATH = Path("/opt/catalog/tj-2607-top100.md")
CATALOG_ENTRY_PATTERN = re.compile(
    r"^\d+\. \*\*.+? — .+?\*\* · \[.+?\]\(https://www\.youtube\.com/watch\?v=([A-Za-z0-9_-]{11})\)$",
    re.MULTILINE,
)

app = modal.App(APP_NAME)

analyzer_image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .pip_install(
        "torch==2.6.0",
        "torchaudio==2.6.0",
        "demucs==4.0.1",
        "yt-dlp==2026.7.4",
        "librosa==0.11.0",
        "numpy==2.3.5",
        "soundfile==0.14.0",
    )
    .add_local_dir(
        REPO_ROOT / "services" / "vocal-profile-api" / "app",
        remote_path=str(REMOTE_ANALYZER_PACKAGE),
    )
    .add_local_file(
        REPO_ROOT / "data" / "catalogs" / "tj-2607-top100.md",
        remote_path=str(REMOTE_CATALOG_PATH),
    )
)


def _utc_now() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _validate_source(source_url: str, expected_video_id: str) -> None:
    allowed_ids = frozenset(
        CATALOG_ENTRY_PATTERN.findall(REMOTE_CATALOG_PATH.read_text(encoding="utf-8"))
    )
    if expected_video_id not in allowed_ids:
        raise ValueError("SOURCE_NOT_ALLOWLISTED: video ID is not in the packaged catalog")
    parsed = urlparse(source_url)
    if parsed.scheme != "https" or parsed.hostname not in {"youtube.com", "www.youtube.com"}:
        raise ValueError("INVALID_SOURCE_URL: only HTTPS YouTube URLs are allowed")
    if parsed.path != "/watch" or parse_qs(parsed.query).get("v") != [expected_video_id]:
        raise ValueError("SOURCE_ID_MISMATCH: source URL and video ID differ")


def _run_command(command: list[str], timeout_seconds: int) -> None:
    completed = subprocess.run(
        command,
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        timeout=timeout_seconds,
    )
    if completed.returncode == 0:
        return
    stderr = completed.stderr.decode("utf-8", errors="replace")
    detail = next((line.strip() for line in reversed(stderr.splitlines()) if line.strip()), "")
    tool = "yt-dlp" if any(part == "yt_dlp" or part.endswith("yt-dlp") for part in command) else "Demucs"
    raise RuntimeError(f"{tool.upper().replace('-', '_')}_FAILED: {detail[:500]}")


def _package_version(name: str) -> str:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return "unavailable"


@app.function(
    image=analyzer_image,
    gpu=GPU_TYPE,
    cpu=4.0,
    memory=8192,
    timeout=1_800,
    max_containers=MAX_CONTAINERS,
    retries=modal.Retries(max_retries=2, initial_delay=5.0, backoff_coefficient=2.0),
)
def analyze_song(
    entry: dict[str, object],
    transfer_volume_id: str,
    transfer_path: str,
) -> dict[str, object]:
    import torch

    sys.path.insert(0, str(REMOTE_ANALYZER_PACKAGE.parent))
    from vocal_profile_app.analysis import analyze_wav
    from vocal_profile_app.config import SONG_ANALYSIS_CONFIG

    source_url = str(entry["sourceUrl"])
    source_video_id = str(entry["sourceVideoId"])
    _validate_source(source_url, source_video_id)
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA_UNAVAILABLE: Modal L4 was not exposed to PyTorch")

    total_started = time.perf_counter()
    timings: dict[str, float] = {}
    job_path: Path | None = None
    profile: dict[str, object]

    with tempfile.TemporaryDirectory(prefix="copy-singer-modal-song-") as temporary:
        job_path = Path(temporary)
        source_path = job_path / "source.wav"
        phase_started = time.perf_counter()
        transfer_volume = modal.Volume.from_id(transfer_volume_id)
        with source_path.open("wb") as source_output:
            for chunk in transfer_volume.read_file(transfer_path):
                source_output.write(chunk)
        timings["transferReadSeconds"] = round(time.perf_counter() - phase_started, 3)
        if not source_path.is_file():
            raise RuntimeError("TRANSFER_OUTPUT_MISSING: ephemeral Volume produced no WAV file")
        source_size_bytes = source_path.stat().st_size

        separated_root = job_path / "separated"
        phase_started = time.perf_counter()
        _run_command(
            [
                sys.executable,
                "-m",
                "demucs",
                "--two-stems=vocals",
                "-n",
                SEPARATOR_MODEL,
                "--device",
                "cuda",
                "-o",
                str(separated_root),
                str(source_path),
            ],
            timeout_seconds=1_200,
        )
        timings["separationSeconds"] = round(time.perf_counter() - phase_started, 3)
        vocals_path = separated_root / SEPARATOR_MODEL / "source" / "vocals.wav"
        if not vocals_path.is_file():
            raise RuntimeError("SEPARATOR_OUTPUT_MISSING: Demucs produced no vocals stem")

        phase_started = time.perf_counter()
        result = analyze_wav(vocals_path, config=SONG_ANALYSIS_CONFIG).to_dict()
        timings["analysisSeconds"] = round(time.perf_counter() - phase_started, 3)
        profile = {
            "durationMs": result.pop("duration_ms"),
            "sampleRate": result.pop("sample_rate"),
            "sourceSizeBytes": source_size_bytes,
            "minMidi": result.pop("min_midi"),
            "maxMidi": result.pop("max_midi"),
            "p10Midi": result.pop("p10_midi"),
            "medianMidi": result.pop("median_midi"),
            "p90Midi": result.pop("p90_midi"),
            "tessituraLowMidi": result.pop("tessitura_low_midi"),
            "tessituraHighMidi": result.pop("tessitura_high_midi"),
            "voicedRatio": result.pop("voiced_ratio"),
            "pitchStability": result.pop("pitch_stability"),
            "clippingRatio": result.pop("clipping_ratio"),
            "rmsDb": result.pop("rms_db"),
            "analyzer": result.pop("analyzer"),
            "analyzerVersion": result.pop("analyzer_version"),
            "descriptors": result.pop("descriptors"),
            "ytDlpVersion": str(entry["ytDlpVersion"]),
            "separator": "demucs",
            "separatorVersion": _package_version("demucs"),
            "separatorModel": SEPARATOR_MODEL,
            "cleanupConfirmed": True,
        }

    if job_path is None or job_path.exists():
        raise RuntimeError("CLEANUP_FAILED: temporary Modal audio files remain")
    timings["totalSeconds"] = round(time.perf_counter() - total_started, 3)
    return {
        "catalogOrder": entry["catalogOrder"],
        "sourceVideoId": source_video_id,
        "profile": profile,
        "timings": timings,
        "gpu": torch.cuda.get_device_name(0),
    }


def _load_artifact(path: Path = ARTIFACT_PATH) -> dict[str, object]:
    artifact = json.loads(path.read_text(encoding="utf-8"))
    songs = artifact.get("songs")
    if artifact.get("schemaVersion") != 1 or not isinstance(songs, list) or len(songs) != 100:
        raise ValueError("The local song profile artifact is invalid")
    return artifact


def _select_candidates(artifact: dict[str, object], limit: int) -> list[dict[str, object]]:
    if not 1 <= limit <= MAX_BATCH_SONGS:
        raise ValueError(f"limit must be between 1 and {MAX_BATCH_SONGS}")
    songs = artifact["songs"]
    assert isinstance(songs, list)
    return [song for song in songs if isinstance(song, dict) and song.get("status") != "READY"][:limit]


def _write_artifact(artifact: dict[str, object], path: Path = ARTIFACT_PATH) -> None:
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        temporary.write_text(json.dumps(artifact, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def _local_temp_root() -> Path | None:
    configured = os.environ.get("COPY_SINGER_TEMP_ROOT")
    if not configured:
        return None
    root = Path(configured).expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    if not os.access(root, os.W_OK):
        raise PermissionError(f"COPY_SINGER_TEMP_ROOT is not writable: {root}")
    return root


def _local_download(entry: dict[str, object], directory: Path) -> tuple[Path, float]:
    destination_template = directory / f"{entry['catalogOrder']}.%(ext)s"
    started = time.perf_counter()
    _run_command(
        [
            "yt-dlp",
            "--ignore-config",
            "--no-playlist",
            "--match-filter",
            "duration <= 600",
            "--no-progress",
            "--no-warnings",
            "--force-overwrites",
            "-f",
            "bestaudio/best",
            "-x",
            "--audio-format",
            "wav",
            "--audio-quality",
            "0",
            "-o",
            str(destination_template),
            str(entry["sourceUrl"]),
        ],
        timeout_seconds=600,
    )
    path = directory / f"{entry['catalogOrder']}.wav"
    if not path.is_file():
        raise RuntimeError("DOWNLOAD_OUTPUT_MISSING: local yt-dlp produced no WAV file")
    return path, round(time.perf_counter() - started, 3)


@app.local_entrypoint()
def main(limit: int = DEFAULT_BENCHMARK_SONGS) -> None:
    artifact = _load_artifact()
    candidates = _select_candidates(artifact, limit)
    if not candidates:
        print(json.dumps({"status": "ok", "selected": 0, "message": "No pending songs."}))
        return

    started = time.perf_counter()
    succeeded = 0
    failed = 0
    remote_seconds = 0.0
    benchmarks: list[dict[str, object]] = []
    yt_dlp_version = subprocess.run(
        ["yt-dlp", "--version"], check=True, capture_output=True, text=True
    ).stdout.strip()
    songs = artifact["songs"]
    assert isinstance(songs, list)

    with tempfile.TemporaryDirectory(
        prefix="copy-singer-modal-upload-",
        dir=_local_temp_root(),
    ) as temporary:
        local_temp = Path(temporary)
        downloaded_by_rank: dict[int, tuple[Path, float]] = {}
        with ThreadPoolExecutor(max_workers=LOCAL_DOWNLOAD_WORKERS) as executor:
            futures = {
                executor.submit(_local_download, candidate, local_temp): candidate
                for candidate in candidates
            }
            for future in as_completed(futures):
                candidate = futures[future]
                rank = int(candidate["catalogOrder"])
                try:
                    downloaded_by_rank[rank] = future.result()
                except Exception as error:
                    target = next(
                        song
                        for song in songs
                        if isinstance(song, dict) and song.get("catalogOrder") == rank
                    )
                    target["status"] = "FAILED"
                    target["profile"] = None
                    target["error"] = {
                        "reasonCode": "LOCAL_DOWNLOAD_FAILED",
                        "detail": f"{type(error).__name__}: {error}",
                        "updatedAt": _utc_now(),
                    }
                    failed += 1
                    artifact["generatedAt"] = _utc_now()
                    _write_artifact(artifact)

        gpu_candidates = [
            candidate
            for candidate in candidates
            if int(candidate["catalogOrder"]) in downloaded_by_rank
        ]
        downloaded = [
            downloaded_by_rank[int(candidate["catalogOrder"])] for candidate in gpu_candidates
        ]
        remote_paths = [f"/{candidate['catalogOrder']}.wav" for candidate in gpu_candidates]
        modal_inputs = [
            {**candidate, "ytDlpVersion": yt_dlp_version}
            for candidate in gpu_candidates
        ]

        with modal.Volume.ephemeral() as transfer_volume:
            with transfer_volume.batch_upload() as batch:
                for (local_path, _), remote_path in zip(downloaded, remote_paths, strict=True):
                    batch.put_file(local_path, remote_path)

            results = analyze_song.map(
                modal_inputs,
                [transfer_volume.object_id] * len(gpu_candidates),
                remote_paths,
                order_outputs=True,
                return_exceptions=True,
            )
            for candidate, (_, download_seconds), result in zip(
                gpu_candidates, downloaded, results, strict=True
            ):
                target = next(
                    song
                    for song in songs
                    if isinstance(song, dict) and song.get("catalogOrder") == candidate["catalogOrder"]
                )
                if isinstance(result, BaseException):
                    target["status"] = "FAILED"
                    target["profile"] = None
                    target["error"] = {
                        "reasonCode": "MODAL_ANALYSIS_FAILED",
                        "detail": f"{type(result).__name__}: {result}",
                        "updatedAt": _utc_now(),
                    }
                    failed += 1
                else:
                    if result["sourceVideoId"] != target["sourceVideoId"]:
                        raise RuntimeError("Modal result source ID does not match the local artifact")
                    target["status"] = "READY"
                    target["profile"] = result["profile"]
                    target["error"] = None
                    remote_seconds += float(result["timings"]["totalSeconds"])
                    benchmarks.append(
                        {
                            "catalogOrder": result["catalogOrder"],
                            "gpu": result["gpu"],
                            "downloadSeconds": download_seconds,
                            **result["timings"],
                        }
                    )
                    succeeded += 1
                artifact["generatedAt"] = _utc_now()
                _write_artifact(artifact)

    wall_seconds = round(time.perf_counter() - started, 3)
    estimated_l4_cost_usd = round(remote_seconds * 0.000222, 4)
    print(
        json.dumps(
            {
                "status": "ok" if failed == 0 else "partial",
                "selected": len(candidates),
                "succeeded": succeeded,
                "failed": failed,
                "wallSeconds": wall_seconds,
                "remoteTaskSeconds": round(remote_seconds, 3),
                "estimatedL4CostUsd": estimated_l4_cost_usd,
                "benchmarks": benchmarks,
            },
            ensure_ascii=False,
        )
    )
    if failed:
        raise RuntimeError(f"{failed} Modal catalog analyses failed")
