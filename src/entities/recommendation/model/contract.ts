import { z } from "zod";
import { keyFitReasonCodeSchema, keyFitScoreBreakdownSchema } from "./key-fit-contract";

export const SYNTHESIS_STATUSES = ["preparing", "queued", "processing", "succeeded", "failed"] as const;

export type SynthesisStatus = (typeof SYNTHESIS_STATUSES)[number];

export const recommendationSynthesisSchema = z.object({
  status: z.enum(["not_started", ...SYNTHESIS_STATUSES]),
  jobId: z.uuid().nullable(),
  error: z
    .object({
      code: z.string(),
      detail: z.string(),
      retryable: z.boolean(),
    })
    .nullable(),
  startedAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  attemptCount: z.number().int().nonnegative(),
  audioUrl: z.string().nullable(),
});

export type RecommendationSynthesis = z.infer<typeof recommendationSynthesisSchema>;

export const RECOMMENDATION_ERROR_CODES = [
  "INVALID_REQUEST",
  "INVALID_PROFILE",
  "INCOMPATIBLE_ANALYZER",
  "CATALOG_NOT_READY",
  "RECOMMENDATION_NOT_FOUND",
  "RECOMMENDATION_SAVE_FAILED",
  "SYNTHESIS_NOT_FOUND",
  "SYNTHESIS_PREFLIGHT_FAILED",
  "SYNTHESIS_MEDIA_FAILED",
  "SYNTHESIS_UPSTREAM_FAILED",
  "SYNTHESIS_CLEANUP_FAILED",
] as const;

export const recommendationErrorCodeSchema = z.enum(RECOMMENDATION_ERROR_CODES);

export type RecommendationErrorCode = z.infer<typeof recommendationErrorCodeSchema>;

export class RecommendationError extends Error {
  readonly code: RecommendationErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly details: Record<string, unknown>;

  constructor(
    code: RecommendationErrorCode,
    message: string,
    options: {
      status: number;
      retryable?: boolean;
      details?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.name = "RecommendationError";
    this.code = code;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
    this.details = options.details ?? {};
  }
}

export const recommendationScoreMetricsSchema = z.object({
  confidence: z.number(),
  selectionScore: z.number().optional(),
  original: keyFitScoreBreakdownSchema,
  recommended: keyFitScoreBreakdownSchema,
});

export type RecommendationScoreMetrics = z.infer<typeof recommendationScoreMetricsSchema>;

export const recommendationItemResponseSchema = z.object({
  id: z.uuid(),
  rank: z.number().int().positive(),
  songId: z.uuid(),
  catalogOrder: z.number().int().positive(),
  title: z.string(),
  artist: z.string(),
  sourceUrl: z.string(),
  originalKeyScore: z.number(),
  adjustedScore: z.number(),
  selectionScore: z.number().nullable(),
  recommendedShift: z.number(),
  reasonCodes: z.array(keyFitReasonCodeSchema),
  reasons: z.array(z.string()),
  metrics: recommendationScoreMetricsSchema,
  synthesis: recommendationSynthesisSchema,
});

export type RecommendationItemResponse = z.infer<typeof recommendationItemResponseSchema>;

export const recommendationRunResponseSchema = z.object({
  id: z.uuid(),
  userVocalProfileId: z.uuid(),
  scoringVersion: z.string(),
  createdAt: z.string(),
  profileConfidence: z.number(),
  lowConfidence: z.boolean(),
  profile: z.object({
    analyzer: z.string(),
    analyzerVersion: z.string(),
    tessituraLowMidi: z.number(),
    tessituraHighMidi: z.number(),
    minMidi: z.number(),
    maxMidi: z.number(),
  }),
  items: z.array(recommendationItemResponseSchema),
});

export type RecommendationRunResponse = z.infer<typeof recommendationRunResponseSchema>;

export const recommendationApiErrorSchema = z.object({
  error: z.object({
    code: recommendationErrorCodeSchema,
    message: z.string(),
    retryable: z.boolean(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type RecommendationApiError = z.infer<typeof recommendationApiErrorSchema>;

export const recommendationDeleteResponseSchema = z.object({
  status: z.literal("deleted"),
  id: z.uuid(),
});

export type RecommendationDeleteResponse = z.infer<typeof recommendationDeleteResponseSchema>;
