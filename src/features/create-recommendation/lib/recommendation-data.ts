import {
  type CatalogKeyFitResult,
  type KeyFitProfile,
  KeyFitScoringError,
  type RankedRecommendation,
  RecommendationError,
  rankRecommendations,
  SONG_PROFILE_ARTIFACT_SCHEMA_VERSION,
  SONG_PROFILE_PIPELINE_CONTRACT,
  type SongProfileArtifact,
  scoreCatalogKeyFits,
} from "@/entities/recommendation/index.server";

export const RECOMMENDATION_CATALOG_SIZE = 100;

export type RecommendationSongRow = {
  id: string;
  catalogOrder: number;
  title: string;
  artist: string;
  analysisStatus: "PENDING" | "READY" | "FAILED";
};

function catalogNotReady(message: string, details: Record<string, unknown> = {}): never {
  throw new RecommendationError("CATALOG_NOT_READY", message, {
    status: 503,
    retryable: true,
    details,
  });
}

export function validateRecommendationArtifact(value: unknown): SongProfileArtifact {
  if (!value || typeof value !== "object") catalogNotReady("Song profile artifact is missing.");
  const artifact = value as SongProfileArtifact;
  if (
    artifact.schemaVersion !== SONG_PROFILE_ARTIFACT_SCHEMA_VERSION ||
    artifact.pipelineContract !== SONG_PROFILE_PIPELINE_CONTRACT ||
    !Array.isArray(artifact.songs) ||
    artifact.songs.length !== RECOMMENDATION_CATALOG_SIZE
  ) {
    catalogNotReady("Song profile artifact contract does not match this build.");
  }

  const orders = new Set<number>();
  for (const [index, song] of artifact.songs.entries()) {
    if (
      song.catalogOrder !== index + 1 ||
      orders.has(song.catalogOrder) ||
      song.status !== "READY" ||
      !song.profile ||
      song.profile.cleanupConfirmed !== true
    ) {
      catalogNotReady("Song profile artifact must contain 100 ordered READY profiles.", {
        catalogOrder: song.catalogOrder,
        status: song.status,
      });
    }
    orders.add(song.catalogOrder);
  }
  return artifact;
}

export function validateAndIndexSongRows(
  rows: readonly RecommendationSongRow[],
  artifact: SongProfileArtifact,
): Map<number, RecommendationSongRow> {
  if (rows.length !== RECOMMENDATION_CATALOG_SIZE) {
    catalogNotReady("Database song catalog must contain exactly 100 songs.", {
      songCount: rows.length,
    });
  }

  const byOrder = new Map<number, RecommendationSongRow>();
  for (const row of rows) {
    const artifactSong = artifact.songs[row.catalogOrder - 1];
    if (
      byOrder.has(row.catalogOrder) ||
      !artifactSong ||
      artifactSong.catalogOrder !== row.catalogOrder ||
      artifactSong.title !== row.title ||
      artifactSong.artist !== row.artist
    ) {
      catalogNotReady("Database song metadata does not match the analyzed artifact.", {
        catalogOrder: row.catalogOrder,
      });
    }
    byOrder.set(row.catalogOrder, row);
  }
  return byOrder;
}

export function buildRankedRecommendations(
  profile: KeyFitProfile,
  rows: readonly RecommendationSongRow[],
  artifactValue: unknown,
): Array<RankedRecommendation & { songId: string }> {
  const artifact = validateRecommendationArtifact(artifactValue);
  const byOrder = validateAndIndexSongRows(rows, artifact);
  let scored: CatalogKeyFitResult[];
  try {
    scored = scoreCatalogKeyFits(profile, artifact);
  } catch (error) {
    if (error instanceof KeyFitScoringError) {
      if (error.code === "INCOMPATIBLE_ANALYZER") {
        throw new RecommendationError("INCOMPATIBLE_ANALYZER", error.message, {
          status: 422,
          details: error.details,
        });
      }
      if (error.code === "SONG_PROFILE_NOT_READY") {
        catalogNotReady(error.message, error.details);
      }
      throw new RecommendationError("INVALID_PROFILE", error.message, {
        status: 422,
        details: error.details,
      });
    }
    throw error;
  }

  return rankRecommendations(scored).map((result) => ({
    ...result,
    songId: byOrder.get(result.catalogOrder)!.id,
  }));
}
