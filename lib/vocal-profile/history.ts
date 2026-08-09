import "server-only";

import { prisma } from "@/lib/db/prisma";
import { serializeProfile } from "@/lib/vocal-profile/server";

const profileSummarySelect = {
  id: true,
  minMidi: true,
  maxMidi: true,
  medianMidi: true,
  tessituraLowMidi: true,
  tessituraHighMidi: true,
  voicedRatio: true,
  pitchStability: true,
  analyzer: true,
  analyzerVersion: true,
  createdAt: true,
  recording: { select: { durationMs: true, mimeType: true } },
  recommendationRuns: { orderBy: { createdAt: "desc" as const }, take: 1, select: { id: true } },
  _count: { select: { recommendationRuns: true, mixingJobs: true } },
} as const;

function requiredMetric(value: number | null, name: string) {
  if (value === null) throw new Error(`Stored user profile is missing ${name}.`);
  return value;
}

function serializeSummary(row: Awaited<ReturnType<typeof findProfileRows>>[number]) {
  return {
    id: row.id,
    minMidi: requiredMetric(row.minMidi, "minMidi"),
    maxMidi: requiredMetric(row.maxMidi, "maxMidi"),
    medianMidi: requiredMetric(row.medianMidi, "medianMidi"),
    tessituraLowMidi: requiredMetric(row.tessituraLowMidi, "tessituraLowMidi"),
    tessituraHighMidi: requiredMetric(row.tessituraHighMidi, "tessituraHighMidi"),
    voicedRatio: requiredMetric(row.voicedRatio, "voicedRatio"),
    pitchStability: requiredMetric(row.pitchStability, "pitchStability"),
    analyzer: row.analyzer,
    analyzerVersion: row.analyzerVersion,
    durationMs: row.recording.durationMs,
    mimeType: row.recording.mimeType,
    recommendationCount: row._count.recommendationRuns,
    mixingCount: row._count.mixingJobs,
    latestRecommendationId: row.recommendationRuns[0]?.id ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function findProfileRows(userId: string, skip: number, take: number) {
  return prisma.vocalProfile.findMany({
    where: { userId, sourceType: "USER" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip,
    take,
    select: profileSummarySelect,
  });
}

export async function getVocalProfileHistory(userId: string, page = 1, pageSize = 12) {
  const normalizedPage = Math.max(1, Math.trunc(page));
  const normalizedPageSize = Math.min(50, Math.max(1, Math.trunc(pageSize)));
  const where = { userId, sourceType: "USER" as const };
  const [total, rows] = await Promise.all([
    prisma.vocalProfile.count({ where }),
    findProfileRows(userId, (normalizedPage - 1) * normalizedPageSize, normalizedPageSize),
  ]);
  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / normalizedPageSize)),
    profiles: rows.map(serializeSummary),
  };
}

export async function getVocalProfileDetail(userId: string, id: string) {
  const row = await prisma.vocalProfile.findFirst({
    where: { id, userId, sourceType: "USER" },
    include: {
      recording: true,
      recommendationRuns: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true } },
      _count: { select: { recommendationRuns: true, mixingJobs: true } },
    },
  });
  if (!row) return null;
  return {
    profile: serializeProfile(row),
    recommendationCount: row._count.recommendationRuns,
    mixingCount: row._count.mixingJobs,
    latestRecommendationId: row.recommendationRuns[0]?.id ?? null,
    audioUrl: `/api/vocal-profiles/${row.id}/audio`,
  };
}

export async function getVocalProfileReference(userId: string, id: string) {
  const row = await prisma.vocalProfile.findFirst({
    where: { id, userId, sourceType: "USER" },
    select: {
      id: true,
      recording: {
        select: {
          mediaAsset: {
            select: { userId: true, kind: true, status: true, externalUrl: true, mimeType: true },
          },
        },
      },
    },
  });
  const asset = row?.recording.mediaAsset;
  if (!row || !asset || asset.userId !== userId || asset.kind !== "REFERENCE" || asset.status !== "READY") return null;
  return { profileId: row.id, externalUrl: asset.externalUrl, mimeType: asset.mimeType };
}

export async function getVocalProfileSynthesisReference(userId: string, id: string) {
  const row = await prisma.vocalProfile.findFirst({
    where: { id, userId, sourceType: "USER" },
    select: {
      id: true,
      synthesisReferenceAsset: {
        select: { userId: true, kind: true, status: true, externalUrl: true, mimeType: true },
      },
    },
  });
  const asset = row?.synthesisReferenceAsset;
  if (!row || !asset || asset.userId !== userId || asset.kind !== "SYNTHESIS_REFERENCE" || asset.status !== "READY")
    return null;
  return { profileId: row.id, externalUrl: asset.externalUrl, mimeType: asset.mimeType };
}
