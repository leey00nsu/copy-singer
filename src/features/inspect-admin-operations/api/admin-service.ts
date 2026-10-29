import "server-only";

import type { MixingJobStatus, Prisma } from "@/shared/db/index.server";
import { prisma } from "@/shared/db/index.server";

const JOB_STATUSES = new Set<MixingJobStatus>([
  "PENDING",
  "PREPARING",
  "SUBMITTED",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "CANCELED",
]);

export async function getAdminOverview() {
  const [users, guests, claimedTrials, jobs, ticketTotals, recentFailures] = await Promise.all([
    prisma.user.count({ where: { isGuest: false } }),
    prisma.guestAnalysisTrial.count({ where: { user: { isGuest: true } } }),
    prisma.guestAnalysisTrial.count({ where: { user: { isGuest: true }, claimedAt: { not: null } } }),
    prisma.mixingJob.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.ticketWallet.aggregate({ _sum: { balance: true }, _count: { _all: true } }),
    prisma.mixingJob.count({
      where: { status: "FAILED", completedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1_000) } },
    }),
  ]);
  return {
    users,
    guests,
    claimedTrials,
    jobs: Object.fromEntries(jobs.map((entry) => [entry.status.toLowerCase(), entry._count._all])),
    ticketNet: ticketTotals._sum.balance ?? 0,
    ticketWallets: ticketTotals._count._all,
    recentFailures,
  };
}

function pagination(page: number, pageSize: number, total: number) {
  const take = Number.isFinite(pageSize) ? Math.min(100, Math.max(1, Math.trunc(pageSize))) : 10;
  const pageCount = Math.max(1, Math.ceil(total / take));
  const current = Number.isFinite(page) ? Math.min(pageCount, Math.max(1, Math.trunc(page))) : 1;
  return { page: current, pageCount, take, skip: (current - 1) * take };
}

export async function listAdminUsers(query = "", page = 1, pageSize = 10, memberId = "") {
  const q = query.trim();
  const where: Prisma.UserWhereInput = {
    isGuest: false,
    ...(memberId ? { id: memberId } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const total = await prisma.user.count({ where });
  const paging = pagination(page, pageSize, total);
  const users = await prisma.user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: paging.skip,
    take: paging.take,
    select: {
      id: true,
      name: true,
      email: true,
      ticketWallets: { select: { kind: true, balance: true } },
      createdAt: true,
      _count: { select: { vocalProfiles: true, mixingJobs: true } },
    },
  });
  return { users, total, page: paging.page, pageCount: paging.pageCount };
}

export async function listAdminGuests({
  query = "",
  page = 1,
  pageSize = 10,
  status = "",
  now = new Date(),
}: {
  query?: string;
  page?: number;
  pageSize?: number;
  status?: string;
  now?: Date;
} = {}) {
  const q = query.trim();
  const where: Prisma.GuestAnalysisTrialWhereInput = {
    user: { isGuest: true },
    ...(status === "claimed" ? { claimedAt: { not: null } } : {}),
    ...(status === "expired" ? { claimedAt: null, expiresAt: { lte: now } } : {}),
    ...(status === "unclaimed" ? { claimedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } : {}),
    ...(q
      ? {
          AND: [
            {
              OR: [
                { userId: { contains: q, mode: "insensitive" } },
                { claimedBy: { name: { contains: q, mode: "insensitive" } } },
                { claimedBy: { email: { contains: q, mode: "insensitive" } } },
              ],
            },
          ],
        }
      : {}),
  };
  const total = await prisma.guestAnalysisTrial.count({ where });
  const paging = pagination(page, pageSize, total);
  const trials = await prisma.guestAnalysisTrial.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: paging.skip,
    take: paging.take,
    select: {
      id: true,
      userId: true,
      createdAt: true,
      consumedAt: true,
      expiresAt: true,
      claimedAt: true,
      claimedBy: { select: { id: true, name: true, email: true } },
      job: { select: { id: true, status: true, completedAt: true } },
    },
  });
  return { trials, total, page: paging.page, pageCount: paging.pageCount };
}

export async function listAdminMixingJobs(query = "", status = "", page = 1, pageSize = 10) {
  const q = query.trim();
  const normalizedStatus = status.trim().toUpperCase() as MixingJobStatus;
  const where: Prisma.MixingJobWhereInput = {
    ...(JOB_STATUSES.has(normalizedStatus) ? { status: normalizedStatus } : {}),
    ...(q
      ? {
          OR: [
            { user: { email: { contains: q, mode: "insensitive" } } },
            { song: { title: { contains: q, mode: "insensitive" } } },
            { song: { artist: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const total = await prisma.mixingJob.count({ where });
  const paging = pagination(page, pageSize, total);
  const jobs = await prisma.mixingJob.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: paging.skip,
    take: paging.take,
    select: {
      id: true,
      status: true,
      ticketCost: true,
      attempts: true,
      errorCode: true,
      createdAt: true,
      completedAt: true,
      user: { select: { id: true, email: true, name: true } },
      song: { select: { title: true, artist: true } },
    },
  });
  return { jobs, total, page: paging.page, pageCount: paging.pageCount };
}
