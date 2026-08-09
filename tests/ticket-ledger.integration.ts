import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("signup grants and ticket debits are idempotent and never create a negative balance", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }
  const previousGrant = process.env.SIGNUP_TICKET_GRANT;
  process.env.SIGNUP_TICKET_GRANT = "1";
  const { prisma } = await import("../src/shared/db/index.server");
  const { applyTicketChange, ensureSignupGrant, getTicketAccount, InsufficientTicketsError } = await import(
    "../src/entities/ticket/index.server"
  );
  const userId = `ticket-owner-${crypto.randomUUID()}`;
  try {
    await prisma.user.create({
      data: { id: userId, name: "Ticket owner", email: `${userId}@example.test`, emailVerified: true },
    });

    await Promise.all([ensureSignupGrant(userId), ensureSignupGrant(userId)]);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).ticketBalance, 1);
    assert.equal(await prisma.ticketLedger.count({ where: { userId, type: "SIGNUP_GRANT" } }), 1);

    const debitInput = {
      userId,
      type: "MIXING_DEBIT" as const,
      amount: -1,
      idempotencyKey: `mixing:debit:${userId}`,
      reason: "AI 믹싱",
    };
    const [first, duplicate] = await Promise.all([applyTicketChange(debitInput), applyTicketChange(debitInput)]);
    assert.equal(first.id, duplicate.id);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).ticketBalance, 0);
    const account = await getTicketAccount(userId, 99, 1);
    assert.equal(account.page, account.pageCount);
    assert.equal(account.entries.length, 1);
    assert.equal(await prisma.ticketLedger.count({ where: { userId, type: "MIXING_DEBIT" } }), 1);

    await assert.rejects(
      () => applyTicketChange({ ...debitInput, idempotencyKey: `${debitInput.idempotencyKey}:second` }),
      (error) => error instanceof InsufficientTicketsError && error.required === 1 && error.balance === 0,
    );
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).ticketBalance, 0);
  } finally {
    if (previousGrant === undefined) delete process.env.SIGNUP_TICKET_GRANT;
    else process.env.SIGNUP_TICKET_GRANT = previousGrant;
    await prisma.ticketLedger.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
