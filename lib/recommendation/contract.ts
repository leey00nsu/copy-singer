import type {
  KeyFitReasonCode,
  KeyFitScoreBreakdown,
} from "../key-fit/contract";

export const SYNTHESIS_STATUSES = [
  "preparing",
  "queued",
  "processing",
  "succeeded",
  "failed",
] as const;

export type SynthesisStatus = (typeof SYNTHESIS_STATUSES)[number];

export type RecommendationSynthesis = {
  status: SynthesisStatus | "not_started";
  jobId: string | null;
  error: {
    code: string;
    detail: string;
    retryable: boolean;
  } | null;
  startedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  attemptCount: number;
  audioUrl: string | null;
};

export type RecommendationErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_PROFILE"
  | "INCOMPATIBLE_ANALYZER"
  | "CATALOG_NOT_READY"
  | "RECOMMENDATION_NOT_FOUND"
  | "RECOMMENDATION_SAVE_FAILED"
  | "SYNTHESIS_NOT_FOUND"
  | "SYNTHESIS_PREFLIGHT_FAILED"
  | "SYNTHESIS_MEDIA_FAILED"
  | "SYNTHESIS_UPSTREAM_FAILED"
  | "SYNTHESIS_CLEANUP_FAILED";

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

export type RecommendationScoreMetrics = {
  confidence: number;
  selectionScore?: number;
  original: KeyFitScoreBreakdown;
  recommended: KeyFitScoreBreakdown;
};

export type RecommendationItemResponse = {
  id: string;
  rank: number;
  songId: string;
  catalogOrder: number;
  title: string;
  artist: string;
  sourceUrl: string;
  originalKeyScore: number;
  adjustedScore: number;
  selectionScore: number | null;
  recommendedShift: number;
  reasonCodes: KeyFitReasonCode[];
  reasons: string[];
  metrics: RecommendationScoreMetrics;
  synthesis: RecommendationSynthesis;
};

export type RecommendationRunResponse = {
  id: string;
  userVocalProfileId: string;
  scoringVersion: string;
  createdAt: string;
  profileConfidence: number;
  lowConfidence: boolean;
  profile: {
    analyzer: string;
    analyzerVersion: string;
    tessituraLowMidi: number;
    tessituraHighMidi: number;
    minMidi: number;
    maxMidi: number;
  };
  items: RecommendationItemResponse[];
};

export type RecommendationApiError = {
  error: {
    code: RecommendationErrorCode;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
};
