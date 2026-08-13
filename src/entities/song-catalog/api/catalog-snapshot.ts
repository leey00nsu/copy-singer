import "server-only";

import { TJ_2607_CATALOG_SLUG } from "@/shared/config/index.server";
import { type PrismaClient, prisma } from "@/shared/db/index.server";
import { catalogReadiness } from "../lib/readiness";

const FORBIDDEN_META_KEYS_RE = /(audioBytes|audio_bytes|base64|tempPath|tmpPath|filePath|storagePath)/i;

function sanitizeRecord(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const src = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) {
    if (FORBIDDEN_META_KEYS_RE.test(k)) continue;
    if (typeof v === "string" && v.length > 20000) continue;
    // drop huge strings that look like base64 audio
    if (typeof v === "string" && v.length > 4096 && /^[A-Za-z0-9+/=\n\r]+$/.test(v.slice(0, 200))) continue;
    out[k] = v;
  }
  return out;
}
function sanitizeDescriptors(value: unknown) {
  return sanitizeRecord(value);
}
function sanitizePipelineMetadata(value: unknown) {
  const rec = sanitizeRecord(value);
  if (!rec) return null;
  const allow = new Set([
    "ytDlpVersion",
    "separator",
    "separatorVersion",
    "separatorModel",
    "analyzer",
    "analyzerVersion",
  ]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec)) if (allow.has(k)) out[k] = v;
  return Object.keys(out).length ? out : null;
}

import { CATALOG_SNAPSHOT_SCHEMA_VERSION, type CatalogSnapshot } from "../model/snapshot";
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
  const verification = await verifyDatabaseSongCatalog(database, catalogSlug);
  if (verification.total === 0 || verification.invalid.length > 0) {
    throw new Error(
      `Cannot export an incomplete catalog (${verification.total} published, ${verification.invalid.length} invalid rows).`,
    );
  }
  const catalog = await database.catalog.findUniqueOrThrow({ where: { slug: catalogSlug } });
  const rows = await database.catalogEntry.findMany({
    where: {
      status: "PUBLISHED",
      catalog: { slug: catalogSlug, status: "PUBLISHED" },
      song: { lifecycleStatus: "ACTIVE" },
    },
    orderBy: { position: "asc" },
    select: {
      position: true,
      song: {
        select: {
          title: true,
          artist: true,
          originalKey: true,
          activeSource: {
            select: {
              sourceUrl: true,
              sourceVideoId: true,
              sourceLabel: true,
              status: true,
            },
          },
          currentAnalysis: {
            select: {
              pipelineContract: true,
              status: true,
              cleanupConfirmed: true,
              durationMs: true,
              sampleRate: true,
              sourceSizeBytes: true,
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
              estimatedKey: true,
              keyConfidence: true,
              analyzer: true,
              analyzerVersion: true,
              descriptors: true,
              pipelineMetadata: true,
            },
          },
          targetAsset: {
            select: {
              externalProjectId: true,
              externalFileId: true,
              externalUrl: true,
              fileName: true,
              mimeType: true,
              sizeBytes: true,
              sha256: true,
              sourceVideoId: true,
              status: true,
            },
          },
        },
      },
    },
  });

  const snapshot: CatalogSnapshot = {
    schemaVersion: CATALOG_SNAPSHOT_SCHEMA_VERSION,
    catalog: {
      slug: catalog.slug,
      name: catalog.name,
      issue: catalog.issue,
      revision: catalog.revision,
    },
    generatedAt: new Date().toISOString(),
    songs: rows.map((row) => {
      const song = row.song;
      if (!song.activeSource || !song.currentAnalysis || !song.targetAsset) {
        throw new Error("Catalog snapshot requires complete active source, analysis, and target rows.");
      }
      return {
        position: row.position,
        title: song.title,
        artist: song.artist,
        originalKey: song.originalKey,
        source: song.activeSource,
        analysis: {
          ...song.currentAnalysis,
          sourceSizeBytes:
            song.currentAnalysis.sourceSizeBytes === null ? null : Number(song.currentAnalysis.sourceSizeBytes),
          descriptors: sanitizeDescriptors(song.currentAnalysis.descriptors),
          pipelineMetadata: sanitizePipelineMetadata(song.currentAnalysis.pipelineMetadata),
        },
        targetAsset: {
          ...song.targetAsset,
          sizeBytes: Number(song.targetAsset.sizeBytes),
        },
      };
    }),
  };
  return snapshot;
}
