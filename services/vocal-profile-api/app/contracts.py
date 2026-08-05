from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    reasonCode: str
    detail: str
    retryable: bool = True


class AnalyzerResponse(BaseModel):
    recordingId: str
    storagePath: str
    mimeType: str
    sizeBytes: int
    expiresAt: str
    durationMs: int
    sampleRate: int
    minMidi: float
    maxMidi: float
    p10Midi: float
    medianMidi: float
    p90Midi: float
    tessituraLowMidi: float
    tessituraHighMidi: float
    voicedRatio: float
    pitchStability: float
    clippingRatio: float
    rmsDb: float
    analyzer: str
    analyzerVersion: str
    descriptors: dict[str, Any] = Field(default_factory=dict)


class DeleteResponse(BaseModel):
    status: str
    recordingId: str


class SongAnalysisRequest(BaseModel):
    sourceUrl: str
    expectedVideoId: str = Field(pattern=r"^[A-Za-z0-9_-]{11}$")


class SongAnalysisResponse(BaseModel):
    durationMs: int
    sampleRate: int
    sourceSizeBytes: int
    minMidi: float
    maxMidi: float
    p10Midi: float
    medianMidi: float
    p90Midi: float
    tessituraLowMidi: float
    tessituraHighMidi: float
    voicedRatio: float
    pitchStability: float
    clippingRatio: float
    rmsDb: float
    analyzer: str
    analyzerVersion: str
    descriptors: dict[str, Any] = Field(default_factory=dict)
    ytDlpVersion: str
    separator: str
    separatorVersion: str
    separatorModel: str
    cleanupConfirmed: bool
