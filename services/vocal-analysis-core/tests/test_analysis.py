from __future__ import annotations

import numpy as np
import pytest

from vocal_analysis_core.analysis import AnalysisRejectedError, SegmentBounds, analyze_audio
from vocal_analysis_core.config import GUIDE_PATTERN, GUIDE_START_MIDI, MAX_PITCH_TRACK_POINTS

SAMPLE_RATE = 22_050


def _tone(frequency: float, duration: float, amplitude: float = 0.3) -> np.ndarray:
    time = np.arange(round(SAMPLE_RATE * duration)) / SAMPLE_RATE
    return amplitude * np.sin(2 * np.pi * frequency * time)


def _guided_fixture(preset: str = "medium") -> np.ndarray:
    start_midi = GUIDE_START_MIDI[preset]
    melody = np.concatenate(
        [_tone(440.0 * 2 ** ((start_midi + step - 69) / 12), 0.75) for step in GUIDE_PATTERN]
    )
    transition = np.zeros(round(SAMPLE_RATE * 1.5))
    glissando_midi = np.concatenate(
        [
            np.linspace(start_midi, start_midi - 5, round(SAMPLE_RATE * 1.875)),
            np.linspace(start_midi - 5, start_midi, round(SAMPLE_RATE * 1.875)),
            np.linspace(start_midi, start_midi + 12, round(SAMPLE_RATE * 1.875)),
            np.linspace(start_midi + 12, start_midi, round(SAMPLE_RATE * 1.875)),
        ]
    )
    frequencies = 440.0 * 2 ** ((glissando_midi - 69) / 12)
    phase = np.cumsum(2 * np.pi * frequencies / SAMPLE_RATE)
    glissando = 0.3 * np.sin(phase)
    return np.concatenate([melody, transition, glissando]).astype(np.float32)


def test_segmented_guide_returns_melody_and_glissando_statistics() -> None:
    result = analyze_audio(
        _guided_fixture(),
        SAMPLE_RATE,
        SegmentBounds(0, 12_000, 13_500, 21_000, "medium"),
    )

    assert result.analyzer == "librosa-pyin"
    assert result.analyzer_version == "0.11.0"
    assert result.descriptors["segmented"] is True
    assert result.min_midi == pytest.approx(50, abs=1.5)
    assert result.max_midi == pytest.approx(66, abs=1.5)
    assert 55 <= result.median_midi <= 62
    assert result.voiced_ratio >= 0.8


@pytest.mark.parametrize(
    ("audio", "reason_code"),
    [
        (np.zeros(SAMPLE_RATE * 10, dtype=np.float32), "TOO_SILENT"),
        (_tone(220, 4).astype(np.float32), "TOO_SHORT"),
        (np.sign(_tone(220, 10)).astype(np.float32), "EXCESSIVE_CLIPPING"),
    ],
)
def test_quality_gate_rejects_invalid_audio(audio: np.ndarray, reason_code: str) -> None:
    with pytest.raises(AnalysisRejectedError) as error:
        analyze_audio(audio, SAMPLE_RATE)

    assert error.value.reason_code == reason_code


def test_unsegmented_upload_uses_whole_voiced_range() -> None:
    audio = np.concatenate([_tone(220, 5), _tone(440, 5)]).astype(np.float32)
    result = analyze_audio(audio, SAMPLE_RATE)

    assert result.descriptors["segmented"] is False
    assert result.min_midi == pytest.approx(57, abs=1)
    assert result.max_midi == pytest.approx(69, abs=1)

    histogram = result.descriptors["pitchHistogram"]
    assert isinstance(histogram, list)
    assert sum(bin_["count"] for bin_ in histogram) == result.descriptors["voicedFrameCount"]
    assert sum(bin_["ratio"] for bin_ in histogram) == pytest.approx(1, abs=0.001)
    assert {bin_["midi"] for bin_ in histogram} >= {57, 69}


def test_pitch_track_is_bounded_and_preserves_unvoiced_gaps() -> None:
    audio = np.concatenate([_tone(220, 5), np.zeros(SAMPLE_RATE), _tone(330, 5)]).astype(np.float32)
    result = analyze_audio(audio, SAMPLE_RATE)
    track = result.descriptors["pitchTrack"]

    assert isinstance(track, list)
    assert len(track) <= MAX_PITCH_TRACK_POINTS
    assert 0 <= track[0]["timeMs"] <= 10
    assert any(point["midi"] is None for point in track)
    assert any(point["midi"] == pytest.approx(57, abs=1) for point in track if point["midi"] is not None)
    assert any(point["midi"] == pytest.approx(64, abs=1) for point in track if point["midi"] is not None)


def test_five_second_boundary_is_accepted() -> None:
    result = analyze_audio(_tone(220, 5).astype(np.float32), SAMPLE_RATE)

    assert result.duration_ms == 5_000
    assert result.voiced_ratio >= 0.25
