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
      ? "백그라운드 작업 순서를 기다리고 있어요."
      : stage === "retrying"
        ? `일시적인 문제로 다시 시도할 예정입니다. 시도 ${Math.min(attempts, maxAttempts)} / ${maxAttempts}`
        : stage === "reconnecting"
          ? "서버 작업은 계속될 수 있으며 연결이 돌아오면 같은 상태를 확인합니다."
          : "실제 음역과 안정성을 분석하고 있어요.";

  return [
    {
      id: "delivery",
      label: "오디오 전달",
      description: deliveryCurrent ? "분석할 오디오를 안전하게 전달하고 있어요." : "분석할 오디오를 저장했습니다.",
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
      description: "완료된 결과를 보컬 프로필로 저장합니다.",
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
            <p>{guidance?.action ?? "잠시 뒤 다시 시도해주세요."}</p>
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
      ? { title: "오디오를 안전하게 전달하고 있어요", status: "전달 중" }
      : stage === "pending"
        ? { title: "목소리 분석을 준비하고 있어요", status: "분석 대기" }
        : stage === "retrying"
          ? { title: "분석을 자동으로 다시 시도할 예정이에요", status: "재시도 대기" }
          : stage === "reconnecting"
            ? { title: "분석 상태 연결을 다시 확인하고 있어요", status: "연결 확인" }
            : { title: "당신의 목소리 기준을 찾고 있어요", status: "분석 중" };

  return (
    <ProcessHero
      action={
        stage === "reconnecting" && onCheckAgain ? (
          <Button onClick={onCheckAgain} variant="outline">
            <RotateCcw aria-hidden="true" /> 지금 다시 확인
          </Button>
        ) : undefined
      }
      description="페이지를 닫아도 서버에서 계속 진행되며 돌아오면 같은 작업 상태를 확인합니다."
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
