"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock3, LoaderCircle, Mic2, Music2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import {
  DEFAULT_RECOMMENDATION_FILTERS,
  parseRecommendationFilters,
  projectRecommendationItems,
  type RecommendationFilters,
  type RecommendationRunResponse,
  recommendationDetailQueryOptions,
  recommendationMixingUnavailableDescription,
  recommendationRank,
  serializeRecommendationFilters,
} from "@/entities/recommendation";
import { useRecommendationMixing } from "@/features/create-mixing";
import { ApiError } from "@/shared/api";
import { Button, buttonVariants } from "@/shared/ui/button";
import { ProductPageIntro } from "@/shared/ui/product-page-intro";
import { StatePanel } from "@/shared/ui/state-panel";
import { StatusNotice } from "@/shared/ui/status-notice";
import { CreationFunnelShell } from "@/widgets/creation-funnel";
import { RecommendationFilterBar } from "./recommendation-filter-bar";
import { RecommendationSelection } from "./recommendation-selection";
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
  ticketCost = 1,
}: {
  initialRun?: RecommendationRunResponse;
  runId?: string;
  ticketCost?: number;
}) {
  const resolvedRunId = initialRun?.id ?? runId ?? null;
  const runQuery = useQuery(recommendationDetailQueryOptions(resolvedRunId, initialRun));
  const { filters, resetFilters, updateFilters } = useRecommendationFilters();
  const { startMixing } = useRecommendationMixing();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const run = runQuery.data ?? null;
  const loadError: "not-found" | "failed" | null =
    !resolvedRunId || runQuery.error
      ? runQuery.error instanceof ApiError && runQuery.error.status === 404
        ? "not-found"
        : "failed"
      : null;

  const startItem = (itemId: string, retry = false) => {
    if (!run || run.profile.mixing?.available === false) return;
    startMixing(run, itemId, retry);
  };

  if (loadError) {
    return (
      <StatePanel
        action={
          <Link className={buttonVariants()} href="/library?tab=profiles">
            보컬 프로필로 이동
          </Link>
        }
        className="min-h-[60vh]"
        description={
          loadError === "not-found"
            ? "삭제됐거나 올바르지 않은 주소예요."
            : "잠시 뒤 다시 시도해 주세요. 계속 문제가 생기면 보컬 프로필에서 추천을 다시 확인해 주세요."
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
  const selectedItem = visibleItems.find((item) => item.id === selectedItemId) ?? visibleItems[0] ?? null;
  const selectedMatchRank = selectedItem ? recommendationRank(run.items, selectedItem.id) : null;

  return (
    <CreationFunnelShell currentStep="recommendation">
      <ProductPageIntro
        aside={
          <div className="hidden min-w-64 gap-2 rounded-2xl bg-muted/30 p-4 text-xs lg:grid">
            <p className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">비교한 곡</span>
              <strong>{run.items.length}곡</strong>
            </p>
            <p className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">믹싱 방식</span>
              <strong>선택한 곡만 시작</strong>
            </p>
          </div>
        }
        className="mt-8 pb-7 lg:mt-10"
        description={
          <>이번 보컬 프로필로 {run.items.length}곡을 비교했어요. 각 곡의 추천 키와 이유를 확인할 수 있어요.</>
        }
        eyebrow="Song match"
        title="내 목소리에 맞는 노래"
        variant="task"
      />

      {run.lowConfidence ? (
        <StatusNotice
          className="mt-8"
          description="더 긴 소절로 다시 분석하면 순위와 추천 키가 달라질 수 있어요."
          title="녹음이 짧아 추천이 달라질 수 있어요"
          tone="warning"
        />
      ) : null}

      {run.profile.mixing?.available === false ? (
        <StatusNotice
          action={
            <Link className={buttonVariants({ size: "sm", variant: "outline" })} href="/profile">
              <Mic2 className="size-4" aria-hidden="true" /> 새 프로필 분석하기
            </Link>
          }
          className="mt-5"
          description={recommendationMixingUnavailableDescription(run.profile.mixing)}
          title="이 프로필로는 AI 믹싱을 만들 수 없어요"
          tone="warning"
        />
      ) : null}

      <div className="mt-8 rounded-2xl bg-muted/55 p-4 sm:p-5" data-recommendation-filter-surface>
        <RecommendationFilterBar
          filters={filters}
          onChange={updateFilters}
          onReset={resetFilters}
          resultCount={visibleItems.length}
          totalCount={run.items.length}
        />
      </div>

      <div className="mt-7 grid gap-8 pb-24 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:pb-0">
        <section aria-label="추천 노래 비교 목록">
          {visibleItems.length > 0 && selectedItem ? (
            <RecommendationSongList
              items={visibleItems}
              mixing={run.profile.mixing}
              onSelect={setSelectedItemId}
              onStart={startItem}
              selectedItemId={selectedItem.id}
              ticketCost={ticketCost}
            />
          ) : (
            <StatePanel
              action={
                <Button onClick={resetFilters} variant="outline">
                  모든 조건 지우기
                </Button>
              }
              description="검색어나 필터를 바꿔 다시 찾아보세요."
              icon={<Music2 />}
              title="조건에 맞는 노래가 없어요."
            />
          )}
        </section>
        {selectedItem ? (
          <RecommendationSelection
            item={selectedItem}
            matchRank={selectedMatchRank}
            mixing={run.profile.mixing}
            onStart={startItem}
            runId={run.id}
            ticketCost={ticketCost}
          />
        ) : null}
      </div>

      <section className="mt-10 grid gap-5 py-6 text-xs leading-6 text-muted-foreground lg:grid-cols-2">
        <div className="flex gap-3">
          <Mic2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            추천은 음역을 기준으로 계산한 참고값이에요. 가창력이나 건강 상태를 평가하지 않아요. 추천 키는 직접 부를 때
            참고해 주세요.
          </p>
        </div>
        <div className="flex gap-3">
          <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            곡을 선택해 AI 믹싱을 시작하기 전에는 작업이 생기지 않아요. 시작한 작업은 라이브러리에서 확인할 수 있어요.
          </p>
        </div>
      </section>
    </CreationFunnelShell>
  );
}
