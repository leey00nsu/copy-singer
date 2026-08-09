"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock3,
  Download,
  Gauge,
  Headphones,
  LoaderCircle,
  Mic2,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { mixingJobKeys } from "@/entities/mixing-job";
import type { RecommendationRunResponse } from "@/entities/recommendation";
import {
  deleteRecommendationMutationOptions,
  formatRecommendedShift,
  recommendationDetailQueryOptions,
  recommendationKeys,
} from "@/entities/recommendation";
import { createMixingMutationOptions, patchRecommendationSynthesis } from "@/features/create-mixing";
import { ApiError } from "@/shared/api";
import { AudioWaveformPlayer } from "@/shared/ui/audio-waveform-player";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function RecommendationResults({
  initialRun,
  runId,
}: {
  initialRun?: RecommendationRunResponse;
  runId?: string;
}) {
  const resolvedRunId = initialRun?.id ?? runId ?? null;
  const queryClient = useQueryClient();
  const runQuery = useQuery(recommendationDetailQueryOptions(resolvedRunId, initialRun));
  const deleteRunMutation = useMutation(deleteRecommendationMutationOptions());
  const startingItemsRef = useRef(new Set<string>());
  const createMixingMutation = useMutation({
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
  const run = runQuery.data ?? null;
  const loadError: "not-found" | "failed" | null =
    !resolvedRunId || runQuery.error
      ? runQuery.error instanceof ApiError && runQuery.error.status === 404
        ? "not-found"
        : "failed"
      : null;

  const startItem = (itemId: string, retry = false) => {
    if (!run || startingItemsRef.current.has(itemId)) return;
    startingItemsRef.current.add(itemId);
    createMixingMutation.mutate({
      runId: run.id,
      recommendationItemId: itemId,
      idempotencyKey: crypto.randomUUID(),
      retry,
    });
  };

  const deleteRun = () => {
    if (
      !run ||
      deleteRunMutation.isPending ||
      !window.confirm("이 추천 결과와 합성 파일을 삭제할까요? 보컬 프로필은 유지됩니다.")
    ) {
      return;
    }
    deleteRunMutation.mutate(run.id, {
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: recommendationKeys.detail(run.id) });
        toast.success("추천 결과를 삭제했습니다.");
        // Direct Node-rendered component tests do not provide a Next router context.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/profile";
      },
      onError: () => toast.error("추천 결과를 삭제하지 못했습니다. 잠시 뒤 다시 시도해주세요."),
    });
  };

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto size-9 text-destructive" />
          <h1 className="mt-4 text-2xl font-semibold">
            {loadError === "not-found" ? "추천 결과를 찾을 수 없어요." : "추천 결과를 불러오지 못했어요."}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {loadError === "not-found"
              ? "삭제됐거나 올바르지 않은 주소입니다."
              : "PostgreSQL 연결과 카탈로그 상태를 확인한 뒤 다시 시도해주세요."}
          </p>
          <a className={`${buttonVariants()} mt-6`} href="/profile">
            보컬 프로필로 이동
          </a>
        </div>
      </main>
    );
  }

  if (!run) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" /> 추천 결과를 불러오는 중…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="page-shell py-10 sm:py-14">
        <section className="mx-auto max-w-4xl text-center">
          <Badge className="gap-1.5" variant="secondary">
            <Sparkles className="size-3" /> 100곡 비교 완료
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
            내 목소리와 어울리는
            <br />
            노래 순위예요.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            이번 한 소절에서 관찰된 음역을 기준으로 100곡 전체를 정렬했습니다. 듣고 싶은 곡의 AI 믹싱을 누르면 그 곡만
            내 목소리로 변환합니다. 실제 노래방 음원과 당일 컨디션에 따라 알맞은 키는 달라질 수 있습니다.
          </p>
        </section>

        {run.lowConfidence ? (
          <section
            className="mx-auto mt-8 flex max-w-3xl gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 text-sm leading-6"
            role="status"
          >
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <p>
              <strong>조금 더 긴 소절로 다시 측정해보세요.</strong>
              <br />
              <span className="text-muted-foreground">
                분석 신뢰도가 낮아 순위와 추천 키가 달라질 수 있습니다. 현재 결과도 참고용으로 확인할 수 있어요.
              </span>
            </p>
          </section>
        ) : null}

        <section aria-label="추천 노래 전체 순위" className="mx-auto mt-8 max-w-5xl space-y-3">
          {run.items.map((item) => (
            <Card className={item.rank <= 3 ? "border-primary/35 bg-primary/[0.015]" : ""} key={item.id}>
              <CardContent className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={item.rank <= 3 ? "default" : "secondary"}>{item.rank}위</Badge>
                    <span className="font-mono text-xs text-muted-foreground">TJ #{item.catalogOrder}</span>
                    <Badge className="ml-auto" variant="outline">
                      <Gauge className="size-3" /> 추천 키 {formatRecommendedShift(item.recommendedShift)}
                    </Badge>
                  </div>
                  <CardHeader className="px-0 pb-0 pt-4">
                    <CardTitle className="truncate text-xl">{item.title}</CardTitle>
                    <CardDescription>{item.artist}</CardDescription>
                  </CardHeader>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-md">
                    <div className="rounded-xl bg-muted/55 p-3">
                      <p className="text-[11px] text-muted-foreground">원키 적합도</p>
                      <p className="mt-1 text-lg font-semibold">{item.originalKeyScore.toFixed(1)}</p>
                    </div>
                    <div className="rounded-xl bg-primary/8 p-3">
                      <p className="text-[11px] text-muted-foreground">추천 키 적합도</p>
                      <p className="mt-1 text-lg font-semibold text-primary">{item.adjustedScore.toFixed(1)}</p>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-1.5 text-xs leading-5 text-muted-foreground">
                    {item.reasons.slice(0, 2).map((reason) => (
                      <li className="flex gap-2" key={reason}>
                        <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border bg-muted/25 p-4">
                  {item.synthesis.status === "not_started" ? (
                    <div className="text-center">
                      <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Sparkles className="size-5" />
                      </span>
                      <p className="mt-3 text-sm font-semibold">이 곡을 내 목소리로 들어보세요</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        자동 피치 이동을 적용해 한 곡만 믹싱합니다.
                      </p>
                      <Button className="mt-3 w-full" onClick={() => void startItem(item.id)} size="sm">
                        <Sparkles className="size-4" /> AI 믹싱
                      </Button>
                    </div>
                  ) : ["preparing", "queued", "processing"].includes(item.synthesis.status) ? (
                    <div aria-live="polite" className="text-center">
                      <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <LoaderCircle className="size-5 animate-spin" />
                      </span>
                      <p className="mt-3 font-semibold">믹싱 중이에요</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.synthesis.status === "queued"
                          ? "GPU 순서를 기다리고 있어요."
                          : item.synthesis.status === "processing"
                            ? "내 목소리를 원곡에 입히고 있어요."
                            : "보컬과 원곡을 준비하고 있어요."}
                      </p>
                    </div>
                  ) : item.synthesis.status === "succeeded" && item.synthesis.audioUrl ? (
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <Headphones className="size-4" /> AI 믹싱 완료
                      </p>
                      <AudioWaveformPlayer
                        className="mt-3"
                        label={`${item.artist} ${item.title} AI 믹싱 결과`}
                        src={item.synthesis.audioUrl}
                      />
                      <a
                        className={`${buttonVariants({ size: "sm", variant: "outline" })} mt-3 w-full`}
                        download
                        href={item.synthesis.audioUrl}
                      >
                        <Download className="size-4" /> 결과 저장
                      </a>
                    </div>
                  ) : (
                    <div aria-live="polite" className="text-center">
                      <AlertTriangle className="mx-auto size-6 text-destructive" />
                      <p className="mt-2 text-sm font-semibold">이 곡의 믹싱을 완료하지 못했어요</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {item.synthesis.error?.detail ?? "잠시 뒤 다시 시도해주세요."}
                      </p>
                      {item.synthesis.error?.retryable ? (
                        <Button
                          className="mt-3 w-full"
                          onClick={() => void startItem(item.id, true)}
                          size="sm"
                          variant="outline"
                        >
                          <RefreshCw className="size-4" /> 이 곡 다시 시도
                        </Button>
                      ) : (
                        <a
                          className={`${buttonVariants({ size: "sm", variant: "outline" })} mt-3 w-full`}
                          href="/profile"
                        >
                          <Mic2 className="size-4" /> 다시 녹음
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mx-auto mt-8 max-w-5xl rounded-2xl border bg-card/75 p-5 text-xs leading-6 text-muted-foreground">
          <div className="flex gap-3">
            <Mic2 className="mt-0.5 size-4 shrink-0" />
            <p>
              이 결과는 <strong className="text-foreground">{run.scoringVersion}</strong>으로 계산한 노래 선택
              참고값이며 가창력이나 건강 상태를 평가하지 않습니다. 추천 노래방 키는 직접 부를 때의 안내이며 AI 믹싱에는
              SoulX-Singer의 자동 피치 이동이 적용됩니다.
            </p>
          </div>
          <div className="mt-2 flex gap-3">
            <Clock3 className="mt-0.5 size-4 shrink-0" />
            <p>
              목록을 보는 것만으로 GPU 작업이 시작되지 않습니다. 누른 곡만 처리하며 페이지를 닫아도 믹싱 히스토리에서
              상태와 결과를 확인할 수 있습니다.
            </p>
          </div>
        </section>

        <div className="mx-auto mt-6 flex max-w-5xl justify-between gap-3">
          <p className="self-center font-mono text-[10px] text-muted-foreground">
            RUN {run.id.slice(0, 8)} · {new Date(run.createdAt).toLocaleString("ko-KR")}
          </p>
          <Button disabled={deleteRunMutation.isPending} onClick={deleteRun} variant="ghost">
            {deleteRunMutation.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            결과 삭제
          </Button>
        </div>
      </div>
    </main>
  );
}
