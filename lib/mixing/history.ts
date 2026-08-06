import "server-only";

import { prisma } from "@/lib/db/prisma";

const historySelect = {
  id: true,
  status: true,
  ticketCost: true,
  errorCode: true,
  errorDetail: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  completedAt: true,
  song: { select: { title: true, artist: true, catalogOrder: true } },
  vocalProfile: { select: { id: true, createdAt: true } },
  resultAsset: { select: { id: true, status: true } },
} as const;

export type MixingHistoryRow = Awaited<ReturnType<typeof getMixingHistory>>["jobs"][number];

function serializeRow(row: Awaited<ReturnType<typeof findRows>>[number]) {
  return {
    id: row.id,
    status: row.status.toLowerCase(),
    ticketCost: row.ticketCost,
    error: row.errorCode ? { code: row.errorCode, detail: row.errorDetail ?? "믹싱 작업이 실패했습니다." } : null,
    song: row.song,
    vocalProfile: { id: row.vocalProfile.id, createdAt: row.vocalProfile.createdAt.toISOString() },
    resultReady: row.status === "SUCCEEDED" && row.resultAsset?.status === "READY",
    audioUrl: row.status === "SUCCEEDED" && row.resultAsset?.status === "READY" ? `/api/mixing-jobs/${row.id}/audio` : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

async function findRows(userId: string, skip: number, take: number) {
  return prisma.mixingJob.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip,
    take,
    select: historySelect,
  });
}

export async function getMixingHistory(userId: string, page = 1, pageSize = 20) {
  const normalizedPage = Math.max(1, Math.trunc(page));
  const normalizedPageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const [total, rows] = await Promise.all([
    prisma.mixingJob.count({ where: { userId } }),
    findRows(userId, (normalizedPage - 1) * normalizedPageSize, normalizedPageSize),
  ]);
  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / normalizedPageSize)),
    jobs: rows.map(serializeRow),
  };
}

export async function getMixingJobForUser(userId: string, id: string) {
  const row = await prisma.mixingJob.findFirst({ where: { id, userId }, select: historySelect });
  return row ? serializeRow(row) : null;
}
