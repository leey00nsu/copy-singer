from __future__ import annotations

import asyncio
from pathlib import Path

from .analysis import AnalysisRejectedError
from .config import DEFAULT_ANALYSIS_CONFIG


async def standardize_audio(source_path: Path, output_path: Path) -> None:
    process = await asyncio.create_subprocess_exec(
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-y",
        "-i",
        str(source_path),
        "-ac",
        "1",
        "-ar",
        str(DEFAULT_ANALYSIS_CONFIG.sample_rate),
        "-c:a",
        "pcm_f32le",
        str(output_path),
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        _, stderr = await asyncio.wait_for(process.communicate(), timeout=70)
    except TimeoutError as error:
        process.kill()
        await process.communicate()
        raise AnalysisRejectedError("ANALYSIS_FAILED", "Audio decoding timed out.") from error

    if process.returncode != 0:
        message = stderr.decode("utf-8", errors="replace").strip()
        detail = "The uploaded file could not be decoded as audio."
        if "Invalid data" not in message and message:
            detail = "The uploaded audio format is unsupported or damaged."
        raise AnalysisRejectedError("UNSUPPORTED_AUDIO", detail)
