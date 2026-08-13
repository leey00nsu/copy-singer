import { z } from "zod";
import { pageSearchParamSchema } from "@/shared/api";

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

export const MIXING_HISTORY_FILTER_STATUSES = ["all", ...MIXING_JOB_STATUSES] as const;

export const mixingHistoryFilterStatusSchema = z.enum(MIXING_HISTORY_FILTER_STATUSES);

function firstSearchParam(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

export const mixingHistoryFiltersSchema = z.object({
  page: z.preprocess(firstSearchParam, pageSearchParamSchema),
  q: z.preprocess(
    (value) => firstSearchParam(value) ?? "",
    z
      .string()
      .trim()
      .transform((value) => value.slice(0, 80)),
  ),
  status: z.preprocess((value) => firstSearchParam(value) ?? "all", mixingHistoryFilterStatusSchema.catch("all")),
});

export type MixingHistoryFilters = z.infer<typeof mixingHistoryFiltersSchema>;
export type MixingHistoryFilterStatus = z.infer<typeof mixingHistoryFilterStatusSchema>;

export const mixingJobErrorSchema = z.object({
  code: z.string(),
  detail: z.string(),
});

export const mixingJobResponseSchema = z.object({
  id: z.uuid(),
  songAnalysisId: z.uuid(),
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
  vocalProfile: z.object({
    id: z.uuid(),
    displayName: z.string().min(1),
    createdAt: z.string(),
    artwork: z
      .object({
        minMidi: z.number(),
        maxMidi: z.number(),
        medianMidi: z.number(),
        pitchStability: z.number(),
        voicedRatio: z.number(),
        rmsDb: z.number(),
      })
      .optional(),
  }),
  resultReady: z.boolean(),
  audioUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  submittedAt: z.string().nullable().optional(),
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

export const mixingDeleteResponseSchema = z.object({
  status: z.literal("deleted"),
  id: z.uuid(),
  mediaCleanupPending: z.boolean(),
});

export type MixingDeleteResponse = z.infer<typeof mixingDeleteResponseSchema>;

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
  songAnalysisId: string;
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
    songAnalysisId: job.songAnalysisId,
    status: job.status.toLowerCase() as PublicMixingJobStatus,
    ticketCost: job.ticketCost,
    error: job.errorCode ? { code: job.errorCode, detail: job.errorDetail ?? "믹싱 작업이 실패했습니다." } : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}
