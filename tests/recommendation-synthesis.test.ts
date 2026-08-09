import assert from "node:assert/strict";
import test from "node:test";

import {
  appendSynthesisAttempt,
  canTransitionSynthesis,
  parseSynthesisAttempts,
  SYNTHESIS_PRESET,
  toPublicSynthesisStatus,
} from "../src/entities/recommendation";

test("synthesis lifecycle only permits forward transitions and explicit retry", () => {
  assert.equal(canTransitionSynthesis(null, "PREPARING"), true);
  assert.equal(canTransitionSynthesis(null, "QUEUED"), false);
  assert.equal(canTransitionSynthesis("PREPARING", "QUEUED"), true);
  assert.equal(canTransitionSynthesis("QUEUED", "PROCESSING"), true);
  assert.equal(canTransitionSynthesis("PROCESSING", "SUCCEEDED"), true);
  assert.equal(canTransitionSynthesis("SUCCEEDED", "PROCESSING"), false);
  assert.equal(canTransitionSynthesis("FAILED", "PREPARING"), true);
  assert.equal(canTransitionSynthesis("FAILED", "QUEUED"), false);
});

test("on-demand recommendation synthesis enables automatic pitch shifting", () => {
  assert.equal(SYNTHESIS_PRESET.auto_pitch_shift, true);
  assert.equal(SYNTHESIS_PRESET.pitch_shift, 0);
  assert.equal(SYNTHESIS_PRESET.target_vocal_separation, true);
  assert.equal(SYNTHESIS_PRESET.auto_mix_accompaniment, true);
});

test("stored statuses serialize to the public lowercase contract", () => {
  assert.equal(toPublicSynthesisStatus("PREPARING"), "preparing");
  assert.equal(toPublicSynthesisStatus("SUCCEEDED"), "succeeded");
});

test("attempt history ignores invalid data and appends a preserved failure", () => {
  assert.deepEqual(parseSynthesisAttempts({ invalid: true }), []);
  const history = appendSynthesisAttempt([], {
    jobId: "job-1",
    status: "failed",
    errorCode: "MODAL_FAILED",
    errorDetail: "safe error",
    startedAt: "2026-08-06T00:00:00.000Z",
    completedAt: "2026-08-06T00:01:00.000Z",
  });
  assert.equal(history.length, 1);
  assert.equal(history[0]?.jobId, "job-1");
});
