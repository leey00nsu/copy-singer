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
  vocalProfileId: string;
  songAnalysisId: string;
  catalogRevision: number;
  scoringVersion: string;
  idempotencyKey: string;
  retry?: boolean;
};

export function mixingJobDetailHref(jobId: string) {
  return `/library/mixes/${jobId}`;
}

export function createMixing(input: CreateMixingInput): Promise<MixingJobResponse> {
  const request = createMixingRequestSchema.parse({
    vocalProfileId: input.vocalProfileId,
    songAnalysisId: input.songAnalysisId,
    idempotencyKey: input.idempotencyKey,
  });
  return requestJson("/api/mixing-jobs", {
    method: "POST",
    json: request,
    schema: mixingJobResponseSchema,
  });
}

export function patchRecommendationSynthesis(
  queryClient: QueryClient,
  input: Pick<CreateMixingInput, "vocalProfileId" | "songAnalysisId" | "catalogRevision" | "scoringVersion">,
  patch: Partial<RecommendationSynthesis>,
) {
  queryClient.setQueryData<RecommendationRunResponse>(
    recommendationKeys.detail(input.vocalProfileId, input.catalogRevision, input.scoringVersion),
    (current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.songAnalysisId === input.songAnalysisId
                ? { ...item, synthesis: { ...item.synthesis, ...patch } }
                : item,
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
