import assert from "node:assert/strict";
import test from "node:test";
import {
  boundedProfileUploadDuration,
  findFirstAudibleFrame,
  PROFILE_UPLOAD_SAMPLE_RATE,
} from "../src/shared/lib/audio";

test("finds the first complete audible 50ms window", () => {
  const samples = new Float32Array(PROFILE_UPLOAD_SAMPLE_RATE);
  samples.fill(0.01, 4_000, 4_800);
  assert.equal(findFirstAudibleFrame([samples], PROFILE_UPLOAD_SAMPLE_RATE), 4_000);
});

test("returns the start when no audible window exists", () => {
  assert.equal(findFirstAudibleFrame([new Float32Array(8_000)], PROFILE_UPLOAD_SAMPLE_RATE), 0);
});

test("reserves codec padding headroom below the analyzer 60 second boundary", () => {
  assert.equal(boundedProfileUploadDuration(225), 59.75);
  assert.equal(boundedProfileUploadDuration(60), 59.75);
  assert.equal(boundedProfileUploadDuration(12.5), 12.5);
});
