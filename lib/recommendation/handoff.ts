import type { RecommendationItemResponse, RecommendationRunResponse } from "./contract";

export type RecommendationHandoff = Pick<
  RecommendationItemResponse,
  "id" | "title" | "artist" | "recommendedShift" | "originalKeyScore" | "adjustedScore"
> & {
  runId: string;
};

export function selectRecommendationHandoff(
  run: RecommendationRunResponse,
  itemId: string,
): RecommendationHandoff | null {
  const item = run.items.find((candidate) => candidate.id === itemId);
  if (!item) return null;
  return {
    runId: run.id,
    id: item.id,
    title: item.title,
    artist: item.artist,
    recommendedShift: item.recommendedShift,
    originalKeyScore: item.originalKeyScore,
    adjustedScore: item.adjustedScore,
  };
}
