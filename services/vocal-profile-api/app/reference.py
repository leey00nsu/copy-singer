from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import librosa
import numpy as np
import numpy.typing as npt
import soundfile as sf

from .config import DEFAULT_ANALYSIS_CONFIG, AnalysisConfig
from .analysis import PitchFrames

REFERENCE_VERSION = "smart-reference-mid-v1"
REFERENCE_MAX_SECONDS = 30.0
MAX_CANDIDATE_SECONDS = 4.0
MIN_CANDIDATE_SECONDS = 0.5
MAX_INTERNAL_GAP_SECONDS = 0.35
CROSSFADE_SECONDS = 0.03
MID_BOUNDARY_TOLERANCE_SEMITONES = 0.25


@dataclass(frozen=True)
class ReferenceCandidate:
    index: int
    start_seconds: float
    end_seconds: float
    band: str
    score: float
    voiced_density: float
    median_midi: float

    @property
    def duration_seconds(self) -> float:
        return self.end_seconds - self.start_seconds


@dataclass(frozen=True)
class ReferenceSelection:
    candidate: ReferenceCandidate
    start_seconds: float
    end_seconds: float

    @property
    def duration_seconds(self) -> float:
        return self.end_seconds - self.start_seconds


def _candidate_band(median_midi: float, low_boundary: float, high_boundary: float) -> str:
    if median_midi < low_boundary - MID_BOUNDARY_TOLERANCE_SEMITONES:
        return "low"
    if median_midi > high_boundary + MID_BOUNDARY_TOLERANCE_SEMITONES:
        return "high"
    return "mid"


def _candidate_score(audio: npt.NDArray[np.float32], voiced_density: float) -> float:
    rms = float(np.sqrt(np.mean(np.square(audio), dtype=np.float64)))
    rms_db = 20.0 * np.log10(max(rms, np.finfo(np.float64).tiny))
    loudness = float(np.clip((rms_db + 60.0) / 48.0, 0.0, 1.0))
    clipping = float(np.mean(np.abs(audio) >= 0.999))
    return float(np.clip(voiced_density * 0.7 + loudness * 0.3 - clipping * 2.0, 0.0, 1.0))


def _build_candidates(
    audio: npt.NDArray[np.float32],
    sample_rate: int,
    f0: npt.NDArray[np.floating],
    valid: npt.NDArray[np.bool_],
    frame_times: npt.NDArray[np.floating],
    p10_midi: float,
    median_midi: float,
    p90_midi: float,
) -> list[ReferenceCandidate]:
    voiced_indices = np.flatnonzero(valid)
    if voiced_indices.size == 0:
        return []

    max_gap_frames = max(1, round(MAX_INTERNAL_GAP_SECONDS * sample_rate / DEFAULT_ANALYSIS_CONFIG.hop_length))
    split_points = np.flatnonzero(np.diff(voiced_indices) > max_gap_frames) + 1
    groups = np.split(voiced_indices, split_points)
    low_boundary = (p10_midi + median_midi) / 2.0
    high_boundary = (median_midi + p90_midi) / 2.0
    candidates: list[ReferenceCandidate] = []

    for group in groups:
        group_start = max(0.0, float(frame_times[group[0]]) - 0.08)
        group_end = min(audio.size / sample_rate, float(frame_times[group[-1]]) + 0.08)
        cursor = group_start
        while group_end - cursor >= MIN_CANDIDATE_SECONDS:
            end = min(group_end, cursor + MAX_CANDIDATE_SECONDS)
            frame_mask = (frame_times >= cursor) & (frame_times < end)
            voiced_mask = frame_mask & valid
            frame_count = int(np.sum(frame_mask))
            if frame_count:
                density = float(np.sum(voiced_mask) / frame_count)
                if density >= 0.45:
                    midi = np.asarray(librosa.hz_to_midi(f0[voiced_mask]), dtype=np.float64)
                    pitch = float(np.median(midi))
                    start_sample = round(cursor * sample_rate)
                    end_sample = round(end * sample_rate)
                    segment = audio[start_sample:end_sample]
                    candidates.append(
                        ReferenceCandidate(
                            index=len(candidates),
                            start_seconds=cursor,
                            end_seconds=end,
                            band=_candidate_band(pitch, low_boundary, high_boundary),
                            score=_candidate_score(segment, density),
                            voiced_density=density,
                            median_midi=pitch,
                        )
                    )
            cursor = end
    return candidates


def _select_candidates(candidates: list[ReferenceCandidate]) -> tuple[list[ReferenceSelection], dict[str, float]]:
    selected: list[ReferenceSelection] = []
    allocated = {"low": 0.0, "mid": 0.0, "high": 0.0}
    remaining = REFERENCE_MAX_SECONDS
    ranked = sorted(
        (candidate for candidate in candidates if candidate.band == "mid"),
        key=lambda candidate: (-candidate.score, candidate.start_seconds, candidate.index),
    )

    for candidate in ranked:
        if remaining < MIN_CANDIDATE_SECONDS:
            break
        duration = min(candidate.duration_seconds, remaining)
        if duration < MIN_CANDIDATE_SECONDS:
            continue
        selected.append(
            ReferenceSelection(
                candidate=candidate,
                start_seconds=candidate.start_seconds,
                end_seconds=candidate.start_seconds + duration,
            )
        )
        allocated["mid"] += duration
        remaining -= duration

    selected.sort(key=lambda item: item.start_seconds)
    return selected, allocated


def _crossfade_segments(segments: list[npt.NDArray[np.float32]], sample_rate: int) -> npt.NDArray[np.float32]:
    if not segments:
        return np.asarray([], dtype=np.float32)
    output = segments[0].copy()
    requested_overlap = round(CROSSFADE_SECONDS * sample_rate)
    for segment in segments[1:]:
        overlap = min(requested_overlap, output.size, segment.size)
        if overlap:
            phase = np.linspace(0.0, np.pi / 2.0, overlap, endpoint=True, dtype=np.float32)
            blended = output[-overlap:] * np.cos(phase) + segment[:overlap] * np.sin(phase)
            output = np.concatenate([output[:-overlap], blended, segment[overlap:]])
        else:
            output = np.concatenate([output, segment])
    return np.asarray(output, dtype=np.float32)


def build_smart_reference(
    source_path: str | Path,
    output_path: str | Path,
    *,
    p10_midi: float,
    median_midi: float,
    p90_midi: float,
    pitch_frames: PitchFrames | None = None,
    config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG,
) -> dict[str, object] | None:
    audio, sample_rate = librosa.load(source_path, sr=config.sample_rate, mono=True)
    audio = np.asarray(audio, dtype=np.float32)
    if pitch_frames is None:
        f0, voiced_flag, _ = librosa.pyin(
            audio,
            fmin=float(librosa.note_to_hz(config.fmin_note)),
            fmax=float(librosa.note_to_hz(config.fmax_note)),
            sr=sample_rate,
            frame_length=config.frame_length,
            hop_length=config.hop_length,
        )
        frame_times = librosa.frames_to_time(np.arange(f0.size), sr=sample_rate, hop_length=config.hop_length)
    else:
        f0 = pitch_frames.f0
        voiced_flag = pitch_frames.voiced_flag
        frame_times = pitch_frames.frame_times
    valid = np.asarray(voiced_flag, dtype=bool) & np.isfinite(f0)
    candidates = _build_candidates(audio, sample_rate, f0, valid, frame_times, p10_midi, median_midi, p90_midi)
    selected, allocated = _select_candidates(candidates)
    if not selected:
        return None

    source_ranges: list[dict[str, object]] = []
    segments: list[npt.NDArray[np.float32]] = []
    selected_frame_mask = np.zeros(valid.shape, dtype=bool)
    for selection in selected:
        candidate = selection.candidate
        start = selection.start_seconds
        end = selection.end_seconds
        start_sample = round(start * sample_rate)
        end_sample = round(end * sample_rate)
        segments.append(audio[start_sample:end_sample])
        selected_frame_mask |= (frame_times >= start) & (frame_times < end)
        source_ranges.append(
            {
                "startMs": round(start * 1_000),
                "endMs": round(end * 1_000),
                "band": candidate.band,
                "score": round(candidate.score, 4),
                "voicedDensity": round(candidate.voiced_density, 4),
                "medianMidi": round(candidate.median_midi, 2),
            }
        )

    output = _crossfade_segments(segments, sample_rate)
    max_samples = round(REFERENCE_MAX_SECONDS * sample_rate)
    output = output[:max_samples]
    sf.write(output_path, output, sample_rate, subtype="PCM_16")

    selected_valid = selected_frame_mask & valid
    selected_total = int(np.sum(selected_frame_mask))
    selected_midi = np.asarray(librosa.hz_to_midi(f0[selected_valid]), dtype=np.float64)
    return {
        "algorithm": "voiced-mid-phrase-selection",
        "version": REFERENCE_VERSION,
        "durationMs": round(output.size / sample_rate * 1_000),
        "sourceDurationMs": round(audio.size / sample_rate * 1_000),
        "sourceRanges": source_ranges,
        "bandSeconds": {band: round(seconds, 3) for band, seconds in allocated.items()},
        "voicedDensity": round(float(np.sum(selected_valid) / max(1, selected_total)), 4),
        "pitchCoverageSemitones": round(float(np.percentile(selected_midi, 90) - np.percentile(selected_midi, 10)), 3),
        "crossfadeMs": round(CROSSFADE_SECONDS * 1_000),
        "fallbackReason": None,
    }
