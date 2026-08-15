import "server-only";

import { signupMixingTicketGrant, signupVocalAnalysisTicketGrant } from "@/shared/config/index.server";
import type { Prisma, TicketKind, TicketLedgerType } from "@/shared/db/index.server";
import { prisma } from "@/shared/db/index.server";

export class InsufficientTicketsError extends Error {
  constructor(
    readonly kind: TicketKind,
    readonly required: number,
    readonly balance: number,
  ) {
    const label = kind === "VOCAL_ANALYSIS" ? "분석 티켓" : "믹싱 티켓";
    super(`${label}이 부족해요. 필요한 티켓은 ${required}장이고, 현재 ${balance}장 있어요.`);
    this.name = "InsufficientTicketsError";
  }
}

export type TicketChange = {
  userId: string;
  kind: TicketKind;
  type: TicketLedgerType;
  amount: number;
  idempotencyKey: string;
  reason: string;
  mixingJobId?: string | null;
  vocalProfileAnalysisJobId?: string | null;
  actorUserId?: string | null;
};

function prismaErrorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
}

function isTransactionWriteConflict(error: unknown) {
  return prismaErrorCode(error) === "P2034" || (error instanceof Error && error.message === "TransactionWriteConflict");
}

function validateTicketChange(input: TicketChange) {
  if (!Number.isSafeInteger(input.amount)) throw new Error("Ticket amount must be a safe integer.");
  if (!input.idempotencyKey.trim()) throw new Error("Ticket idempotency key is required.");
  if (!input.reason.trim()) throw new Error("Ticket reason is required.");
}

export async function applyTicketChangeInTransaction(tx: Prisma.TransactionClient, input: TicketChange) {
  validateTicketChange(input);
  const existing = await tx.ticketLedger.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    if (
      existing.userId !== input.userId ||
      existing.kind !== input.kind ||
      existing.type !== input.type ||
      existing.amount !== input.amount
    ) {
      throw new Error("Ticket idempotency key was reused with different input.");
    }
    return existing;
  }

  await tx.ticketWallet.upsert({
    where: { userId_kind: { userId: input.userId, kind: input.kind } },
    create: { userId: input.userId, kind: input.kind, balance: 0 },
    update: {},
  });

  if (input.amount < 0) {
    const updated = await tx.ticketWallet.updateMany({
      where: { userId: input.userId, kind: input.kind, balance: { gte: Math.abs(input.amount) } },
      data: { balance: { increment: input.amount } },
    });
    if (updated.count !== 1) {
      const current = await tx.ticketWallet.findUnique({
        where: { userId_kind: { userId: input.userId, kind: input.kind } },
        select: { balance: true },
      });
      throw new InsufficientTicketsError(input.kind, Math.abs(input.amount), current?.balance ?? 0);
    }
  } else {
    await tx.ticketWallet.update({
      where: { userId_kind: { userId: input.userId, kind: input.kind } },
      data: { balance: { increment: input.amount } },
    });
  }
  const wallet = await tx.ticketWallet.findUniqueOrThrow({
    where: { userId_kind: { userId: input.userId, kind: input.kind } },
    select: { balance: true },
  });
  return tx.ticketLedger.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      type: input.type,
      amount: input.amount,
      balanceAfter: wallet.balance,
      idempotencyKey: input.idempotencyKey,
      reason: input.reason.trim(),
      mixingJobId: input.mixingJobId ?? null,
      vocalProfileAnalysisJobId: input.vocalProfileAnalysisJobId ?? null,
      actorUserId: input.actorUserId ?? null,
    },
  });
}

export async function applyTicketChange(input: TicketChange) {
  validateTicketChange(input);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction((tx) => applyTicketChangeInTransaction(tx, input), {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      const code = prismaErrorCode(error);
      if (isTransactionWriteConflict(error) && attempt < 2) continue;
      if (code === "P2002") {
        const existing = await prisma.ticketLedger.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (
          existing &&
          existing.userId === input.userId &&
          existing.kind === input.kind &&
          existing.type === input.type &&
          existing.amount === input.amount
        ) {
          return existing;
        }
      }
      throw error;
    }
  }
  throw new Error("Ticket transaction exhausted its retry limit.");
}

async function ensureSignupGrantForKind(input: {
  userId: string;
  kind: TicketKind;
  amount: number;
  idempotencyKey: string;
  reason: string;
  reuseExistingSignupGrant?: boolean;
}) {
  if (input.reuseExistingSignupGrant) {
    const existing = await prisma.ticketLedger.findFirst({
      where: { userId: input.userId, kind: input.kind, type: "SIGNUP_GRANT" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    if (existing) return existing;
  }
  return applyTicketChange({
    userId: input.userId,
    kind: input.kind,
    type: "SIGNUP_GRANT",
    amount: input.amount,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason,
  });
}

export async function ensureSignupTicketGrants(userId: string) {
  const [vocalAnalysis, aiMixing] = await Promise.all([
    ensureSignupGrantForKind({
      userId,
      kind: "VOCAL_ANALYSIS",
      amount: signupVocalAnalysisTicketGrant(),
      idempotencyKey: `signup:vocal-analysis:${userId}`,
      reason: "회원가입 무료 분석 티켓",
    }),
    ensureSignupGrantForKind({
      userId,
      kind: "AI_MIXING",
      amount: signupMixingTicketGrant(),
      idempotencyKey: `signup:ai-mixing:${userId}`,
      reason: "회원가입 무료 믹싱 티켓",
      reuseExistingSignupGrant: true,
    }),
  ]);
  return { vocalAnalysis, aiMixing };
}

export async function getTicketWallets(userId: string) {
  await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true } });
  const wallets = await prisma.ticketWallet.findMany({
    where: { userId },
    select: { kind: true, balance: true },
  });
  const byKind = new Map(wallets.map((wallet) => [wallet.kind, wallet.balance]));
  return {
    wallets: (["VOCAL_ANALYSIS", "AI_MIXING"] as const).map((kind) => ({ kind, balance: byKind.get(kind) ?? 0 })),
  };
}

export async function getTicketAccount(userId: string, page = 1, pageSize = 20) {
  const requestedPage = Math.max(1, Math.trunc(page));
  const normalizedPageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const where: Prisma.TicketLedgerWhereInput = { userId };
  return prisma.$transaction(async (transaction) => {
    await transaction.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true } });
    const wallets = await transaction.ticketWallet.findMany({
      where: { userId },
      select: { kind: true, balance: true },
    });
    const walletByKind = new Map(wallets.map((wallet) => [wallet.kind, wallet.balance]));
    const normalizedWallets = (["VOCAL_ANALYSIS", "AI_MIXING"] as const).map((kind) => ({
      kind,
      balance: walletByKind.get(kind) ?? 0,
    }));
    const total = await transaction.ticketLedger.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / normalizedPageSize));
    const normalizedPage = Math.min(requestedPage, pageCount);
    const entries = await transaction.ticketLedger.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (normalizedPage - 1) * normalizedPageSize,
      take: normalizedPageSize,
      select: {
        id: true,
        kind: true,
        type: true,
        amount: true,
        balanceAfter: true,
        reason: true,
        mixingJobId: true,
        vocalProfileAnalysisJobId: true,
        actorUserId: true,
        createdAt: true,
      },
    });
    return {
      wallets: normalizedWallets,
      page: normalizedPage,
      pageSize: normalizedPageSize,
      total,
      pageCount,
      entries,
    };
  });
}
