import { queryOptions } from "@tanstack/react-query";
import { ApiError, requestJson } from "@/shared/api";
import { type RecommendationRunResponse, recommendationRunResponseSchema } from "../model/contract";

const RECOMMENDATION_POLL_INTERVAL_MS = 5_000;

export const recommendationKeys = {
  all: ["recommendation"] as const,
  profiles: () => [...recommendationKeys.all, "profile"] as const,
  profile: (profileId: string | null) => [...recommendationKeys.profiles(), profileId] as const,
  detail: (profileId: string | null, catalogRevision: number | "current", scoringVersion: string | "current") =>
    [...recommendationKeys.profile(profileId), catalogRevision, scoringVersion] as const,
};

export function hasActiveRecommendationSynthesis(run: RecommendationRunResponse | null | undefined) {
  return run?.items.some((item) => ["preparing", "queued", "processing"].includes(item.synthesis.status)) ?? false;
}

export function recommendationPollingInterval(run: RecommendationRunResponse | undefined) {
  return hasActiveRecommendationSynthesis(run) ? RECOMMENDATION_POLL_INTERVAL_MS : false;
}

export function getRecommendation(profileId: string, signal?: AbortSignal): Promise<RecommendationRunResponse> {
  return requestJson(`/api/recommendations/${encodeURIComponent(profileId)}`, {
    cache: "no-store",
    signal,
    schema: recommendationRunResponseSchema,
  });
}

export function recommendationDetailQueryOptions(profileId: string | null, initialData?: RecommendationRunResponse) {
  return queryOptions({
    queryKey: recommendationKeys.detail(
      profileId,
      initialData?.catalogRevision ?? "current",
      initialData?.scoringVersion ?? "current",
    ),
    enabled: profileId !== null,
    queryFn: ({ signal }) => {
      if (profileId === null) {
        throw new ApiError("A vocal profile ID is required.", {
          kind: "contract",
          code: "MISSING_VOCAL_PROFILE_ID",
        });
      }
      return getRecommendation(profileId, signal);
    },
    ...(initialData ? { initialData } : {}),
    refetchInterval: (query) => recommendationPollingInterval(query.state.data),
  });
}
