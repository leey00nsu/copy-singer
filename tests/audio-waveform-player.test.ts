import assert from "node:assert/strict";
import test from "node:test";
import { formatPlaybackTime } from "../lib/audio/playback";

test("audio player formats finite media times", () => {
  assert.equal(formatPlaybackTime(0), "0:00");
  assert.equal(formatPlaybackTime(65.9), "1:05");
  assert.equal(formatPlaybackTime(3_661), "61:01");
});

test("audio player guards unavailable media times", () => {
  assert.equal(formatPlaybackTime(Number.NaN), "0:00");
  assert.equal(formatPlaybackTime(Number.POSITIVE_INFINITY), "0:00");
  assert.equal(formatPlaybackTime(-1), "0:00");
});
