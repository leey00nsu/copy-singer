import { AudioLines, CalendarDays, ChevronRight } from "lucide-react";
import Link from "next/link";
import { presentVocalProfile, type VocalProfileAnalysisJobResponse } from "@/entities/vocal-profile";
import { buttonVariants } from "@/shared/ui/button";
import { StatePanel } from "@/shared/ui/state-panel";
import { VocalProfileAnalysisJobCards } from "./vocal-profile-analysis-job-cards";

export type VocalProfileHistoryPayload = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  profiles: Array<{
    id: string;
    minMidi: number;
    maxMidi: number;
    medianMidi: number;
    tessituraLowMidi: number;
    tessituraHighMidi: number;
    voicedRatio: number;
    pitchStability: number;
    clippingRatio: number;
    rmsDb: number;
    analyzer: string;
    analyzerVersion: string;
    durationMs: number | null;
    mimeType: string;
    recommendationCount: number;
    mixingCount: number;
    latestRecommendationId: string | null;
    createdAt: string;
  }>;
};

export function VocalProfileHistoryList({
  history,
  analysisJobs = [],
}: {
  history: VocalProfileHistoryPayload;
  analysisJobs?: VocalProfileAnalysisJobResponse[];
}) {
  if (history.profiles.length === 0 && analysisJobs.length === 0) {
    return (
      <StatePanel
        action={
          <Link className={buttonVariants()} href="/profile">
            첫 프로필 만들기
          </Link>
        }
        description="노래 한 소절을 분석하면 음역과 제출한 보컬을 여기에 보관합니다."
        icon={<AudioLines />}
        title="아직 저장된 보컬 프로필이 없어요."
      />
    );
  }

  return (
    <div className="divide-y border-y">
      <VocalProfileAnalysisJobCards jobs={analysisJobs} />
      {history.profiles.map((profile) => {
        const presentation = presentVocalProfile(profile);
        return (
          <article
            className="grid gap-5 bg-background py-6 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(5.5rem,.55fr))_auto] md:items-center"
            key={profile.id}
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.14em] text-data-accent-foreground">
                VOCAL PROFILE<span className="sr-only"> 보컬 프로필</span>
              </p>
              <h2 className="mt-2 truncate text-lg font-semibold">{presentation.label}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3" aria-hidden="true" />
                  {new Date(profile.createdAt).toLocaleDateString("ko-KR")}
                </span>
                <span>{profile.durationMs ? `${(profile.durationMs / 1000).toFixed(1)}초` : "길이 정보 없음"}</span>
              </p>
            </div>
            <dl className="contents">
              {[
                ["실용 음역", presentation.practicalRange.label],
                ["안정도", `${presentation.stability.percent}%`],
                ["추천 · 믹싱", `${profile.recommendationCount} · ${profile.mixingCount}`],
              ].map(([label, value]) => (
                <div className="border-l pl-3" key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <Link
              aria-label={`${presentation.label} 분석과 제출 보컬 보기`}
              className={buttonVariants({ variant: "outline" })}
              href={`/vocal-profiles/${profile.id}`}
            >
              상세 보기 <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </article>
        );
      })}
    </div>
  );
}
