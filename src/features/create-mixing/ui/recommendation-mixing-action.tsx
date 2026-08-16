"use client";

import { AlertTriangle, ArrowUpRight, Mic2, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { MixingStatusBadge, type PublicMixingJobStatus } from "@/entities/mixing-job";
import {
  type RecommendationItemResponse,
  type RecommendationMixingCapability,
  recommendationMixingUnavailableDescription,
} from "@/entities/recommendation";
import { TicketConsumptionConfirmDialog } from "@/entities/ticket";
import { Badge } from "@/shared/ui/badge";
import { buttonVariants } from "@/shared/ui/button";
import { mixingJobDetailHref } from "../api/client";

export function RecommendationMixingAction({
  compact = false,
  idleLabel = "AI 믹싱",
  item,
  mixing,
  onStart,
  ticketCost,
}: {
  compact?: boolean;
  idleLabel?: string;
  item: RecommendationItemResponse;
  mixing?: RecommendationMixingCapability;
  onStart: (itemId: string, retry?: boolean) => void;
  ticketCost: number;
}) {
  const status = item.synthesis.status;
  const mixingUnavailable = mixing?.available === false;
  const unavailableDescription = recommendationMixingUnavailableDescription(mixing);

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
      return mixingUnavailable ? (
        <Badge aria-label={unavailableDescription} title={unavailableDescription} variant="outline">
          믹싱 불가
        </Badge>
      ) : (
        <Badge variant="secondary">선택 전</Badge>
      );
    }
    if (mixingStatus && mixingStatus !== "failed") {
      return <MixingStatusBadge status={mixingStatus} />;
    }
    return (
      <div className="flex flex-wrap items-center justify-end gap-2 xl:justify-start">
        <MixingStatusBadge status="failed" />
        {item.synthesis.error?.retryable && !mixingUnavailable ? (
          <TicketConsumptionConfirmDialog
            actionName="AI 믹싱"
            confirmLabel="다시 믹싱"
            cost={ticketCost}
            kind="AI_MIXING"
            onConfirm={() => onStart(item.id, true)}
            triggerProps={{ size: "xs", variant: "ghost" }}
          >
            <RefreshCw aria-hidden="true" className="size-3" /> 재시도
          </TicketConsumptionConfirmDialog>
        ) : null}
      </div>
    );
  }

  if (status === "not_started") {
    if (mixingUnavailable) {
      return (
        <div className="grid gap-2" role="status">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <AlertTriangle className="size-3.5" aria-hidden="true" /> AI 믹싱을 만들 수 없어요
          </p>
          <p className="text-xs leading-5 text-muted-foreground">{unavailableDescription}</p>
          <Link className={buttonVariants({ size: "sm", variant: "outline" })} href="/profile">
            <Mic2 className="size-4" aria-hidden="true" /> 새 프로필 분석하기
          </Link>
        </div>
      );
    }
    return (
      <TicketConsumptionConfirmDialog
        actionName="AI 믹싱"
        confirmLabel="AI 믹싱 시작"
        cost={ticketCost}
        kind="AI_MIXING"
        onConfirm={() => onStart(item.id)}
        triggerProps={{ size: "sm" }}
      >
        <Sparkles className="size-4" aria-hidden="true" /> {idleLabel}
      </TicketConsumptionConfirmDialog>
    );
  }

  if (mixingStatus && ["preparing", "submitted", "processing"].includes(mixingStatus)) {
    return <MixingStatusBadge className="h-8 px-3" status={mixingStatus} />;
  }

  if (status === "succeeded") {
    return item.synthesis.jobId ? (
      <Link className={buttonVariants({ size: "sm" })} href={mixingJobDetailHref(item.synthesis.jobId)}>
        믹싱 결과 보기 <ArrowUpRight aria-hidden="true" className="size-4" />
      </Link>
    ) : (
      <MixingStatusBadge className="h-8 px-3" status="succeeded" />
    );
  }

  return (
    <div aria-live="polite" className="grid max-w-72 gap-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
        <AlertTriangle className="size-3.5" aria-hidden="true" /> 믹싱 실패
      </p>
      <p className="text-xs leading-5 text-muted-foreground">
        {item.synthesis.error?.detail ?? "잠시 뒤 다시 시도해 주세요."}
      </p>
      {item.synthesis.error?.retryable && !mixingUnavailable ? (
        <TicketConsumptionConfirmDialog
          actionName="AI 믹싱"
          confirmLabel="다시 믹싱"
          cost={ticketCost}
          kind="AI_MIXING"
          onConfirm={() => onStart(item.id, true)}
          triggerProps={{ size: "sm", variant: "outline" }}
        >
          <RefreshCw className="size-4" aria-hidden="true" /> 다시 시도
        </TicketConsumptionConfirmDialog>
      ) : (
        <Link className={buttonVariants({ size: "sm", variant: "outline" })} href="/profile">
          <Mic2 className="size-4" aria-hidden="true" /> 새 프로필 분석하기
        </Link>
      )}
    </div>
  );
}
