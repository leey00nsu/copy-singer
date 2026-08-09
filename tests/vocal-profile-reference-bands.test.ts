import assert from "node:assert/strict";
import test from "node:test";
import { referenceBandSegments } from "../src/entities/vocal-profile";

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
  assert.deepEqual(
    segments.map((segment) => segment.label),
    ["저음 영역", "중앙 영역", "고음 영역"],
  );
  assert.deepEqual(segments[0]?.ranges, [
    { startSeconds: 1, endSeconds: 3 },
    { startSeconds: 3.5, endSeconds: 4 },
  ]);
});

test("prefers analysisReferenceBands over mid-only synthesis source ranges", () => {
  const segments = referenceBandSegments({
    analysisReferenceBands: {
      version: "analysis-reference-bands-v1",
      sourceRanges: [
        { startMs: 1_000, endMs: 2_000, band: "low" },
        { startMs: 3_000, endMs: 4_000, band: "mid" },
        { startMs: 5_000, endMs: 6_000, band: "high" },
      ],
    },
    synthesisReference: {
      version: "smart-reference-mid-v1",
      sourceRanges: [{ startMs: 3_000, endMs: 4_000, band: "mid" }],
    },
  });

  assert.deepEqual(
    segments.map((segment) => segment.id),
    ["low", "mid", "high"],
  );
});

test("hides controls for legacy or malformed descriptors", () => {
  assert.deepEqual(referenceBandSegments(null), []);
  assert.deepEqual(referenceBandSegments({ synthesisReference: { sourceRanges: [{ band: "low" }] } }), []);
});
