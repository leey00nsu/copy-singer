import "server-only";

import { type Prisma, type PrismaClient, prisma } from "@/shared/db/index.server";

import { TJ_2607_CATALOG_SLUG } from "../lib/bootstrap";

export async function loadPublishedCatalog(
  database: PrismaClient | Prisma.TransactionClient = prisma,
  catalogSlug = TJ_2607_CATALOG_SLUG,
) {
  return database.catalogEntry.findMany({
    where: {
      status: "PUBLISHED",
      catalog: { slug: catalogSlug, status: "PUBLISHED" },
      song: {
        lifecycleStatus: "ACTIVE",
        activeSource: { status: "READY" },
        currentAnalysis: { status: "READY", cleanupConfirmed: true },
        targetAsset: { status: "READY" },
      },
    },
    orderBy: { position: "asc" },
    select: {
      position: true,
      song: {
        select: {
          id: true,
          title: true,
          artist: true,
          originalKey: true,
          activeSourceId: true,
          currentAnalysisId: true,
          targetAssetId: true,
          activeSource: {
            select: { id: true, sourceUrl: true, sourceVideoId: true, sourceLabel: true, status: true },
          },
          currentAnalysis: {
            select: {
              id: true,
              sourceId: true,
              status: true,
              cleanupConfirmed: true,
              minMidi: true,
              maxMidi: true,
              p10Midi: true,
              medianMidi: true,
              p90Midi: true,
              tessituraLowMidi: true,
              tessituraHighMidi: true,
              voicedRatio: true,
              pitchStability: true,
              clippingRatio: true,
              rmsDb: true,
              analyzer: true,
              analyzerVersion: true,
            },
          },
          targetAsset: { select: { id: true, sourceId: true, status: true } },
        },
      },
    },
  });
}

export type PublishedCatalogRow = Awaited<ReturnType<typeof loadPublishedCatalog>>[number];
