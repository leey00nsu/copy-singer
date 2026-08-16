from dataclasses import dataclass


@dataclass(frozen=True)
class AnalysisConfig:
    sample_rate: int = 22_050
    frame_length: int = 2_048
    hop_length: int = 256
    fmin_note: str = "C2"
    fmax_note: str = "C7"
    min_duration_seconds: float = 5.0
    max_duration_seconds: float = 60.0
    min_rms_db: float = -45.0
    max_clipping_ratio: float = 0.01
    min_voiced_ratio: float = 0.25


DEFAULT_ANALYSIS_CONFIG = AnalysisConfig()
SONG_ANALYSIS_CONFIG = AnalysisConfig(
    max_duration_seconds=900.0,
    min_voiced_ratio=0.05,
)

GUIDE_PATTERN = (0, 2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 9, 7, 4, 2, 0)
GUIDE_START_MIDI = {
    "low": 48,
    "medium": 55,
    "high": 60,
}
GUIDE_NOTE_DURATION_SECONDS = 0.75

MAX_UPLOAD_BYTES = 25 * 1024 * 1024
UPLOAD_CHUNK_BYTES = 1024 * 1024
MAX_PITCH_TRACK_POINTS = 720
ALLOWED_MIME_TYPES = {
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/x-m4a": ".m4a",
    "audio/webm": ".webm",
}
