from __future__ import annotations

import base64
import hashlib
from pathlib import Path
from typing import Any


TRANSPORT_VERSION = "modal-analysis-envelope-v1"


def build_profile_payload(recording_id: str, analyzed: Any) -> dict[str, Any]:
    result = analyzed.analysis
    synthesis_reference = None
    if analyzed.synthesis_reference_descriptor is not None:
        descriptor = analyzed.synthesis_reference_descriptor
        synthesis_reference = {
            "mimeType": "audio/wav",
            "sizeBytes": analyzed.synthesis_reference_size_bytes,
            "durationMs": descriptor["durationMs"],
            "algorithm": descriptor["algorithm"],
            "version": descriptor["version"],
            "sourceRanges": descriptor.get("sourceRanges", []),
            "bandSeconds": descriptor.get("bandSeconds", {}),
            "voicedDensity": descriptor["voicedDensity"],
            "pitchCoverageSemitones": descriptor["pitchCoverageSemitones"],
            "crossfadeMs": descriptor["crossfadeMs"],
            "fallbackReason": descriptor.get("fallbackReason"),
        }
    return {
        "recordingId": recording_id,
        "mimeType": analyzed.source_mime_type,
        "sizeBytes": analyzed.source_size_bytes,
        "durationMs": result.duration_ms,
        "sampleRate": result.sample_rate,
        "minMidi": result.min_midi,
        "maxMidi": result.max_midi,
        "p10Midi": result.p10_midi,
        "medianMidi": result.median_midi,
        "p90Midi": result.p90_midi,
        "tessituraLowMidi": result.tessitura_low_midi,
        "tessituraHighMidi": result.tessitura_high_midi,
        "voicedRatio": result.voiced_ratio,
        "pitchStability": result.pitch_stability,
        "clippingRatio": result.clipping_ratio,
        "rmsDb": result.rms_db,
        "analyzer": result.analyzer,
        "analyzerVersion": result.analyzer_version,
        "descriptors": result.descriptors,
        "synthesisReference": synthesis_reference,
    }


def encode_artifact(path: Path, *, mime_type: str, file_name: str | None = None) -> dict[str, Any]:
    payload = path.read_bytes()
    return {
        "fileName": file_name or path.name,
        "mimeType": mime_type,
        "sizeBytes": len(payload),
        "sha256": hashlib.sha256(payload).hexdigest(),
        "contentBase64": base64.b64encode(payload).decode("ascii"),
    }


def decode_artifact(artifact: dict[str, Any]) -> bytes:
    encoded = artifact.get("contentBase64")
    if not isinstance(encoded, str):
        raise ValueError("Artifact payload is missing contentBase64.")
    payload = base64.b64decode(encoded, validate=True)
    if artifact.get("sizeBytes") != len(payload):
        raise ValueError("Artifact size does not match decoded payload.")
    expected_hash = artifact.get("sha256")
    if not isinstance(expected_hash, str) or hashlib.sha256(payload).hexdigest() != expected_hash:
        raise ValueError("Artifact hash does not match decoded payload.")
    return payload


def build_analysis_envelope(
    *,
    profile: dict[str, Any],
    source_path: Path,
    source_mime_type: str,
    synthesis_reference_path: Path | None,
) -> dict[str, Any]:
    return {
        "transportVersion": TRANSPORT_VERSION,
        "profile": profile,
        "artifacts": {
            "source": encode_artifact(
                source_path,
                mime_type=source_mime_type,
                file_name=source_path.name,
            ),
            "synthesisReference": (
                encode_artifact(
                    synthesis_reference_path,
                    mime_type="audio/wav",
                    file_name="synthesis-reference.wav",
                )
                if synthesis_reference_path is not None
                else None
            ),
        },
        "cleanupConfirmed": False,
    }
