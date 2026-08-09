"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock3, LoaderCircle, Mic2, Music2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  DEFAULT_RECOMMENDATION_FILTERS,
  deleteRecommendationMutationOptions,
  parseRecommendationFilters,
  projectRecommendationItems,
  type RecommendationFilters,
  type RecommendationRunResponse,
  recommendationDetailQueryOptions,
  recommendationKeys,
  serializeRecommendationFilters,
} from "@/entities/recommendation";
import { useRecommendationMixing } from "@/features/create-mixing";
import { ApiError } from "@/shared/api";
import { Button, buttonVariants } from "@/shared/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { StatePanel } from "@/shared/ui/state-panel";
import { RecommendationFilterBar } from "./recommendation-filter-bar";
import { RecommendationSongList } from "./recommendation-song-list";

function isRecommendationRoute() {
  return typeof window !== "undefined" && /^\/recommendations\/[^/]+\/?$/.test(window.location.pathname);
}

const RECOMMENDATION_FILTER_EVENT = "copy-singer:recommendation-filter-change";

function subscribeToRecommendationFilters(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener(RECOMMENDATION_FILTER_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(RECOMMENDATION_FILTER_EVENT, onStoreChange);
  };
}

function recommendationSearchSnapshot() {
  return isRecommendationRoute() ? window.location.search : null;
}

function useRecommendationFilters() {
  const search = useSyncExternalStore(subscribeToRecommendationFilters, recommendationSearchSnapshot, () => null);
  const [localFilters, setLocalFilters] = useState<RecommendationFilters>(DEFAULT_RECOMMENDATION_FILTERS);
  const filters = useMemo(
    () => (search === null ? localFilters : parseRecommendationFilters(search)),
    [localFilters, search],
  );

  const updateFilters = useCallback((patch: Partial<RecommendationFilters>) => {
    if (!isRecommendationRoute()) {
      setLocalFilters((current) => ({ ...current, ...patch }));
      return;
    }
    const next = { ...parseRecommendationFilters(window.location.search), ...patch };
    const query = serializeRecommendationFilters(next, window.location.search);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    window.dispatchEvent(new Event(RECOMMENDATION_FILTER_EVENT));
  }, []);

  const resetFilters = useCallback(() => {
    if (!isRecommendationRoute()) {
      setLocalFilters(DEFAULT_RECOMMENDATION_FILTERS);
      return;
    }
    const query = serializeRecommendationFilters(DEFAULT_RECOMMENDATION_FILTERS, window.location.search);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    window.dispatchEvent(new Event(RECOMMENDATION_FILTER_EVENT));
  }, []);
  return { filters, resetFilters, updateFilters };
}

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
  const { filters, resetFilters, updateFilters } = useRecommendationFilters();
  const { startMixing } = useRecommendationMixing();
  const run = runQuery.data ?? null;
  const loadError: "not-found" | "failed" | null =
    !resolvedRunId || runQuery.error
      ? runQuery.error instanceof ApiError && runQuery.error.status === 404
        ? "not-found"
        : "failed"
      : null;

  const startItem = (itemId: string, retry = false) => {
    if (!run) return;
    startMixing(run.id, itemId, retry);
  };

  const deleteRun = () => {
    if (!run || deleteRunMutation.isPending) return;
    deleteRunMutation.mutate(run.id, {
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: recommendationKeys.detail(run.id) });
        toast.success("추천 결과를 삭제했습니다.");
        // Direct Node-rendered component tests do not provide a Next router context.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/vocal-profiles";
      },
      onError: () => toast.error("추천 결과를 삭제하지 못했습니다. 잠시 뒤 다시 시도해주세요."),
    });
  };

  if (loadError) {
    return (
      <StatePanel
        action={
          <Link className={buttonVariants()} href="/vocal-profiles">
            보컬 프로필로 이동
          </Link>
        }
        className="min-h-[60vh]"
        description={
          loadError === "not-found"
            ? "삭제됐거나 올바르지 않은 주소입니다."
            : "PostgreSQL 연결과 추천 결과 상태를 확인한 뒤 다시 시도해주세요."
        }
        icon={<AlertTriangle />}
        title={loadError === "not-found" ? "추천 결과를 찾을 수 없어요." : "추천 결과를 불러오지 못했어요."}
        tone="destructive"
      />
    );
  }

  if (!run) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> 추천 결과를 불러오는 중…
        </p>
      </div>
    );
  }

  const visibleItems = projectRecommendationItems(run.items, filters);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,.6fr)] lg:items-end">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-data-accent-foreground">SONG MATCH</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">내 목소리에 맞는 노래</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            이번 한 소절에서 관찰된 음역을 기준으로 {run.items.length}곡을 비교했습니다. 추천 적합도는 정수로 단순화해
            표시하며, 추천 키와 근거를 함께 확인할 수 있습니다.
          </p>
        </div>
        <div className="grid gap-3 border-l pl-5 text-sm">
          <p className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">비교한 곡</span>
            <strong>{run.items.length}곡</strong>
          </p>
          <p className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">추천 생성</span>
            <strong>{new Date(run.createdAt).toLocaleDateString("ko-KR")}</strong>
          </p>
          <p className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">믹싱 방식</span>
            <strong>선택한 곡만 시작</strong>
          </p>
        </div>
      </header>

      {run.lowConfidence ? (
        <section
          className="mt-8 flex gap-3 border-y border-warning/70 bg-warning/35 px-4 py-4 text-sm leading-6"
          role="status"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning-foreground" aria-hidden="true" />
          <p>
            <strong>조금 더 긴 소절로 다시 측정해보세요.</strong>
            <br />
            <span className="text-muted-foreground">
              분석 신뢰도가 낮아 순위와 추천 키가 달라질 수 있습니다. 현재 결과도 참고용으로 확인할 수 있어요.
            </span>
          </p>
        </section>
      ) : null}

      <div className="mt-10">
        <RecommendationFilterBar
          filters={filters}
          onChange={updateFilters}
          onReset={resetFilters}
          resultCount={visibleItems.length}
          totalCount={run.items.length}
        />
      </div>

      <section aria-label="추천 노래 전체 순위" className="mt-5">
        {visibleItems.length > 0 ? (
          <RecommendationSongList items={visibleItems} onStart={startItem} runId={run.id} />
        ) : (
          <StatePanel
            action={
              <Button onClick={resetFilters} variant="outline">
                모든 조건 지우기
              </Button>
            }
            description="검색어 또는 필터를 바꾸면 저장된 추천 100곡 안에서 다시 찾을 수 있습니다."
            icon={<Music2 />}
            title="조건에 맞는 노래가 없어요."
          />
        )}
      </section>

      <section className="mt-8 grid gap-3 border-y py-5 text-xs leading-6 text-muted-foreground lg:grid-cols-2">
        <div className="flex gap-3">
          <Mic2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            이 결과는 <strong className="text-foreground">{run.scoringVersion}</strong>으로 계산한 참고값이며 가창력이나
            건강 상태를 평가하지 않습니다. 추천 키는 직접 부를 때의 안내입니다.
          </p>
        </div>
        <div className="flex gap-3">
          <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            목록을 보는 것만으로 작업이 시작되지 않습니다. 누른 곡만 처리하며 페이지를 닫아도 라이브러리에서 상태와
            결과를 확인할 수 있습니다.
          </p>
        </div>
      </section>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] text-muted-foreground">
          RUN {run.id.slice(0, 8)} · {new Date(run.createdAt).toLocaleString("ko-KR")}
        </p>
        <Dialog>
          <DialogTrigger render={<Button disabled={deleteRunMutation.isPending} variant="ghost" />}>
            <Trash2 className="size-4" aria-hidden="true" /> 결과 삭제
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>이 추천 결과를 삭제할까요?</DialogTitle>
              <DialogDescription>
                이 추천에 연결된 AI 믹싱 기록과 결과 파일도 함께 삭제됩니다. 보컬 프로필은 유지되며 이 작업은 되돌릴 수
                없습니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
              <Button disabled={deleteRunMutation.isPending} onClick={deleteRun} variant="destructive">
                {deleteRunMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-4" aria-hidden="true" />
                )}
                {deleteRunMutation.isPending ? "삭제 중" : "추천 결과 삭제"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </footer>
    </div>
  );
}
