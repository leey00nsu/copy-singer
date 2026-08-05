from __future__ import annotations

import importlib.metadata
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .analysis import AnalysisRejectedError, analyze_wav
from .config import SONG_ANALYSIS_CONFIG

JOB_PREFIX = "copy-singer-song-"
SEPARATOR_MODEL = "htdemucs"
CATALOG_ENTRY_PATTERN = re.compile(
    r"^\d+\. \*\*.+? — .+?\*\* · \[.+?\]\(https://www\.youtube\.com/watch\?v=([A-Za-z0-9_-]{11})\)$",
    re.MULTILINE,
)


class SongPipelineError(RuntimeError):
    def __init__(self, reason_code: str, detail: str) -> None:
        super().__init__(detail)
        self.reason_code = reason_code
        self.detail = detail


def _package_version(name: str) -> str:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return "unavailable"


def dependency_status() -> dict[str, object]:
    return {
        "ytDlp": _package_version("yt-dlp"),
        "demucs": _package_version("demucs"),
        "ffmpeg": shutil.which("ffmpeg") is not None,
        "catalogEntries": len(_allowed_video_ids()),
    }


def _catalog_path() -> Path:
    configured = os.environ.get("SONG_CATALOG_PATH")
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parents[3] / "data" / "catalogs" / "tj-2607-top100.md"


def _allowed_video_ids() -> frozenset[str]:
    path = _catalog_path()
    if not path.is_file():
        return frozenset()
    return frozenset(CATALOG_ENTRY_PATTERN.findall(path.read_text(encoding="utf-8")))


def cleanup_abandoned_jobs(temp_root: str | Path | None = None) -> int:
    root = Path(temp_root) if temp_root else Path(tempfile.gettempdir())
    removed = 0
    for candidate in root.glob(f"{JOB_PREFIX}*"):
        if candidate.is_dir() and candidate.parent == root:
            shutil.rmtree(candidate, ignore_errors=True)
            removed += 1
    return removed


def _validate_source_url(source_url: str, expected_video_id: str) -> None:
    if expected_video_id not in _allowed_video_ids():
        raise SongPipelineError("SOURCE_NOT_ALLOWLISTED", "The video ID is not in the local song catalog.")
    parsed = urlparse(source_url)
    if parsed.scheme != "https" or parsed.hostname not in {"youtube.com", "www.youtube.com"}:
        raise SongPipelineError("INVALID_SOURCE_URL", "Only HTTPS YouTube watch URLs are allowed.")
    if parsed.path != "/watch":
        raise SongPipelineError("INVALID_SOURCE_URL", "Only YouTube watch URLs are allowed.")
    video_ids = parse_qs(parsed.query).get("v", [])
    if video_ids != [expected_video_id]:
        raise SongPipelineError("SOURCE_ID_MISMATCH", "The source URL does not match the catalog video ID.")


def _run_command(command: list[str], timeout_seconds: int) -> None:
    try:
        completed = subprocess.run(
            command,
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired as error:
        raise SongPipelineError("PIPELINE_TIMEOUT", "The temporary song job timed out.") from error

    if completed.returncode != 0:
        tool = "yt-dlp" if "yt_dlp" in command else "Demucs"
        raise SongPipelineError(f"{tool.upper().replace('-', '_')}_FAILED", f"{tool} could not process this catalog item.")


def analyze_song_url(
    source_url: str,
    expected_video_id: str,
    *,
    temp_root: str | Path | None = None,
) -> dict[str, object]:
    _validate_source_url(source_url, expected_video_id)
    job_path: Path | None = None
    response: dict[str, object]

    try:
        with tempfile.TemporaryDirectory(prefix=JOB_PREFIX, dir=temp_root) as temporary:
            job_path = Path(temporary)
            source_template = job_path / "source.%(ext)s"
            _run_command(
                [
                    sys.executable,
                    "-m",
                    "yt_dlp",
                    "--ignore-config",
                    "--no-playlist",
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
                    str(source_template),
                    source_url,
                ],
                timeout_seconds=600,
            )
            source_path = job_path / "source.wav"
            if not source_path.is_file():
                raise SongPipelineError("DOWNLOAD_OUTPUT_MISSING", "yt-dlp did not produce the expected audio file.")
            source_size_bytes = source_path.stat().st_size

            separated_root = job_path / "separated"
            _run_command(
                [
                    sys.executable,
                    "-m",
                    "demucs",
                    "--two-stems=vocals",
                    "-n",
                    SEPARATOR_MODEL,
                    "--device",
                    "cpu",
                    "-o",
                    str(separated_root),
                    str(source_path),
                ],
                timeout_seconds=2_400,
            )
            vocals_path = separated_root / SEPARATOR_MODEL / "source" / "vocals.wav"
            if not vocals_path.is_file():
                raise SongPipelineError("SEPARATOR_OUTPUT_MISSING", "Demucs did not produce a vocals stem.")

            result = analyze_wav(vocals_path, config=SONG_ANALYSIS_CONFIG).to_dict()
            response = {
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
                "ytDlpVersion": _package_version("yt-dlp"),
                "separator": "demucs",
                "separatorVersion": _package_version("demucs"),
                "separatorModel": SEPARATOR_MODEL,
                "cleanupConfirmed": False,
            }
    except AnalysisRejectedError:
        raise
    except SongPipelineError:
        raise
    except Exception as error:
        raise SongPipelineError("SONG_PIPELINE_FAILED", "The temporary song analysis failed.") from error

    response["cleanupConfirmed"] = job_path is not None and not job_path.exists()
    if not response["cleanupConfirmed"]:
        raise SongPipelineError("CLEANUP_FAILED", "Temporary song files could not be removed.")
    return response
