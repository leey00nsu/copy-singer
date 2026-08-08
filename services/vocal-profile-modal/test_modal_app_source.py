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


def test_modal_app_exposes_health_and_analyze_contract() -> None:
    text = SOURCE.read_text(encoding="utf-8")

    assert '@web_app.get("/health")' in text
    assert '@web_app.post("/v1/analyze")' in text
    assert '"smart-reference-v1"' in text
    assert '"transportVersion"' in text
    assert "ephemeral_working_directory" in text
    assert "build_analysis_envelope" in text
