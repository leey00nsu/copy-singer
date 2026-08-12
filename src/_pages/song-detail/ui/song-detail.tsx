"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Music2, Ticket } from "lucide-react";
import Link from "next/link";
import {
  formatRecommendedShift,
  type RecommendationRunResponse,
  recommendationDetailQueryOptions,
  recommendationMatchPercent,
  selectRecommendationItem,
  visibleRecommendationReasons,
  YouTubeVideo,
} from "@/entities/recommendation";
import { VocalRangeProfile } from "@/entities/vocal-profile";
import { RecommendationMixingAction, useRecommendationMixing } from "@/features/create-mixing";
import { Badge } from "@/shared/ui/badge";
import { buttonVariants } from "@/shared/ui/button";
import { StatePanel } from "@/shared/ui/state-panel";

export function SongDetail({
  initialRun,
  itemId,
  ticketCost,
}: {
  initialRun: RecommendationRunResponse;
  itemId: string;
  ticketCost: number;
}) {
  const runQuery = useQuery(recommendationDetailQueryOptions(initialRun.id, initialRun));
  const run = runQuery.data ?? initialRun;
  const item = selectRecommendationItem(run, itemId);
  const { startMixing } = useRecommendationMixing();

  if (!item) {
    return (
      <StatePanel
        action={
          <Link className={buttonVariants()} href={`/recommendations/${run.id}`}>
            추천 목록으로
          </Link>
        }
        className="min-h-[60vh]"
        description="추천 목록이 갱신되었거나 이 결과에 포함되지 않은 곡입니다."
        icon={<Music2 />}
        title="추천 곡을 찾을 수 없어요."
      />
    );
  }

  const shift = item.recommendedShift;
  const scoreGain = Math.round(item.adjustedScore) - Math.round(item.originalKeyScore);
  const visibleReasons = visibleRecommendationReasons(item);

  return (
    <div className="mx-auto w-full max-w-[72rem] px-5 py-10 sm:px-7 lg:px-8 lg:py-12">
      <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href={`/recommendations/${run.id}`}>
        <ArrowLeft className="size-4" aria-hidden="true" /> 추천 목록으로
      </Link>

      <section aria-label="원본 영상" className="mt-8 max-w-4xl">
        <YouTubeVideo title={`${item.title} · ${item.artist}`} videoId={item.sourceVideoId} />
      </section>

      <header className="mt-8 grid gap-10 pb-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-data-accent-foreground uppercase">
            Song match
          </p>
          <h1 className="mt-4 text-[clamp(2.5rem,5vw,4.5rem)] font-semibold leading-none tracking-[-0.055em]">
            {item.title}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">{item.artist}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant="secondary">원키 {item.originalKey ?? "정보 없음"}</Badge>
            <Badge>{formatRecommendedShift(shift)} 추천</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <div className="min-w-28 border-l pl-4">
            <p className="text-xs text-muted-foreground">추천 적합도</p>
            <p className="mt-1 text-3xl font-semibold text-data-accent-foreground">
              {recommendationMatchPercent(item)}%
            </p>
          </div>
        </div>
      </header>

      <section aria-labelledby="score-title" className="py-8 sm:py-10 lg:py-12">
        <h2 className="text-lg font-semibold" id="score-title">
          분석 결과
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          저장된 추천 계산 결과입니다. 실제 가창에서는 곡과 컨디션에 따라 다르게 느껴질 수 있습니다.
        </p>
        <dl className="mt-5 grid gap-1 rounded-2xl bg-muted/25 p-1 sm:grid-cols-3">
          <div className="rounded-xl bg-background/75 px-4 py-5 sm:px-6">
            <dt className="text-xs text-muted-foreground">원키 적합도</dt>
            <dd className="mt-2 text-2xl font-semibold">{Math.round(item.originalKeyScore)}%</dd>
          </div>
          <div className="rounded-xl bg-background/75 px-4 py-5 sm:px-6">
            <dt className="text-xs text-muted-foreground">{formatRecommendedShift(shift)} 적합도</dt>
            <dd className="mt-2 text-2xl font-semibold text-data-accent-foreground">
              {Math.round(item.adjustedScore)}%
            </dd>
          </div>
          <div className="rounded-xl bg-background/75 px-4 py-5 sm:px-6">
            <dt className="text-xs text-muted-foreground">키 조정 변화</dt>
            <dd className="mt-2 text-2xl font-semibold">{scoreGain > 0 ? `+${scoreGain}` : scoreGain}%p</dd>
          </div>
        </dl>
        <div className="mt-8 rounded-3xl bg-muted/15 p-4 sm:p-6" data-song-analysis-chapter="vocal-range">
          <VocalRangeProfile profile={run.profile} title="내 목소리 음역" />
        </div>
      </section>

      <div className="grid gap-14 pt-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-10">
          {visibleReasons.length > 0 ? (
            <section aria-labelledby="reason-title">
              <h2 className="text-lg font-semibold" id="reason-title">
                이 곡을 추천한 이유
              </h2>
              <ol className="mt-5 divide-y">
                {visibleReasons.map(({ code, reason }, index) => (
                  <li className="flex gap-4 py-4 text-sm leading-6" key={`${code ?? "reason"}-${index}`}>
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>

        <aside className="h-fit rounded-lg border bg-background p-6 lg:sticky lg:top-28" aria-labelledby="mixing-title">
          <p className="text-xs font-semibold tracking-[0.16em] text-data-accent-foreground">OPTIONAL AI MIXING</p>
          <h2 className="mt-2 text-xl font-semibold" id="mixing-title">
            이 곡으로 AI 믹싱
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            분석에 사용한 내 목소리와 준비된 곡 target으로 믹싱합니다. 선택한 경우에만 작업이 시작됩니다.
          </p>
          <p className="mt-4 flex items-center gap-2 text-sm font-medium">
            <Ticket className="size-4" aria-hidden="true" /> 티켓 {ticketCost}개 사용
          </p>
          <div className="mt-5">
            <RecommendationMixingAction
              item={item}
              mixing={run.profile.mixing}
              onStart={(selectedItemId, retry) => startMixing(run.id, selectedItemId, retry)}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
