export const KEY_FIT_SCORING_VERSION = "key-fit-v2";

export const KEY_SHIFT_MIN = -6;
export const KEY_SHIFT_MAX = 6;

export type KeyFitProfile = {
  minMidi: number;
  maxMidi: number;
  p10Midi: number;
  medianMidi: number;
  p90Midi: number;
  tessituraLowMidi: number;
  tessituraHighMidi: number;
  voicedRatio: number;
  pitchStability: number;
  clippingRatio: number;
  analyzer: string;
  analyzerVersion: string;
};

export type KeyFitReasonCode =
  | "ORIGINAL_KEY_BEST"
  | "KEY_SHIFT_IMPROVES_FIT"
  | "HIGH_TESSITURA_OVERLAP"
  | "HIGH_RANGE_BURDEN"
  | "LOW_RANGE_BURDEN"
  | "HIGH_NOTES_REDUCED"
  | "LOW_NOTES_REDUCED"
  | "LOW_PROFILE_CONFIDENCE";

export type KeyFitContributions = {
  overlap: number;
  tessituraFit: number;
  extremeFit: number;
  confidence: number;
};

export type KeyFitScoreBreakdown = {
  shift: number;
  tessituraOverlapRatio: number;
  highTessituraExcess: number;
  lowTessituraExcess: number;
  highExtremeExcess: number;
  lowExtremeExcess: number;
  tessituraFit: number;
  extremeFit: number;
  confidence: number;
  contributions: KeyFitContributions;
  rawScore: number;
  score: number;
};

export type KeyFitScoreResult = {
  scoringVersion: typeof KEY_FIT_SCORING_VERSION;
  originalKeyScore: number;
  adjustedScore: number;
  recommendedShift: number;
  confidence: number;
  reasonCodes: KeyFitReasonCode[];
  original: KeyFitScoreBreakdown;
  recommended: KeyFitScoreBreakdown;
};

export type KeyFitErrorCode = "INVALID_PROFILE" | "INCOMPATIBLE_ANALYZER" | "SONG_PROFILE_NOT_READY";

export class KeyFitScoringError extends Error {
  readonly code: KeyFitErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: KeyFitErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "KeyFitScoringError";
    this.code = code;
    this.details = details;
  }
}
