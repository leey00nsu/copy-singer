import assert from "node:assert/strict";
import test from "node:test";
import { isLongProfileAudio, MAX_PROFILE_AUDIO_SECONDS } from "../lib/vocal-profile/audio-file";

test("only durations above 60 seconds require trim consent", () => {
  assert.equal(MAX_PROFILE_AUDIO_SECONDS, 60);
  assert.equal(isLongProfileAudio(59.999), false);
  assert.equal(isLongProfileAudio(60), false);
  assert.equal(isLongProfileAudio(60.001), true);
  assert.equal(isLongProfileAudio(Number.NaN), false);
  assert.equal(isLongProfileAudio(Number.POSITIVE_INFINITY), false);
});
