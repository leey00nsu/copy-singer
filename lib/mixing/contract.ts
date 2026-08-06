export const MIXING_JOB_STATUSES = [
  "pending",
  "preparing",
  "submitted",
  "processing",
  "succeeded",
  "failed",
  "canceled",
] as const;

export type PublicMixingJobStatus = (typeof MIXING_JOB_STATUSES)[number];

export class MixingError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "MixingError";
  }
}

export function serializeMixingJob(job: {
  id: string;
  recommendationItemId: string | null;
  status: string;
  ticketCost: number;
  errorCode: string | null;
  errorDetail: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}) {
  return {
    id: job.id,
    recommendationItemId: job.recommendationItemId,
    status: job.status.toLowerCase() as PublicMixingJobStatus,
    ticketCost: job.ticketCost,
    error: job.errorCode ? { code: job.errorCode, detail: job.errorDetail ?? "믹싱 작업이 실패했습니다." } : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}
