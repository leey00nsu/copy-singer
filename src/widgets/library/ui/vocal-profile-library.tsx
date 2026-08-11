"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, AudioLines, LoaderCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  presentVocalProfile,
  type VocalProfileAnalysisJobResponse,
  VocalProfileArtwork,
  type VocalProfileHistoryPayload,
} from "@/entities/vocal-profile";
import { isActiveAnalysisJob, vocalProfileAnalysisJobsQueryOptions } from "@/features/analyze-vocal-profile";
import { Badge } from "@/shared/ui/badge";
import { buttonVariants } from "@/shared/ui/button";
import { ResourceRowLink, resourceRowInteractiveClassName } from "@/shared/ui/resource-row-link";
import { StatePanel } from "@/shared/ui/state-panel";
import { LibraryPagination } from "./library-pagination";

const PROFILE_ROW_GRID_CLASS =
  "grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(8rem,1fr)_minmax(6rem,.75fr)_minmax(5rem,.6fr)_minmax(5rem,.6fr)_minmax(7rem,.75fr)] md:items-center md:gap-0";

function analysisJobCopy(job: VocalProfileAnalysisJobResponse) {
  if (job.status === "processing") {
    return {
      title: "보컬 프로필 분석 중",
      detail: "음정 분포와 믹싱에 사용할 보컬 레퍼런스를 만들고 있어요.",
      badge: "분석 중",
    };
  }
  if (job.status === "pending" && job.attempts > 0 && job.error?.retryable) {
    return {
      title: "분석을 다시 시도하고 있어요",
      detail: "일시적인 연결 문제로 작업이 자동 재시도 대기 중입니다.",
      badge: `재시도 ${job.attempts}/${job.maxAttempts}`,
    };
  }
  if (job.status === "pending") {
    return {
      title: "보컬 프로필 분석 대기 중",
      detail: "업로드는 안전하게 저장됐고 백그라운드 작업 순서를 기다리고 있어요.",
      badge: "대기 중",
    };
  }
  return {
    title: "보컬 프로필을 만들지 못했어요",
    detail: job.error?.detail || "분석 작업이 완료되지 않았습니다.",
    badge: "실패",
  };
}

function VocalProfileAnalysisJobRows({ jobs }: { jobs: VocalProfileAnalysisJobResponse[] }) {
  const router = useRouter();
  const jobsQuery = useQuery(vocalProfileAnalysisJobsQueryOptions(jobs));
  const currentJobs = jobsQuery.data?.jobs ?? jobs;
  const activeIds = useRef(jobs.filter(isActiveAnalysisJob).map((job) => job.id));

  useEffect(() => {
    if (!jobsQuery.data) return;
    const visibleIds = new Set(jobsQuery.data.jobs.map((job) => job.id));
    const profileCompleted = activeIds.current.some((id) => !visibleIds.has(id));
    activeIds.current = jobsQuery.data.jobs.filter(isActiveAnalysisJob).map((job) => job.id);
    if (profileCompleted) router.refresh();
  }, [jobsQuery.data, router]);

  return (
    <>
      {jobsQuery.isError ? (
        <p className="border-b py-3 text-sm text-destructive" role="status">
          분석 상태를 새로 확인하지 못했어요. 마지막으로 확인한 상태를 표시합니다.
        </p>
      ) : null}
      {currentJobs.map((job) => {
        const copy = analysisJobCopy(job);
        const failed = job.status === "failed";
        return (
          <article
            aria-busy={!failed}
            className={`${PROFILE_ROW_GRID_CLASS} bg-background px-3 py-3.5`}
            data-analysis-job-row={job.status}
            key={job.id}
          >
            <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1" data-profile-column="identity">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
                {failed ? (
                  <AlertTriangle aria-hidden="true" className="size-5 text-destructive" />
                ) : (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-5 animate-spin text-data-accent-foreground motion-reduce:animate-none"
                  />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {failed ? (
                    <span className="size-1.5 shrink-0 rounded-full bg-destructive" aria-hidden="true" />
                  ) : (
                    <span className="size-1.5 shrink-0 rounded-full bg-data-accent" aria-hidden="true" />
                  )}
                  <h2 className="truncate text-sm font-semibold">{copy.title}</h2>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{copy.detail}</p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground" data-profile-column="created-at">
              <p>{new Date(job.createdAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}</p>
              <p className="mt-1 text-[10px]">
                시도 {Math.min(job.attempts, job.maxAttempts)} / {job.maxAttempts}
              </p>
            </div>
            <p className="text-xs text-muted-foreground" data-profile-column="range">
              <span className="md:sr-only">음역 </span>—
            </p>
            <p className="text-xs text-muted-foreground" data-profile-column="stability">
              <span className="md:sr-only">안정도 </span>—
            </p>
            <p className="text-xs text-muted-foreground" data-profile-column="mixes">
              <span className="md:sr-only">AI 믹싱 </span>—
            </p>
            <div
              className="order-first col-span-2 flex flex-wrap items-center gap-2 md:order-none md:col-span-1"
              data-profile-column="status"
            >
              <Badge variant={failed ? "destructive" : "secondary"}>{copy.badge}</Badge>
              {failed ? (
                <Link className={buttonVariants({ size: "xs", variant: "outline" })} href="/profile">
                  <RotateCcw aria-hidden="true" className="size-4" /> 다시 분석하기
                </Link>
              ) : null}
            </div>
          </article>
        );
      })}
    </>
  );
}

export function VocalProfileLibrary({
  analysisJobs = [],
  basePath = "/vocal-profiles",
  history,
}: {
  analysisJobs?: VocalProfileAnalysisJobResponse[];
  basePath?: "/library" | "/vocal-profiles";
  history: VocalProfileHistoryPayload;
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
    <section aria-label="보컬 프로필 목록">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p aria-live="polite">보컬 프로필 {history.total}개</p>
        <p>최신 분석순</p>
      </div>
      <div className="hidden grid-cols-[minmax(0,2fr)_minmax(8rem,1fr)_minmax(6rem,.75fr)_minmax(5rem,.6fr)_minmax(5rem,.6fr)_minmax(7rem,.75fr)] border-y bg-muted/15 px-3 py-2 text-[11px] font-medium text-muted-foreground md:grid">
        <span>프로필 이름</span>
        <span>생성일</span>
        <span>음역 (최저–최고)</span>
        <span>안정도</span>
        <span>AI 믹싱</span>
        <span>상태</span>
      </div>
      <div className="divide-y border-b">
        <VocalProfileAnalysisJobRows jobs={analysisJobs} />
        {history.profiles.map((profile) => {
          const presentation = presentVocalProfile(profile);
          return (
            <article
              className={`${resourceRowInteractiveClassName} ${PROFILE_ROW_GRID_CLASS} bg-background px-3 py-3.5`}
              key={profile.id}
            >
              <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1" data-profile-column="identity">
                <VocalProfileArtwork className="size-11" profileId={profile.id} />
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">
                    <ResourceRowLink
                      aria-label={`${profile.displayName} 분석과 제출 보컬 보기`}
                      className="underline-offset-4 group-hover/resource-row:underline"
                      href={`/vocal-profiles/${profile.id}`}
                    >
                      {profile.displayName}
                    </ResourceRowLink>
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {profile.durationMs ? `${(profile.durationMs / 1000).toFixed(1)}초` : "길이 정보 없음"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground" data-profile-column="created-at">
                <span className="mr-1 text-[10px] md:sr-only">생성</span>
                {new Date(profile.createdAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}
              </p>
              <p className="text-xs font-medium" data-profile-column="range">
                <span className="mr-1 text-[10px] font-normal text-muted-foreground md:sr-only">음역</span>
                {presentation.practicalRange.label}
              </p>
              <p className="text-xs font-medium tabular-nums" data-profile-column="stability">
                <span className="mr-1 text-[10px] font-normal text-muted-foreground md:sr-only">안정도</span>
                {presentation.stability.percent}%
              </p>
              <p className="text-[11px] text-muted-foreground sm:text-xs" data-profile-column="mixes">
                <span className="mr-1 text-[10px] md:sr-only">AI 믹싱</span>
                {profile.mixingCount}개
              </p>
              <div className="order-first col-span-2 md:order-none md:col-span-1" data-profile-column="status">
                <Badge variant="secondary">사용 가능</Badge>
              </div>
            </article>
          );
        })}
      </div>
      <LibraryPagination
        getHref={(page) =>
          basePath === "/library" ? `/library?tab=profiles&page=${page}` : `${basePath}?page=${page}`
        }
        label="보컬 프로필 페이지"
        page={history.page}
        pageCount={history.pageCount}
      />
    </section>
  );
}
