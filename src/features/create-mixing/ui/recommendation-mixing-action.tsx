"use client";

import { AlertTriangle, Download, Headphones, LoaderCircle, Mic2, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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

  if (compact) {
    if (status === "not_started") {
      return <span className="text-xs text-muted-foreground">선택 전</span>;
    }
    if (["preparing", "queued", "processing"].includes(status)) {
      return (
        <Badge aria-live="polite" className="h-7 px-2" variant="secondary">
          <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> 진행 중
        </Badge>
      );
    }
    if (status === "succeeded" && detailHref) {
      return (
        <Link className={buttonVariants({ size: "xs", variant: "outline" })} href={detailHref}>
          결과 확인
        </Link>
      );
    }
    return item.synthesis.error?.retryable ? (
      <Button onClick={() => onStart(item.id, true)} size="xs" variant="ghost">
        <RefreshCw aria-hidden="true" className="size-3" /> 재시도
      </Button>
    ) : (
      <Badge variant="destructive">실패</Badge>
    );
  }

  if (status === "not_started") {
    return (
      <Button onClick={() => onStart(item.id)} size="sm">
        <Sparkles className="size-4" aria-hidden="true" /> AI 믹싱
      </Button>
    );
  }

  if (["preparing", "queued", "processing"].includes(status)) {
    const label = status === "queued" ? "믹싱 대기 중" : status === "processing" ? "믹싱 처리 중" : "오디오 준비 중";
    return (
      <Badge aria-live="polite" className="h-8 px-3" variant="secondary">
        <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> {label}
      </Badge>
    );
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
