import "server-only";

import { MixingJobStatus, type Prisma, prisma } from "@/shared/db/index.server";
import {
  type MixingHistoryFilters,
  type MixingHistoryPayload,
  type MixingHistoryRow,
  mixingHistoryFiltersSchema,
  type PublicMixingJobStatus,
} from "../model/contract";

const historySelect = {
  id: true,
  status: true,
  ticketCost: true,
  errorCode: true,
  errorDetail: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  startedAt: true,
  completedAt: true,
  song: { select: { title: true, artist: true, catalogOrder: true } },
  vocalProfile: { select: { id: true, profileNumber: true, displayName: true, createdAt: true } },
  resultAsset: { select: { id: true, status: true } },
} as const;

function serializeRow(row: Awaited<ReturnType<typeof findRows>>[number]): MixingHistoryRow {
  return {
    id: row.id,
    status: row.status.toLowerCase() as PublicMixingJobStatus,
    ticketCost: row.ticketCost,
    error:
      row.status === "FAILED" && row.errorCode
        ? { code: row.errorCode, detail: row.errorDetail ?? "믹싱 작업이 실패했습니다." }
        : null,
    song: row.song,
    vocalProfile: {
      id: row.vocalProfile.id,
      displayName: row.vocalProfile.displayName?.trim() || `보컬 프로필 ${row.vocalProfile.profileNumber ?? 1}`,
      createdAt: row.vocalProfile.createdAt.toISOString(),
    },
    resultReady: row.status === "SUCCEEDED" && row.resultAsset?.status === "READY",
    audioUrl:
      row.status === "SUCCEEDED" && row.resultAsset?.status === "READY" ? `/api/mixing-jobs/${row.id}/audio` : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    submittedAt: row.submittedAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

const databaseStatusByPublicStatus: Record<PublicMixingJobStatus, MixingJobStatus> = {
  pending: MixingJobStatus.PENDING,
  preparing: MixingJobStatus.PREPARING,
  submitted: MixingJobStatus.SUBMITTED,
  processing: MixingJobStatus.PROCESSING,
  succeeded: MixingJobStatus.SUCCEEDED,
  failed: MixingJobStatus.FAILED,
  canceled: MixingJobStatus.CANCELED,
};

function mixingHistoryWhere(userId: string, filters: MixingHistoryFilters): Prisma.MixingJobWhereInput {
  return {
    userId,
    ...(filters.status === "all" ? {} : { status: databaseStatusByPublicStatus[filters.status] }),
    ...(filters.q
      ? {
          OR: [
            { song: { title: { contains: filters.q, mode: "insensitive" as const } } },
            { song: { artist: { contains: filters.q, mode: "insensitive" as const } } },
            { vocalProfile: { displayName: { contains: filters.q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
}

async function findRows(where: Prisma.MixingJobWhereInput, skip: number, take: number) {
  return prisma.mixingJob.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip,
    take,
    select: historySelect,
  });
}

export async function getMixingHistory(
  userId: string,
  pageOrFilters: number | Partial<MixingHistoryFilters> = 1,
  pageSize = 20,
): Promise<MixingHistoryPayload> {
  const filters = mixingHistoryFiltersSchema.parse(
    typeof pageOrFilters === "number" ? { page: pageOrFilters } : pageOrFilters,
  );
  const normalizedPageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const where = mixingHistoryWhere(userId, filters);
  const [total, rows] = await Promise.all([
    prisma.mixingJob.count({ where }),
    findRows(where, (filters.page - 1) * normalizedPageSize, normalizedPageSize),
  ]);
  return {
    page: filters.page,
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
