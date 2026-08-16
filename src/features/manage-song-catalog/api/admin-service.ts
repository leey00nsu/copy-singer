import "server-only";

import { SONG_ANALYSIS_PIPELINE_CONTRACT, TJ_2607_CATALOG_SLUG } from "@/shared/config/index.server";
import type { Prisma } from "@/shared/db/index.server";
import { prisma } from "@/shared/db/index.server";
import { SongCatalogAdminError } from "../model/error";
import type { CreateAdminSongInput, ReplaceAdminSongSourceInput } from "../model/schema";
import { cleanupUnreferencedCatalogTarget } from "./target-assets";

function songInclude() {
  return {
    activeSource: true,
    currentAnalysis: true,
    targetAsset: true,
    sources: {
      orderBy: { revision: "desc" as const },
      include: { analysisJob: true, analyses: true, targetAssets: true },
    },
    catalogEntries: { include: { catalog: true } },
  };
}

async function catalogOrThrow(tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const catalog = await tx.catalog.findUnique({ where: { slug: TJ_2607_CATALOG_SLUG } });
  if (!catalog) throw new SongCatalogAdminError("CATALOG_NOT_FOUND", "카탈로그를 먼저 초기화해야 해요.", 409);
  return catalog;
}

export async function findAdminCatalog(
  input: { q: string; status: "" | "DRAFT" | "ACTIVE" | "ARCHIVED"; page: number },
  pageSize = 20,
  catalogSlug = TJ_2607_CATALOG_SLUG,
) {
  const catalog = await prisma.catalog.findUnique({ where: { slug: catalogSlug } });
  if (!catalog) return null;
  const where: Prisma.CatalogEntryWhereInput = {
    catalogId: catalog.id,
    song: {
      ...(input.status ? { lifecycleStatus: input.status } : {}),
      ...(input.q
        ? {
            OR: [
              { title: { contains: input.q, mode: "insensitive" as const } },
              { artist: { contains: input.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
  };
  const [total, entries] = await Promise.all([
    prisma.catalogEntry.count({ where }),
    prisma.catalogEntry.findMany({
      where,
      orderBy: { position: "asc" },
      skip: (input.page - 1) * pageSize,
      take: pageSize,
      include: { song: { include: songInclude() } },
    }),
  ]);
  return { catalog, entries, total, page: input.page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listAdminCatalog(
  input: { q: string; status: "" | "DRAFT" | "ACTIVE" | "ARCHIVED"; page: number },
  pageSize = 20,
) {
  const result = await findAdminCatalog(input, pageSize);
  if (!result) throw new SongCatalogAdminError("CATALOG_NOT_FOUND", "카탈로그를 먼저 초기화해야 해요.", 409);
  return result;
}

export async function createAdminSong(input: CreateAdminSongInput, adminUserId: string | null) {
  const existingJob = await prisma.songAnalysisJob.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: { source: { include: { song: { include: songInclude() } } } },
  });
  if (existingJob) {
    const existing = existingJob.source;
    if (
      existing.sourceVideoId !== input.sourceVideoId ||
      existing.song.title !== input.title ||
      existing.song.artist !== input.artist
    ) {
      throw new SongCatalogAdminError("IDEMPOTENCY_CONFLICT", "다른 요청에서 이미 사용한 요청 키예요.", 409);
    }
    return existing.song;
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const catalog = await catalogOrThrow(tx);
      const lastEntry = await tx.catalogEntry.findFirst({
        where: { catalogId: catalog.id },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const position = input.catalogPosition ?? (lastEntry?.position ?? 0) + 1;
      const song = await tx.song.create({
        data: {
          title: input.title,
          artist: input.artist,
          originalKey: null,
          lifecycleStatus: "DRAFT",
          createdByUserId: adminUserId,
        },
      });
      const source = await tx.songSource.create({
        data: {
          songId: song.id,
          revision: 1,
          sourceUrl: input.sourceUrl,
          sourceVideoId: input.sourceVideoId,
          sourceLabel: input.sourceLabel,
          status: "DRAFT",
          createdByUserId: adminUserId,
        },
      });
      await tx.catalogEntry.create({ data: { catalogId: catalog.id, songId: song.id, position, status: "DRAFT" } });
      await tx.songAnalysisJob.create({ data: { sourceId: source.id, idempotencyKey: input.idempotencyKey } });
      return tx.song.findUniqueOrThrow({ where: { id: song.id }, include: songInclude() });
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      const raced = await prisma.songAnalysisJob.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { source: { include: { song: { include: songInclude() } } } },
      });
      if (
        raced?.source.sourceVideoId === input.sourceVideoId &&
        raced.source.song.title === input.title &&
        raced.source.song.artist === input.artist
      )
        return raced.source.song;
      throw new SongCatalogAdminError("SONG_CONFLICT", "곡, 순위 또는 출처가 이미 등록되어 있어요.", 409);
    }
    throw error;
  }
}

export async function replaceAdminSongSource(
  songId: string,
  input: ReplaceAdminSongSourceInput,
  adminUserId: string | null,
) {
  const existingJob = await prisma.songAnalysisJob.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: { source: true },
  });
  if (existingJob) {
    if (existingJob.source.songId !== songId)
      throw new SongCatalogAdminError("IDEMPOTENCY_CONFLICT", "다른 곡에서 이미 사용한 요청 키예요.", 409);
    if (existingJob.source.sourceVideoId !== input.sourceVideoId)
      throw new SongCatalogAdminError("IDEMPOTENCY_CONFLICT", "다른 출처에서 이미 사용한 요청 키예요.", 409);
    return existingJob.source;
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const song = await tx.song.findUnique({ where: { id: songId }, select: { id: true } });
      if (!song) throw new SongCatalogAdminError("SONG_NOT_FOUND", "곡을 찾을 수 없어요.", 404);
      const last = await tx.songSource.findFirst({
        where: { songId },
        orderBy: { revision: "desc" },
        select: { revision: true },
      });
      const source = await tx.songSource.create({
        data: {
          songId,
          revision: (last?.revision ?? 0) + 1,
          sourceUrl: input.sourceUrl,
          sourceVideoId: input.sourceVideoId,
          sourceLabel: input.sourceLabel,
          status: "DRAFT",
          createdByUserId: adminUserId,
        },
      });
      await tx.songAnalysisJob.create({ data: { sourceId: source.id, idempotencyKey: input.idempotencyKey } });
      return source;
    });
  } catch (error) {
    if (error instanceof SongCatalogAdminError) throw error;
    if ((error as { code?: string }).code === "P2002") {
      const raced = await prisma.songAnalysisJob.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { source: true },
      });
      if (raced?.source.songId === songId && raced.source.sourceVideoId === input.sourceVideoId) return raced.source;
      throw new SongCatalogAdminError("SOURCE_CONFLICT", "이미 등록된 출처예요.", 409);
    }
    throw error;
  }
}

export async function retryAdminSongAnalysis(sourceId: string) {
  const job = await prisma.songAnalysisJob.findUnique({ where: { sourceId } });
  if (!job) throw new SongCatalogAdminError("ANALYSIS_JOB_NOT_FOUND", "분석 작업을 찾을 수 없어요.", 404);
  if (job.status !== "FAILED")
    throw new SongCatalogAdminError("ANALYSIS_JOB_NOT_FAILED", "실패한 분석 작업만 다시 시도할 수 있어요.", 409);
  return prisma.songAnalysisJob.update({
    where: { id: job.id },
    data: {
      status: "PENDING",
      attempts: 0,
      nextAttemptAt: new Date(),
      errorCode: null,
      errorDetail: null,
      retryable: null,
      completedAt: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      externalJobId: null,
      externalSubmittedAt: null,
    },
  });
}

export async function publishAdminSongSource(songId: string, sourceId: string, fetchImpl?: typeof fetch) {
  const previous = await prisma.song.findUnique({ where: { id: songId }, include: { targetAsset: true } });
  const result = await prisma.$transaction(async (tx) => {
    const source = await tx.songSource.findFirst({ where: { id: sourceId, songId } });
    if (!source) throw new SongCatalogAdminError("SOURCE_NOT_FOUND", "곡의 출처를 찾을 수 없어요.", 404);
    const analysis = await tx.songAnalysis.findUnique({
      where: { sourceId_pipelineContract: { sourceId, pipelineContract: SONG_ANALYSIS_PIPELINE_CONTRACT } },
    });
    if (analysis?.status !== "READY" || analysis.cleanupConfirmed !== true)
      throw new SongCatalogAdminError("ANALYSIS_NOT_READY", "분석이 아직 완료되지 않았어요.", 409);
    const target = await tx.catalogTargetAsset.findFirst({
      where: { sourceId, status: "READY" },
      orderBy: { createdAt: "desc" },
    });
    if (!target || target.sourceVideoId !== source.sourceVideoId)
      throw new SongCatalogAdminError("TARGET_NOT_READY", "이 영상에 대응하는 원곡 음원 파일이 없어요.", 409);
    const entry = await tx.catalogEntry.findFirst({ where: { songId, catalog: { slug: TJ_2607_CATALOG_SLUG } } });
    if (!entry) throw new SongCatalogAdminError("CATALOG_ENTRY_NOT_FOUND", "카탈로그 항목을 찾을 수 없어요.", 404);
    const current = await tx.song.findUniqueOrThrow({ where: { id: songId } });
    const publishedResultChanged =
      entry.status !== "PUBLISHED" ||
      current.activeSourceId !== sourceId ||
      current.currentAnalysisId !== analysis.id ||
      current.targetAssetId !== target.id;
    await tx.songSource.updateMany({
      where: { songId, id: { not: sourceId }, status: "READY" },
      data: { status: "SUPERSEDED" },
    });
    await tx.songSource.update({ where: { id: sourceId }, data: { status: "READY" } });
    await tx.catalogEntry.update({ where: { id: entry.id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    if (publishedResultChanged) {
      await tx.catalog.update({ where: { id: entry.catalogId }, data: { revision: { increment: 1 } } });
    }
    return tx.song.update({
      where: { id: songId },
      data: {
        lifecycleStatus: "ACTIVE",
        activeSourceId: sourceId,
        currentAnalysisId: analysis.id,
        targetAssetId: target.id,
        originalKey: analysis.estimatedKey,
      },
    });
  });
  if (previous?.targetAsset && previous.targetAsset.id !== result.targetAssetId)
    await cleanupUnreferencedCatalogTarget(previous.targetAsset, fetchImpl);
  return result;
}

export async function archiveAdminSong(songId: string) {
  return prisma.$transaction(async (tx) => {
    const song = await tx.song.findUnique({ where: { id: songId } });
    if (!song) throw new SongCatalogAdminError("SONG_NOT_FOUND", "곡을 찾을 수 없어요.", 404);
    const entries = await tx.catalogEntry.findMany({ where: { songId, status: { not: "ARCHIVED" } } });
    await tx.catalogEntry.updateMany({ where: { songId, status: { not: "ARCHIVED" } }, data: { status: "ARCHIVED" } });
    for (const catalogId of new Set(entries.map((entry) => entry.catalogId))) {
      await tx.catalog.update({ where: { id: catalogId }, data: { revision: { increment: 1 } } });
    }
    return tx.song.update({ where: { id: songId }, data: { lifecycleStatus: "ARCHIVED" } });
  });
}
