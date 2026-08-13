from __future__ import annotations

import asyncio
import hmac
import importlib.metadata
import logging
import os
import shutil
import sys
import time
from pathlib import Path
from typing import Annotated, Any
from uuid import UUID, uuid4

import modal
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel


APP_NAME = "copy-singer-vocal-profile-analyzer"
REMOTE_ANALYZER_ROOT = Path("/opt/vocal_profile_api")
REMOTE_SERVICE_ROOT = Path("/opt/vocal_profile_modal")
MIN_CONTAINERS = 0
MAX_CONTAINERS = 10
MAX_INPUTS_PER_CONTAINER = 1
CPU_CORES = 2.0
MEMORY_MIB = 4096
FUNCTION_TIMEOUT_SECONDS = 120
SCALEDOWN_WINDOW_SECONDS = 60

REPO_ROOT = Path(__file__).resolve().parents[2] if modal.is_local() else Path("/root")
SERVICE_ROOT = Path(__file__).resolve().parent if modal.is_local() else REMOTE_SERVICE_ROOT
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from runtime import ephemeral_working_directory
from transport import TRANSPORT_VERSION, build_analysis_envelope, build_profile_payload


LOGGER = logging.getLogger(__name__)
CONTAINER_INSTANCE_ID = uuid4().hex
CONTAINER_STARTED_AT_MS = round(time.time() * 1000)

app = modal.App(APP_NAME)
api_secret = modal.Secret.from_name("soulx-api-secret")


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    expected = os.environ.get("SOULX_API_KEY", "")
    if not expected:
        raise HTTPException(status_code=503, detail="Server API key is not configured")
    if x_api_key is None or not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(status_code=401, detail="Invalid API key")


web_app = FastAPI(
    title="Copysinger Vocal Profile Analyzer",
    version="1.0.0",
    dependencies=[Depends(require_api_key)],
)

analyzer_image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .pip_install(
        "fastapi==0.141.1",
        "librosa==0.11.0",
        "numpy==2.3.5",
        "python-multipart==0.0.32",
        "soundfile==0.14.0",
        "uvicorn==0.52.1",
        "yt-dlp==2026.7.4",
    )
    .add_local_dir(
        REPO_ROOT / "services" / "vocal-profile-api" / "app",
        remote_path=str(REMOTE_ANALYZER_ROOT / "app"),
    )
    .add_local_dir(
        REPO_ROOT / "services" / "vocal-profile-modal",
        remote_path=str(REMOTE_SERVICE_ROOT),
    )
    .add_local_file(
        REPO_ROOT / "data" / "catalogs" / "tj-2607-top100.md",
        remote_path="/data/catalogs/tj-2607-top100.md",
    )
)


def _prepare_analyzer_imports() -> None:
    root = REPO_ROOT / "services" / "vocal-profile-api" if modal.is_local() else REMOTE_ANALYZER_ROOT
    root_value = str(root)
    if root_value not in sys.path:
        sys.path.insert(0, root_value)


def _error_status(reason_code: str) -> int:
    if reason_code in {"PAYLOAD_TOO_LARGE", "TOO_LONG"}:
        return 413
    if reason_code == "UNSUPPORTED_AUDIO":
        return 415
    if reason_code == "INVALID_RECORDING_ID":
        return 400
    return 422


def _error_response(reason_code: str, detail: str, *, retryable: bool) -> JSONResponse:
    return JSONResponse(
        status_code=_error_status(reason_code),
        content={"reasonCode": reason_code, "detail": detail, "retryable": retryable},
    )


class SongTargetRequest(BaseModel):
    sourceUrl: str
    expectedVideoId: str


def _normalize_recording_id(recording_id: str) -> str:
    try:
        return str(UUID(recording_id))
    except ValueError as error:
        raise ValueError("INVALID_RECORDING_ID") from error


@web_app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "analyzer": "librosa-pyin",
        "analyzerVersion": importlib.metadata.version("librosa"),
        "capabilities": ["smart-reference-mid-v1", "song-target-v1"],
        "transportVersion": TRANSPORT_VERSION,
        "containerInstanceId": CONTAINER_INSTANCE_ID,
        "containerStartedAtMs": CONTAINER_STARTED_AT_MS,
        "compute": {
            "gpu": False,
            "cpuPhysicalCores": CPU_CORES,
            "memoryMiB": MEMORY_MIB,
        },
        "autoscaling": {
            "minContainers": MIN_CONTAINERS,
            "maxContainers": MAX_CONTAINERS,
            "scaledownWindowSeconds": SCALEDOWN_WINDOW_SECONDS,
            "maxInputsPerContainer": MAX_INPUTS_PER_CONTAINER,
        },
    }


@web_app.post("/v1/song-target", response_model=None)
async def song_target(request: SongTargetRequest) -> StreamingResponse | JSONResponse:
    _prepare_analyzer_imports()
    from app.song_pipeline import SongPipelineError, download_song_target

    try:
        job_path, source_path = await asyncio.to_thread(
            download_song_target,
            request.sourceUrl,
            request.expectedVideoId,
        )
    except SongPipelineError as error:
        retryable = error.reason_code not in {
            "SOURCE_NOT_ALLOWLISTED",
            "INVALID_SOURCE_URL",
            "SOURCE_ID_MISMATCH",
        }
        status = 422 if not retryable else (504 if error.reason_code == "PIPELINE_TIMEOUT" else 502)
        return JSONResponse(
            status_code=status,
            content={"reasonCode": error.reason_code, "detail": error.detail, "retryable": retryable},
        )
    except Exception:
        LOGGER.exception("Song target preparation failed")
        return JSONResponse(
            status_code=500,
            content={
                "reasonCode": "SONG_TARGET_FAILED",
                "detail": "The song target service failed unexpectedly.",
                "retryable": True,
            },
        )

    size = source_path.stat().st_size

    async def stream_and_cleanup():
        try:
            with source_path.open("rb") as source:
                while chunk := source.read(1024 * 1024):
                    yield chunk
                    await asyncio.sleep(0)
        finally:
            shutil.rmtree(job_path, ignore_errors=True)

    return StreamingResponse(
        stream_and_cleanup(),
        media_type="audio/wav",
        headers={
            "Content-Length": str(size),
            "Content-Disposition": 'attachment; filename="target.wav"',
        },
    )


@web_app.post("/v1/analyze")
async def analyze(
    audio: Annotated[UploadFile, File()],
    recording_id: Annotated[str, Header(alias="X-Recording-ID")],
    preset: Annotated[str | None, Form()] = None,
    melody_start_ms: Annotated[int | None, Form()] = None,
    melody_end_ms: Annotated[int | None, Form()] = None,
    glissando_start_ms: Annotated[int | None, Form()] = None,
    glissando_end_ms: Annotated[int | None, Form()] = None,
    trim_to_max_duration: Annotated[bool, Form()] = False,
) -> JSONResponse:
    _prepare_analyzer_imports()
    from app.analysis import AnalysisRejectedError
    from app.analysis_service import analyze_recording_file, audio_suffix_for_mime_type
    from app.config import MAX_UPLOAD_BYTES, UPLOAD_CHUNK_BYTES

    try:
        normalized_recording_id = _normalize_recording_id(recording_id)
    except ValueError:
        await audio.close()
        return _error_response(
            "INVALID_RECORDING_ID",
            "X-Recording-ID must be a UUID.",
            retryable=False,
        )

    try:
        handler_started = time.perf_counter()
        mime_type, suffix = audio_suffix_for_mime_type(audio.content_type)
        envelope: dict[str, Any]
        analysis_seconds = 0.0
        serialization_seconds = 0.0
        size_bytes = 0
        with ephemeral_working_directory() as working_directory:
            upload_path = working_directory / (
                f"upload{suffix}" if trim_to_max_duration else f"source{suffix}"
            )
            with upload_path.open("wb") as output:
                while chunk := await audio.read(UPLOAD_CHUNK_BYTES):
                    size_bytes += len(chunk)
                    if size_bytes > MAX_UPLOAD_BYTES:
                        raise AnalysisRejectedError(
                            "PAYLOAD_TOO_LARGE",
                            "Audio must be 25 MB or smaller.",
                        )
                    output.write(chunk)

            analysis_started = time.perf_counter()
            analyzed = await analyze_recording_file(
                upload_path=upload_path,
                working_directory=working_directory,
                mime_type=mime_type,
                trim_to_max_duration=trim_to_max_duration,
                preset=preset,
                melody_start_ms=melody_start_ms,
                melody_end_ms=melody_end_ms,
                glissando_start_ms=glissando_start_ms,
                glissando_end_ms=glissando_end_ms,
            )
            analysis_seconds = time.perf_counter() - analysis_started
            serialization_started = time.perf_counter()
            profile = build_profile_payload(normalized_recording_id, analyzed)
            envelope = build_analysis_envelope(
                profile=profile,
                source_path=analyzed.source_path,
                source_mime_type=analyzed.source_mime_type,
                synthesis_reference_path=analyzed.synthesis_reference_path,
            )
            serialization_seconds = time.perf_counter() - serialization_started

        envelope["cleanupConfirmed"] = True
        envelope["containerInstanceId"] = CONTAINER_INSTANCE_ID
        envelope["containerStartedAtMs"] = CONTAINER_STARTED_AT_MS
        envelope["compute"] = {
            "gpu": False,
            "cpuPhysicalCores": CPU_CORES,
            "memoryMiB": MEMORY_MIB,
        }
        envelope["metrics"] = {
            "uploadBytes": size_bytes,
            "analysisSeconds": round(analysis_seconds, 3),
            "serializationSeconds": round(serialization_seconds, 3),
            "handlerSeconds": round(time.perf_counter() - handler_started, 3),
        }
        return JSONResponse(content=envelope)
    except AnalysisRejectedError as error:
        return _error_response(
            error.reason_code,
            error.detail,
            retryable=error.reason_code != "ANALYSIS_FAILED",
        )
    except Exception:
        LOGGER.exception(
            "Modal vocal profile analysis failed",
            extra={"recordingId": normalized_recording_id},
        )
        return JSONResponse(
            status_code=500,
            content={
                "reasonCode": "ANALYSIS_FAILED",
                "detail": "The vocal analysis service failed unexpectedly.",
                "retryable": True,
            },
        )
    finally:
        await audio.close()


@app.function(
    image=analyzer_image,
    cpu=CPU_CORES,
    memory=MEMORY_MIB,
    timeout=FUNCTION_TIMEOUT_SECONDS,
    min_containers=MIN_CONTAINERS,
    max_containers=MAX_CONTAINERS,
    scaledown_window=SCALEDOWN_WINDOW_SECONDS,
    secrets=[api_secret],
)
@modal.concurrent(max_inputs=MAX_INPUTS_PER_CONTAINER)
@modal.asgi_app()
def fastapi_app():
    return web_app
