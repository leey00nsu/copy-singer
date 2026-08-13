from __future__ import annotations

import hmac
import importlib.metadata
import math
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Annotated, Any

import modal
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse


APP_NAME = "copy-singer-catalog-analyzer"
ANALYSIS_CPU_CORES = 8.0
ANALYSIS_MEMORY_MB = 16_384
MAX_CONTAINERS = 4
MAX_UPLOAD_BYTES = 100 * 1024 * 1024
SEPARATOR_MODEL = "htdemucs"
VIDEO_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{11}$")
ALLOWED_SUFFIXES = frozenset({".m4a", ".mp3", ".mp4", ".wav", ".webm"})
PITCH_CLASS_NAMES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")
MAJOR_KEY_PROFILE = (6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88)
MINOR_KEY_PROFILE = (6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17)

REPO_ROOT = Path(__file__).resolve().parents[2] if modal.is_local() else Path("/root")
REMOTE_ANALYZER_PACKAGE = Path("/opt/vocal_profile_app")

app = modal.App(APP_NAME)
api_secret = modal.Secret.from_name("soulx-api-secret")
job_index = modal.Dict.from_name("copy-singer-catalog-analysis-jobs", create_if_missing=True)

analyzer_image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .pip_install(
        "torch==2.6.0",
        "torchaudio==2.6.0",
        "demucs==4.0.1",
        "fastapi==0.141.1",
        "librosa==0.11.0",
        "numpy==2.3.5",
        "python-multipart==0.0.32",
        "soundfile==0.14.0",
    )
    .add_local_dir(
        REPO_ROOT / "services" / "vocal-profile-api" / "app",
        remote_path=str(REMOTE_ANALYZER_PACKAGE),
    )
)

web_image = modal.Image.debian_slim(python_version="3.12").pip_install(
    "fastapi==0.141.1",
    "python-multipart==0.0.32",
)


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    expected = os.environ.get("SOULX_API_KEY", "")
    if not expected:
        raise HTTPException(status_code=503, detail="Server API key is not configured")
    if x_api_key is None or not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(status_code=401, detail="Invalid API key")


def _audio_suffix(file_name: str) -> str:
    suffix = Path(file_name).suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise ValueError("UNSUPPORTED_AUDIO: unsupported catalog audio extension")
    return suffix


def _validate_submission(request_id: str, source_video_id: str, size_bytes: int) -> None:
    if not request_id or len(request_id) > 200:
        raise ValueError("INVALID_REQUEST_ID: requestId is required and must be at most 200 characters")
    if VIDEO_ID_PATTERN.fullmatch(source_video_id) is None:
        raise ValueError("INVALID_SOURCE_VIDEO_ID: sourceVideoId must be an 11-character YouTube video ID")
    if size_bytes <= 0:
        raise ValueError("EMPTY_AUDIO: catalog audio must not be empty")
    if size_bytes > MAX_UPLOAD_BYTES:
        raise ValueError("PAYLOAD_TOO_LARGE: catalog audio must be 100 MB or smaller")


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
    tool = "FFMPEG" if command[0] == "ffmpeg" else "DEMUCS"
    raise RuntimeError(f"{tool}_FAILED: {detail[:500]}")


def _package_version(name: str) -> str:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return "unavailable"


def _correlation(left: list[float], right: tuple[float, ...]) -> float:
    left_mean = sum(left) / len(left)
    right_mean = sum(right) / len(right)
    left_centered = [value - left_mean for value in left]
    right_centered = [value - right_mean for value in right]
    denominator = math.sqrt(
        sum(value * value for value in left_centered) * sum(value * value for value in right_centered)
    )
    if denominator == 0:
        return 0.0
    return sum(a * b for a, b in zip(left_centered, right_centered, strict=True)) / denominator


def _estimate_key(chroma: list[float]) -> tuple[str | None, float]:
    if len(chroma) != 12 or not all(math.isfinite(value) for value in chroma) or sum(chroma) <= 0:
        return None, 0.0
    candidates: list[tuple[float, str]] = []
    for tonic, pitch_name in enumerate(PITCH_CLASS_NAMES):
        major = tuple(MAJOR_KEY_PROFILE[(pitch_class - tonic) % 12] for pitch_class in range(12))
        minor = tuple(MINOR_KEY_PROFILE[(pitch_class - tonic) % 12] for pitch_class in range(12))
        candidates.append((_correlation(chroma, major), pitch_name))
        candidates.append((_correlation(chroma, minor), f"{pitch_name}m"))
    candidates.sort(reverse=True)
    best_score, estimated_key = candidates[0]
    runner_up_score = candidates[1][0]
    confidence = max(0.0, min(1.0, (best_score - runner_up_score) / 2.0))
    return estimated_key, confidence


@app.function(
    image=analyzer_image,
    cpu=ANALYSIS_CPU_CORES,
    memory=ANALYSIS_MEMORY_MB,
    timeout=3_600,
    max_containers=MAX_CONTAINERS,
    retries=modal.Retries(max_retries=2, initial_delay=5.0, backoff_coefficient=2.0),
)
def analyze_song(source_bytes: bytes, source_video_id: str, file_name: str) -> dict[str, Any]:
    import librosa
    import numpy as np

    sys.path.insert(0, str(REMOTE_ANALYZER_PACKAGE.parent))
    from vocal_profile_app.analysis import analyze_wav
    from vocal_profile_app.config import SONG_ANALYSIS_CONFIG

    _validate_submission("modal-cpu-job", source_video_id, len(source_bytes))
    suffix = _audio_suffix(file_name)
    job_path: Path | None = None
    profile: dict[str, Any]
    with tempfile.TemporaryDirectory(prefix="copy-singer-modal-song-") as temporary:
        job_path = Path(temporary)
        upload_path = job_path / f"upload{suffix}"
        upload_path.write_bytes(source_bytes)
        source_path = job_path / "source.wav"
        _run_command(
            ["ffmpeg", "-y", "-i", str(upload_path), "-vn", "-ac", "2", "-ar", "44100", str(source_path)],
            timeout_seconds=600,
        )

        mix, mix_sample_rate = librosa.load(source_path, sr=22050, mono=True, duration=600)
        chroma = librosa.feature.chroma_cqt(y=mix, sr=mix_sample_rate)
        estimated_key, key_confidence = _estimate_key(np.nanmean(chroma, axis=1).tolist())

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
            timeout_seconds=1_200,
        )
        vocals_path = separated_root / SEPARATOR_MODEL / "source" / "vocals.wav"
        if not vocals_path.is_file():
            raise RuntimeError("SEPARATOR_OUTPUT_MISSING: Demucs produced no vocals stem")

        result = analyze_wav(vocals_path, config=SONG_ANALYSIS_CONFIG).to_dict()
        profile = {
            "durationMs": result.pop("duration_ms"),
            "sampleRate": result.pop("sample_rate"),
            "sourceSizeBytes": len(source_bytes),
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
            "estimatedKey": estimated_key,
            "keyConfidence": key_confidence,
            "analyzer": result.pop("analyzer"),
            "analyzerVersion": result.pop("analyzer_version"),
            "descriptors": result.pop("descriptors"),
            "ytDlpVersion": None,
            "separator": "demucs",
            "separatorVersion": _package_version("demucs"),
            "separatorModel": SEPARATOR_MODEL,
            "sourceVideoId": source_video_id,
            "cleanupConfirmed": False,
        }

    profile["cleanupConfirmed"] = job_path is not None and not job_path.exists()
    if not profile["cleanupConfirmed"]:
        raise RuntimeError("CLEANUP_FAILED: temporary Modal audio files remain")
    return profile


web_app = FastAPI(
    title="Copysinger Song Catalog Analyzer",
    version="1.0.0",
    dependencies=[Depends(require_api_key)],
)


@web_app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "compute": {"cpu": ANALYSIS_CPU_CORES, "memoryMb": ANALYSIS_MEMORY_MB},
        "pipeline": {"separator": "demucs", "separatorModel": SEPARATOR_MODEL, "analyzer": "librosa-pyin"},
    }


@web_app.post("/v1/jobs")
async def submit_job(
    audio: Annotated[UploadFile, File()],
    request_id: Annotated[str, Form(alias="requestId")],
    source_video_id: Annotated[str, Form(alias="sourceVideoId")],
) -> JSONResponse:
    existing_call_id = await job_index.get.aio(request_id, None)
    if isinstance(existing_call_id, str) and existing_call_id:
        await audio.close()
        return JSONResponse(
            status_code=202,
            content={"status": "PROCESSING", "externalJobId": existing_call_id, "reused": True},
        )

    source = await audio.read(MAX_UPLOAD_BYTES + 1)
    await audio.close()
    try:
        _validate_submission(request_id, source_video_id, len(source))
        _audio_suffix(audio.filename or "")
    except ValueError as error:
        reason_code, _, detail = str(error).partition(": ")
        status_code = 413 if reason_code == "PAYLOAD_TOO_LARGE" else 422
        return JSONResponse(
            status_code=status_code,
            content={"reasonCode": reason_code, "detail": detail, "retryable": False},
        )

    call = await analyze_song.spawn.aio(source, source_video_id, audio.filename or "source.m4a")
    await job_index.put.aio(request_id, call.object_id)
    return JSONResponse(
        status_code=202,
        content={"status": "PROCESSING", "externalJobId": call.object_id, "reused": False},
    )


@web_app.get("/v1/jobs/{external_job_id}")
async def poll_job(external_job_id: str) -> JSONResponse:
    call = modal.FunctionCall.from_id(external_job_id)
    try:
        result = await call.get.aio(timeout=0)
    except TimeoutError:
        return JSONResponse(status_code=202, content={"status": "PROCESSING", "externalJobId": external_job_id})
    except modal.exception.OutputExpiredError:
        return JSONResponse(
            status_code=410,
            content={
                "status": "FAILED",
                "reasonCode": "MODAL_RESULT_EXPIRED",
                "detail": "Modal analysis result expired before it was collected.",
                "retryable": True,
            },
        )
    except Exception:
        return JSONResponse(
            status_code=200,
            content={
                "status": "FAILED",
                "reasonCode": "MODAL_ANALYSIS_FAILED",
                "detail": "Modal song analysis failed.",
                "retryable": True,
            },
        )
    return JSONResponse(status_code=200, content={"status": "SUCCEEDED", "result": result})


@app.function(
    image=web_image,
    cpu=1.0,
    memory=512,
    timeout=120,
    min_containers=0,
    max_containers=4,
    scaledown_window=60,
    secrets=[api_secret],
)
@modal.concurrent(max_inputs=20)
@modal.asgi_app()
def fastapi_app():
    return web_app
