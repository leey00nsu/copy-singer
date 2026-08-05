import assert from "node:assert/strict";
import test from "node:test";

import {
  KEY_FIT_SCORING_VERSION,
  KeyFitScoringError,
  type KeyFitProfile,
} from "../lib/key-fit/contract";
import {
  validateCompatibleKeyFitProfiles,
  validateKeyFitProfile,
} from "../lib/key-fit/scorer";

export const USER_PROFILE_FIXTURE: KeyFitProfile = {
  minMidi: 48,
  maxMidi: 72,
  p10Midi: 52,
  medianMidi: 60,
  p90Midi: 68,
  tessituraLowMidi: 52,
  tessituraHighMidi: 68,
  voicedRatio: 0.72,
  pitchStability: 0.84,
  clippingRatio: 0.001,
  analyzer: "librosa-pyin",
  analyzerVersion: "0.11.0",
};

export const SONG_PROFILE_FIXTURE: KeyFitProfile = {
  ...USER_PROFILE_FIXTURE,
  minMidi: 50,
  maxMidi: 74,
  p10Midi: 54,
  medianMidi: 62,
  p90Midi: 70,
  tessituraLowMidi: 54,
  tessituraHighMidi: 70,
};

test("exposes a stable key-fit scoring version", () => {
  assert.equal(KEY_FIT_SCORING_VERSION, "key-fit-v1");
});

test("accepts ordered compatible user and song profiles", () => {
  assert.doesNotThrow(() => validateCompatibleKeyFitProfiles(USER_PROFILE_FIXTURE, SONG_PROFILE_FIXTURE));
});

test("rejects non-finite and out-of-range profile metrics", () => {
  assert.throws(
    () => validateKeyFitProfile({ ...USER_PROFILE_FIXTURE, minMidi: Number.NaN }, "user"),
    (error: unknown) => error instanceof KeyFitScoringError && error.code === "INVALID_PROFILE",
  );
  assert.throws(
    () => validateKeyFitProfile({ ...USER_PROFILE_FIXTURE, voicedRatio: 1.1 }, "user"),
    (error: unknown) => error instanceof KeyFitScoringError && error.code === "INVALID_PROFILE",
  );
});

test("rejects reversed pitch and empty tessitura intervals", () => {
  assert.throws(
    () => validateKeyFitProfile({ ...USER_PROFILE_FIXTURE, p10Midi: 69 }, "user"),
    (error: unknown) => error instanceof KeyFitScoringError && error.code === "INVALID_PROFILE",
  );
  assert.throws(
    () =>
      validateKeyFitProfile(
        { ...USER_PROFILE_FIXTURE, tessituraLowMidi: 60, tessituraHighMidi: 60 },
        "user",
      ),
    (error: unknown) => error instanceof KeyFitScoringError && error.code === "INVALID_PROFILE",
  );
});

test("rejects incompatible analyzer contracts with stable details", () => {
  assert.throws(
    () =>
      validateCompatibleKeyFitProfiles(USER_PROFILE_FIXTURE, {
        ...SONG_PROFILE_FIXTURE,
        analyzerVersion: "0.12.0",
      }),
    (error: unknown) => {
      assert.ok(error instanceof KeyFitScoringError);
      assert.equal(error.code, "INCOMPATIBLE_ANALYZER");
      assert.equal(error.details.songAnalyzerVersion, "0.12.0");
      return true;
    },
  );
});
