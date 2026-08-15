"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Music2, Ticket } from "lucide-react";
import Link from "next/link";
import {
  formatRecommendedShift,
  type RecommendationRunResponse,
  recommendationDetailQueryOptions,
  recommendationScore,
  selectRecommendationItem,
  visibleRecommendationReasons,
  YouTubeVideo,
} from "@/entities/recommendation";
import { midiToKoreanNoteName, VocalRangeProfile } from "@/entities/vocal-profile";
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
        description="추천 목록이 바뀌었거나 현재 결과에 없는 곡이에요."
        icon={<Music2 />}
        title="추천 곡을 찾을 수 없어요."
      />
    );
  }

  const shift = item.recommendedShift;
  const scoreGain = Math.round(item.adjustedScore) - Math.round(item.originalKeyScore);
  const visibleReasons = visibleRecommendationReasons(item);
  const userMajorRange = `${midiToKoreanNoteName(run.profile.tessituraLowMidi)}–${midiToKoreanNoteName(run.profile.tessituraHighMidi)}`;
  const songMajorRange = item.songProfile
    ? `${midiToKoreanNoteName(item.songProfile.tessituraLowMidi)}–${midiToKoreanNoteName(item.songProfile.tessituraHighMidi)}`
    : null;

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
            <p className="text-xs text-muted-foreground">추천 점수</p>
            <p className="mt-1 text-3xl font-semibold text-data-accent-foreground">{recommendationScore(item)}점</p>
          </div>
        </div>
      </header>

      <section aria-labelledby="score-title" className="py-8 sm:py-10 lg:py-12">
        <h2 className="text-lg font-semibold" id="score-title">
          분석 결과
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          현재 보컬 프로필을 기준으로 계산한 결과예요. 실제로 부를 때는 컨디션에 따라 다르게 느껴질 수 있어요.
        </p>
        <dl className="mt-5 grid gap-1 rounded-2xl bg-muted/55 p-1 sm:grid-cols-3">
          <div className="rounded-xl bg-background px-4 py-5 sm:px-6">
            <dt className="text-xs text-muted-foreground">원키 적합도</dt>
            <dd className="mt-2 text-2xl font-semibold">{Math.round(item.originalKeyScore)}점</dd>
          </div>
          <div className="rounded-xl bg-background px-4 py-5 sm:px-6">
            <dt className="text-xs text-muted-foreground">{formatRecommendedShift(shift)} 적합도</dt>
            <dd className="mt-2 text-2xl font-semibold text-data-accent-foreground">
              {Math.round(item.adjustedScore)}점
            </dd>
          </div>
          <div className="rounded-xl bg-background px-4 py-5 sm:px-6">
            <dt className="text-xs text-muted-foreground">키 조정 변화</dt>
            <dd className="mt-2 text-2xl font-semibold">{scoreGain > 0 ? `+${scoreGain}` : scoreGain}점</dd>
          </div>
        </dl>
        <div className="mt-8 rounded-3xl bg-muted/55 p-4 sm:p-6" data-song-analysis-chapter="vocal-range">
          <div>
            <h3 className="text-sm font-semibold">주요 음역 비교</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              이번 녹음과 곡 보컬 분석에서 자주 관찰된 음높이 구간을 같은 기준으로 비교해요.
            </p>
          </div>
          <dl className="mt-4 grid gap-1 rounded-2xl bg-muted/55 p-1 sm:grid-cols-2">
            <div className="rounded-xl bg-background px-4 py-4">
              <dt className="text-xs text-muted-foreground">내 주요 음역</dt>
              <dd className="mt-1.5 text-sm font-semibold">{userMajorRange}</dd>
            </div>
            <div className="rounded-xl bg-background px-4 py-4">
              <dt className="text-xs text-muted-foreground">곡 주요 음역</dt>
              <dd className="mt-1.5 text-sm font-semibold">{songMajorRange ?? "분석 정보 없음"}</dd>
            </div>
          </dl>
          <div className={`mt-6 grid gap-6 ${item.songProfile ? "lg:grid-cols-2" : ""}`}>
            <VocalRangeProfile profile={run.profile} title="내 음역" />
            {item.songProfile ? <VocalRangeProfile profile={item.songProfile} title="곡 보컬 음역" /> : null}
          </div>
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
            이 곡과 보컬 프로필로 AI 믹싱을 만들어요. 아래 버튼을 눌러야 작업이 시작돼요.
          </p>
          <p className="mt-4 flex items-center gap-2 text-sm font-medium">
            <Ticket className="size-4" aria-hidden="true" /> 티켓 {ticketCost}개 사용
          </p>
          <div className="mt-5">
            <RecommendationMixingAction
              item={item}
              mixing={run.profile.mixing}
              onStart={(selectedItemId, retry) => startMixing(run, selectedItemId, retry)}
              ticketCost={ticketCost}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
