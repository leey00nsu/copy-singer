from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    api_key: str
    soulx_root: Path
    runtime_dir: Path
    prompt_max_seconds: int
    target_max_seconds: int
    max_upload_bytes: int
    job_ttl_hours: int
    queue_size: int
    fp16: bool

    @classmethod
    def from_env(cls) -> "Settings":
        root = Path(os.getenv("SOULX_ROOT", "./vendor/SoulX-Singer")).resolve()
        runtime = Path(os.getenv("SOULX_RUNTIME_DIR", "./runtime")).resolve()
        return cls(
            api_key=os.getenv("SOULX_API_KEY", ""),
            soulx_root=root,
            runtime_dir=runtime,
            prompt_max_seconds=int(os.getenv("SOULX_PROMPT_MAX_SECONDS", "30")),
            target_max_seconds=int(os.getenv("SOULX_TARGET_MAX_SECONDS", "300")),
            max_upload_bytes=int(os.getenv("SOULX_MAX_UPLOAD_MB", "256")) * 1024 * 1024,
            job_ttl_hours=int(os.getenv("SOULX_JOB_TTL_HOURS", "24")),
            queue_size=int(os.getenv("SOULX_QUEUE_SIZE", "4")),
            fp16=_bool("SOULX_FP16", True),
        )
