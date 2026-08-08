from __future__ import annotations

import ast
from pathlib import Path


SOURCE = Path(__file__).with_name("modal_app.py")


def test_modal_app_is_cpu_only_and_server_key_authenticated() -> None:
    text = SOURCE.read_text(encoding="utf-8")
    ast.parse(text)

    assert 'APP_NAME = "copy-singer-vocal-profile-analyzer"' in text
    assert "CPU_CORES = 2.0" in text
    assert "MEMORY_MIB = 4096" in text
    assert "MIN_CONTAINERS = 0" in text
    assert "SCALEDOWN_WINDOW_SECONDS = 60" in text
    assert "MAX_INPUTS_PER_CONTAINER = 1" in text
    assert 'modal.Secret.from_name("soulx-api-secret")' in text
    assert '"X-API-Key"' not in text
    assert "hmac.compare_digest" in text
    assert "@modal.concurrent(max_inputs=MAX_INPUTS_PER_CONTAINER)" in text
    assert "@modal.asgi_app()" in text
    assert "modal.Volume" not in text
    assert "gpu=" not in text


def test_modal_app_exposes_health_analyze_and_song_target_contract() -> None:
    text = SOURCE.read_text(encoding="utf-8")

    assert '@web_app.get("/health")' in text
    assert '@web_app.post("/v1/analyze")' in text
    assert '@web_app.post("/v1/song-target", response_model=None)' in text
    assert '"smart-reference-mid-v1"' in text
    assert '"song-target-v1"' in text
    assert '"yt-dlp==2026.7.4"' in text
    assert 'remote_path="/data/catalogs/tj-2607-top100.md"' in text
    assert "download_song_target" in text
    assert "StreamingResponse" in text
    assert "shutil.rmtree(job_path" in text
    assert '"transportVersion"' in text
    assert "ephemeral_working_directory" in text
    assert "build_analysis_envelope" in text
