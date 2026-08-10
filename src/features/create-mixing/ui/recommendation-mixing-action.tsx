"use client";

import { AlertTriangle, Download, Headphones, Mic2, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MixingStatusBadge, type PublicMixingJobStatus } from "@/entities/mixing-job";
import type { RecommendationItemResponse } from "@/entities/recommendation";
import { AudioWaveformPlayer } from "@/shared/ui/audio-waveform-player";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";

export function RecommendationMixingAction({
  compact = false,
  detailHref,
  item,
  onStart,
}: {
  compact?: boolean;
  detailHref?: string;
  item: RecommendationItemResponse;
  onStart: (itemId: string, retry?: boolean) => void;
}) {
  const [audioOpen, setAudioOpen] = useState(false);
  const status = item.synthesis.status;

  const mixingStatus = (() => {
    if (status === "preparing") return "preparing";
    if (status === "queued") return "submitted";
    if (status === "processing") return "processing";
    if (status === "succeeded") return "succeeded";
    if (status === "failed") return "failed";
    return null;
  })() satisfies PublicMixingJobStatus | null;

  if (compact) {
    if (status === "not_started") {
      return <Badge variant="secondary">선택 전</Badge>;
    }
    if (mixingStatus && mixingStatus !== "failed") {
      const resultHref = item.synthesis.jobId ? `/library/mixes/${item.synthesis.jobId}` : detailHref;
      return (
        <div className="flex flex-wrap items-center justify-end gap-2 xl:justify-start">
          <MixingStatusBadge status={mixingStatus} />
          {status === "succeeded" && resultHref ? (
            <Link className="text-xs font-semibold underline-offset-4 hover:underline" href={resultHref}>
              결과 확인
            </Link>
          ) : null}
        </div>
      );
    }
    return (
      <div className="flex flex-wrap items-center justify-end gap-2 xl:justify-start">
        <MixingStatusBadge status="failed" />
        {item.synthesis.error?.retryable ? (
          <Button onClick={() => onStart(item.id, true)} size="xs" variant="ghost">
            <RefreshCw aria-hidden="true" className="size-3" /> 재시도
          </Button>
        ) : null}
      </div>
    );
  }

  if (status === "not_started") {
    return (
      <Button onClick={() => onStart(item.id)} size="sm">
        <Sparkles className="size-4" aria-hidden="true" /> AI 믹싱
      </Button>
    );
  }

  if (mixingStatus && ["preparing", "submitted", "processing"].includes(mixingStatus)) {
    return <MixingStatusBadge className="h-8 px-3" status={mixingStatus} />;
  }

  if (status === "succeeded" && item.synthesis.audioUrl) {
    return (
      <div className="grid min-w-0 gap-2">
        <Button aria-expanded={audioOpen} onClick={() => setAudioOpen((open) => !open)} size="sm" variant="outline">
          <Headphones className="size-4 text-success-foreground" aria-hidden="true" />
          {audioOpen ? "결과 닫기" : "결과 듣기"}
        </Button>
        {audioOpen ? (
          <div className="min-w-0 md:w-80">
            <AudioWaveformPlayer label={`${item.artist} ${item.title} AI 믹싱 결과`} src={item.synthesis.audioUrl} />
            <a
              className={`${buttonVariants({ size: "sm", variant: "outline" })} mt-2 w-full`}
              download
              href={item.synthesis.audioUrl}
            >
              <Download className="size-4" aria-hidden="true" /> 결과 저장
            </a>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div aria-live="polite" className="grid max-w-72 gap-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
        <AlertTriangle className="size-3.5" aria-hidden="true" /> 믹싱 실패
      </p>
      <p className="text-xs leading-5 text-muted-foreground">
        {item.synthesis.error?.detail ?? "잠시 뒤 다시 시도해주세요."}
      </p>
      {item.synthesis.error?.retryable ? (
        <Button onClick={() => onStart(item.id, true)} size="sm" variant="outline">
          <RefreshCw className="size-4" aria-hidden="true" /> 다시 시도
        </Button>
      ) : (
        <Link className={buttonVariants({ size: "sm", variant: "outline" })} href="/profile">
          <Mic2 className="size-4" aria-hidden="true" /> 다시 녹음
        </Link>
      )}
    </div>
  );
}
