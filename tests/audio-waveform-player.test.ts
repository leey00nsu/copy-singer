import assert from "node:assert/strict";
import test from "node:test";
import { formatPlaybackTime, playbackRangesDuration, playbackRangesElapsed } from "../src/shared/lib/audio";

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

test("audio player reports combined time across disjoint reference ranges", () => {
  const ranges = [
    { startSeconds: 2, endSeconds: 5 },
    { startSeconds: 8, endSeconds: 10.5 },
  ];
  assert.equal(playbackRangesDuration(ranges), 5.5);
  assert.equal(playbackRangesElapsed(ranges, 0, 3.25), 1.25);
  assert.equal(playbackRangesElapsed(ranges, 1, 9), 4);
});
