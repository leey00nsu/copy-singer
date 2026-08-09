import { AlertTriangle, Clock3, CloudCog, LoaderCircle, RotateCcw, WifiOff } from "lucide-react";
import type { VocalProfileError } from "@/entities/vocal-profile";
import { Button } from "@/shared/ui/button";
import { StatePanel } from "@/shared/ui/state-panel";
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
      <StatePanel
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
        aria-live="assertive"
        className="mt-8"
        description={
          <>
            <p>{guidance?.action ?? "잠시 뒤 다시 시도해주세요."}</p>
            {error?.reasonCode ? <p className="mt-2 font-mono text-[11px]">{error.reasonCode}</p> : null}
          </>
        }
        icon={<AlertTriangle />}
        title={guidance?.title ?? "분석을 완료하지 못했어요"}
        tone="destructive"
      />
    );
  }

  if (stage === "reconnecting") {
    return (
      <StatePanel
        action={
          onCheckAgain ? (
            <Button onClick={onCheckAgain} variant="outline">
              <RotateCcw aria-hidden="true" /> 지금 다시 확인
            </Button>
          ) : null
        }
        aria-live="polite"
        className="mt-8"
        description="서버의 작업은 계속 진행될 수 있습니다. 연결이 돌아오면 같은 작업 상태를 다시 확인합니다."
        icon={<WifiOff />}
        title="분석 상태 연결을 다시 시도하고 있어요"
        tone="warning"
      />
    );
  }

  const copy =
    stage === "submitting"
      ? {
          title: "오디오를 안전하게 전달하는 중",
          description: "업로드가 끝나면 백그라운드 분석 작업 번호를 저장합니다.",
          icon: <CloudCog />,
        }
      : stage === "pending"
        ? {
            title: "보컬 분석 대기 중",
            description: "업로드는 저장됐고 백그라운드 작업 순서를 기다리고 있어요. 페이지를 닫아도 계속됩니다.",
            icon: <Clock3 />,
          }
        : stage === "retrying"
          ? {
              title: "분석을 자동으로 다시 시도할 예정이에요",
              description: `일시적인 문제로 서버가 재시도 대기 중입니다. 시도 ${Math.min(attempts, maxAttempts)} / ${maxAttempts}`,
              icon: <RotateCcw />,
            }
          : {
              title: "목소리의 음역과 안정성을 분석하는 중",
              description: "실제 분석 결과를 저장하고 있습니다. 완료되면 보컬 프로필 상세로 자동 이동합니다.",
              icon: <LoaderCircle className="animate-spin motion-reduce:animate-none" />,
            };

  return (
    <StatePanel
      aria-live="polite"
      className="mt-8"
      description={copy.description}
      icon={copy.icon}
      title={copy.title}
      tone={stage === "retrying" ? "warning" : "neutral"}
    />
  );
}
