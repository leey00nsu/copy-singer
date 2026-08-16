from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest
import soundfile as sf

from vocal_analysis_core import song_pipeline

SAMPLE_RATE = 22_050
VIDEO_ID = "NbKH4iZqq1Y"
SOURCE_URL = f"https://www.youtube.com/watch?v={VIDEO_ID}"


def _write_singing_fixture(path: Path) -> None:
    duration_seconds = 12
    time = np.arange(SAMPLE_RATE * duration_seconds) / SAMPLE_RATE
    frequency = 220 + 25 * np.sin(2 * np.pi * time / 3)
    phase = np.cumsum(2 * np.pi * frequency / SAMPLE_RATE)
    sf.write(path, 0.25 * np.sin(phase), SAMPLE_RATE)


def test_song_pipeline_deletes_source_and_stems_after_success(tmp_path, monkeypatch) -> None:
    observed_job_paths: list[Path] = []

    def fake_run(command: list[str], timeout_seconds: int) -> None:
        assert timeout_seconds > 0
        if "yt_dlp" in command:
            output = Path(command[command.index("-o") + 1].replace("%(ext)s", "wav"))
            observed_job_paths.append(output.parent)
            _write_singing_fixture(output)
            return

        output_root = Path(command[command.index("-o") + 1])
        source = Path(command[-1])
        vocals = output_root / song_pipeline.SEPARATOR_MODEL / source.stem / "vocals.wav"
        vocals.parent.mkdir(parents=True)
        _write_singing_fixture(vocals)

    monkeypatch.setattr(song_pipeline, "_run_command", fake_run)
    result = song_pipeline.analyze_song_url(
        SOURCE_URL,
        VIDEO_ID,
        temp_root=tmp_path,
    )

    assert result["cleanupConfirmed"] is True
    assert result["analyzer"] == "librosa-pyin"
    assert result["separatorModel"] == "htdemucs"
    assert observed_job_paths
    assert all(not path.exists() for path in observed_job_paths)
    assert list(tmp_path.iterdir()) == []


def test_song_pipeline_deletes_download_after_separator_failure(tmp_path, monkeypatch) -> None:
    observed_job_paths: list[Path] = []

    def fake_run(command: list[str], timeout_seconds: int) -> None:
        assert timeout_seconds > 0
        if "yt_dlp" in command:
            output = Path(command[command.index("-o") + 1].replace("%(ext)s", "wav"))
            observed_job_paths.append(output.parent)
            _write_singing_fixture(output)
            return
        raise song_pipeline.SongPipelineError("DEMUCS_FAILED", "fixture failure")

    monkeypatch.setattr(song_pipeline, "_run_command", fake_run)
    with pytest.raises(song_pipeline.SongPipelineError, match="fixture failure"):
        song_pipeline.analyze_song_url(SOURCE_URL, VIDEO_ID, temp_root=tmp_path)

    assert observed_job_paths
    assert all(not path.exists() for path in observed_job_paths)
    assert list(tmp_path.iterdir()) == []


def test_song_pipeline_rejects_non_catalog_url_before_creating_files(tmp_path) -> None:
    with pytest.raises(song_pipeline.SongPipelineError) as error:
        song_pipeline.analyze_song_url(
            "https://example.com/audio.wav",
            VIDEO_ID,
            temp_root=tmp_path,
        )

    assert error.value.reason_code == "INVALID_SOURCE_URL"
    assert list(tmp_path.iterdir()) == []



def test_cleanup_abandoned_jobs_only_removes_owned_prefix(tmp_path) -> None:
    abandoned = tmp_path / f"{song_pipeline.JOB_PREFIX}old"
    unrelated = tmp_path / "keep-me"
    abandoned.mkdir()
    unrelated.mkdir()

    assert song_pipeline.cleanup_abandoned_jobs(tmp_path) == 1
    assert not abandoned.exists()
    assert unrelated.exists()


def test_download_song_target_returns_caller_owned_file(tmp_path, monkeypatch) -> None:
    def fake_run(command: list[str], timeout_seconds: int) -> None:
        assert timeout_seconds == 600
        output = Path(command[command.index("-o") + 1].replace("%(ext)s", "wav"))
        _write_singing_fixture(output)

    monkeypatch.setattr(song_pipeline, "_run_command", fake_run)
    job_path, source_path = song_pipeline.download_song_target(SOURCE_URL, VIDEO_ID, temp_root=tmp_path)
    assert job_path.parent == tmp_path
    assert source_path.is_file()
    assert source_path.stat().st_size > 0
    song_pipeline.shutil.rmtree(job_path)
    assert list(tmp_path.iterdir()) == []


def test_download_song_target_cleans_up_failed_download(tmp_path, monkeypatch) -> None:
    def fake_run(command: list[str], timeout_seconds: int) -> None:
        raise song_pipeline.SongPipelineError("YT_DLP_FAILED", "fixture failure")

    monkeypatch.setattr(song_pipeline, "_run_command", fake_run)
    with pytest.raises(song_pipeline.SongPipelineError, match="fixture failure"):
        song_pipeline.download_song_target(SOURCE_URL, VIDEO_ID, temp_root=tmp_path)
    assert list(tmp_path.iterdir()) == []
