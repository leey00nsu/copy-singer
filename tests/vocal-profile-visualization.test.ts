import assert from "node:assert/strict";
import test from "node:test";
import {
  axisTicks,
  histogramChartData,
  midiAxis,
  midiPosition,
  parseVocalProfileVisualization,
  pitchChartData,
  rangeChartData,
} from "../lib/vocal-profile/visualization";

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
  assert.deepEqual(
    parsed?.histogram.map((bin) => bin.midi),
    [58, 60],
  );
  assert.deepEqual(
    parsed?.track.map((point) => point.timeMs),
    [0, 100],
  );
});

test("rejects missing or oversized visualization descriptors", () => {
  assert.equal(parseVocalProfileVisualization(null), null);
  assert.equal(parseVocalProfileVisualization({}), null);
  assert.equal(
    parseVocalProfileVisualization({
      pitchHistogram: [{ midi: 60, count: 1, ratio: 1 }],
      pitchTrack: Array.from({ length: 721 }, (_, index) => ({ timeMs: index, midi: 60 })),
    }),
    null,
  );
});

test("builds a padded MIDI axis with stable positions and ticks", () => {
  const axis = midiAxis(50.7, 52.1);
  assert.ok(axis.high - axis.low >= 6);
  assert.equal(midiPosition(axis.low, axis.low, axis.high), 0);
  assert.equal(midiPosition(axis.high, axis.low, axis.high), 100);
  assert.deepEqual(axisTicks(48, 55), [48, 49, 50, 51, 52, 53, 54, 55]);
});

test("maps range and histogram values for shadcn Chart", () => {
  assert.deepEqual(rangeChartData({ minMidi: 48, maxMidi: 67, tessituraLowMidi: 52, tessituraHighMidi: 64 }), [
    { key: "observed", label: "전체 관측 음역", range: [48, 67], lowNote: "C3", highNote: "G4" },
    { key: "tessitura", label: "실용 음역", range: [52, 64], lowNote: "E3", highNote: "E4" },
  ]);
  assert.deepEqual(histogramChartData({ histogram: [{ midi: 60, count: 4, ratio: 0.25 }], track: [] }), [
    { midi: 60, count: 4, ratio: 0.25, note: "C4", ratioPercent: 25 },
  ]);
});

test("keeps unvoiced null gaps in Recharts pitch data", () => {
  const data = pitchChartData({
    histogram: [],
    track: [
      { timeMs: 0, midi: 60 },
      { timeMs: 100, midi: null },
      { timeMs: 200, midi: 64 },
    ],
  });
  assert.deepEqual(
    data.map((point) => point.midi),
    [60, null, 64],
  );
  assert.deepEqual(
    data.map((point) => point.note),
    ["C4", null, "E4"],
  );
  assert.deepEqual(
    data.map((point) => point.timeSeconds),
    [0, 0.1, 0.2],
  );
});
