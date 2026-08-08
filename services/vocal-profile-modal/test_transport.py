from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest

from transport import (
    build_analysis_envelope,
    build_profile_payload,
    decode_artifact,
    encode_artifact,
)


def test_artifact_round_trip_preserves_size_and_hash(tmp_path: Path) -> None:
    source = tmp_path / "source.webm"
    source.write_bytes(b"copy-singer-source-bytes")

    artifact = encode_artifact(source, mime_type="audio/webm")

    assert artifact["fileName"] == "source.webm"
    assert artifact["mimeType"] == "audio/webm"
    assert artifact["sizeBytes"] == source.stat().st_size
    assert decode_artifact(artifact) == source.read_bytes()


def test_profile_payload_preserves_analyzer_and_smart_reference_contract() -> None:
    analyzed = SimpleNamespace(
        analysis=SimpleNamespace(
            duration_ms=7_000,
            sample_rate=22_050,
            min_midi=56.0,
            max_midi=72.0,
            p10_midi=58.0,
            median_midi=64.0,
            p90_midi=70.0,
            tessitura_low_midi=58.0,
            tessitura_high_midi=70.0,
            voiced_ratio=0.9,
            pitch_stability=0.8,
            clipping_ratio=0.0,
            rms_db=-18.0,
            analyzer="librosa-pyin",
            analyzer_version="fixture",
            descriptors={"synthesisReference": {"version": "smart-reference-mid-v1"}},
        ),
        source_mime_type="audio/webm",
        source_size_bytes=512,
        synthesis_reference_size_bytes=256,
        synthesis_reference_descriptor={
            "version": "smart-reference-mid-v1",
            "durationMs": 6_000,
            "algorithm": "voiced-mid-phrase-selection",
            "sourceRanges": [{"startMs": 0, "endMs": 6_000, "band": "mid"}],
            "bandSeconds": {"low": 0.0, "mid": 6.0, "high": 0.0},
            "voicedDensity": 0.9,
            "pitchCoverageSemitones": 12.0,
            "crossfadeMs": 30,
            "fallbackReason": None,
        },
    )

    profile = build_profile_payload("recording-id", analyzed)

    assert profile["recordingId"] == "recording-id"
    assert profile["mimeType"] == "audio/webm"
    assert profile["analyzerVersion"] == "fixture"
    assert profile["synthesisReference"]["version"] == "smart-reference-mid-v1"
    assert profile["synthesisReference"]["sizeBytes"] == 256


def test_analysis_envelope_supports_unavailable_smart_reference(tmp_path: Path) -> None:
    source = tmp_path / "source.wav"
    source.write_bytes(b"RIFF-source")

    envelope = build_analysis_envelope(
        profile={
            "recordingId": "fixture",
            "descriptors": {
                "synthesisReference": {
                    "version": "smart-reference-mid-v1",
                    "status": "unavailable",
                    "fallbackReason": "no-quality-mid-phrase",
                }
            },
            "synthesisReference": None,
        },
        source_path=source,
        source_mime_type="audio/wav",
        synthesis_reference_path=None,
    )

    assert envelope["transportVersion"] == "modal-analysis-envelope-v1"
    assert envelope["artifacts"]["synthesisReference"] is None
    assert decode_artifact(envelope["artifacts"]["source"]) == b"RIFF-source"
    assert envelope["cleanupConfirmed"] is False


def test_decode_rejects_tampered_artifact(tmp_path: Path) -> None:
    source = tmp_path / "source.wav"
    source.write_bytes(b"original")
    artifact = encode_artifact(source, mime_type="audio/wav")
    artifact["sha256"] = "0" * 64

    with pytest.raises(ValueError, match="hash"):
        decode_artifact(artifact)
