import { RotateCcw } from "lucide-react";
import type { VocalProfileError } from "@/entities/vocal-profile";
import { lifecycleStatusClassNames } from "@/shared/lib/lifecycle-status-colors";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { type ActualStateStep, ActualStateTimeline, ProcessHero } from "@/widgets/creation-funnel";
import { ANALYSIS_ERROR_GUIDANCE, type AnalysisStatusStage } from "../model/voice-scan";

type AnalysisStatusProps = {
  attempts?: number;
  canRetry?: boolean;
  error?: VocalProfileError | null;
  maxAttempts?: number;
  onCheckAgain?: () => void;
  onReset?: () => void;
  onRetry?: () => void;
  stage: AnalysisStatusStage | null;
};

function timelineFor(stage: Exclude<AnalysisStatusStage, "failed">, attempts: number, maxAttempts: number) {
  const deliveryCurrent = stage === "submitting";
  const analysisDescription =
    stage === "pending"
      ? "분석 순서를 기다리고 있어요."
      : stage === "retrying"
        ? `일시적인 문제로 다시 시도할 예정이에요. 시도 ${Math.min(attempts, maxAttempts)} / ${maxAttempts}`
        : stage === "reconnecting"
          ? "연결을 다시 확인하고 있어요."
          : "실제 음역과 안정성을 분석하고 있어요.";

  return [
    {
      id: "delivery",
      label: "오디오 전달",
      description: deliveryCurrent ? "분석할 오디오를 보내고 있어요." : "오디오 전달을 마쳤어요.",
      state: deliveryCurrent ? "current" : "complete",
    },
    {
      id: "analysis",
      label: stage === "reconnecting" ? "분석 상태 확인" : "보컬 분석",
      description: analysisDescription,
      state: deliveryCurrent ? "upcoming" : "current",
    },
    {
      id: "save",
      label: "결과 저장",
      description: "분석 결과를 보컬 프로필로 저장해요.",
      state: "upcoming",
    },
  ] satisfies ActualStateStep[];
}

export function AnalysisStatus({
  attempts = 0,
  canRetry = false,
  error,
  maxAttempts = 0,
  onCheckAgain,
  onReset,
  onRetry,
  stage,
}: AnalysisStatusProps) {
  if (!stage) return null;

  if (stage === "failed") {
    const guidance = ANALYSIS_ERROR_GUIDANCE[error?.reasonCode ?? ""];
    return (
      <ProcessHero
        action={
          <>
            {canRetry && onRetry ? (
              <Button onClick={onRetry}>
                <RotateCcw aria-hidden="true" /> 분석 다시 시도
              </Button>
            ) : null}
            {onReset ? (
              <Button onClick={onReset} variant="outline">
                새 오디오 선택
              </Button>
            ) : null}
          </>
        }
        description={
          <>
            <p>{guidance?.action ?? "잠시 뒤 다시 시도해 주세요."}</p>
            {error?.reasonCode ? <p className="mt-2 font-mono text-[11px]">{error.reasonCode}</p> : null}
          </>
        }
        eyebrow="Voice analysis"
        title={guidance?.title ?? "분석을 완료하지 못했어요"}
        tone="failure"
      />
    );
  }

  const copy =
    stage === "submitting"
      ? { title: "오디오를 보내고 있어요", status: "전달 중" }
      : stage === "pending"
        ? { title: "목소리 분석을 준비하고 있어요", status: "분석 대기" }
        : stage === "retrying"
          ? { title: "분석을 다시 시도할 예정이에요", status: "재시도 대기" }
          : stage === "reconnecting"
            ? { title: "분석 상태를 다시 확인하고 있어요", status: "연결 확인" }
            : { title: "목소리를 분석하고 있어요", status: "분석 중" };

  return (
    <ProcessHero
      action={
        stage === "reconnecting" && onCheckAgain ? (
          <Button onClick={onCheckAgain} variant="outline">
            <RotateCcw aria-hidden="true" /> 지금 다시 확인
          </Button>
        ) : undefined
      }
      description="페이지를 닫아도 분석은 계속돼요. 진행 상태는 라이브러리에서 확인할 수 있어요."
      eyebrow="Voice analysis"
      status={
        <Badge className={lifecycleStatusClassNames.active} variant="secondary">
          {copy.status}
        </Badge>
      }
      title={copy.title}
    >
      <ActualStateTimeline label="보컬 분석 진행 단계" steps={timelineFor(stage, attempts, maxAttempts)} />
    </ProcessHero>
  );
}
