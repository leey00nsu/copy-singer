import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_RECOMMENDATION_FILTERS,
  parseRecommendationFilters,
  projectRecommendationItems,
  recommendationMatchPercent,
  serializeRecommendationFilters,
} from "../src/entities/recommendation";

const synthesis = (status: "not_started" | "processing" | "succeeded" | "failed") => ({
  status,
  jobId: null,
  error: null,
  startedAt: null,
  updatedAt: null,
  completedAt: null,
  expiresAt: null,
  attemptCount: 0,
  audioUrl: null,
});

const items = [
  {
    rank: 1,
    title: "바람의 노래",
    artist: "조용필",
    originalKeyScore: 84.4,
    adjustedScore: 91.6,
    recommendedShift: -2,
    synthesis: synthesis("processing"),
  },
  {
    rank: 2,
    title: "가나다",
    artist: "테스트",
    originalKeyScore: 92.2,
    adjustedScore: 92.2,
    recommendedShift: 0,
    synthesis: synthesis("not_started"),
  },
  {
    rank: 3,
    title: "별",
    artist: "밤",
    originalKeyScore: 60,
    adjustedScore: 76.3,
    recommendedShift: 1,
    synthesis: synthesis("succeeded"),
  },
] as const;

test("parses and serializes only supported recommendation URL filters", () => {
  const parsed = parseRecommendationFilters("q=%20바람%20&score=90-plus&shift=lower&status=active&sort=adjusted-score");
  assert.deepEqual(parsed, {
    query: "바람",
    score: "90-plus",
    shift: "lower",
    status: "active",
    sort: "adjusted-score",
  });
  assert.equal(
    serializeRecommendationFilters(parsed),
    "q=%EB%B0%94%EB%9E%8C&score=90-plus&shift=lower&status=active&sort=adjusted-score",
  );
  assert.deepEqual(parseRecommendationFilters("score=invalid&sort=unknown"), DEFAULT_RECOMMENDATION_FILTERS);
});

test("projects search, score, shift, status, and sort without mutating source rank", () => {
  const projected = projectRecommendationItems(items, {
    query: "조용필",
    score: "90-plus",
    shift: "lower",
    status: "active",
    sort: "title",
  });
  assert.deepEqual(
    projected.map((item) => item.rank),
    [1],
  );
  assert.deepEqual(
    items.map((item) => item.rank),
    [1, 2, 3],
  );
  assert.deepEqual(
    projectRecommendationItems(items, { ...DEFAULT_RECOMMENDATION_FILTERS, sort: "original-score" }).map(
      (item) => item.rank,
    ),
    [2, 1, 3],
  );
});

test("shows a bounded integer match percent without fabricating precision", () => {
  assert.equal(recommendationMatchPercent(items[0]), 92);
  assert.equal(recommendationMatchPercent({ adjustedScore: 101.2 }), 100);
  assert.equal(recommendationMatchPercent({ adjustedScore: -1 }), 0);
});
