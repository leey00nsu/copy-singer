import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";
import artifactJson from "../data/catalogs/tj-2607-song-profiles.json";
import type { SongProfileArtifact } from "../src/entities/recommendation/index.model";
import { rankRecommendations, scoreCatalogKeyFits } from "../src/entities/recommendation/index.model";
import type { BootstrapSongCatalogArtifact } from "../src/entities/song-catalog/index.server";
import { buildRankedDatabaseRecommendations } from "../src/features/create-recommendation/index.data.server";

config({ path: [".env.local", ".env"], quiet: true });

const artifact = artifactJson as SongProfileArtifact;
const userProfile = {
  minMidi: 48,
  maxMidi: 72,
  p10Midi: 52,
  medianMidi: 60,
  p90Midi: 68,
  tessituraLowMidi: 52,
  tessituraHighMidi: 68,
  voicedRatio: 0.72,
  pitchStability: 0.84,
  clippingRatio: 0.001,
  analyzer: "librosa-pyin",
  analyzerVersion: "0.11.0",
};

test("catalog bootstrap is idempotent and preserves the artifact ranking", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }

  const { bootstrapSongCatalog, loadPublishedCatalog, verifyDatabaseSongCatalog } = await import(
    "../src/entities/song-catalog/index.server"
  );
  const { prisma } = await import("../src/shared/db/index.server");
  try {
    const first = await bootstrapSongCatalog(prisma, artifactJson as BootstrapSongCatalogArtifact);
    const second = await bootstrapSongCatalog(prisma, artifactJson as BootstrapSongCatalogArtifact);
    assert.deepEqual(second, first);
    assert.deepEqual(await verifyDatabaseSongCatalog(prisma), {
      catalogSlug: "tj-2026-07-top-100",
      total: 100,
      ready: 100,
      invalid: [],
    });

    const databaseRanked = buildRankedDatabaseRecommendations(userProfile, await loadPublishedCatalog(prisma));
    const artifactRanked = rankRecommendations(scoreCatalogKeyFits(userProfile, artifact));
    assert.deepEqual(
      databaseRanked.map((item) => ({
        position: item.catalogOrder,
        rank: item.rank,
        originalKeyScore: item.originalKeyScore,
        adjustedScore: item.adjustedScore,
        recommendedShift: item.recommendedShift,
      })),
      artifactRanked.map((item) => ({
        position: item.catalogOrder,
        rank: item.rank,
        originalKeyScore: item.originalKeyScore,
        adjustedScore: item.adjustedScore,
        recommendedShift: item.recommendedShift,
      })),
    );
  } finally {
    await prisma.$disconnect();
  }
});
