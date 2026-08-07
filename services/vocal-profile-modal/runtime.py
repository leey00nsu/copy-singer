from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Iterator


@contextmanager
def ephemeral_working_directory() -> Iterator[Path]:
    path: Path | None = None
    try:
        with TemporaryDirectory(prefix="copy-singer-vocal-profile-") as temporary:
            path = Path(temporary)
            yield path
    finally:
        if path is not None and path.exists():
            raise RuntimeError(f"CLEANUP_FAILED: temporary analysis directory remains: {path}")
