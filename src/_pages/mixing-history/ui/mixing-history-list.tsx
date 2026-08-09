"use client";

import { AlertTriangle, CheckCircle2, Clock3, Download, LoaderCircle, Music2, Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import type { MixingHistoryPayload } from "@/entities/mixing-job";
import { AudioWaveformPlayer } from "@/shared/ui/audio-waveform-player";
import { Badge } from "@/shared/ui/badge";
import { buttonVariants } from "@/shared/ui/button";

const ACTIVE = new Set(["pending", "preparing", "submitted", "processing"]);
const STATUS_LABELS: Record<string, string> = {
  pending: "대기 중",
  preparing: "음원 준비 중",
  submitted: "GPU 대기 중",
  processing: "믹싱 중",
  succeeded: "완료",
  failed: "실패",
  canceled: "취소",
};

export function MixingHistoryList({ initial }: { initial: MixingHistoryPayload }) {
  const [history, setHistory] = useState(initial);
  useEffect(() => {
    if (!history.jobs.some((job) => ACTIVE.has(job.status))) return;
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/mixing-jobs?page=${history.page}`, { cache: "no-store" }).catch(() => null);
      if (response?.ok) setHistory((await response.json()) as MixingHistoryPayload);
    }, 5_000);
    return () => window.clearTimeout(timer);
  }, [history]);

  if (history.jobs.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed p-12 text-center">
        <Music2 className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-4 font-medium">아직 믹싱 내역이 없어요.</p>
        <p className="mt-2 text-sm text-muted-foreground">추천 목록에서 듣고 싶은 곡의 AI 믹싱을 시작해보세요.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {history.jobs.map((job) => {
        const active = ACTIVE.has(job.status);
        return (
          <article className="rounded-2xl border bg-background p-5" key={job.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={job.status === "succeeded" ? "default" : "secondary"}>
                    {active ? (
                      <LoaderCircle className="size-3 animate-spin" />
                    ) : job.status === "succeeded" ? (
                      <CheckCircle2 className="size-3" />
                    ) : (
                      <AlertTriangle className="size-3" />
                    )}
                    {STATUS_LABELS[job.status] ?? job.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">TJ #{job.song.catalogOrder}</span>
                </div>
                <h2 className="mt-3 truncate text-lg font-semibold">{job.song.title}</h2>
                <p className="text-sm text-muted-foreground">{job.song.artist}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p className="flex items-center justify-end gap-1">
                  <Ticket className="size-3" /> {job.ticketCost}개 사용
                </p>
                <p className="mt-1 flex items-center justify-end gap-1">
                  <Clock3 className="size-3" /> {new Date(job.createdAt).toLocaleString("ko-KR")}
                </p>
              </div>
            </div>
            {job.audioUrl ? (
              <div className="mt-5 rounded-xl bg-muted/40 p-4">
                <AudioWaveformPlayer label={`${job.song.artist} ${job.song.title} AI 믹싱 결과`} src={job.audioUrl} />
                <a
                  className={`${buttonVariants({ size: "sm", variant: "outline" })} mt-3`}
                  download
                  href={job.audioUrl}
                >
                  <Download className="size-4" /> 결과 저장
                </a>
              </div>
            ) : null}
            {job.error ? (
              <p className="mt-4 rounded-xl bg-destructive/8 p-3 text-sm text-destructive">{job.error.detail}</p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
