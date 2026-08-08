from __future__ import annotations

import asyncio
import shutil
import sys
from pathlib import Path
from uuid import uuid4

import numpy as np
import pytest
import soundfile as sf
from fastapi.testclient import TestClient

from app.analysis import AnalysisRejectedError
from app.analysis_service import analyze_recording_file
from app.main import app


SERVICES_ROOT = Path(__file__).resolve().parents[2]
MODAL_SERVICE_ROOT = SERVICES_ROOT / "vocal-profile-modal"
if str(MODAL_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(MODAL_SERVICE_ROOT))

from transport import build_analysis_envelope, build_profile_payload, decode_artifact  # noqa: E402


SAMPLE_RATE = 22_050


def _three_band_wav(path: Path, duration_seconds: float) -> None:
    total_samples = round(SAMPLE_RATE * duration_seconds)
    band_samples = [total_samples // 3, total_samples // 3]
    band_samples.append(total_samples - sum(band_samples))
    segments: list[np.ndarray] = []
    for frequency, sample_count in zip((196.0, 220.0, 261.63), band_samples, strict=True):
        time = np.arange(sample_count) / SAMPLE_RATE
        segments.append(0.25 * np.sin(2 * np.pi * frequency * time))
    sf.write(path, np.concatenate(segments), SAMPLE_RATE)


def _strip_local_storage(profile: dict[str, object]) -> dict[str, object]:
    result = dict(profile)
    result.pop("storagePath", None)
    result.pop("expiresAt", None)
    reference = result.get("synthesisReference")
    if isinstance(reference, dict):
        reference = dict(reference)
        reference.pop("storagePath", None)
        result["synthesisReference"] = reference
    return result


@pytest.mark.parametrize("duration_seconds", [10.0, 30.0, 60.0])
def test_local_and_modal_entry_contracts_match_for_supported_durations(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    duration_seconds: float,
) -> None:
    from app import main

    storage_root = tmp_path / "local-storage"
    monkeypatch.setattr(main, "STORAGE_ROOT", storage_root)
    source = tmp_path / f"fixture-{duration_seconds:g}.wav"
    _three_band_wav(source, duration_seconds)
    recording_id = str(uuid4())

    with TestClient(app) as client, source.open("rb") as audio:
        local_response = client.post(
            "/v1/analyze",
            headers={"X-Recording-ID": recording_id},
            files={"audio": (source.name, audio, "audio/wav")},
        )
        assert local_response.status_code == 200, local_response.text
        local_profile = local_response.json()
        local_source = client.get(f"/v1/recordings/{recording_id}/source")
        local_reference = client.get(f"/v1/recordings/{recording_id}/synthesis-reference")
        assert local_source.status_code == 200
        assert local_reference.status_code == 200

    modal_working = tmp_path / f"modal-{duration_seconds:g}"
    modal_working.mkdir()
    modal_source = modal_working / "source.wav"
    shutil.copyfile(source, modal_source)
    analyzed = asyncio.run(
        analyze_recording_file(
            upload_path=modal_source,
            working_directory=modal_working,
            mime_type="audio/wav",
        )
    )
    modal_profile = build_profile_payload(recording_id, analyzed)
    envelope = build_analysis_envelope(
        profile=modal_profile,
        source_path=analyzed.source_path,
        source_mime_type=analyzed.source_mime_type,
        synthesis_reference_path=analyzed.synthesis_reference_path,
    )

    assert _strip_local_storage(local_profile) == modal_profile
    assert decode_artifact(envelope["artifacts"]["source"]) == local_source.content
    assert envelope["artifacts"]["synthesisReference"] is not None
    assert decode_artifact(envelope["artifacts"]["synthesisReference"]) == local_reference.content

    with TestClient(app) as client:
        assert client.delete(f"/v1/recordings/{recording_id}").status_code == 200


def test_local_and_modal_core_reject_silent_audio_with_the_same_reason(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app import main

    monkeypatch.setattr(main, "STORAGE_ROOT", tmp_path / "storage")
    source = tmp_path / "silent.wav"
    sf.write(source, np.zeros(SAMPLE_RATE * 10, dtype=np.float32), SAMPLE_RATE)
    recording_id = str(uuid4())

    with TestClient(app) as client, source.open("rb") as audio:
        local_response = client.post(
            "/v1/analyze",
            headers={"X-Recording-ID": recording_id},
            files={"audio": (source.name, audio, "audio/wav")},
        )
    assert local_response.status_code == 422
    assert local_response.json()["reasonCode"] == "TOO_SILENT"

    modal_working = tmp_path / "modal-silent"
    modal_working.mkdir()
    modal_source = modal_working / "source.wav"
    shutil.copyfile(source, modal_source)
    with pytest.raises(AnalysisRejectedError) as captured:
        asyncio.run(
            analyze_recording_file(
                upload_path=modal_source,
                working_directory=modal_working,
                mime_type="audio/wav",
            )
        )
    assert captured.value.reason_code == local_response.json()["reasonCode"]
