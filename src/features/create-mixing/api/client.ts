import { mutationOptions, type QueryClient } from "@tanstack/react-query";
import { type MixingJobResponse, mixingJobResponseSchema } from "@/entities/mixing-job";
import {
  type RecommendationRunResponse,
  type RecommendationSynthesis,
  recommendationKeys,
} from "@/entities/recommendation";
import { requestJson } from "@/shared/api";
import { createMixingRequestSchema } from "../model/contract";

export type CreateMixingInput = {
  runId: string;
  recommendationItemId: string;
  idempotencyKey: string;
  retry?: boolean;
};

export function createMixing(input: CreateMixingInput): Promise<MixingJobResponse> {
  const request = createMixingRequestSchema.parse(input);
  return requestJson("/api/mixing-jobs", {
    method: "POST",
    json: request,
    schema: mixingJobResponseSchema,
  });
}

export function patchRecommendationSynthesis(
  queryClient: QueryClient,
  runId: string,
  recommendationItemId: string,
  patch: Partial<RecommendationSynthesis>,
) {
  queryClient.setQueryData<RecommendationRunResponse>(recommendationKeys.detail(runId), (current) =>
    current
      ? {
          ...current,
          items: current.items.map((item) =>
            item.id === recommendationItemId ? { ...item, synthesis: { ...item.synthesis, ...patch } } : item,
          ),
        }
      : current,
  );
}

export function createMixingMutationOptions() {
  return mutationOptions({
    mutationKey: ["mixing-job", "create"] as const,
    mutationFn: createMixing,
  });
}
