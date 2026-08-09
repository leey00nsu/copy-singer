import { mutationOptions } from "@tanstack/react-query";
import { type RecommendationRunResponse, recommendationRunResponseSchema } from "@/entities/recommendation";
import { requestJson } from "@/shared/api";
import { createRecommendationRequestSchema } from "../model/contract";

export function createRecommendation(userVocalProfileId: string): Promise<RecommendationRunResponse> {
  const request = createRecommendationRequestSchema.parse({ userVocalProfileId });
  return requestJson("/api/recommendations", {
    method: "POST",
    json: request,
    schema: recommendationRunResponseSchema,
  });
}

export function createRecommendationMutationOptions() {
  return mutationOptions({
    mutationKey: ["recommendation", "create"] as const,
    mutationFn: createRecommendation,
  });
}
