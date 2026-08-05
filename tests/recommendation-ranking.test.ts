import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { scoreCatalogKeyFits, type CatalogKeyFitResult } from "../lib/key-fit/catalog";
import type { SongProfileArtifact } from "../lib/song-catalog/artifact";
import {
  RecommendationError,
  RECOMMENDATION_RESULT_COUNT,
  type RecommendationRunResponse,
} from "../lib/recommendation/contract";
import {
  formatRecommendationReasons,
  formatRecommendedShift,
  rankTopRecommendations,
} from "../lib/recommendation/ranking";
import {
  buildTopRecommendations,
  validateAndIndexSongRows,
  validateRecommendationArtifact,
} from "../lib/recommendation/data";
import { selectRecommendationHandoff } from "../lib/recommendation/handoff";
import type { KeyFitProfile } from "../lib/key-fit/contract";

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

const artifact = JSON.parse(
  readFileSync(new URL("../data/catalogs/tj-2607-song-profiles.json", import.meta.url), "utf8"),
) as SongProfileArtifact;

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

test("ranks exactly three songs with every documented tie-break", () => {
  const ranked = rankTopRecommendations([
    candidate(5, 90, 80, -2),
    candidate(4, 90, 81, -4),
    candidate(3, 90, 81, 2),
    candidate(2, 90, 81, -2),
    candidate(1, 89, 99, 0),
  ]);

  assert.equal(ranked.length, RECOMMENDATION_RESULT_COUNT);
  assert.deepEqual(ranked.map(({ catalogOrder, rank }) => [rank, catalogOrder]), [
    [1, 2],
    [2, 3],
    [3, 4],
  ]);
});

test("does not mutate candidates and produces deterministic real-artifact top three", () => {
  const scored = scoreCatalogKeyFits(USER_PROFILE_FIXTURE, artifact);
  const before = JSON.stringify(scored);
  const first = rankTopRecommendations(scored);
  const second = rankTopRecommendations(scored);

  assert.equal(scored.length, 100);
  assert.equal(JSON.stringify(scored), before);
  assert.deepEqual(first, second);
  assert.deepEqual(first.map((item) => item.rank), [1, 2, 3]);
});

test("rejects partial and duplicate ranking inputs as an unready catalog", () => {
  assert.throws(
    () => rankTopRecommendations([candidate(1, 90, 80, 0)]),
    (error: unknown) => error instanceof RecommendationError && error.code === "CATALOG_NOT_READY",
  );
  assert.throws(
    () => rankTopRecommendations([
      candidate(1, 90, 80, 0),
      candidate(1, 89, 79, 0),
      candidate(3, 88, 78, 0),
    ]),
    (error: unknown) => error instanceof RecommendationError && error.code === "CATALOG_NOT_READY",
  );
});

test("formats signed karaoke keys and evidence-backed Korean reasons", () => {
  const result = scoreCatalogKeyFits(USER_PROFILE_FIXTURE, artifact).find(
    (item) => item.reasonCodes.includes("KEY_SHIFT_IMPROVES_FIT"),
  );
  assert.ok(result);

  assert.equal(formatRecommendedShift(0), "원키");
  assert.equal(formatRecommendedShift(2), "+2키");
  assert.equal(formatRecommendedShift(-3), "-3키");

  const reasons = formatRecommendationReasons(result);
  assert.equal(reasons.length, result.reasonCodes.length);
  assert.ok(reasons.every((reason) => reason.endsWith(".")));
  assert.ok(reasons.some((reason) => reason.includes("예상 적합도")));
});

test("low-confidence explanations recommend a longer recording", () => {
  const result = scoreCatalogKeyFits(
    { ...USER_PROFILE_FIXTURE, voicedRatio: 0.25, pitchStability: 0.2 },
    artifact,
  )[0];
  assert.ok(result.reasonCodes.includes("LOW_PROFILE_CONFIDENCE"));
  assert.ok(formatRecommendationReasons(result).some((reason) => reason.includes("더 긴 소절")));
});

test("strictly joins the READY artifact to 100 database song rows", () => {
  const rows = artifact.songs.map((song, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    catalogOrder: song.catalogOrder,
    title: song.title,
    artist: song.artist,
    analysisStatus: "READY" as const,
  }));
  const validatedArtifact = validateRecommendationArtifact(artifact);
  assert.equal(validateAndIndexSongRows(rows, validatedArtifact).size, 100);
  const top = buildTopRecommendations(USER_PROFILE_FIXTURE, rows, artifact);
  assert.equal(top.length, 3);
  assert.ok(top.every((item) => item.songId.length === 36));
});

test("rejects database metadata drift before scoring or persistence", () => {
  const rows = artifact.songs.map((song, index) => ({
    id: `song-${index + 1}`,
    catalogOrder: song.catalogOrder,
    title: song.title,
    artist: song.artist,
    analysisStatus: "READY" as const,
  }));
  rows[8] = { ...rows[8]!, title: "Wrong title" };
  assert.throws(
    () => buildTopRecommendations(USER_PROFILE_FIXTURE, rows, artifact),
    (error: unknown) => error instanceof RecommendationError && error.code === "CATALOG_NOT_READY",
  );
});

test("selects a handoff only when the item belongs to the stored run", () => {
  const scored = scoreCatalogKeyFits(USER_PROFILE_FIXTURE, artifact)[0]!;
  const item = {
    id: "item-1", rank: 1, songId: "song-1", catalogOrder: 1, title: "Song", artist: "Artist", sourceUrl: "https://www.youtube.com/watch?v=NbKH4iZqq1Y", originalKeyScore: 80, adjustedScore: 95, recommendedShift: -2, reasonCodes: [], reasons: [], metrics: { confidence: 0.8, original: scored.original, recommended: scored.recommended },
  };
  const run: RecommendationRunResponse = { id: "run-1", userVocalProfileId: "profile-1", scoringVersion: "key-fit-v1", createdAt: "2026-08-06T00:00:00.000Z", profileConfidence: 0.8, lowConfidence: false, profile: { analyzer: "librosa-pyin", analyzerVersion: "0.11.0", tessituraLowMidi: 52, tessituraHighMidi: 68, minMidi: 48, maxMidi: 72 }, items: [item] };
  assert.deepEqual(selectRecommendationHandoff(run, "item-1"), { runId: "run-1", id: "item-1", title: "Song", artist: "Artist", recommendedShift: -2, originalKeyScore: 80, adjustedScore: 95 });
  assert.equal(selectRecommendationHandoff(run, "item-from-another-run"), null);
});
