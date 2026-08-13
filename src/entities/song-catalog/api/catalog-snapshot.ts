import "server-only";

import { TJ_2607_CATALOG_SLUG } from "@/shared/config/index.server";
import { type PrismaClient, prisma } from "@/shared/db/index.server";

import { catalogReadiness } from "../lib/readiness";
import { loadPublishedCatalog } from "./published-catalog";

export async function verifyDatabaseSongCatalog(database: PrismaClient = prisma, catalogSlug = TJ_2607_CATALOG_SLUG) {
  const [rows, published] = await Promise.all([
    loadPublishedCatalog(database, catalogSlug),
    database.catalogEntry.count({
      where: { status: "PUBLISHED", catalog: { slug: catalogSlug, status: "PUBLISHED" } },
    }),
  ]);
  const positions = new Set<number>();
  const invalid: Array<{ songId: string; position: number; reasons: string[] }> = [];
  for (const row of rows) {
    const readiness = catalogReadiness({
      lifecycleStatus: "ACTIVE",
      activeSourceId: row.song.activeSourceId,
      currentAnalysisId: row.song.currentAnalysisId,
      targetAssetId: row.song.targetAssetId,
      activeSource: row.song.activeSource,
      currentAnalysis: row.song.currentAnalysis,
      targetAsset: row.song.targetAsset,
      catalogEntry: { status: "PUBLISHED" },
    });
    if (!Number.isInteger(row.position) || row.position < 1 || positions.has(row.position) || !readiness.ready) {
      invalid.push({
        songId: row.song.id,
        position: row.position,
        reasons: readiness.ready ? ["INVALID_POSITION"] : readiness.reasons,
      });
    }
    positions.add(row.position);
  }
  if (published !== rows.length) {
    invalid.push({ songId: "unknown", position: 0, reasons: ["PUBLISHED_ROW_NOT_READY"] });
  }
  return { catalogSlug, total: published, ready: rows.length, invalid };
}

export async function exportDatabaseSongCatalog(database: PrismaClient = prisma, catalogSlug = TJ_2607_CATALOG_SLUG) {
  const catalog = await database.catalog.findUniqueOrThrow({ where: { slug: catalogSlug } });
  const rows = await loadPublishedCatalog(database, catalogSlug);
  return {
    schemaVersion: 2,
    catalog: { slug: catalog.slug, name: catalog.name, issue: catalog.issue },
    generatedAt: new Date().toISOString(),
    songs: rows.map((row) => ({
      position: row.position,
      id: row.song.id,
      title: row.song.title,
      artist: row.song.artist,
      originalKey: row.song.originalKey,
      source: row.song.activeSource,
      analysis: row.song.currentAnalysis,
      targetAsset: row.song.targetAsset,
    })),
  };
}
