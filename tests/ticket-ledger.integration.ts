import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("signup grants and kind-specific ticket debits are idempotent and isolated", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }
  const previousAnalysisGrant = process.env.SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT;
  const previousMixingGrant = process.env.SIGNUP_MIXING_TICKET_GRANT;
  process.env.SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT = "2";
  process.env.SIGNUP_MIXING_TICKET_GRANT = "1";
  const { prisma } = await import("../src/shared/db/index.server");
  const { applyTicketChange, ensureSignupTicketGrants, getTicketAccount, InsufficientTicketsError } = await import(
    "../src/entities/ticket/index.server"
  );
  const userId = `ticket-owner-${crypto.randomUUID()}`;
  try {
    await prisma.user.create({
      data: { id: userId, name: "Ticket owner", email: `${userId}@example.test`, emailVerified: true },
    });

    await Promise.all([ensureSignupTicketGrants(userId), ensureSignupTicketGrants(userId)]);
    const wallets = await prisma.ticketWallet.findMany({ where: { userId }, orderBy: { kind: "asc" } });
    assert.deepEqual(
      wallets.map(({ kind, balance }) => ({ kind, balance })),
      [
        { kind: "VOCAL_ANALYSIS", balance: 2 },
        { kind: "AI_MIXING", balance: 1 },
      ],
    );
    assert.equal(await prisma.ticketLedger.count({ where: { userId, type: "SIGNUP_GRANT" } }), 2);

    const debitInput = {
      userId,
      kind: "AI_MIXING" as const,
      type: "USAGE_DEBIT" as const,
      amount: -1,
      idempotencyKey: `mixing:debit:${userId}`,
      reason: "AI 믹싱",
    };
    const [first, duplicate] = await Promise.all([applyTicketChange(debitInput), applyTicketChange(debitInput)]);
    assert.equal(first.id, duplicate.id);
    assert.equal(
      (await prisma.ticketWallet.findUniqueOrThrow({ where: { userId_kind: { userId, kind: "AI_MIXING" } } })).balance,
      0,
    );
    assert.equal(
      (await prisma.ticketWallet.findUniqueOrThrow({ where: { userId_kind: { userId, kind: "VOCAL_ANALYSIS" } } }))
        .balance,
      2,
    );
    const account = await getTicketAccount(userId, 99, 1);
    assert.equal(account.page, account.pageCount);
    assert.equal(account.entries.length, 1);
    assert.equal(await prisma.ticketLedger.count({ where: { userId, kind: "AI_MIXING", type: "USAGE_DEBIT" } }), 1);

    await assert.rejects(
      () => applyTicketChange({ ...debitInput, idempotencyKey: `${debitInput.idempotencyKey}:second` }),
      (error) =>
        error instanceof InsufficientTicketsError &&
        error.kind === "AI_MIXING" &&
        error.required === 1 &&
        error.balance === 0,
    );
  } finally {
    if (previousAnalysisGrant === undefined) delete process.env.SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT;
    else process.env.SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT = previousAnalysisGrant;
    if (previousMixingGrant === undefined) delete process.env.SIGNUP_MIXING_TICKET_GRANT;
    else process.env.SIGNUP_MIXING_TICKET_GRANT = previousMixingGrant;
    await prisma.ticketLedger.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
