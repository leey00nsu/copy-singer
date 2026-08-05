import assert from "node:assert/strict";
import test from "node:test";

import {
  KEY_FIT_SCORING_VERSION,
  KeyFitScoringError,
  type KeyFitProfile,
} from "../lib/key-fit/contract";
import {
  calculateProfileConfidence,
  scoreKeyFitCandidate,
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

test("scores a fully overlapping original key with an explainable breakdown", () => {
  const result = scoreKeyFitCandidate(USER_PROFILE_FIXTURE, USER_PROFILE_FIXTURE, 0);

  assert.equal(result.tessituraOverlapRatio, 1);
  assert.equal(result.tessituraFit, 1);
  assert.equal(result.extremeFit, 1);
  assert.equal(result.confidence, 0.88);
  assert.deepEqual(result.contributions, {
    overlap: 55,
    tessituraFit: 25,
    extremeFit: 15,
    confidence: 4.4,
  });
  assert.equal(result.score, 99.4);
});

test("high and low burden cannot improve a candidate score", () => {
  const centered = scoreKeyFitCandidate(USER_PROFILE_FIXTURE, USER_PROFILE_FIXTURE, 0);
  const raised = scoreKeyFitCandidate(USER_PROFILE_FIXTURE, USER_PROFILE_FIXTURE, 4);
  const lowered = scoreKeyFitCandidate(USER_PROFILE_FIXTURE, USER_PROFILE_FIXTURE, -4);

  assert.equal(raised.highTessituraExcess, 4);
  assert.equal(raised.highExtremeExcess, 4);
  assert.equal(lowered.lowTessituraExcess, 4);
  assert.equal(lowered.lowExtremeExcess, 4);
  assert.ok(raised.score < centered.score);
  assert.ok(lowered.score < centered.score);
});

test("profile confidence combines stability and voiced ratio within the unit interval", () => {
  assert.equal(calculateProfileConfidence(USER_PROFILE_FIXTURE), 0.88);
  assert.equal(
    calculateProfileConfidence({
      ...USER_PROFILE_FIXTURE,
      voicedRatio: 0.25,
      pitchStability: 0,
    }),
    0,
  );
  assert.equal(
    calculateProfileConfidence({
      ...USER_PROFILE_FIXTURE,
      voicedRatio: 1,
      pitchStability: 1,
    }),
    1,
  );
});

test("candidate scoring rejects fractional shifts", () => {
  assert.throws(
    () => scoreKeyFitCandidate(USER_PROFILE_FIXTURE, SONG_PROFILE_FIXTURE, 0.5),
    (error: unknown) => error instanceof KeyFitScoringError && error.code === "INVALID_PROFILE",
  );
});
