import type { CatalogReadinessCode, CatalogReadinessInput } from "../model/contract";

export type CatalogReadiness = { ready: true; reasons: [] } | { ready: false; reasons: CatalogReadinessCode[] };

export function catalogReadiness(input: CatalogReadinessInput): CatalogReadiness {
  const reasons: CatalogReadinessCode[] = [];

  if (input.lifecycleStatus !== "ACTIVE") reasons.push("SONG_NOT_ACTIVE");

  if (
    !input.activeSourceId ||
    !input.activeSource ||
    input.activeSource.id !== input.activeSourceId ||
    input.activeSource.status !== "READY"
  ) {
    reasons.push("SOURCE_NOT_READY");
  }

  if (
    !input.currentAnalysisId ||
    !input.currentAnalysis ||
    input.currentAnalysis.id !== input.currentAnalysisId ||
    input.currentAnalysis.status !== "READY" ||
    input.currentAnalysis.cleanupConfirmed !== true
  ) {
    reasons.push("ANALYSIS_NOT_READY");
  } else if (input.currentAnalysis.sourceId !== input.activeSourceId) {
    reasons.push("ANALYSIS_SOURCE_MISMATCH");
  }

  if (
    !input.targetAssetId ||
    !input.targetAsset ||
    input.targetAsset.id !== input.targetAssetId ||
    input.targetAsset.status !== "READY"
  ) {
    reasons.push("TARGET_NOT_READY");
  } else if (input.targetAsset.sourceId !== input.activeSourceId) {
    reasons.push("TARGET_SOURCE_MISMATCH");
  }

  if (input.catalogEntry?.status !== "PUBLISHED") reasons.push("CATALOG_ENTRY_NOT_PUBLISHED");

  return reasons.length === 0 ? { ready: true, reasons: [] } : { ready: false, reasons };
}
