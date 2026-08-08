from __future__ import annotations

from dataclasses import dataclass, replace
from pathlib import Path

from .analysis import AnalysisRejectedError, AnalysisResult, SegmentBounds, analyze_wav_with_frames
from .config import ALLOWED_MIME_TYPES
from .media import standardize_audio
from .reference import build_reference_outputs


@dataclass(frozen=True)
class RecordingAnalysisResult:
    analysis: AnalysisResult
    source_path: Path
    source_mime_type: str
    synthesis_reference_path: Path | None
    synthesis_reference_descriptor: dict[str, object] | None

    @property
    def source_size_bytes(self) -> int:
        return self.source_path.stat().st_size

    @property
    def synthesis_reference_size_bytes(self) -> int | None:
        if self.synthesis_reference_path is None:
            return None
        return self.synthesis_reference_path.stat().st_size


def normalize_audio_mime_type(content_type: str | None) -> str:
    return (content_type or "").partition(";")[0].strip().lower()


def audio_suffix_for_mime_type(content_type: str | None) -> tuple[str, str]:
    mime_type = normalize_audio_mime_type(content_type)
    suffix = ALLOWED_MIME_TYPES.get(mime_type)
    if suffix is None:
        raise AnalysisRejectedError(
            "UNSUPPORTED_AUDIO",
            "Use a WAV, MP3, M4A, or WebM audio file.",
        )
    return mime_type, suffix


def segment_bounds_from_fields(
    *,
    preset: str | None,
    melody_start_ms: int | None,
    melody_end_ms: int | None,
    glissando_start_ms: int | None,
    glissando_end_ms: int | None,
) -> SegmentBounds | None:
    values = (
        melody_start_ms,
        melody_end_ms,
        glissando_start_ms,
        glissando_end_ms,
    )
    if not any(value is not None for value in values) and preset is None:
        return None
    if preset is None or any(value is None for value in values):
        raise AnalysisRejectedError(
            "INVALID_SEGMENTS",
            "All guide segment fields are required together.",
        )
    assert melody_start_ms is not None
    assert melody_end_ms is not None
    assert glissando_start_ms is not None
    assert glissando_end_ms is not None
    return SegmentBounds(
        melody_start_ms=melody_start_ms,
        melody_end_ms=melody_end_ms,
        glissando_start_ms=glissando_start_ms,
        glissando_end_ms=glissando_end_ms,
        preset=preset,
    )


async def analyze_recording_file(
    *,
    upload_path: Path,
    working_directory: Path,
    mime_type: str,
    trim_to_max_duration: bool = False,
    preset: str | None = None,
    melody_start_ms: int | None = None,
    melody_end_ms: int | None = None,
    glissando_start_ms: int | None = None,
    glissando_end_ms: int | None = None,
) -> RecordingAnalysisResult:
    normalized_mime_type, _ = audio_suffix_for_mime_type(mime_type)
    working_directory.mkdir(parents=True, exist_ok=True)

    source_path = working_directory / "source.wav" if trim_to_max_duration else upload_path
    analysis_path = source_path if trim_to_max_duration else working_directory / "analysis.wav"

    try:
        await standardize_audio(
            upload_path,
            analysis_path,
            trim_to_max_duration=trim_to_max_duration,
        )
        if trim_to_max_duration:
            upload_path.unlink(missing_ok=True)

        segments = segment_bounds_from_fields(
            preset=preset,
            melody_start_ms=melody_start_ms,
            melody_end_ms=melody_end_ms,
            glissando_start_ms=glissando_start_ms,
            glissando_end_ms=glissando_end_ms,
        )
        analysis, pitch_frames = analyze_wav_with_frames(analysis_path, segments)
        descriptors = dict(analysis.descriptors)

        synthesis_path = working_directory / "synthesis-reference.wav"
        reference_outputs = build_reference_outputs(
            analysis_path,
            synthesis_path,
            p10_midi=analysis.p10_midi,
            median_midi=analysis.median_midi,
            p90_midi=analysis.p90_midi,
            pitch_frames=pitch_frames,
        )
        descriptors["analysisReferenceBands"] = reference_outputs.analysis_bands_descriptor
        synthesis_descriptor = reference_outputs.synthesis_descriptor
        if synthesis_descriptor is None:
            synthesis_path.unlink(missing_ok=True)
            descriptors["synthesisReference"] = {
                "algorithm": "voiced-mid-phrase-selection",
                "version": "smart-reference-mid-v1",
                "status": "unavailable",
                "fallbackReason": "no-quality-mid-phrase",
            }
            synthesis_reference_path = None
        else:
            descriptors["synthesisReference"] = synthesis_descriptor
            synthesis_reference_path = synthesis_path

        if trim_to_max_duration:
            descriptors.update(
                {
                    "trimmedFromLongFile": True,
                    "trimStartPolicy": "first-audible--45db",
                    "trimMaxDurationMs": 60_000,
                }
            )

        return RecordingAnalysisResult(
            analysis=replace(analysis, descriptors=descriptors),
            source_path=source_path,
            source_mime_type="audio/wav" if trim_to_max_duration else normalized_mime_type,
            synthesis_reference_path=synthesis_reference_path,
            synthesis_reference_descriptor=synthesis_descriptor,
        )
    finally:
        if analysis_path != source_path:
            analysis_path.unlink(missing_ok=True)
