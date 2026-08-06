import type { CatalogKeyFitResult } from "../key-fit/catalog";
import type { KeyFitReasonCode, KeyFitScoreResult } from "../key-fit/contract";
import { RecommendationError } from "./contract";

export type RankedRecommendation = CatalogKeyFitResult & { rank: number; selectionScore: number };

export const ORIGINAL_KEY_SELECTION_WEIGHT = 0.65;
export const ADJUSTED_KEY_SELECTION_WEIGHT = 0.35;
export const KEY_SHIFT_SELECTION_PENALTIES = [0, 1, 3, 7, 12, 20, 30] as const;

function roundScore(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateRecommendationSelectionScore(
  candidate: Pick<CatalogKeyFitResult, "originalKeyScore" | "adjustedScore" | "recommendedShift">,
): number {
  const shiftPenalty = KEY_SHIFT_SELECTION_PENALTIES[Math.abs(candidate.recommendedShift)];
  if (shiftPenalty === undefined) {
    throw new RecommendationError("CATALOG_NOT_READY", "Recommended shift is outside the selection policy.", {
      status: 503,
      retryable: true,
      details: { recommendedShift: candidate.recommendedShift },
    });
  }
  return Math.max(
    0,
    ORIGINAL_KEY_SELECTION_WEIGHT * candidate.originalKeyScore +
      ADJUSTED_KEY_SELECTION_WEIGHT * candidate.adjustedScore -
      shiftPenalty,
  );
}

function compareRecommendations(
  first: CatalogKeyFitResult & { selectionScore: number },
  second: CatalogKeyFitResult & { selectionScore: number },
): number {
  return (
    second.selectionScore - first.selectionScore ||
    second.originalKeyScore - first.originalKeyScore ||
    second.adjustedScore - first.adjustedScore ||
    Math.abs(first.recommendedShift) - Math.abs(second.recommendedShift) ||
    first.catalogOrder - second.catalogOrder
  );
}

export function rankRecommendations(
  candidates: readonly CatalogKeyFitResult[],
): RankedRecommendation[] {
  if (candidates.length === 0) {
    throw new RecommendationError(
      "CATALOG_NOT_READY",
      "At least one scored song is required.",
      { status: 503, retryable: true, details: { candidateCount: candidates.length } },
    );
  }

  const seenOrders = new Set<number>();
  for (const candidate of candidates) {
    if (
      !Number.isInteger(candidate.catalogOrder) ||
      !Number.isFinite(candidate.adjustedScore) ||
      !Number.isFinite(candidate.originalKeyScore) ||
      !Number.isInteger(candidate.recommendedShift) ||
      seenOrders.has(candidate.catalogOrder)
    ) {
      throw new RecommendationError(
        "CATALOG_NOT_READY",
        "Scored catalog contains invalid or duplicate ranking data.",
        {
          status: 503,
          retryable: true,
          details: { catalogOrder: candidate.catalogOrder },
        },
      );
    }
    seenOrders.add(candidate.catalogOrder);
  }

  return candidates
    .map((candidate) => ({
      ...candidate,
      selectionScore: calculateRecommendationSelectionScore(candidate),
    }))
    .sort(compareRecommendations)
    .map((candidate, index) => ({
      ...candidate,
      selectionScore: roundScore(candidate.selectionScore),
      rank: index + 1,
    }));
}

export function formatRecommendedShift(shift: number): string {
  if (!Number.isInteger(shift)) return String(shift);
  if (shift === 0) return "원키";
  return `${shift > 0 ? "+" : ""}${shift}키`;
}

function formatReason(
  code: KeyFitReasonCode,
  result: Pick<
    KeyFitScoreResult,
    "originalKeyScore" | "adjustedScore" | "recommendedShift" | "original" | "recommended"
  >,
): string {
  const original = result.original;
  const recommended = result.recommended;
  switch (code) {
    case "ORIGINAL_KEY_BEST":
      return "이번 소절에서 관찰된 음역에는 원키가 가장 잘 맞았습니다.";
    case "KEY_SHIFT_IMPROVES_FIT":
      return `${formatRecommendedShift(result.recommendedShift)}로 조정하면 예상 적합도가 ${result.originalKeyScore.toFixed(1)}점에서 ${result.adjustedScore.toFixed(1)}점으로 높아집니다.`;
    case "HIGH_TESSITURA_OVERLAP":
      return `편안한 음역과 곡의 주요 음역이 약 ${Math.round(recommended.tessituraOverlapRatio * 100)}% 겹칩니다.`;
    case "HIGH_RANGE_BURDEN":
      return `추천 키에서도 고음 부담이 약 ${(recommended.highTessituraExcess + recommended.highExtremeExcess).toFixed(1)}반음 남아 있습니다.`;
    case "LOW_RANGE_BURDEN":
      return `추천 키에서도 저음 부담이 약 ${(recommended.lowTessituraExcess + recommended.lowExtremeExcess).toFixed(1)}반음 남아 있습니다.`;
    case "HIGH_NOTES_REDUCED": {
      const reduced =
        original.highTessituraExcess +
        original.highExtremeExcess -
        recommended.highTessituraExcess -
        recommended.highExtremeExcess;
      return `키를 조정해 고음 부담을 약 ${Math.max(0, reduced).toFixed(1)}반음 줄였습니다.`;
    }
    case "LOW_NOTES_REDUCED": {
      const reduced =
        original.lowTessituraExcess +
        original.lowExtremeExcess -
        recommended.lowTessituraExcess -
        recommended.lowExtremeExcess;
      return `키를 조정해 저음 부담을 약 ${Math.max(0, reduced).toFixed(1)}반음 줄였습니다.`;
    }
    case "LOW_PROFILE_CONFIDENCE":
      return "분석 신뢰도가 낮아 더 긴 소절을 다시 녹음하면 추천이 달라질 수 있습니다.";
  }
}

export function formatRecommendationReasons(
  result: Pick<
    KeyFitScoreResult,
    "reasonCodes" | "originalKeyScore" | "adjustedScore" | "recommendedShift" | "original" | "recommended"
  >,
): string[] {
  return result.reasonCodes.map((code) => formatReason(code, result));
}
