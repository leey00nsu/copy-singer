from __future__ import annotations

from pathlib import Path

import pytest

from runtime import ephemeral_working_directory


def test_ephemeral_directory_is_removed_after_success() -> None:
    retained_path: Path | None = None
    with ephemeral_working_directory() as working_directory:
        retained_path = working_directory
        (working_directory / "source.wav").write_bytes(b"source")
        (working_directory / "analysis.wav").write_bytes(b"analysis")
        assert working_directory.exists()

    assert retained_path is not None
    assert not retained_path.exists()


def test_ephemeral_directory_is_removed_after_analysis_failure() -> None:
    retained_path: Path | None = None
    with pytest.raises(RuntimeError, match="analysis failed"):
        with ephemeral_working_directory() as working_directory:
            retained_path = working_directory
            (working_directory / "source.wav").write_bytes(b"source")
            raise RuntimeError("analysis failed")

    assert retained_path is not None
    assert not retained_path.exists()


def test_ephemeral_directory_is_removed_after_serialization_failure() -> None:
    retained_path: Path | None = None
    with pytest.raises(ValueError, match="serialization failed"):
        with ephemeral_working_directory() as working_directory:
            retained_path = working_directory
            (working_directory / "synthesis-reference.wav").write_bytes(b"reference")
            raise ValueError("serialization failed")

    assert retained_path is not None
    assert not retained_path.exists()
