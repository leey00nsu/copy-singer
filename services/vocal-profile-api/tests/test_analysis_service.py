from __future__ import annotations

import asyncio

import numpy as np
import pytest
import soundfile as sf

from app.analysis import AnalysisRejectedError
from app.analysis_service import (
    analyze_recording_file,
    audio_suffix_for_mime_type,
    segment_bounds_from_fields,
)


SAMPLE_RATE = 22_050


def _voiced_wav(path, duration_seconds: float = 7.0) -> None:
    time = np.arange(round(SAMPLE_RATE * duration_seconds)) / SAMPLE_RATE
    audio = 0.25 * np.sin(2 * np.pi * 220.0 * time)
    sf.write(path, audio, SAMPLE_RATE)


def test_analysis_service_keeps_source_and_removes_intermediate_wav(tmp_path) -> None:
    working_directory = tmp_path / "recording"
    working_directory.mkdir()
    source = working_directory / "source.wav"
    _voiced_wav(source)

    analyzed = asyncio.run(
        analyze_recording_file(
            upload_path=source,
            working_directory=working_directory,
            mime_type="audio/wav",
        )
    )

    assert analyzed.source_path == source
    assert analyzed.source_mime_type == "audio/wav"
    assert analyzed.source_size_bytes == source.stat().st_size
    assert analyzed.analysis.analyzer == "librosa-pyin"
    assert analyzed.analysis.descriptors["synthesisReference"]["version"] == "smart-reference-v1"
    assert not (working_directory / "analysis.wav").exists()
    assert analyzed.synthesis_reference_path is not None
    assert analyzed.synthesis_reference_path.exists()
    assert analyzed.synthesis_reference_size_bytes == analyzed.synthesis_reference_path.stat().st_size


def test_parameterized_mime_is_normalized_for_transport_adapters() -> None:
    assert audio_suffix_for_mime_type("audio/webm;codecs=opus") == ("audio/webm", ".webm")


def test_partial_segment_contract_is_rejected_before_analysis() -> None:
    with pytest.raises(AnalysisRejectedError) as captured:
        segment_bounds_from_fields(
            preset="medium",
            melody_start_ms=0,
            melody_end_ms=12_000,
            glissando_start_ms=None,
            glissando_end_ms=None,
        )

    assert captured.value.reason_code == "INVALID_SEGMENTS"
