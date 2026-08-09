import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { ApiError, requestJson } from "@/shared/api";
import {
  type RecommendationDeleteResponse,
  type RecommendationRunResponse,
  recommendationDeleteResponseSchema,
  recommendationRunResponseSchema,
} from "../model/contract";

const RECOMMENDATION_POLL_INTERVAL_MS = 5_000;

export const recommendationKeys = {
  all: ["recommendation"] as const,
  details: () => [...recommendationKeys.all, "detail"] as const,
  detail: (id: string | null) => [...recommendationKeys.details(), id] as const,
};

export function hasActiveRecommendationSynthesis(run: RecommendationRunResponse | null | undefined) {
  return run?.items.some((item) => ["preparing", "queued", "processing"].includes(item.synthesis.status)) ?? false;
}

export function recommendationPollingInterval(run: RecommendationRunResponse | undefined) {
  return hasActiveRecommendationSynthesis(run) ? RECOMMENDATION_POLL_INTERVAL_MS : false;
}

export function getRecommendation(id: string, signal?: AbortSignal): Promise<RecommendationRunResponse> {
  return requestJson(`/api/recommendations/${encodeURIComponent(id)}`, {
    cache: "no-store",
    signal,
    schema: recommendationRunResponseSchema,
  });
}

export function deleteRecommendation(id: string): Promise<RecommendationDeleteResponse> {
  return requestJson(`/api/recommendations/${encodeURIComponent(id)}`, {
    method: "DELETE",
    schema: recommendationDeleteResponseSchema,
  });
}

export function recommendationDetailQueryOptions(id: string | null, initialData?: RecommendationRunResponse) {
  return queryOptions({
    queryKey: recommendationKeys.detail(id),
    enabled: id !== null,
    queryFn: ({ signal }) => {
      if (id === null) {
        throw new ApiError("A recommendation ID is required.", {
          kind: "contract",
          code: "MISSING_RECOMMENDATION_ID",
        });
      }
      return getRecommendation(id, signal);
    },
    ...(initialData ? { initialData } : {}),
    refetchInterval: (query) => recommendationPollingInterval(query.state.data),
  });
}

export function deleteRecommendationMutationOptions() {
  return mutationOptions({
    mutationKey: [...recommendationKeys.all, "delete"] as const,
    mutationFn: deleteRecommendation,
  });
}
