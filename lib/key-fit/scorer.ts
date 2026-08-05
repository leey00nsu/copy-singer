import { KeyFitScoringError, type KeyFitProfile } from "./contract";

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
