import "server-only";

import { signupTicketGrant } from "@/shared/config/index.server";
import type { Prisma, TicketLedgerType } from "@/shared/db/index.server";
import { prisma } from "@/shared/db/index.server";

export class InsufficientTicketsError extends Error {
  constructor(
    readonly required: number,
    readonly balance: number,
  ) {
    super(`티켓이 부족합니다. 필요한 티켓 ${required}개, 현재 ${balance}개입니다.`);
    this.name = "InsufficientTicketsError";
  }
}

type TicketChange = {
  userId: string;
  type: TicketLedgerType;
  amount: number;
  idempotencyKey: string;
  reason: string;
  mixingJobId?: string | null;
  actorUserId?: string | null;
};

function prismaErrorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
}

export async function applyTicketChange(input: TicketChange) {
  if (!Number.isSafeInteger(input.amount)) throw new Error("Ticket amount must be a safe integer.");
  if (!input.idempotencyKey.trim()) throw new Error("Ticket idempotency key is required.");
  if (!input.reason.trim()) throw new Error("Ticket reason is required.");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existing = await tx.ticketLedger.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
          if (existing) {
            if (existing.userId !== input.userId || existing.type !== input.type || existing.amount !== input.amount) {
              throw new Error("Ticket idempotency key was reused with different input.");
            }
            return existing;
          }

          if (input.amount < 0) {
            const updated = await tx.user.updateMany({
              where: { id: input.userId, ticketBalance: { gte: Math.abs(input.amount) } },
              data: { ticketBalance: { increment: input.amount } },
            });
            if (updated.count !== 1) {
              const current = await tx.user.findUnique({
                where: { id: input.userId },
                select: { ticketBalance: true },
              });
              if (!current) throw new Error("Ticket owner was not found.");
              throw new InsufficientTicketsError(Math.abs(input.amount), current.ticketBalance);
            }
          } else {
            await tx.user.update({
              where: { id: input.userId },
              data: { ticketBalance: { increment: input.amount } },
            });
          }
          const owner = await tx.user.findUniqueOrThrow({
            where: { id: input.userId },
            select: { ticketBalance: true },
          });
          return tx.ticketLedger.create({
            data: {
              userId: input.userId,
              type: input.type,
              amount: input.amount,
              balanceAfter: owner.ticketBalance,
              idempotencyKey: input.idempotencyKey,
              reason: input.reason.trim(),
              mixingJobId: input.mixingJobId ?? null,
              actorUserId: input.actorUserId ?? null,
            },
          });
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      const code = prismaErrorCode(error);
      if (code === "P2034" && attempt < 2) continue;
      if (code === "P2002") {
        const existing = await prisma.ticketLedger.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (
          existing &&
          existing.userId === input.userId &&
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

export async function ensureSignupGrant(userId: string) {
  const amount = signupTicketGrant();
  return applyTicketChange({
    userId,
    type: "SIGNUP_GRANT",
    amount,
    idempotencyKey: `signup:${userId}`,
    reason: "회원가입 무료 티켓",
  });
}

export async function getTicketAccount(userId: string, page = 1, pageSize = 20) {
  const normalizedPage = Math.max(1, Math.trunc(page));
  const normalizedPageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const where: Prisma.TicketLedgerWhereInput = { userId };
  const [user, total, entries] = await prisma.$transaction([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { ticketBalance: true } }),
    prisma.ticketLedger.count({ where }),
    prisma.ticketLedger.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (normalizedPage - 1) * normalizedPageSize,
      take: normalizedPageSize,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        reason: true,
        mixingJobId: true,
        actorUserId: true,
        createdAt: true,
      },
    }),
  ]);
  return {
    balance: user.ticketBalance,
    page: normalizedPage,
    pageSize: normalizedPageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / normalizedPageSize)),
    entries,
  };
}
