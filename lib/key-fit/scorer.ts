import {
  KeyFitScoringError,
  type KeyFitProfile,
  type KeyFitScoreBreakdown,
} from "./contract";

const SCORE_WEIGHTS = {
  overlap: 55,
  tessituraFit: 25,
  extremeFit: 15,
  confidence: 5,
} as const;

const EXCESS_PENALTY_CAP_SEMITONES = 12;

const NUMERIC_FIELDS = [
  "minMidi",
  "maxMidi",
  "p10Midi",
  "medianMidi",
  "p90Midi",
  "tessituraLowMidi",
  "tessituraHighMidi",
  "voicedRatio",
  "pitchStability",
  "clippingRatio",
] as const satisfies readonly (keyof KeyFitProfile)[];

const UNIT_INTERVAL_FIELDS = [
  "voicedRatio",
  "pitchStability",
  "clippingRatio",
] as const satisfies readonly (keyof KeyFitProfile)[];

function invalidProfile(role: "user" | "song", message: string, details: Record<string, unknown> = {}): never {
  throw new KeyFitScoringError("INVALID_PROFILE", `${role} profile ${message}`, {
    role,
    ...details,
  });
}

export function validateKeyFitProfile(profile: KeyFitProfile, role: "user" | "song"): void {
  if (!profile || typeof profile !== "object") {
    invalidProfile(role, "must be an object.");
  }

  for (const field of NUMERIC_FIELDS) {
    if (!Number.isFinite(profile[field])) {
      invalidProfile(role, `contains an invalid ${field}.`, { field, value: profile[field] });
    }
  }

  for (const field of UNIT_INTERVAL_FIELDS) {
    if (profile[field] < 0 || profile[field] > 1) {
      invalidProfile(role, `${field} must be between 0 and 1.`, { field, value: profile[field] });
    }
  }

  if (
    profile.minMidi > profile.p10Midi ||
    profile.p10Midi > profile.medianMidi ||
    profile.medianMidi > profile.p90Midi ||
    profile.p90Midi > profile.maxMidi
  ) {
    invalidProfile(role, "pitch percentiles must be ordered from minMidi to maxMidi.");
  }

  if (
    profile.minMidi > profile.tessituraLowMidi ||
    profile.tessituraLowMidi > profile.tessituraHighMidi ||
    profile.tessituraHighMidi > profile.maxMidi ||
    profile.tessituraLowMidi === profile.tessituraHighMidi
  ) {
    invalidProfile(role, "tessitura must be a non-empty interval within minMidi and maxMidi.");
  }

  if (typeof profile.analyzer !== "string" || profile.analyzer.trim().length === 0) {
    invalidProfile(role, "must include an analyzer name.");
  }
  if (typeof profile.analyzerVersion !== "string" || profile.analyzerVersion.trim().length === 0) {
    invalidProfile(role, "must include an analyzer version.");
  }
}

export function validateCompatibleKeyFitProfiles(user: KeyFitProfile, song: KeyFitProfile): void {
  validateKeyFitProfile(user, "user");
  validateKeyFitProfile(song, "song");

  if (user.analyzer !== song.analyzer || user.analyzerVersion !== song.analyzerVersion) {
    throw new KeyFitScoringError(
      "INCOMPATIBLE_ANALYZER",
      "User and song profiles must use the same analyzer contract.",
      {
        userAnalyzer: user.analyzer,
        userAnalyzerVersion: user.analyzerVersion,
        songAnalyzer: song.analyzer,
        songAnalyzerVersion: song.analyzerVersion,
      },
    );
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function intervalOverlapRatio(
  firstLow: number,
  firstHigh: number,
  secondLow: number,
  secondHigh: number,
): number {
  const overlap = Math.max(0, Math.min(firstHigh, secondHigh) - Math.max(firstLow, secondLow));
  return clamp(overlap / (secondHigh - secondLow), 0, 1);
}

export function calculateProfileConfidence(user: KeyFitProfile): number {
  validateKeyFitProfile(user, "user");
  const voicedConfidence = clamp((user.voicedRatio - 0.25) / 0.5, 0, 1);
  return clamp(0.6 * user.pitchStability + 0.4 * voicedConfidence, 0, 1);
}

export function scoreKeyFitCandidate(
  user: KeyFitProfile,
  song: KeyFitProfile,
  shift: number,
): KeyFitScoreBreakdown {
  validateCompatibleKeyFitProfiles(user, song);
  if (!Number.isInteger(shift)) {
    throw new KeyFitScoringError("INVALID_PROFILE", "Key shift must be an integer semitone value.", {
      shift,
    });
  }

  const shiftedTessituraLow = song.tessituraLowMidi + shift;
  const shiftedTessituraHigh = song.tessituraHighMidi + shift;
  const shiftedMinimum = song.minMidi + shift;
  const shiftedMaximum = song.maxMidi + shift;

  const tessituraOverlapRatio = intervalOverlapRatio(
    user.tessituraLowMidi,
    user.tessituraHighMidi,
    shiftedTessituraLow,
    shiftedTessituraHigh,
  );
  const highTessituraExcess = Math.max(0, shiftedTessituraHigh - user.tessituraHighMidi);
  const lowTessituraExcess = Math.max(0, user.tessituraLowMidi - shiftedTessituraLow);
  const highExtremeExcess = Math.max(0, shiftedMaximum - user.maxMidi);
  const lowExtremeExcess = Math.max(0, user.minMidi - shiftedMinimum);
  const tessituraFit = 1 - clamp(
    (highTessituraExcess + lowTessituraExcess) / EXCESS_PENALTY_CAP_SEMITONES,
    0,
    1,
  );
  const extremeFit = 1 - clamp(
    (highExtremeExcess + lowExtremeExcess) / EXCESS_PENALTY_CAP_SEMITONES,
    0,
    1,
  );
  const confidence = calculateProfileConfidence(user);
  const rawContributions = {
    overlap: SCORE_WEIGHTS.overlap * tessituraOverlapRatio,
    tessituraFit: SCORE_WEIGHTS.tessituraFit * tessituraFit,
    extremeFit: SCORE_WEIGHTS.extremeFit * extremeFit,
    confidence: SCORE_WEIGHTS.confidence * confidence,
  };
  const rawScore = clamp(
    rawContributions.overlap +
      rawContributions.tessituraFit +
      rawContributions.extremeFit +
      rawContributions.confidence,
    0,
    100,
  );

  return {
    shift,
    tessituraOverlapRatio: round(tessituraOverlapRatio, 4),
    highTessituraExcess: round(highTessituraExcess, 4),
    lowTessituraExcess: round(lowTessituraExcess, 4),
    highExtremeExcess: round(highExtremeExcess, 4),
    lowExtremeExcess: round(lowExtremeExcess, 4),
    tessituraFit: round(tessituraFit, 4),
    extremeFit: round(extremeFit, 4),
    confidence: round(confidence, 4),
    contributions: {
      overlap: round(rawContributions.overlap, 4),
      tessituraFit: round(rawContributions.tessituraFit, 4),
      extremeFit: round(rawContributions.extremeFit, 4),
      confidence: round(rawContributions.confidence, 4),
    },
    rawScore,
    score: round(rawScore, 2),
  };
}
