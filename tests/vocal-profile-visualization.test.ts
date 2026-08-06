import assert from "node:assert/strict";
import test from "node:test";
import { axisTicks, midiAxis, midiPosition, parseVocalProfileVisualization } from "../lib/vocal-profile/visualization";

test("parses and sorts bounded visualization descriptors", () => {
  const parsed = parseVocalProfileVisualization({
    pitchHistogram: [
      { midi: 60, count: 2, ratio: 0.4 },
      { midi: 58, count: 3, ratio: 0.6 },
    ],
    pitchTrack: [
      { timeMs: 100, midi: null },
      { timeMs: 0, midi: 58.2 },
    ],
  });
  assert.deepEqual(parsed?.histogram.map((bin) => bin.midi), [58, 60]);
  assert.deepEqual(parsed?.track.map((point) => point.timeMs), [0, 100]);
});

test("rejects missing or oversized visualization descriptors", () => {
  assert.equal(parseVocalProfileVisualization(null), null);
  assert.equal(parseVocalProfileVisualization({}), null);
  assert.equal(parseVocalProfileVisualization({
    pitchHistogram: [{ midi: 60, count: 1, ratio: 1 }],
    pitchTrack: Array.from({ length: 721 }, (_, index) => ({ timeMs: index, midi: 60 })),
  }), null);
});

test("builds a padded MIDI axis with stable positions and ticks", () => {
  const axis = midiAxis(50.7, 52.1);
  assert.ok(axis.high - axis.low >= 6);
  assert.equal(midiPosition(axis.low, axis.low, axis.high), 0);
  assert.equal(midiPosition(axis.high, axis.low, axis.high), 100);
  assert.deepEqual(axisTicks(48, 55), [48, 49, 50, 51, 52, 53, 54, 55]);
});
