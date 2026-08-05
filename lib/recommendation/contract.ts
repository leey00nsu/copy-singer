import type {
  KeyFitReasonCode,
  KeyFitScoreBreakdown,
} from "../key-fit/contract";

export const RECOMMENDATION_RESULT_COUNT = 3;

export type RecommendationErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_PROFILE"
  | "INCOMPATIBLE_ANALYZER"
  | "CATALOG_NOT_READY"
  | "RECOMMENDATION_NOT_FOUND"
  | "RECOMMENDATION_SAVE_FAILED";

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
  recommendedShift: number;
  reasonCodes: KeyFitReasonCode[];
  reasons: string[];
  metrics: RecommendationScoreMetrics;
};

export type RecommendationRunResponse = {
  id: string;
  userVocalProfileId: string;
  scoringVersion: string;
  createdAt: string;
  profileConfidence: number;
  lowConfidence: boolean;
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
