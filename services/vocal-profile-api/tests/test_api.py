from __future__ import annotations

from uuid import uuid4

import numpy as np
import soundfile as sf
from fastapi.testclient import TestClient

from app.config import GUIDE_PATTERN, GUIDE_START_MIDI
from app.main import app

SAMPLE_RATE = 22_050


def _guided_wav(path, preset: str = "medium") -> None:
    start_midi = GUIDE_START_MIDI[preset]
    notes = []
    for step in GUIDE_PATTERN:
        frequency = 440.0 * 2 ** ((start_midi + step - 69) / 12)
        time = np.arange(round(SAMPLE_RATE * 0.75)) / SAMPLE_RATE
        notes.append(0.25 * np.sin(2 * np.pi * frequency * time))
    transition = np.zeros(round(SAMPLE_RATE * 1.5))
    glissando_midi = np.concatenate(
        [
            np.linspace(start_midi, start_midi - 5, round(SAMPLE_RATE * 1.875)),
            np.linspace(start_midi - 5, start_midi, round(SAMPLE_RATE * 1.875)),
            np.linspace(start_midi, start_midi + 12, round(SAMPLE_RATE * 1.875)),
            np.linspace(start_midi + 12, start_midi, round(SAMPLE_RATE * 1.875)),
        ]
    )
    frequency = 440.0 * 2 ** ((glissando_midi - 69) / 12)
    glissando = 0.25 * np.sin(np.cumsum(2 * np.pi * frequency / SAMPLE_RATE))
    sf.write(path, np.concatenate([*notes, transition, glissando]), SAMPLE_RATE)


def test_health_analyze_and_delete(tmp_path, monkeypatch) -> None:
    from app import main

    monkeypatch.setattr(main, "STORAGE_ROOT", tmp_path / "storage")
    source = tmp_path / "guide.wav"
    _guided_wav(source)
    recording_id = str(uuid4())

    with TestClient(app) as client, source.open("rb") as audio:
        assert client.get("/health").json()["status"] == "ok"
        response = client.post(
            "/v1/analyze",
            headers={"X-Recording-ID": recording_id},
            files={"audio": ("guide.wav", audio, "audio/wav")},
            data={
                "preset": "medium",
                "melody_start_ms": "0",
                "melody_end_ms": "12000",
                "glissando_start_ms": "13500",
                "glissando_end_ms": "21000",
            },
        )

        assert response.status_code == 200, response.text
        body = response.json()
        assert body["recordingId"] == recording_id
        assert body["analyzer"] == "librosa-pyin"
        assert (main.STORAGE_ROOT / body["storagePath"]).exists()

        deleted = client.delete(f"/v1/recordings/{recording_id}")
        assert deleted.status_code == 200
        assert not (main.STORAGE_ROOT / recording_id).exists()


def test_rejects_unsupported_mime(tmp_path, monkeypatch) -> None:
    from app import main

    monkeypatch.setattr(main, "STORAGE_ROOT", tmp_path / "storage")
    with TestClient(app) as client:
        response = client.post(
            "/v1/analyze",
            headers={"X-Recording-ID": str(uuid4())},
            files={"audio": ("voice.txt", b"not audio", "text/plain")},
        )

    assert response.status_code == 415
    assert response.json()["reasonCode"] == "UNSUPPORTED_AUDIO"


def test_rejects_payload_over_limit(tmp_path, monkeypatch) -> None:
    from app import main

    monkeypatch.setattr(main, "STORAGE_ROOT", tmp_path / "storage")
    monkeypatch.setattr(main, "MAX_UPLOAD_BYTES", 32)
    with TestClient(app) as client:
        response = client.post(
            "/v1/analyze",
            headers={"X-Recording-ID": str(uuid4())},
            files={"audio": ("voice.wav", b"x" * 33, "audio/wav")},
        )

    assert response.status_code == 413
    assert response.json()["reasonCode"] == "PAYLOAD_TOO_LARGE"
