import assert from "node:assert/strict";
import test from "node:test";

import { catalogReadiness, songAnalysisMetricsSchema } from "../src/entities/song-catalog/index.model";

const readySong = {
  lifecycleStatus: "ACTIVE" as const,
  activeSourceId: "source-1",
  currentAnalysisId: "analysis-1",
  targetAssetId: "target-1",
  activeSource: { id: "source-1", status: "READY" as const, sourceVideoId: "HdTUQhHHJEg" },
  currentAnalysis: {
    id: "analysis-1",
    sourceId: "source-1",
    status: "READY" as const,
    cleanupConfirmed: true,
  },
  targetAsset: { id: "target-1", sourceId: "source-1", status: "READY" as const },
  catalogEntry: { status: "PUBLISHED" as const },
};

test("a published song is ready only when source, analysis, and target revisions match", () => {
  assert.deepEqual(catalogReadiness(readySong), { ready: true, reasons: [] });

  assert.deepEqual(
    catalogReadiness({
      ...readySong,
      currentAnalysis: { ...readySong.currentAnalysis, sourceId: "source-old" },
      targetAsset: { ...readySong.targetAsset, sourceId: "source-old" },
    }),
    {
      ready: false,
      reasons: ["ANALYSIS_SOURCE_MISMATCH", "TARGET_SOURCE_MISMATCH"],
    },
  );
});

test("draft and incomplete songs expose deterministic readiness reasons", () => {
  assert.deepEqual(
    catalogReadiness({
      lifecycleStatus: "DRAFT",
      activeSourceId: null,
      currentAnalysisId: null,
      targetAssetId: null,
      activeSource: null,
      currentAnalysis: null,
      targetAsset: null,
      catalogEntry: { status: "DRAFT" },
    }),
    {
      ready: false,
      reasons: [
        "SONG_NOT_ACTIVE",
        "SOURCE_NOT_READY",
        "ANALYSIS_NOT_READY",
        "TARGET_NOT_READY",
        "CATALOG_ENTRY_NOT_PUBLISHED",
      ],
    },
  );
});

test("song analysis metrics reject non-finite values and empty analyzer identity", () => {
  const metrics = {
    minMidi: 40,
    maxMidi: 72,
    p10Midi: 48,
    medianMidi: 60,
    p90Midi: 69,
    tessituraLowMidi: 50,
    tessituraHighMidi: 67,
    voicedRatio: 0.8,
    pitchStability: 0.9,
    clippingRatio: 0,
    rmsDb: -18,
    analyzer: "librosa-pyin",
    analyzerVersion: "0.11.0",
  };

  assert.equal(songAnalysisMetricsSchema.safeParse(metrics).success, true);
  assert.equal(songAnalysisMetricsSchema.safeParse({ ...metrics, maxMidi: Number.NaN }).success, false);
  assert.equal(songAnalysisMetricsSchema.safeParse({ ...metrics, analyzer: " " }).success, false);
});
