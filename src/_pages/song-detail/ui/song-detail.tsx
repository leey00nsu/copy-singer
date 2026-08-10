"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, AudioLines, Gauge, Info, Music2, Ticket } from "lucide-react";
import Link from "next/link";
import {
  formatRecommendedShift,
  type RecommendationRunResponse,
  recommendationDetailQueryOptions,
  recommendationMatchPercent,
  safeRecommendationSourceUrl,
  selectRecommendationItem,
} from "@/entities/recommendation";
import { midiToNoteName } from "@/entities/vocal-profile";
import { RecommendationMixingAction, useRecommendationMixing } from "@/features/create-mixing";
import { Badge } from "@/shared/ui/badge";
import { buttonVariants } from "@/shared/ui/button";
import { StatePanel } from "@/shared/ui/state-panel";

function noteRange(lowMidi: number, highMidi: number) {
  return `${midiToNoteName(lowMidi)}–${midiToNoteName(highMidi)}`;
}

function percent(value: number) {
  return Math.round(Math.min(1, Math.max(0, value)) * 100);
}

function semitones(value: number) {
  return `${Math.max(0, value).toFixed(1)}반음`;
}

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

  const sourceUrl = safeRecommendationSourceUrl(item);
  const songProfile = item.songProfile;
  const shift = item.recommendedShift;
  const recommended = item.metrics.recommended;
  const scoreGain = Math.round(item.adjustedScore) - Math.round(item.originalKeyScore);

  return (
    <div className="mx-auto w-full max-w-[72rem] px-5 py-10 sm:px-7 lg:px-8 lg:py-12">
      <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href={`/recommendations/${run.id}`}>
        <ArrowLeft className="size-4" aria-hidden="true" /> 추천 목록으로
      </Link>

      <header className="mt-10 grid gap-10 border-b pb-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-data-accent-foreground uppercase">
            Song match · #{item.rank}
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
          {sourceUrl ? (
            <a
              className={buttonVariants({ variant: "outline" })}
              href={sourceUrl}
              rel="noreferrer noopener"
              target="_blank"
            >
              외부 출처 열기 <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          ) : null}
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
          키 조정 결과
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          저장된 추천 계산 결과입니다. 실제 가창에서는 곡과 컨디션에 따라 다르게 느껴질 수 있습니다.
        </p>
        <dl className="mt-5 grid border-y sm:grid-cols-3 sm:divide-x">
          <div className="px-1 py-5 sm:px-6">
            <dt className="text-xs text-muted-foreground">원키 적합도</dt>
            <dd className="mt-2 text-2xl font-semibold">{Math.round(item.originalKeyScore)}%</dd>
          </div>
          <div className="border-t px-1 py-5 sm:border-t-0 sm:px-6">
            <dt className="text-xs text-muted-foreground">{formatRecommendedShift(shift)} 적합도</dt>
            <dd className="mt-2 text-2xl font-semibold text-data-accent-foreground">
              {Math.round(item.adjustedScore)}%
            </dd>
          </div>
          <div className="border-t px-1 py-5 sm:border-t-0 sm:px-6">
            <dt className="text-xs text-muted-foreground">키 조정 변화</dt>
            <dd className="mt-2 text-2xl font-semibold">{scoreGain > 0 ? `+${scoreGain}` : scoreGain}%p</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-14 border-t pt-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="range-title">
            <h2 className="text-lg font-semibold" id="range-title">
              음역 비교
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">사용자 분석값과 저장된 곡 분석값만 비교합니다.</p>
            <div className="mt-5 grid border-y md:grid-cols-2 md:divide-x">
              <div className="px-1 py-6 md:px-6">
                <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">MY VOICE</p>
                <dl className="mt-4 grid gap-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">실용 음역</dt>
                    <dd className="font-semibold">
                      {noteRange(run.profile.tessituraLowMidi, run.profile.tessituraHighMidi)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">전체 관측</dt>
                    <dd>{noteRange(run.profile.minMidi, run.profile.maxMidi)}</dd>
                  </div>
                </dl>
              </div>
              <div className="border-t px-1 py-6 md:border-t-0 md:px-6">
                <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">SONG RANGE</p>
                {songProfile ? (
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">원키 실용 음역</dt>
                      <dd>{noteRange(songProfile.tessituraLowMidi, songProfile.tessituraHighMidi)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">추천 키 반영</dt>
                      <dd className="font-semibold text-data-accent-foreground">
                        {noteRange(songProfile.tessituraLowMidi + shift, songProfile.tessituraHighMidi + shift)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">곡 전체 관측</dt>
                      <dd>{noteRange(songProfile.minMidi, songProfile.maxMidi)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">곡 중앙음</dt>
                      <dd>{midiToNoteName(songProfile.medianMidi)}</dd>
                    </div>
                  </dl>
                ) : (
                  <div className="mt-4 flex gap-3 border-l-2 border-warning px-4 py-2 text-sm leading-6">
                    <AudioLines className="mt-0.5 size-4 shrink-0 text-warning-foreground" aria-hidden="true" />
                    <p>
                      <strong>곡 음역을 표시할 수 없어요.</strong>
                      <br />
                      <span className="text-muted-foreground">
                        저장된 곡 분석이 없거나 불완전합니다. 값을 추정하지 않습니다.
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section aria-labelledby="reason-title">
            <h2 className="text-lg font-semibold" id="reason-title">
              이 곡을 추천한 이유
            </h2>
            {item.reasons.length > 0 ? (
              <ol className="mt-5 divide-y border-y">
                {item.reasons.map((reason, index) => (
                  <li
                    className="flex gap-4 py-4 text-sm leading-6"
                    key={`${item.reasonCodes[index] ?? "reason"}-${index}`}
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-5 border-y py-5 text-sm text-muted-foreground">저장된 추천 근거가 없습니다.</p>
            )}
          </section>

          <section aria-labelledby="breakdown-title">
            <h2 className="text-lg font-semibold" id="breakdown-title">
              분석 근거
            </h2>
            <dl className="mt-5 grid border-y sm:grid-cols-3 sm:divide-x">
              <div className="px-1 py-5 sm:px-5">
                <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Gauge className="size-4" aria-hidden="true" /> 실용 음역 겹침
                </dt>
                <dd className="mt-2 text-xl font-semibold">{percent(recommended.tessituraOverlapRatio)}%</dd>
              </div>
              <div className="border-t px-1 py-5 sm:border-t-0 sm:px-5">
                <dt className="text-xs text-muted-foreground">남은 고음 부담</dt>
                <dd className="mt-2 text-xl font-semibold">
                  {semitones(recommended.highTessituraExcess + recommended.highExtremeExcess)}
                </dd>
              </div>
              <div className="border-t px-1 py-5 sm:border-t-0 sm:px-5">
                <dt className="text-xs text-muted-foreground">분석 신뢰도</dt>
                <dd className="mt-2 text-xl font-semibold">{percent(item.metrics.confidence)}%</dd>
              </div>
            </dl>
            <p className="mt-4 flex gap-2 text-xs leading-5 text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> 이 수치는 저장된 score breakdown을 읽기
              쉽게 요약한 값이며 가창력 평가가 아닙니다.
            </p>
          </section>
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
              onStart={(selectedItemId, retry) => startMixing(run.id, selectedItemId, retry)}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
