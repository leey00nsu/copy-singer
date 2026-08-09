"use client";

import { AlertTriangle, Clock3, LoaderCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { VocalProfileAnalysisJobResponse } from "@/lib/vocal-profile/contract";

const POLL_INTERVAL_MS = 3_000;

function jobCopy(job: VocalProfileAnalysisJobResponse) {
  if (job.status === "processing") {
    return {
      title: "보컬 프로필 분석 중",
      detail: "Modal에서 음정 분포와 스마트 레퍼런스를 만들고 있어요.",
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

export function VocalProfileAnalysisJobCards({ jobs }: { jobs: VocalProfileAnalysisJobResponse[] }) {
  const [currentJobs, setCurrentJobs] = useState(jobs);
  const activeKey = currentJobs
    .filter((job) => job.status === "pending" || job.status === "processing")
    .map((job) => job.id)
    .join(",");

  useEffect(() => {
    if (!activeKey) return;
    const activeIds = new Set(activeKey.split(","));
    let active = true;
    const poll = async () => {
      try {
        const response = await fetch("/api/vocal-profile-analysis-jobs", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { jobs?: VocalProfileAnalysisJobResponse[] };
        const updates = Array.isArray(payload.jobs) ? payload.jobs : [];
        if (!active) return;
        const visibleIds = new Set(updates.map((job) => job.id));
        if ([...activeIds].some((id) => !visibleIds.has(id))) {
          window.location.reload();
          return;
        }
        setCurrentJobs(updates);
      } catch {
        // Keep the last known status and try again on the next interval.
      }
    };
    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeKey]);

  return currentJobs.map((job) => {
    const copy = jobCopy(job);
    const failed = job.status === "failed";
    return (
      <article className="rounded-2xl border bg-background p-5 shadow-sm" key={job.id}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant={failed ? "destructive" : "secondary"}>{copy.badge}</Badge>
            <div className="mt-3 flex items-center gap-2">
              {failed ? (
                <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />
              ) : (
                <LoaderCircle className="size-5 animate-spin text-emerald-600" aria-hidden="true" />
              )}
              <h2 className="text-lg font-semibold">{copy.title}</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.detail}</p>
          </div>
          <div className="shrink-0 text-right text-xs text-muted-foreground">
            <p className="flex items-center gap-1">
              <Clock3 className="size-3" aria-hidden="true" />
              {new Date(job.createdAt).toLocaleString("ko-KR")}
            </p>
            <p className="mt-1">
              시도 {Math.min(job.attempts, job.maxAttempts)} / {job.maxAttempts}
            </p>
          </div>
        </div>
        {failed ? (
          <Link className={`${buttonVariants({ variant: "outline" })} mt-5 w-full`} href="/profile">
            <RotateCcw className="size-4" aria-hidden="true" /> 새 프로필 만들기
          </Link>
        ) : (
          <div className="mt-5 rounded-xl bg-muted/45 px-4 py-3 text-xs leading-5 text-muted-foreground">
            이 페이지를 닫아도 분석은 계속됩니다. 완료되면 저장된 보컬 프로필 카드로 자동 전환됩니다.
          </div>
        )}
      </article>
    );
  });
}
