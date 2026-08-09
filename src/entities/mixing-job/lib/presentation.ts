import type { MixingHistoryRow, PublicMixingJobStatus } from "../model/contract";

export const ACTIVE_MIXING_JOB_STATUSES = ["pending", "preparing", "submitted", "processing"] as const;
export const TERMINAL_MIXING_JOB_STATUSES = ["succeeded", "failed", "canceled"] as const;

export type MixingTimelineStepState = "complete" | "reached" | "current" | "upcoming" | "skipped";

export type MixingTimelineStep = {
  id: "preparation" | "submitted" | "processing" | "terminal";
  label: string;
  description: string;
  state: MixingTimelineStepState;
};

export type MixingStatusTone = "neutral" | "success" | "destructive";

export const MIXING_STATUS_LABELS: Record<PublicMixingJobStatus, string> = {
  pending: "대기 중",
  preparing: "음원 준비 중",
  submitted: "GPU 대기 중",
  processing: "AI 믹싱 중",
  succeeded: "완료",
  failed: "실패",
  canceled: "취소",
};

export function isActiveMixingStatus(status: PublicMixingJobStatus) {
  return ACTIVE_MIXING_JOB_STATUSES.includes(status as (typeof ACTIVE_MIXING_JOB_STATUSES)[number]);
}

export function isTerminalMixingStatus(status: PublicMixingJobStatus) {
  return TERMINAL_MIXING_JOB_STATUSES.includes(status as (typeof TERMINAL_MIXING_JOB_STATUSES)[number]);
}

function achievedOrSkipped(achieved: boolean, terminal: boolean): MixingTimelineStepState {
  if (achieved) return "complete";
  return terminal ? "skipped" : "upcoming";
}

export function presentMixingJob(job: MixingHistoryRow) {
  const terminal = isTerminalMixingStatus(job.status);
  const submitted =
    Boolean(job.submittedAt || job.startedAt) || ["submitted", "processing", "succeeded"].includes(job.status);
  const started = Boolean(job.startedAt) || ["processing", "succeeded"].includes(job.status);
  const succeeded = job.status === "succeeded";
  const tone: MixingStatusTone = succeeded ? "success" : job.status === "failed" ? "destructive" : "neutral";
  const description = (() => {
    if (job.resultReady) return "AI 믹싱 결과를 재생하거나 저장할 수 있어요.";
    if (job.status === "succeeded") return "믹싱은 완료됐지만 결과 파일을 아직 확인하고 있어요.";
    if (job.status === "failed") return job.error?.detail ?? "믹싱 작업을 완료하지 못했어요.";
    if (job.status === "canceled") return "믹싱 작업이 취소됐어요.";
    if (job.status === "submitted") return "GPU 작업이 접수되어 실행을 기다리고 있어요.";
    if (job.status === "processing") return "AI가 보컬과 반주를 실제로 믹싱하고 있어요.";
    return "믹싱에 사용할 음원과 요청을 준비하고 있어요.";
  })();

  const timeline: MixingTimelineStep[] = [
    {
      id: "preparation",
      label: "음원 준비",
      description: "보컬과 반주 파일 확인",
      state: submitted
        ? "complete"
        : job.status === "pending" || job.status === "preparing"
          ? "current"
          : terminal
            ? "reached"
            : "upcoming",
    },
    {
      id: "submitted",
      label: "GPU 작업 접수",
      description: "믹싱 작업 실행 대기",
      state: started
        ? "complete"
        : job.status === "submitted"
          ? "current"
          : terminal && submitted
            ? "reached"
            : achievedOrSkipped(false, terminal),
    },
    {
      id: "processing",
      label: "AI 믹싱",
      description: "보컬과 반주 사운드 처리",
      state: succeeded
        ? "complete"
        : job.status === "processing"
          ? "current"
          : terminal && started
            ? "reached"
            : achievedOrSkipped(false, terminal),
    },
    {
      id: "terminal",
      label: terminal ? MIXING_STATUS_LABELS[job.status] : "결과",
      description: terminal ? description : "완료·실패·취소 결과",
      state: terminal ? "complete" : "upcoming",
    },
  ];

  return {
    label: MIXING_STATUS_LABELS[job.status],
    description,
    active: isActiveMixingStatus(job.status),
    terminal,
    tone,
    timeline,
  };
}
