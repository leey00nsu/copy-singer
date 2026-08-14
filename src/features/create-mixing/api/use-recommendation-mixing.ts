"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { mixingJobKeys } from "@/entities/mixing-job";
import { type RecommendationRunResponse, recommendationKeys } from "@/entities/recommendation";
import { ApiError } from "@/shared/api";
import { createMixingMutationOptions, mixingJobDetailHref, patchRecommendationSynthesis } from "./client";

export function useRecommendationMixing() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const startingItemsRef = useRef(new Set<string>());
  const mutation = useMutation({
    ...createMixingMutationOptions(),
    onMutate: (input) => {
      patchRecommendationSynthesis(queryClient, input, {
        status: "preparing",
        error: null,
      });
    },
    onSuccess: async (job, input) => {
      const invalidations = Promise.all([
        queryClient.invalidateQueries({ queryKey: recommendationKeys.profile(input.vocalProfileId) }),
        queryClient.invalidateQueries({ queryKey: mixingJobKeys.histories() }),
      ]);
      toast.success("AI 믹싱을 시작했어요. 페이지를 닫아도 계속돼요.");
      router.push(mixingJobDetailHref(job.id));
      await invalidations;
    },
    onError: (error, input) => {
      const apiError = error instanceof ApiError ? error : null;
      patchRecommendationSynthesis(queryClient, input, {
        status: "failed",
        error: {
          code: apiError?.code ?? "SYNTHESIS_UPSTREAM_FAILED",
          detail: apiError?.message ?? "AI 믹싱을 시작하지 못했어요.",
          retryable: apiError?.retryable ?? true,
        },
      });
      toast.error(input.retry ? "이 곡의 AI 믹싱을 다시 시작하지 못했어요." : "AI 믹싱을 시작하지 못했어요.");
    },
    onSettled: (_, __, input) => {
      startingItemsRef.current.delete(input.songAnalysisId);
    },
  });

  const startMixing = useCallback(
    (result: RecommendationRunResponse, songAnalysisId: string, retry = false) => {
      if (startingItemsRef.current.has(songAnalysisId)) return;
      startingItemsRef.current.add(songAnalysisId);
      mutation.mutate({
        vocalProfileId: result.userVocalProfileId,
        songAnalysisId,
        catalogRevision: result.catalogRevision,
        scoringVersion: result.scoringVersion,
        idempotencyKey: crypto.randomUUID(),
        retry,
      });
    },
    [mutation],
  );

  return { createdJob: mutation.data ?? null, isPending: mutation.isPending, startMixing };
}
