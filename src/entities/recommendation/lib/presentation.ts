import { z } from "zod";
import type { RecommendationItemResponse, RecommendationMixingCapability } from "../model/contract";

export const recommendationScoreFilterSchema = z.enum(["all", "90-plus", "80-plus", "under-80"]);
export const recommendationShiftFilterSchema = z.enum(["all", "original", "lower", "higher"]);
export const recommendationStatusFilterSchema = z.enum(["all", "not-started", "active", "succeeded", "failed"]);
export const recommendationSortSchema = z.enum(["recommendation-score", "original-score", "title"]);

export type RecommendationScoreFilter = z.infer<typeof recommendationScoreFilterSchema>;
export type RecommendationShiftFilter = z.infer<typeof recommendationShiftFilterSchema>;
export type RecommendationStatusFilter = z.infer<typeof recommendationStatusFilterSchema>;
export type RecommendationSort = z.infer<typeof recommendationSortSchema>;

const LEGACY_RECOMMENDATION_SCORE_SORTS = new Set(["rank", "adjusted-score"]);
const HIDDEN_RECOMMENDATION_REASON_CODES = new Set([
  "KEY_SHIFT_IMPROVES_FIT",
  "HIGH_RANGE_BURDEN",
  "LOW_RANGE_BURDEN",
  "HIGH_NOTES_REDUCED",
  "LOW_NOTES_REDUCED",
]);

export type RecommendationFilters = {
  query: string;
  score: RecommendationScoreFilter;
  shift: RecommendationShiftFilter;
  status: RecommendationStatusFilter;
  sort: RecommendationSort;
};

export const DEFAULT_RECOMMENDATION_FILTERS: RecommendationFilters = Object.freeze({
  query: "",
  score: "all",
  shift: "all",
  status: "all",
  sort: "recommendation-score",
});

const FILTER_KEYS = ["q", "score", "shift", "status", "sort"] as const;

function parsedOrDefault<T extends string>(schema: z.ZodType<T>, value: string | null, fallback: T) {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

function parseRecommendationSort(value: string | null): RecommendationSort {
  if (value && LEGACY_RECOMMENDATION_SCORE_SORTS.has(value)) return "recommendation-score";
  return parsedOrDefault(recommendationSortSchema, value, "recommendation-score");
}

export function parseRecommendationFilters(input: string | URLSearchParams): RecommendationFilters {
  const params = typeof input === "string" ? new URLSearchParams(input) : input;
  return {
    query: (params.get("q") ?? "").trim().slice(0, 80),
    score: parsedOrDefault(recommendationScoreFilterSchema, params.get("score"), "all"),
    shift: parsedOrDefault(recommendationShiftFilterSchema, params.get("shift"), "all"),
    status: parsedOrDefault(recommendationStatusFilterSchema, params.get("status"), "all"),
    sort: parseRecommendationSort(params.get("sort")),
  };
}

export function serializeRecommendationFilters(filters: RecommendationFilters, current = "") {
  const params = new URLSearchParams(current);
  for (const key of FILTER_KEYS) params.delete(key);
  if (filters.query) params.set("q", filters.query);
  if (filters.score !== "all") params.set("score", filters.score);
  if (filters.shift !== "all") params.set("shift", filters.shift);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.sort !== "recommendation-score") params.set("sort", filters.sort);
  return params.toString();
}

export function synthesisStatusFilter(
  status: RecommendationItemResponse["synthesis"]["status"],
): Exclude<RecommendationStatusFilter, "all"> {
  if (status === "not_started") return "not-started";
  if (status === "succeeded") return "succeeded";
  if (status === "failed") return "failed";
  return "active";
}

export function recommendationScore(item: Pick<RecommendationItemResponse, "selectionScore">) {
  return Math.max(0, Math.min(100, Math.round(item.selectionScore)));
}

export function recommendationScoreColor(item: Pick<RecommendationItemResponse, "selectionScore">) {
  const score = recommendationScore(item);
  return `color-mix(in oklab, var(--foreground), var(--data-accent-foreground) ${score}%)`;
}

export function recommendationMixingUnavailableDescription(
  mixing: Pick<RecommendationMixingCapability, "unavailableReason"> | null | undefined,
) {
  return mixing?.unavailableReason === "missing_mid_reference"
    ? "안정적인 중앙 음역 구간을 찾지 못해 이 프로필로는 AI 믹싱을 만들 수 없어요."
    : "저장된 보컬 레퍼런스를 사용할 수 없어 이 프로필로는 AI 믹싱을 만들 수 없어요.";
}

export function visibleRecommendationReasons(item: Pick<RecommendationItemResponse, "reasonCodes" | "reasons">) {
  return item.reasons.flatMap((reason, index) =>
    HIDDEN_RECOMMENDATION_REASON_CODES.has(item.reasonCodes[index] ?? "")
      ? []
      : [{ code: item.reasonCodes[index], reason }],
  );
}

type ProjectableRecommendation = Pick<
  RecommendationItemResponse,
  "rank" | "title" | "artist" | "selectionScore" | "originalKeyScore" | "recommendedShift" | "synthesis"
>;

export function recommendationRank<T extends Pick<ProjectableRecommendation, "rank"> & { id: string }>(
  items: readonly T[],
  itemId: string,
) {
  return items.find((item) => item.id === itemId)?.rank ?? null;
}

export function projectRecommendationItems<T extends ProjectableRecommendation>(
  items: readonly T[],
  filters: RecommendationFilters,
) {
  const query = filters.query.normalize("NFKC").toLocaleLowerCase("ko-KR");
  return items
    .filter((item) => {
      if (query && !`${item.title} ${item.artist}`.normalize("NFKC").toLocaleLowerCase("ko-KR").includes(query)) {
        return false;
      }
      const score = recommendationScore(item);
      if (filters.score === "90-plus" && score < 90) return false;
      if (filters.score === "80-plus" && (score < 80 || score >= 90)) return false;
      if (filters.score === "under-80" && score >= 80) return false;
      if (filters.shift === "original" && item.recommendedShift !== 0) return false;
      if (filters.shift === "lower" && item.recommendedShift >= 0) return false;
      if (filters.shift === "higher" && item.recommendedShift <= 0) return false;
      if (filters.status !== "all" && synthesisStatusFilter(item.synthesis.status) !== filters.status) return false;
      return true;
    })
    .toSorted((first, second) => {
      if (filters.sort === "recommendation-score")
        return second.selectionScore - first.selectionScore || first.rank - second.rank;
      if (filters.sort === "original-score")
        return second.originalKeyScore - first.originalKeyScore || first.rank - second.rank;
      return (
        first.title.localeCompare(second.title, "ko-KR") ||
        first.artist.localeCompare(second.artist, "ko-KR") ||
        first.rank - second.rank
      );
    });
}
