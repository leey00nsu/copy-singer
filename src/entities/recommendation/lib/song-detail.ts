import type { RecommendationItemResponse, RecommendationRunResponse } from "../model/contract";

export function selectRecommendationItem(run: RecommendationRunResponse, itemId: string) {
  return run.items.find((item) => item.id === itemId) ?? null;
}

export function safeRecommendationSourceUrl(item: Pick<RecommendationItemResponse, "sourceUrl">) {
  try {
    const url = new URL(item.sourceUrl);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
