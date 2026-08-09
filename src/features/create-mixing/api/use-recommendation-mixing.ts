"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { mixingJobKeys } from "@/entities/mixing-job";
import { recommendationKeys } from "@/entities/recommendation";
import { ApiError } from "@/shared/api";
import { createMixingMutationOptions, patchRecommendationSynthesis } from "./client";

export function useRecommendationMixing() {
  const queryClient = useQueryClient();
  const startingItemsRef = useRef(new Set<string>());
  const mutation = useMutation({
    ...createMixingMutationOptions(),
    onMutate: (input) => {
      patchRecommendationSynthesis(queryClient, input.runId, input.recommendationItemId, {
        status: "preparing",
        error: null,
      });
    },
    onSuccess: async (_, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: recommendationKeys.detail(input.runId) }),
        queryClient.invalidateQueries({ queryKey: mixingJobKeys.histories() }),
      ]);
      toast.success("믹싱을 접수했어요. 페이지를 닫아도 계속 진행됩니다.");
    },
    onError: (error, input) => {
      const apiError = error instanceof ApiError ? error : null;
      patchRecommendationSynthesis(queryClient, input.runId, input.recommendationItemId, {
        status: "failed",
        error: {
          code: apiError?.code ?? "SYNTHESIS_UPSTREAM_FAILED",
          detail: apiError?.message ?? "합성 서버에 연결하지 못했습니다.",
          retryable: apiError?.retryable ?? true,
        },
      });
      toast.error(input.retry ? "이 곡의 합성을 다시 시작하지 못했습니다." : "AI 믹싱을 시작하지 못했습니다.");
    },
    onSettled: (_, __, input) => {
      startingItemsRef.current.delete(input.recommendationItemId);
    },
  });

  const startMixing = useCallback(
    (runId: string, recommendationItemId: string, retry = false) => {
      if (startingItemsRef.current.has(recommendationItemId)) return;
      startingItemsRef.current.add(recommendationItemId);
      mutation.mutate({
        runId,
        recommendationItemId,
        idempotencyKey: crypto.randomUUID(),
        retry,
      });
    },
    [mutation],
  );

  return { isPending: mutation.isPending, startMixing };
}
