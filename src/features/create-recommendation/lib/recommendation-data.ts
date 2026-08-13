import {
  type KeyFitProfile,
  RecommendationError,
  rankRecommendations,
  scoreCatalogProfiles,
} from "@/entities/recommendation/index.server";
import type { PublishedCatalogRow } from "@/entities/song-catalog/index.server";

function catalogNotReady(message: string, details: Record<string, unknown> = {}): never {
  throw new RecommendationError("CATALOG_NOT_READY", message, {
    status: 503,
    retryable: true,
    details,
  });
}

function requiredCatalogProfile(row: PublishedCatalogRow) {
  const source = row.song.activeSource;
  const analysis = row.song.currentAnalysis;
  const target = row.song.targetAsset;
  if (
    !source ||
    source.id !== row.song.activeSourceId ||
    source.status !== "READY" ||
    !analysis ||
    analysis.id !== row.song.currentAnalysisId ||
    analysis.sourceId !== source.id ||
    analysis.status !== "READY" ||
    !analysis.cleanupConfirmed ||
    !target ||
    target.id !== row.song.targetAssetId ||
    target.sourceId !== source.id ||
    target.status !== "READY"
  ) {
    catalogNotReady("Published catalog contains mismatched active revisions.", {
      songId: row.song.id,
      position: row.position,
    });
  }
  const required = [
    "minMidi",
    "maxMidi",
    "p10Midi",
    "medianMidi",
    "p90Midi",
    "tessituraLowMidi",
    "tessituraHighMidi",
    "voicedRatio",
    "pitchStability",
    "clippingRatio",
  ] as const;
  for (const field of required) {
    if (!Number.isFinite(analysis[field])) {
      catalogNotReady("Published song analysis is missing a scoring metric.", {
        songId: row.song.id,
        analysisId: analysis.id,
        field,
      });
    }
  }
  if (!analysis.analyzer?.trim() || !analysis.analyzerVersion?.trim()) {
    catalogNotReady("Published song analysis is missing analyzer identity.", {
      songId: row.song.id,
      analysisId: analysis.id,
    });
  }
  return { profile: analysis as KeyFitProfile, source, analysisId: analysis.id };
}

export function buildRankedDatabaseRecommendations(profile: KeyFitProfile, rows: readonly PublishedCatalogRow[]) {
  if (rows.length === 0) catalogNotReady("Published catalog does not contain any READY songs.");
  const positions = new Set<number>();
  const identityByPosition = new Map<number, { songId: string; songAnalysisId: string }>();
  const entries = rows.map((row) => {
    if (!Number.isInteger(row.position) || row.position < 1 || positions.has(row.position)) {
      catalogNotReady("Published catalog contains an invalid or duplicate position.", {
        position: row.position,
      });
    }
    positions.add(row.position);
    const { profile: songProfile, source, analysisId } = requiredCatalogProfile(row);
    identityByPosition.set(row.position, { songId: row.song.id, songAnalysisId: analysisId });
    return {
      catalogOrder: row.position,
      title: row.song.title,
      artist: row.song.artist,
      sourceLabel: source.sourceLabel,
      sourceUrl: source.sourceUrl,
      sourceVideoId: source.sourceVideoId,
      profile: songProfile,
    };
  });
  return rankRecommendations(scoreCatalogProfiles(profile, entries)).map((item) => {
    const identity = identityByPosition.get(item.catalogOrder);
    if (!identity) catalogNotReady("Ranked song identity was lost during catalog scoring.");
    return { ...item, ...identity };
  });
}
