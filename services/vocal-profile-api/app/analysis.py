from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path

import librosa
import numpy as np
import numpy.typing as npt

from .config import (
    DEFAULT_ANALYSIS_CONFIG,
    GUIDE_NOTE_DURATION_SECONDS,
    GUIDE_PATTERN,
    GUIDE_START_MIDI,
    AnalysisConfig,
)


class AnalysisRejectedError(ValueError):
    def __init__(self, reason_code: str, detail: str) -> None:
        super().__init__(detail)
        self.reason_code = reason_code
        self.detail = detail


@dataclass(frozen=True)
class SegmentBounds:
    melody_start_ms: int
    melody_end_ms: int
    glissando_start_ms: int
    glissando_end_ms: int
    preset: str

    def validate(self, duration_ms: int) -> None:
        if self.preset not in GUIDE_START_MIDI:
            raise AnalysisRejectedError("INVALID_SEGMENTS", "Unknown guide preset.")
        points = (
            self.melody_start_ms,
            self.melody_end_ms,
            self.glissando_start_ms,
            self.glissando_end_ms,
        )
        if not (0 <= points[0] < points[1] <= points[2] < points[3] <= duration_ms):
            raise AnalysisRejectedError("INVALID_SEGMENTS", "Segment timestamps are out of range.")


@dataclass(frozen=True)
class AnalysisResult:
    duration_ms: int
    sample_rate: int
    min_midi: float
    max_midi: float
    p10_midi: float
    median_midi: float
    p90_midi: float
    tessitura_low_midi: float
    tessitura_high_midi: float
    voiced_ratio: float
    pitch_stability: float
    clipping_ratio: float
    rms_db: float
    analyzer: str
    analyzer_version: str
    descriptors: dict[str, object]

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


def _round(value: float, digits: int = 4) -> float:
    return round(float(value), digits)


def _rms_db(audio: npt.NDArray[np.floating]) -> float:
    rms = float(np.sqrt(np.mean(np.square(audio), dtype=np.float64)))
    return 20.0 * np.log10(max(rms, np.finfo(np.float64).tiny))


def _frame_mask(
    frame_times: npt.NDArray[np.floating], start_ms: int, end_ms: int
) -> npt.NDArray[np.bool_]:
    return (frame_times >= start_ms / 1_000) & (frame_times < end_ms / 1_000)


def _stability_score(
    midi: npt.NDArray[np.floating],
    frame_times: npt.NDArray[np.floating],
    segments: SegmentBounds | None,
) -> tuple[float, dict[str, float]]:
    if midi.size < 3:
        return 0.0, {"local_cents_mad": 1_200.0}

    local_cents = np.diff(midi) * 100.0
    local_median = np.median(local_cents)
    local_mad = float(np.median(np.abs(local_cents - local_median)))
    target_error = 0.0

    if segments is not None:
        elapsed = frame_times - segments.melody_start_ms / 1_000
        note_indices = np.clip(
            np.floor(elapsed / GUIDE_NOTE_DURATION_SECONDS).astype(int),
            0,
            len(GUIDE_PATTERN) - 1,
        )
        expected = GUIDE_START_MIDI[segments.preset] + np.asarray(GUIDE_PATTERN)[note_indices]
        target_error = float(np.median(np.abs((midi - expected) * 100.0)))

    stability = float(np.exp(-local_mad / 80.0) * np.exp(-target_error / 200.0))
    return float(np.clip(stability, 0.0, 1.0)), {
        "local_cents_mad": _round(local_mad),
        "target_cents_median_error": _round(target_error),
    }


def analyze_audio(
    audio: npt.NDArray[np.floating],
    sample_rate: int,
    segments: SegmentBounds | None = None,
    config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG,
) -> AnalysisResult:
    if audio.ndim != 1 or audio.size == 0:
        raise AnalysisRejectedError("UNSUPPORTED_AUDIO", "Decoded audio must be mono and non-empty.")

    duration_seconds = audio.size / sample_rate
    duration_ms = round(duration_seconds * 1_000)
    if duration_seconds < config.min_duration_seconds:
        raise AnalysisRejectedError("TOO_SHORT", "Audio must be at least 8 seconds long.")
    if duration_seconds > config.max_duration_seconds:
        raise AnalysisRejectedError("TOO_LONG", "Audio must be 60 seconds or shorter.")

    audio = np.asarray(audio, dtype=np.float32)
    rms_db = _rms_db(audio)
    if rms_db < config.min_rms_db:
        raise AnalysisRejectedError("TOO_SILENT", "Audio level is too low for reliable analysis.")

    clipping_ratio = float(np.mean(np.abs(audio) >= 0.999))
    if clipping_ratio > config.max_clipping_ratio:
        raise AnalysisRejectedError("EXCESSIVE_CLIPPING", "Audio is clipped; move away from the microphone.")

    if segments is not None:
        segments.validate(duration_ms)

    f0, voiced_flag, _ = librosa.pyin(
        audio,
        fmin=float(librosa.note_to_hz(config.fmin_note)),
        fmax=float(librosa.note_to_hz(config.fmax_note)),
        sr=sample_rate,
        frame_length=config.frame_length,
        hop_length=config.hop_length,
    )
    valid = np.asarray(voiced_flag, dtype=bool) & np.isfinite(f0)
    voiced_ratio = float(np.mean(valid))
    if voiced_ratio < config.min_voiced_ratio:
        raise AnalysisRejectedError("LOW_VOICED_RATIO", "Not enough clear singing was detected.")

    frame_times = librosa.frames_to_time(
        np.arange(f0.size), sr=sample_rate, hop_length=config.hop_length
    )
    all_midi = np.asarray(librosa.hz_to_midi(f0[valid]), dtype=np.float64)
    stats_midi = all_midi
    range_midi = all_midi
    stability_times = frame_times[valid]

    if segments is not None:
        melody_mask = valid & _frame_mask(
            frame_times, segments.melody_start_ms, segments.melody_end_ms
        )
        glissando_mask = valid & _frame_mask(
            frame_times, segments.glissando_start_ms, segments.glissando_end_ms
        )
        stats_midi = np.asarray(librosa.hz_to_midi(f0[melody_mask]), dtype=np.float64)
        range_midi = np.asarray(librosa.hz_to_midi(f0[glissando_mask]), dtype=np.float64)
        stability_times = frame_times[melody_mask]
        if stats_midi.size < 20 or range_midi.size < 20:
            raise AnalysisRejectedError(
                "LOW_VOICED_RATIO", "The melody or glissando section needs clearer singing."
            )

    p10, median, p90 = np.percentile(stats_midi, (10, 50, 90))
    min_midi, max_midi = np.percentile(range_midi, (2, 98))
    stability, stability_details = _stability_score(stats_midi, stability_times, segments)

    return AnalysisResult(
        duration_ms=duration_ms,
        sample_rate=sample_rate,
        min_midi=_round(min_midi),
        max_midi=_round(max_midi),
        p10_midi=_round(p10),
        median_midi=_round(median),
        p90_midi=_round(p90),
        tessitura_low_midi=_round(p10),
        tessitura_high_midi=_round(p90),
        voiced_ratio=_round(voiced_ratio),
        pitch_stability=_round(stability),
        clipping_ratio=_round(clipping_ratio, 6),
        rms_db=_round(rms_db),
        analyzer="librosa-pyin",
        analyzer_version=librosa.__version__,
        descriptors={
            "segmented": segments is not None,
            "preset": segments.preset if segments else None,
            "voicedFrameCount": int(np.sum(valid)),
            "totalFrameCount": int(valid.size),
            "frameLength": config.frame_length,
            "hopLength": config.hop_length,
            "fminNote": config.fmin_note,
            "fmaxNote": config.fmax_note,
            **stability_details,
        },
    )


def analyze_wav(
    path: str | Path,
    segments: SegmentBounds | None = None,
    config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG,
) -> AnalysisResult:
    audio, sample_rate = librosa.load(path, sr=config.sample_rate, mono=True)
    return analyze_audio(audio, sample_rate, segments, config)
