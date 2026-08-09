import { z } from "zod";

export const MIXING_JOB_STATUSES = [
  "pending",
  "preparing",
  "submitted",
  "processing",
  "succeeded",
  "failed",
  "canceled",
] as const;

export const publicMixingJobStatusSchema = z.enum(MIXING_JOB_STATUSES);

export type PublicMixingJobStatus = z.infer<typeof publicMixingJobStatusSchema>;

export const mixingJobErrorSchema = z.object({
  code: z.string(),
  detail: z.string(),
});

export const mixingJobResponseSchema = z.object({
  id: z.uuid(),
  recommendationItemId: z.uuid().nullable(),
  status: publicMixingJobStatusSchema,
  ticketCost: z.number().int().nonnegative(),
  error: mixingJobErrorSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
});

export type MixingJobResponse = z.infer<typeof mixingJobResponseSchema>;

export const mixingHistoryRowSchema = z.object({
  id: z.uuid(),
  status: publicMixingJobStatusSchema,
  ticketCost: z.number().int().nonnegative(),
  error: mixingJobErrorSchema.nullable(),
  song: z.object({
    title: z.string(),
    artist: z.string(),
    catalogOrder: z.number().int().positive(),
  }),
  vocalProfile: z.object({ id: z.uuid(), createdAt: z.string() }),
  resultReady: z.boolean(),
  audioUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export type MixingHistoryRow = z.infer<typeof mixingHistoryRowSchema>;

export const mixingHistoryPayloadSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  pageCount: z.number().int().positive(),
  jobs: z.array(mixingHistoryRowSchema),
});

export type MixingHistoryPayload = z.infer<typeof mixingHistoryPayloadSchema>;

export const mixingDeleteResponseSchema = z
  .object({
    status: z.string(),
  })
  .passthrough();

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
