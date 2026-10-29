"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { guestRecommendationReturn } from "@/entities/guest-analysis/index.model";
import { ApiError, requestJson } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { StatusNotice } from "@/shared/ui/status-notice";

export function SaveTrial({ next }: { next?: string }) {
  const router = useRouter();
  const queries = useQueryClient();
  const started = useRef(false);
  const save = useMutation({
    mutationFn: () =>
      requestJson("/api/guest-analysis/claim", { method: "POST", schema: z.object({ profileId: z.uuid() }) }),
    onSuccess: ({ profileId }) => {
      queries.removeQueries({ queryKey: ["vocal-analysis"] });
      queries.removeQueries({ queryKey: ["recommendation"] });
      void queries.invalidateQueries({ queryKey: ["vocal-profile"] });
      router.replace(guestRecommendationReturn(profileId, next));
      router.refresh();
    },
  });
  const { mutate } = save;
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mutate();
  }, [mutate]);

  const code = save.error instanceof ApiError ? save.error.code : null;
  const unavailable = [
    "GUEST_RESULT_EXPIRED",
    "GUEST_RESULT_NOT_FOUND",
    "GUEST_TRIAL_NOT_FOUND",
    "GUEST_TRIAL_ALREADY_SAVED",
  ].includes(code ?? "");
  return (
    <section className="mx-auto grid w-full max-w-xl gap-5 px-5 py-16" aria-live="polite">
      <h1 className="text-2xl font-semibold tracking-tight">분석 결과 저장</h1>
      {save.isError ? (
        <>
          <StatusNotice
            tone="warning"
            title={
              unavailable
                ? "저장할 체험 결과를 찾지 못했어요."
                : code === "GUEST_ANALYSIS_PROCESSING"
                  ? "아직 목소리를 분석하고 있어요."
                  : "결과를 저장하지 못했어요."
            }
            description={
              unavailable
                ? "결과가 이미 저장됐거나 보관 기간이 지났을 수 있어요."
                : "결과를 유지하고 있어요. 잠시 뒤 다시 시도해 주세요."
            }
          />
          {!unavailable ? <Button onClick={() => save.mutate()}>다시 저장하기</Button> : null}
          <Button nativeButton={false} render={<Link href="/library?tab=profiles" />} variant="outline">
            내 보컬 프로필 보기
          </Button>
        </>
      ) : (
        <p className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
          분석 결과를 계정에 저장하고 있어요.
        </p>
      )}
    </section>
  );
}
