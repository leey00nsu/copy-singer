from dataclasses import dataclass


@dataclass(frozen=True)
class AnalysisConfig:
    sample_rate: int = 22_050
    frame_length: int = 2_048
    hop_length: int = 256
    fmin_note: str = "C2"
    fmax_note: str = "C7"
    min_duration_seconds: float = 8.0
    max_duration_seconds: float = 60.0
    min_rms_db: float = -45.0
    max_clipping_ratio: float = 0.01
    min_voiced_ratio: float = 0.25


DEFAULT_ANALYSIS_CONFIG = AnalysisConfig()

GUIDE_PATTERN = (0, 2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 9, 7, 4, 2, 0)
GUIDE_START_MIDI = {
    "low": 48,
    "medium": 55,
    "high": 60,
}
GUIDE_NOTE_DURATION_SECONDS = 0.75
