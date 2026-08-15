import assert from "node:assert/strict";
import test from "node:test";
import type { KeyFitProfile } from "../src/entities/recommendation/index.model";
import {
  type CatalogKeyFitResult,
  calculateRecommendationSelectionScore,
  formatRecommendationReasons,
  formatRecommendedShift,
  RecommendationError,
  type RecommendationRunResponse,
  rankRecommendations,
  scoreCatalogKeyFits,
  selectRecommendationHandoff,
} from "../src/entities/recommendation/index.model";
import type { PublishedCatalogRow } from "../src/entities/song-catalog/index.server";
import { buildRankedDatabaseRecommendations } from "../src/features/create-recommendation/index.data.server";
import { SYNTHETIC_SONG_CATALOG } from "./fixtures/synthetic-song-catalog";

const USER_PROFILE_FIXTURE: KeyFitProfile = {
  minMidi: 48,
  maxMidi: 72,
  p10Midi: 52,
  medianMidi: 60,
  p90Midi: 68,
  tessituraLowMidi: 52,
  tessituraHighMidi: 68,
  voicedRatio: 0.72,
  pitchStability: 0.84,
  clippingRatio: 0.001,
  analyzer: "librosa-pyin",
  analyzerVersion: "0.11.0",
};

const artifact = SYNTHETIC_SONG_CATALOG;

function candidate(
  catalogOrder: number,
  adjustedScore: number,
  originalKeyScore: number,
  recommendedShift: number,
): CatalogKeyFitResult {
  const scored = scoreCatalogKeyFits(USER_PROFILE_FIXTURE, artifact)[0];
  return {
    ...scored,
    catalogOrder,
    title: `Song ${catalogOrder}`,
    adjustedScore,
    originalKeyScore,
    recommendedShift,
  };
}

test("ranks every scored song with every documented tie-break", () => {
  const ranked = rankRecommendations([
    candidate(5, 90, 80, -2),
    candidate(4, 90, 81, -4),
    candidate(3, 90, 81, 2),
    candidate(2, 90, 81, -2),
    candidate(1, 89, 99, 0),
  ]);

  assert.equal(ranked.length, 5);
  assert.deepEqual(
    ranked.map(({ catalogOrder, rank }) => [rank, catalogOrder]),
    [
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 5],
      [5, 4],
    ],
  );
  assert.deepEqual(
    ranked.map((item) => item.selectionScore),
    [95.5, 81.15, 81.15, 80.5, 72.15],
  );
});

test("selection score prioritizes original pitch and applies stepped shift penalties", () => {
  assert.equal(calculateRecommendationSelectionScore(candidate(1, 100, 50, 0)), 67.5);
  assert.equal(calculateRecommendationSelectionScore(candidate(1, 100, 50, 4)), 55.5);
  assert.throws(
    () => calculateRecommendationSelectionScore(candidate(1, 100, 50, 7)),
    (error: unknown) => error instanceof RecommendationError && error.code === "CATALOG_NOT_READY",
  );
});

test("does not mutate candidates and produces a deterministic full artifact ranking", () => {
  const scored = scoreCatalogKeyFits(USER_PROFILE_FIXTURE, artifact);
  const before = JSON.stringify(scored);
  const first = rankRecommendations(scored);
  const second = rankRecommendations(scored);

  assert.equal(scored.length, 100);
  assert.equal(JSON.stringify(scored), before);
  assert.deepEqual(first, second);
  assert.equal(first.length, 100);
  assert.deepEqual(
    first.map((item) => item.rank),
    Array.from({ length: 100 }, (_, index) => index + 1),
  );
});

test("stored profile fixtures get distinct deterministic rank-one results", () => {
  const highProfile: KeyFitProfile = {
    minMidi: 54.6,
    maxMidi: 70.7,
    p10Midi: 55.2,
    medianMidi: 60,
    p90Midi: 67.2,
    tessituraLowMidi: 55.2,
    tessituraHighMidi: 67.2,
    voicedRatio: 0.9501,
    pitchStability: 1,
    clippingRatio: 0,
    analyzer: "librosa-pyin",
    analyzerVersion: "0.11.0",
  };
  const broadProfile: KeyFitProfile = {
    minMidi: 39.978,
    maxMidi: 63.902,
    p10Midi: 50.19,
    medianMidi: 57,
    p90Midi: 62.7,
    tessituraLowMidi: 50.19,
    tessituraHighMidi: 62.7,
    voicedRatio: 0.4644,
    pitchStability: 0.8825,
    clippingRatio: 0,
    analyzer: "librosa-pyin",
    analyzerVersion: "0.11.0",
  };

  const highRanked = rankRecommendations(scoreCatalogKeyFits(highProfile, artifact));
  const broadRanked = rankRecommendations(scoreCatalogKeyFits(broadProfile, artifact));
  assert.equal(highRanked.length, 100);
  assert.equal(broadRanked.length, 100);
  assert.notEqual(highRanked[0]!.title, broadRanked[0]!.title);
  const repeated = rankRecommendations(scoreCatalogKeyFits(highProfile, artifact));
  assert.deepEqual(
    repeated.map((item) => item.title),
    highRanked.map((item) => item.title),
  );
});

test("rejects empty and duplicate ranking inputs as an unready catalog", () => {
  assert.throws(
    () => rankRecommendations([]),
    (error: unknown) => error instanceof RecommendationError && error.code === "CATALOG_NOT_READY",
  );
  assert.throws(
    () => rankRecommendations([candidate(1, 90, 80, 0), candidate(1, 89, 79, 0), candidate(3, 88, 78, 0)]),
    (error: unknown) => error instanceof RecommendationError && error.code === "CATALOG_NOT_READY",
  );
});

test("formats signed karaoke keys and evidence-backed Korean reasons", () => {
  const result = scoreCatalogKeyFits(USER_PROFILE_FIXTURE, artifact).find((item) =>
    item.reasonCodes.includes("KEY_SHIFT_IMPROVES_FIT"),
  );
  assert.ok(result);

  assert.equal(formatRecommendedShift(0), "원키");
  assert.equal(formatRecommendedShift(2), "+2키");
  assert.equal(formatRecommendedShift(-3), "-3키");

  const reasons = formatRecommendationReasons(result);
  assert.equal(reasons.length, result.reasonCodes.length);
  assert.ok(reasons.every((reason) => reason.endsWith(".")));
  assert.ok(reasons.some((reason) => reason.includes("음역 적합도 점수")));
});

test("low-confidence explanations recommend a longer recording", () => {
  const result = scoreCatalogKeyFits({ ...USER_PROFILE_FIXTURE, voicedRatio: 0.25, pitchStability: 0.2 }, artifact)[0];
  assert.ok(result.reasonCodes.includes("LOW_PROFILE_CONFIDENCE"));
  assert.ok(formatRecommendationReasons(result).some((reason) => reason.includes("더 긴 소절")));
});

function publishedRows(count = artifact.songs.length): PublishedCatalogRow[] {
  return artifact.songs.slice(0, count).map((song, index) => {
    assert.ok(song.profile);
    const sourceId = `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    const analysisId = `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    const targetAssetId = `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    return {
      position: song.catalogOrder,
      song: {
        id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        title: song.title,
        artist: song.artist,
        originalKey: null,
        activeSourceId: sourceId,
        currentAnalysisId: analysisId,
        targetAssetId,
        activeSource: {
          id: sourceId,
          sourceUrl: song.sourceUrl,
          sourceVideoId: song.sourceVideoId,
          sourceLabel: song.sourceLabel,
          status: "READY",
        },
        currentAnalysis: {
          id: analysisId,
          sourceId,
          status: "READY",
          cleanupConfirmed: true,
          minMidi: song.profile.minMidi,
          maxMidi: song.profile.maxMidi,
          p10Midi: song.profile.p10Midi,
          medianMidi: song.profile.medianMidi,
          p90Midi: song.profile.p90Midi,
          tessituraLowMidi: song.profile.tessituraLowMidi,
          tessituraHighMidi: song.profile.tessituraHighMidi,
          voicedRatio: song.profile.voicedRatio,
          pitchStability: song.profile.pitchStability,
          clippingRatio: song.profile.clippingRatio,
          rmsDb: song.profile.rmsDb,
          analyzer: song.profile.analyzer,
          analyzerVersion: song.profile.analyzerVersion,
        },
        targetAsset: { id: targetAssetId, sourceId, status: "READY" },
      },
    };
  });
}

test("ranks any non-empty published database catalog without a fixed size contract", () => {
  const ranked = buildRankedDatabaseRecommendations(USER_PROFILE_FIXTURE, publishedRows(7));
  assert.equal(ranked.length, 7);
  assert.deepEqual(
    ranked.map((item) => item.rank),
    Array.from({ length: 7 }, (_, index) => index + 1),
  );
  assert.ok(ranked.every((item) => item.songId.length === 36));
  assert.ok(ranked.every((item) => item.songAnalysisId.length === 36));
});

test("rejects mismatched active database revisions before scoring or persistence", () => {
  const rows = publishedRows(10);
  rows[8] = {
    ...rows[8],
    song: {
      ...rows[8]!.song,
      currentAnalysis: { ...rows[8]!.song.currentAnalysis!, sourceId: "mismatched-source" },
    },
  };
  assert.throws(
    () => buildRankedDatabaseRecommendations(USER_PROFILE_FIXTURE, rows),
    (error: unknown) => error instanceof RecommendationError && error.code === "CATALOG_NOT_READY",
  );
});

test("selects a handoff only when the item belongs to the calculated result", () => {
  const scored = scoreCatalogKeyFits(USER_PROFILE_FIXTURE, artifact)[0]!;
  const item = {
    id: "item-1",
    songAnalysisId: "analysis-1",
    targetAssetId: "target-1",
    rank: 1,
    songId: "song-1",
    catalogOrder: 1,
    title: "Song",
    artist: "Artist",
    sourceUrl: "https://www.youtube.com/watch?v=NbKH4iZqq1Y",
    sourceVideoId: "NbKH4iZqq1Y",
    originalKey: null,
    songProfile: null,
    originalKeyScore: 80,
    adjustedScore: 95,
    selectionScore: 82,
    recommendedShift: -2,
    reasonCodes: [],
    reasons: [],
    metrics: { confidence: 0.8, selectionScore: 82, original: scored.original, recommended: scored.recommended },
    synthesis: {
      status: "not_started" as const,
      jobId: null,
      error: null,
      startedAt: null,
      updatedAt: null,
      completedAt: null,
      expiresAt: null,
      attemptCount: 0,
      audioUrl: null,
    },
  };
  const run: RecommendationRunResponse = {
    id: "run-1",
    userVocalProfileId: "profile-1",
    catalogId: "catalog-1",
    catalogRevision: 1,
    scoringVersion: "key-fit-v1",
    calculatedAt: "2026-08-06T00:00:00.000Z",
    profileConfidence: 0.8,
    lowConfidence: false,
    profile: {
      analyzer: "librosa-pyin",
      analyzerVersion: "0.11.0",
      tessituraLowMidi: 52,
      tessituraHighMidi: 68,
      minMidi: 48,
      maxMidi: 72,
    },
    items: [item],
  };
  assert.deepEqual(selectRecommendationHandoff(run, "item-1"), {
    runId: "run-1",
    id: "item-1",
    title: "Song",
    artist: "Artist",
    recommendedShift: -2,
    originalKeyScore: 80,
    adjustedScore: 95,
  });
  assert.equal(selectRecommendationHandoff(run, "item-from-another-run"), null);
});
