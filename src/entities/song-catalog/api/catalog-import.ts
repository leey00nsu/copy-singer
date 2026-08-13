import "server-only";

import { TJ_2607_CATALOG_SLUG } from "@/shared/config/index.server";
import { Prisma, type PrismaClient } from "@/shared/db/index.server";
import { type CatalogSnapshot, type CatalogSnapshotSong, catalogSnapshotSchema } from "../model/snapshot";

const FORBIDDEN_IMPORT_KEYS_RE = /(audioBytes|audio_bytes|base64|tempPath|tmpPath|filePath|storagePath)/i;
function sanitizeImportJson(value: unknown) {
  if (value == null) return Prisma.JsonNull;
  if (typeof value !== "object" || Array.isArray(value)) return value as Prisma.InputJsonValue;
  const src = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) {
    if (FORBIDDEN_IMPORT_KEYS_RE.test(k)) continue;
    out[k] = v;
  }
  return out as Prisma.InputJsonValue;
}

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

function assertSnapshotUniqueness(snapshot: CatalogSnapshot) {
  const positions = new Set<number>();
  const songKeys = new Set<string>();
  const sourceVideoIds = new Set<string>();
  const targetKeys = new Set<string>();

  for (const song of snapshot.songs) {
    const songKey = `${song.title}\u0000${song.artist}`;
    const targetKey = `${song.targetAsset.externalProjectId}\u0000${song.targetAsset.externalFileId}`;
    if (positions.has(song.position)) throw new Error(`Catalog snapshot contains duplicate position ${song.position}.`);
    if (songKeys.has(songKey))
      throw new Error(`Catalog snapshot contains duplicate song ${song.title} - ${song.artist}.`);
    if (sourceVideoIds.has(song.source.sourceVideoId))
      throw new Error(`Catalog snapshot contains duplicate source video ID ${song.source.sourceVideoId}.`);
    if (targetKeys.has(targetKey))
      throw new Error(`Catalog snapshot contains duplicate target ${song.targetAsset.externalFileId}.`);
    if (song.targetAsset.sourceVideoId !== song.source.sourceVideoId)
      throw new Error(`Catalog snapshot target ${song.targetAsset.externalFileId} does not match its source video ID.`);
    positions.add(song.position);
    songKeys.add(songKey);
    sourceVideoIds.add(song.source.sourceVideoId);
    targetKeys.add(targetKey);
  }
}

export type CatalogImportResult = {
  catalogId: string;
  total: number;
  published: number;
  songsCreated: number;
  sourcesCreated: number;
  analysesCreated: number;
  targetsCreated: number;
  entriesCreated: number;
};

export function parseCatalogSnapshot(input: unknown) {
  return catalogSnapshotSchema.safeParse(input);
}

function analysisInput(song: CatalogSnapshotSong, completedAt: Date | null | undefined) {
  const analysis = song.analysis;
  return {
    status: analysis.status,
    cleanupConfirmed: analysis.cleanupConfirmed,
    durationMs: analysis.durationMs,
    sampleRate: analysis.sampleRate,
    sourceSizeBytes: analysis.sourceSizeBytes === null ? null : BigInt(Math.trunc(analysis.sourceSizeBytes)),
    minMidi: analysis.minMidi,
    maxMidi: analysis.maxMidi,
    p10Midi: analysis.p10Midi,
    medianMidi: analysis.medianMidi,
    p90Midi: analysis.p90Midi,
    tessituraLowMidi: analysis.tessituraLowMidi,
    tessituraHighMidi: analysis.tessituraHighMidi,
    voicedRatio: analysis.voicedRatio,
    pitchStability: analysis.pitchStability,
    clippingRatio: analysis.clippingRatio,
    rmsDb: analysis.rmsDb,
    estimatedKey: analysis.estimatedKey ?? null,
    keyConfidence: analysis.keyConfidence ?? null,
    analyzer: analysis.analyzer,
    analyzerVersion: analysis.analyzerVersion,
    descriptors: sanitizeImportJson(analysis.descriptors),
    pipelineMetadata: sanitizeImportJson(analysis.pipelineMetadata),
    errorCode: null,
    errorDetail: null,
    completedAt: completedAt ?? (analysis.status === "READY" ? new Date() : null),
  };
}

async function importSong(
  tx: TransactionClient,
  catalogId: string,
  song: CatalogSnapshotSong,
  stats: {
    songsCreated: number;
    sourcesCreated: number;
    analysesCreated: number;
    targetsCreated: number;
    entriesCreated: number;
  },
) {
  const existingSong = await tx.song.findUnique({
    where: { title_artist: { title: song.title, artist: song.artist } },
  });
  const songRow = await tx.song.upsert({
    where: { title_artist: { title: song.title, artist: song.artist } },
    create: { title: song.title, artist: song.artist, lifecycleStatus: "DRAFT" },
    update: {},
  });
  if (!existingSong) stats.songsCreated += 1;

  const existingSource = await tx.songSource.findUnique({ where: { sourceVideoId: song.source.sourceVideoId } });
  if (existingSource && existingSource.songId !== songRow.id) {
    throw new Error(`Catalog snapshot source ${song.source.sourceVideoId} is already assigned to another song.`);
  }
  const nextSourceRevision =
    existingSource?.revision ??
    ((await tx.songSource.aggregate({ where: { songId: songRow.id }, _max: { revision: true } }))._max.revision ?? 0) +
      1;
  const source = await tx.songSource.upsert({
    where: { sourceVideoId: song.source.sourceVideoId },
    create: {
      songId: songRow.id,
      revision: nextSourceRevision,
      sourceUrl: song.source.sourceUrl,
      sourceVideoId: song.source.sourceVideoId,
      sourceLabel: song.source.sourceLabel,
      status: song.source.status,
    },
    update: {
      songId: songRow.id,
      sourceUrl: song.source.sourceUrl,
      sourceLabel: song.source.sourceLabel,
      status: song.source.status,
    },
  });
  if (!existingSource) stats.sourcesCreated += 1;

  const existingAnalysis = await tx.songAnalysis.findUnique({
    where: {
      sourceId_pipelineContract: { sourceId: source.id, pipelineContract: song.analysis.pipelineContract },
    },
  });
  const analysis = await tx.songAnalysis.upsert({
    where: {
      sourceId_pipelineContract: { sourceId: source.id, pipelineContract: song.analysis.pipelineContract },
    },
    create: {
      songId: songRow.id,
      sourceId: source.id,
      pipelineContract: song.analysis.pipelineContract,
      ...analysisInput(song, existingAnalysis?.completedAt),
    },
    update: {
      songId: songRow.id,
      ...analysisInput(song, existingAnalysis?.completedAt),
    },
  });
  if (!existingAnalysis) stats.analysesCreated += 1;

  const target = song.targetAsset;
  const existingTarget = await tx.catalogTargetAsset.findUnique({
    where: {
      externalProjectId_externalFileId: {
        externalProjectId: target.externalProjectId,
        externalFileId: target.externalFileId,
      },
    },
  });
  if (existingTarget?.sourceId && existingTarget.sourceId !== source.id) {
    throw new Error(`Catalog snapshot target ${target.externalFileId} is already assigned to another source.`);
  }
  if (existingTarget && existingTarget.sourceVideoId !== target.sourceVideoId) {
    throw new Error(`Catalog snapshot target ${target.externalFileId} has a conflicting source video ID.`);
  }
  const targetRow = await tx.catalogTargetAsset.upsert({
    where: {
      externalProjectId_externalFileId: {
        externalProjectId: target.externalProjectId,
        externalFileId: target.externalFileId,
      },
    },
    create: {
      externalProjectId: target.externalProjectId,
      externalFileId: target.externalFileId,
      externalUrl: target.externalUrl,
      fileName: target.fileName,
      mimeType: target.mimeType,
      sizeBytes: BigInt(Math.trunc(target.sizeBytes)),
      sha256: target.sha256,
      sourceVideoId: target.sourceVideoId,
      sourceId: source.id,
      status: target.status,
    },
    update: {
      externalUrl: target.externalUrl,
      fileName: target.fileName,
      mimeType: target.mimeType,
      sizeBytes: BigInt(Math.trunc(target.sizeBytes)),
      sha256: target.sha256,
      sourceVideoId: target.sourceVideoId,
      sourceId: source.id,
      status: target.status,
    },
  });
  if (!existingTarget) stats.targetsCreated += 1;

  const ready =
    source.status === "READY" &&
    analysis.status === "READY" &&
    analysis.cleanupConfirmed &&
    targetRow.status === "READY" &&
    targetRow.sourceVideoId === source.sourceVideoId;

  const existingEntry = await tx.catalogEntry.findUnique({
    where: { catalogId_songId: { catalogId, songId: songRow.id } },
  });
  const entryAtPosition = await tx.catalogEntry.findUnique({
    where: { catalogId_position: { catalogId, position: song.position } },
  });
  if (entryAtPosition && entryAtPosition.songId !== songRow.id) {
    throw new Error(`Catalog snapshot position ${song.position} is already assigned to another song.`);
  }
  const publishedAt = ready ? (existingEntry?.publishedAt ?? new Date()) : null;
  await tx.catalogEntry.upsert({
    where: { catalogId_songId: { catalogId, songId: songRow.id } },
    create: {
      catalogId,
      songId: songRow.id,
      position: song.position,
      status: ready ? "PUBLISHED" : "DRAFT",
      publishedAt,
    },
    update: {
      position: song.position,
      status: ready ? "PUBLISHED" : "DRAFT",
      publishedAt,
    },
  });
  if (!existingEntry) stats.entriesCreated += 1;

  await tx.song.update({
    where: { id: songRow.id },
    data: ready
      ? {
          lifecycleStatus: "ACTIVE",
          analysisStatus: analysis.status,
          activeSourceId: source.id,
          currentAnalysisId: analysis.id,
          targetAssetId: targetRow.id,
          originalKey: song.originalKey ?? null,
        }
      : { analysisStatus: analysis.status },
  });

  return { ready };
}

export async function importDatabaseSongCatalog(
  database: PrismaClient,
  snapshot: CatalogSnapshot,
): Promise<CatalogImportResult> {
  assertSnapshotUniqueness(snapshot);
  return database.$transaction(async (tx) => {
    const existingCatalog = await tx.catalog.findUnique({ where: { slug: snapshot.catalog.slug } });
    const catalog = await tx.catalog.upsert({
      where: { slug: snapshot.catalog.slug },
      create: {
        slug: snapshot.catalog.slug,
        name: snapshot.catalog.name,
        issue: snapshot.catalog.issue ?? null,
        status: "PUBLISHED",
        revision: Math.max(existingCatalog?.revision ?? 1, snapshot.catalog.revision),
      },
      update: {
        name: snapshot.catalog.name,
        issue: snapshot.catalog.issue ?? null,
        status: "PUBLISHED",
        revision: { set: Math.max(existingCatalog?.revision ?? 1, snapshot.catalog.revision) },
      },
    });

    const stats = {
      total: snapshot.songs.length,
      published: 0,
      songsCreated: 0,
      sourcesCreated: 0,
      analysesCreated: 0,
      targetsCreated: 0,
      entriesCreated: 0,
    };
    for (const song of snapshot.songs) {
      const result = await importSong(tx, catalog.id, song, stats);
      if (result.ready) stats.published += 1;
    }
    return { catalogId: catalog.id, ...stats };
  });
}

export { TJ_2607_CATALOG_SLUG };
