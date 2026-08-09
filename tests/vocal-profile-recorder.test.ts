import assert from "node:assert/strict";
import test from "node:test";
import { MAX_VOCAL_PROFILE_RECORDING_MS, recorderExtension, shouldStopRecording } from "../src/shared/lib/audio";

test("vocal profile recording stops at 60 seconds", () => {
  assert.equal(MAX_VOCAL_PROFILE_RECORDING_MS, 60_000);
  assert.equal(shouldStopRecording(59_999), false);
  assert.equal(shouldStopRecording(60_000), true);
  assert.equal(shouldStopRecording(60_250), true);
  assert.equal(shouldStopRecording(Number.NaN), false);
});

test("recorder MIME types keep analyzer-compatible file extensions", () => {
  assert.equal(recorderExtension("audio/webm;codecs=opus"), "webm");
  assert.equal(recorderExtension("audio/webm"), "webm");
  assert.equal(recorderExtension("audio/mp4"), "m4a");
  assert.equal(recorderExtension("audio/aac"), "m4a");
});
