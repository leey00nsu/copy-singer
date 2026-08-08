from __future__ import annotations

import numpy as np
import soundfile as sf

from app.reference import ReferenceCandidate, _select_candidates, build_reference_outputs, build_smart_reference

SAMPLE_RATE = 22_050


def _tone(midi: float, duration: float) -> np.ndarray:
    frequency = 440.0 * 2 ** ((midi - 69.0) / 12.0)
    time = np.arange(round(SAMPLE_RATE * duration)) / SAMPLE_RATE
    return (0.25 * np.sin(2 * np.pi * frequency * time)).astype(np.float32)


def test_smart_reference_removes_silence_and_keeps_only_mid_band(tmp_path) -> None:
    source = tmp_path / "source.wav"
    output = tmp_path / "reference.wav"
    silence = np.zeros(SAMPLE_RATE, dtype=np.float32)
    audio = np.concatenate([silence, _tone(52, 11), silence, _tone(60, 11), silence, _tone(67, 11)])
    sf.write(source, audio, SAMPLE_RATE)

    built = build_reference_outputs(
        source,
        output,
        p10_midi=52,
        median_midi=60,
        p90_midi=67,
    )
    descriptor = built.synthesis_descriptor

    assert descriptor is not None
    analysis_ranges = built.analysis_bands_descriptor["sourceRanges"]
    assert {item["band"] for item in analysis_ranges} == {"low", "mid", "high"}
    assert built.analysis_bands_descriptor["version"] == "analysis-reference-bands-v1"
    assert built.analysis_bands_descriptor["status"] == "ready"
    rendered, sample_rate = sf.read(output, dtype="float32")
    assert sample_rate == SAMPLE_RATE
    assert 10.0 <= len(rendered) / sample_rate < 11.5
    assert descriptor["algorithm"] == "voiced-mid-phrase-selection"
    assert descriptor["version"] == "smart-reference-mid-v1"
    assert descriptor["fallbackReason"] is None
    assert descriptor["bandSeconds"]["low"] == 0
    assert descriptor["bandSeconds"]["high"] == 0
    assert 10.0 <= float(descriptor["bandSeconds"]["mid"]) <= 11.5
    ranges = descriptor["sourceRanges"]
    assert ranges == sorted(ranges, key=lambda item: item["startMs"])
    assert all(item["band"] == "mid" for item in ranges)
    assert all(first["endMs"] <= second["startMs"] for first, second in zip(ranges, ranges[1:], strict=False))
    assert float(descriptor["voicedDensity"]) > 0.9


def test_selection_uses_each_mid_candidate_once_and_allows_short_reference() -> None:
    candidates = [
        ReferenceCandidate(
            index=index,
            start_seconds=index * 4.0,
            end_seconds=(index + 1) * 4.0,
            band="mid",
            score=0.9 - index * 0.01,
            voiced_density=0.9,
            median_midi=60,
        )
        for index in range(4)
    ]
    candidates.extend(
        [
            ReferenceCandidate(index=10, start_seconds=20.0, end_seconds=24.0, band="low", score=1.0, voiced_density=1.0, median_midi=52),
            ReferenceCandidate(index=11, start_seconds=24.0, end_seconds=28.0, band="high", score=1.0, voiced_density=1.0, median_midi=67),
        ]
    )

    selected, allocated = _select_candidates(candidates)

    assert [selection.candidate.index for selection in selected] == [0, 1, 2, 3]
    assert all(first.end_seconds <= second.start_seconds for first, second in zip(selected, selected[1:], strict=False))
    assert sum(selection.duration_seconds for selection in selected) == 16
    assert allocated == {"low": 0.0, "mid": 16.0, "high": 0.0}


def test_selection_caps_mid_reference_at_30_seconds_without_repeating() -> None:
    candidates = [
        ReferenceCandidate(
            index=index,
            start_seconds=index * 4.0,
            end_seconds=(index + 1) * 4.0,
            band="mid",
            score=1.0 - index * 0.01,
            voiced_density=0.95,
            median_midi=60,
        )
        for index in range(8)
    ]

    selected, allocated = _select_candidates(candidates)

    assert [selection.candidate.index for selection in selected] == list(range(8))
    assert sum(selection.duration_seconds for selection in selected) == 30
    assert selected[-1].duration_seconds == 2
    assert allocated == {"low": 0.0, "mid": 30.0, "high": 0.0}


def test_reference_is_unavailable_when_only_low_and_high_phrases_exist(tmp_path) -> None:
    source = tmp_path / "source.wav"
    output = tmp_path / "reference.wav"
    silence = np.zeros(SAMPLE_RATE, dtype=np.float32)
    audio = np.concatenate([_tone(52, 5), silence, _tone(67, 5)])
    sf.write(source, audio, SAMPLE_RATE)

    descriptor = build_smart_reference(
        source,
        output,
        p10_midi=52,
        median_midi=60,
        p90_midi=67,
    )

    assert descriptor is None
    assert not output.exists()


def test_mid_reference_is_deterministic_for_same_source(tmp_path) -> None:
    source = tmp_path / "source.wav"
    output_a = tmp_path / "reference-a.wav"
    output_b = tmp_path / "reference-b.wav"
    silence = np.zeros(SAMPLE_RATE // 2, dtype=np.float32)
    audio = np.concatenate([_tone(60, 3), silence, _tone(61, 3), silence, _tone(59, 3)])
    sf.write(source, audio, SAMPLE_RATE)

    descriptor_a = build_smart_reference(
        source,
        output_a,
        p10_midi=55,
        median_midi=60,
        p90_midi=65,
    )
    descriptor_b = build_smart_reference(
        source,
        output_b,
        p10_midi=55,
        median_midi=60,
        p90_midi=65,
    )

    assert descriptor_a == descriptor_b
    assert output_a.read_bytes() == output_b.read_bytes()
