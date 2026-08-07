from __future__ import annotations

import numpy as np
import soundfile as sf

from app.reference import ReferenceCandidate, _select_candidates, build_smart_reference

SAMPLE_RATE = 22_050


def _tone(midi: float, duration: float) -> np.ndarray:
    frequency = 440.0 * 2 ** ((midi - 69.0) / 12.0)
    time = np.arange(round(SAMPLE_RATE * duration)) / SAMPLE_RATE
    return (0.25 * np.sin(2 * np.pi * frequency * time)).astype(np.float32)


def test_smart_reference_removes_silence_and_balances_pitch_bands(tmp_path) -> None:
    source = tmp_path / "source.wav"
    output = tmp_path / "reference.wav"
    silence = np.zeros(SAMPLE_RATE, dtype=np.float32)
    audio = np.concatenate([silence, _tone(52, 11), silence, _tone(60, 11), silence, _tone(67, 11)])
    sf.write(source, audio, SAMPLE_RATE)

    descriptor = build_smart_reference(
        source,
        output,
        p10_midi=52,
        median_midi=60,
        p90_midi=67,
    )

    assert descriptor is not None
    rendered, sample_rate = sf.read(output, dtype="float32")
    assert sample_rate == SAMPLE_RATE
    assert 29.0 <= len(rendered) / sample_rate <= 30.0
    assert descriptor["fallbackReason"] is None
    assert all(float(descriptor["bandSeconds"][band]) >= 9.5 for band in ("low", "mid", "high"))
    ranges = descriptor["sourceRanges"]
    assert ranges == sorted(ranges, key=lambda item: item["startMs"])
    assert all(first["endMs"] <= second["startMs"] for first, second in zip(ranges, ranges[1:], strict=False))
    assert float(descriptor["voicedDensity"]) > 0.9
    assert float(descriptor["pitchCoverageSemitones"]) > 10


def test_selection_redistributes_missing_band_without_repeating_candidates() -> None:
    candidates = [
        ReferenceCandidate(index=index, start_seconds=index * 4.0, end_seconds=(index + 1) * 4.0, band="mid", score=0.9 - index * 0.01, voiced_density=0.9, median_midi=60)
        for index in range(4)
    ]

    selected, allocated = _select_candidates(candidates)

    assert [selection.candidate.index for selection in selected] == [0, 1, 2, 2, 3]
    assert all(first.end_seconds <= second.start_seconds for first, second in zip(selected, selected[1:], strict=False))
    assert sum(selection.duration_seconds for selection in selected) == 16
    assert allocated == {"low": 0.0, "mid": 16.0, "high": 0.0}
