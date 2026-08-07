import assert from "node:assert/strict";
import test from "node:test";
import { referenceBandSegments } from "../lib/vocal-profile/reference-segments";

test("groups smart reference source ranges into ordered low, mid, and high controls", () => {
  const segments = referenceBandSegments({
    synthesisReference: {
      sourceRanges: [
        { startMs: 8_000, endMs: 10_000, band: "high" },
        { startMs: 1_000, endMs: 3_000, band: "low" },
        { startMs: 5_000, endMs: 6_500, band: "mid" },
        { startMs: 3_500, endMs: 4_000, band: "low" },
      ],
    },
  });
  assert.deepEqual(segments.map((segment) => segment.label), ["저음 영역", "중앙 영역", "고음 영역"]);
  assert.deepEqual(segments[0]?.ranges, [
    { startSeconds: 1, endSeconds: 3 },
    { startSeconds: 3.5, endSeconds: 4 },
  ]);
});

test("hides controls for legacy or malformed descriptors", () => {
  assert.deepEqual(referenceBandSegments(null), []);
  assert.deepEqual(referenceBandSegments({ synthesisReference: { sourceRanges: [{ band: "low" }] } }), []);
});
