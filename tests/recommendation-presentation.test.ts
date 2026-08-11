import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_RECOMMENDATION_FILTERS,
  parseRecommendationFilters,
  projectRecommendationItems,
  projectRecommendationSongProfile,
  recommendationMatchColor,
  recommendationMatchPercent,
  recommendationMatchRank,
  serializeRecommendationFilters,
  visibleRecommendationReasons,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
} from "../src/entities/recommendation";

test("builds YouTube media URLs only from canonical video IDs", () => {
  assert.equal(
    youtubeEmbedUrl("NbKH4iZqq1Y"),
    "https://www.youtube-nocookie.com/embed/NbKH4iZqq1Y?autoplay=0&playsinline=1&rel=0",
  );
  assert.equal(youtubeThumbnailUrl("NbKH4iZqq1Y"), "https://i.ytimg.com/vi/NbKH4iZqq1Y/hqdefault.jpg");
  assert.equal(youtubeEmbedUrl("../javascript"), null);
});

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
  assert.equal(serializeRecommendationFilters(parsed), "q=%EB%B0%94%EB%9E%8C&score=90-plus&shift=lower&status=active");
  assert.deepEqual(parseRecommendationFilters("score=invalid&sort=unknown"), DEFAULT_RECOMMENDATION_FILTERS);
  assert.deepEqual(
    projectRecommendationItems(items, DEFAULT_RECOMMENDATION_FILTERS).map((item) => item.rank),
    [2, 1, 3],
  );
  assert.deepEqual(
    projectRecommendationItems(items, { ...DEFAULT_RECOMMENDATION_FILTERS, sort: "rank" }).map((item) => item.rank),
    [1, 2, 3],
  );
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

test("derives the displayed recommendation rank from adjusted match score", () => {
  const rankedItems = items.map((item) => ({ ...item, id: `item-${item.rank}` }));
  assert.equal(recommendationMatchRank(rankedItems, "item-2"), 1);
  assert.equal(recommendationMatchRank(rankedItems, "item-1"), 2);
  assert.equal(recommendationMatchRank(rankedItems, "item-3"), 3);
  assert.equal(recommendationMatchRank(rankedItems, "missing"), null);
});

test("maps match strength continuously from foreground black to the brand accent", () => {
  assert.equal(
    recommendationMatchColor({ adjustedScore: 0 }),
    "color-mix(in oklab, var(--foreground), var(--data-accent-foreground) 0%)",
  );
  assert.equal(
    recommendationMatchColor({ adjustedScore: 50.4 }),
    "color-mix(in oklab, var(--foreground), var(--data-accent-foreground) 50%)",
  );
  assert.equal(
    recommendationMatchColor({ adjustedScore: 100 }),
    "color-mix(in oklab, var(--foreground), var(--data-accent-foreground) 100%)",
  );
});

test("keeps only user-meaningful recommendation reasons", () => {
  assert.deepEqual(
    visibleRecommendationReasons({
      reasonCodes: [
        "HIGH_TESSITURA_OVERLAP",
        "KEY_SHIFT_IMPROVES_FIT",
        "HIGH_RANGE_BURDEN",
        "HIGH_NOTES_REDUCED",
        "LOW_NOTES_REDUCED",
      ],
      reasons: [
        "실용 음역이 편안하게 겹칩니다.",
        "-6키로 조정하면 예상 적합도가 34.4점에서 75.7점으로 높아집니다.",
        "추천 키에서도 고음 부담이 약 1.7반음 남아 있습니다.",
        "키를 조정해 고음 부담을 약 12.0반음 줄였습니다.",
        "키를 조정해 저음 부담을 줄였습니다.",
      ],
    }),
    [{ code: "HIGH_TESSITURA_OVERLAP", reason: "실용 음역이 편안하게 겹칩니다." }],
  );
});

test("projects only complete SONG vocal profiles for recommendation details", () => {
  assert.deepEqual(
    projectRecommendationSongProfile({
      sourceType: "SONG",
      minMidi: 50,
      maxMidi: 75,
      medianMidi: 63,
      tessituraLowMidi: 55,
      tessituraHighMidi: 72,
    }),
    {
      minMidi: 50,
      maxMidi: 75,
      medianMidi: 63,
      tessituraLowMidi: 55,
      tessituraHighMidi: 72,
    },
  );
  assert.equal(
    projectRecommendationSongProfile({
      sourceType: "SONG",
      minMidi: 50,
      maxMidi: 75,
      medianMidi: null,
      tessituraLowMidi: 55,
      tessituraHighMidi: 72,
    }),
    null,
  );
  assert.equal(
    projectRecommendationSongProfile({
      sourceType: "USER",
      minMidi: 50,
      maxMidi: 75,
      medianMidi: 63,
      tessituraLowMidi: 55,
      tessituraHighMidi: 72,
    }),
    null,
  );
});
