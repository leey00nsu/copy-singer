import "server-only";

import type { MixingJobStatus, Prisma } from "@/generated/prisma/client";
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
  const [users, jobs, ticketTotals, recentFailures] = await Promise.all([
    prisma.user.count(),
    prisma.mixingJob.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.ticketLedger.aggregate({ _sum: { amount: true }, _count: { _all: true } }),
    prisma.mixingJob.count({
      where: { status: "FAILED", completedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1_000) } },
    }),
  ]);
  return {
    users,
    jobs: Object.fromEntries(jobs.map((entry) => [entry.status.toLowerCase(), entry._count._all])),
    ticketNet: ticketTotals._sum.amount ?? 0,
    ticketEvents: ticketTotals._count._all,
    recentFailures,
  };
}

export async function listAdminUsers(query = "", page = 1, pageSize = 10) {
  const normalizedPage = Math.max(1, Math.trunc(page));
  const q = query.trim();
  const where: Prisma.UserWhereInput = q
    ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] }
    : {};
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (normalizedPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        ticketBalance: true,
        createdAt: true,
        _count: { select: { vocalProfiles: true, mixingJobs: true } },
      },
    }),
  ]);
  return { users, total, page: normalizedPage, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listAdminMixingJobs(query = "", status = "", page = 1, pageSize = 10) {
  const normalizedPage = Math.max(1, Math.trunc(page));
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
  const [total, jobs] = await Promise.all([
    prisma.mixingJob.count({ where }),
    prisma.mixingJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (normalizedPage - 1) * pageSize,
      take: pageSize,
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
    }),
  ]);
  return { jobs, total, page: normalizedPage, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
