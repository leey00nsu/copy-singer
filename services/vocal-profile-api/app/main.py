from __future__ import annotations

import shutil
import asyncio
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Annotated
from uuid import UUID

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

from .analysis import AnalysisRejectedError, SegmentBounds, analyze_wav
from .config import (
    ALLOWED_MIME_TYPES,
    MAX_UPLOAD_BYTES,
    SOURCE_TTL_HOURS,
    STORAGE_ROOT,
    UPLOAD_CHUNK_BYTES,
)
from .contracts import (
    AnalyzerResponse,
    DeleteResponse,
    ErrorResponse,
    SongAnalysisRequest,
    SongAnalysisResponse,
)
from .media import standardize_audio
from .song_pipeline import (
    SongPipelineError,
    analyze_song_url,
    cleanup_abandoned_jobs,
    dependency_status,
    download_song_target,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    cleanup_abandoned_jobs()
    yield


app = FastAPI(title="Copy Singer Vocal Profile Analyzer", version="1.1.0", lifespan=lifespan)


def _recording_directory(recording_id: str) -> Path:
    try:
        normalized = str(UUID(recording_id))
    except ValueError as error:
        raise HTTPException(status_code=400, detail="Invalid recording ID.") from error
    return STORAGE_ROOT / normalized


def _error_status(reason_code: str) -> int:
    if reason_code in {"PAYLOAD_TOO_LARGE", "TOO_LONG"}:
        return 413
    if reason_code == "UNSUPPORTED_AUDIO":
        return 415
    return 422


@app.exception_handler(AnalysisRejectedError)
async def analysis_rejected_handler(_, error: AnalysisRejectedError) -> JSONResponse:
    return JSONResponse(
        status_code=_error_status(error.reason_code),
        content=ErrorResponse(
            reasonCode=error.reason_code,
            detail=error.detail,
            retryable=error.reason_code != "ANALYSIS_FAILED",
        ).model_dump(),
    )


@app.exception_handler(SongPipelineError)
async def song_pipeline_error_handler(_, error: SongPipelineError) -> JSONResponse:
    status = (
        400
        if error.reason_code in {"INVALID_SOURCE_URL", "SOURCE_ID_MISMATCH"}
        or error.reason_code == "SOURCE_NOT_ALLOWLISTED"
        else 504
        if error.reason_code == "PIPELINE_TIMEOUT"
        else 422
    )
    return JSONResponse(
        status_code=status,
        content=ErrorResponse(
            reasonCode=error.reason_code,
            detail=error.detail,
            retryable=status != 400,
        ).model_dump(),
    )


@app.get("/health")
async def health() -> dict[str, object]:
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    return {
        "status": "ok",
        "analyzer": "librosa-pyin",
        "storageWritable": STORAGE_ROOT.is_dir(),
        "songPipeline": dependency_status(),
    }


@app.post(
    "/v1/analyze-song-url",
    response_model=SongAnalysisResponse,
    responses={400: {"model": ErrorResponse}, 422: {"model": ErrorResponse}, 504: {"model": ErrorResponse}},
)
async def analyze_song(request: SongAnalysisRequest) -> SongAnalysisResponse:
    result = await asyncio.to_thread(
        analyze_song_url,
        request.sourceUrl,
        request.expectedVideoId,
    )
    return SongAnalysisResponse(**result)


@app.get("/v1/recordings/{recording_id}/source")
async def recording_source(recording_id: str) -> FileResponse:
    directory = _recording_directory(recording_id)
    sources = sorted(directory.glob("source.*")) if directory.is_dir() else []
    if len(sources) != 1 or not sources[0].is_file():
        raise HTTPException(status_code=404, detail="Recording source was not found.")
    source = sources[0]
    mime_types = {
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
        ".webm": "audio/webm",
    }
    return FileResponse(
        source,
        media_type=mime_types.get(source.suffix, "application/octet-stream"),
        filename=source.name,
    )


@app.post("/v1/song-target")
async def song_target(request: SongAnalysisRequest) -> StreamingResponse:
    job_path, source_path = await asyncio.to_thread(
        download_song_target,
        request.sourceUrl,
        request.expectedVideoId,
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


@app.post(
    "/v1/analyze",
    response_model=AnalyzerResponse,
    responses={413: {"model": ErrorResponse}, 415: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
)
async def analyze(
    audio: Annotated[UploadFile, File()],
    recording_id: Annotated[str, Header(alias="X-Recording-ID")],
    preset: Annotated[str | None, Form()] = None,
    melody_start_ms: Annotated[int | None, Form()] = None,
    melody_end_ms: Annotated[int | None, Form()] = None,
    glissando_start_ms: Annotated[int | None, Form()] = None,
    glissando_end_ms: Annotated[int | None, Form()] = None,
) -> AnalyzerResponse:
    mime_type = (audio.content_type or "").partition(";")[0].strip().lower()
    suffix = ALLOWED_MIME_TYPES.get(mime_type)
    if suffix is None:
        raise AnalysisRejectedError("UNSUPPORTED_AUDIO", "Use a WAV, MP3, M4A, or WebM audio file.")

    directory = _recording_directory(recording_id)
    if directory.exists():
        shutil.rmtree(directory)
    directory.mkdir(parents=True)
    source_path = directory / f"source{suffix}"
    analysis_path = directory / "analysis.wav"
    size_bytes = 0

    try:
        with source_path.open("wb") as output:
            while chunk := await audio.read(UPLOAD_CHUNK_BYTES):
                size_bytes += len(chunk)
                if size_bytes > MAX_UPLOAD_BYTES:
                    raise AnalysisRejectedError("PAYLOAD_TOO_LARGE", "Audio must be 25 MB or smaller.")
                output.write(chunk)

        await standardize_audio(source_path, analysis_path)
        segment_values = (
            melody_start_ms,
            melody_end_ms,
            glissando_start_ms,
            glissando_end_ms,
        )
        segments = None
        if any(value is not None for value in segment_values) or preset is not None:
            if preset is None or any(value is None for value in segment_values):
                raise AnalysisRejectedError("INVALID_SEGMENTS", "All guide segment fields are required together.")
            segments = SegmentBounds(
                melody_start_ms=melody_start_ms,
                melody_end_ms=melody_end_ms,
                glissando_start_ms=glissando_start_ms,
                glissando_end_ms=glissando_end_ms,
                preset=preset,
            )

        result = analyze_wav(analysis_path, segments)
        expires_at = datetime.now(UTC) + timedelta(hours=SOURCE_TTL_HOURS)
        data = result.to_dict()
        return AnalyzerResponse(
            recordingId=recording_id,
            storagePath=f"{recording_id}/{source_path.name}",
            mimeType=mime_type,
            sizeBytes=size_bytes,
            expiresAt=expires_at.isoformat(),
            durationMs=data.pop("duration_ms"),
            sampleRate=data.pop("sample_rate"),
            minMidi=data.pop("min_midi"),
            maxMidi=data.pop("max_midi"),
            p10Midi=data.pop("p10_midi"),
            medianMidi=data.pop("median_midi"),
            p90Midi=data.pop("p90_midi"),
            tessituraLowMidi=data.pop("tessitura_low_midi"),
            tessituraHighMidi=data.pop("tessitura_high_midi"),
            voicedRatio=data.pop("voiced_ratio"),
            pitchStability=data.pop("pitch_stability"),
            clippingRatio=data.pop("clipping_ratio"),
            rmsDb=data.pop("rms_db"),
            analyzer=data.pop("analyzer"),
            analyzerVersion=data.pop("analyzer_version"),
            descriptors=data.pop("descriptors"),
        )
    except Exception:
        shutil.rmtree(directory, ignore_errors=True)
        raise
    finally:
        await audio.close()
        analysis_path.unlink(missing_ok=True)


@app.delete("/v1/recordings/{recording_id}", response_model=DeleteResponse)
async def delete_recording(recording_id: str) -> DeleteResponse:
    directory = _recording_directory(recording_id)
    shutil.rmtree(directory, ignore_errors=True)
    return DeleteResponse(status="deleted", recordingId=recording_id)
