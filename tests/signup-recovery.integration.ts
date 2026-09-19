import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("signup snapshots, legacy partial grants and session reads preserve the ledger", async () => {
  const { prisma } = await import("../src/shared/db/index.server");
  const { ensureSignupTicketGrants, recoverSignupGrant, applyTicketChange } = await import(
    "../src/entities/ticket/index.server"
  );
  const ids = [crypto.randomUUID(), crypto.randomUUID()];
  const saved = { ...process.env };
  try {
    for (const id of ids) await prisma.user.create({ data: { id, email: `${id}@example.test`, name: "Readiness" } });
    const [fresh, legacy] = ids;
    process.env.SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT = "5";
    process.env.SIGNUP_MIXING_TICKET_GRANT = "1";
    await Promise.all([ensureSignupTicketGrants(fresh), ensureSignupTicketGrants(fresh)]);
    process.env.SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT = "3";
    await ensureSignupTicketGrants(fresh);
    assert.equal(
      (
        await prisma.ticketWallet.findUniqueOrThrow({
          where: { userId_kind: { userId: fresh, kind: "VOCAL_ANALYSIS" } },
        })
      ).balance,
      5,
    );
    assert.equal(await prisma.ticketLedger.count({ where: { userId: fresh } }), 2);
    await applyTicketChange({
      userId: legacy,
      kind: "AI_MIXING",
      amount: 4,
      type: "SIGNUP_GRANT",
      idempotencyKey: `legacy:${legacy}`,
      reason: "old policy",
    });
    const before = await prisma.ticketLedger.findMany({ where: { userId: legacy } });
    const recovery = {
      userId: legacy,
      kind: "VOCAL_ANALYSIS" as const,
      amount: 7,
      operator: "test-operator",
      reason: "verified old amount",
    };
    const dryRun = await recoverSignupGrant(recovery);
    assert.equal(dryRun.action, "WOULD_GRANT");
    assert.deepEqual(
      { balanceBefore: dryRun.balanceBefore, balanceAfter: dryRun.balanceAfter },
      { balanceBefore: 0, balanceAfter: 7 },
    );
    assert.equal(await prisma.signupGrantIntent.count({ where: { userId: legacy } }), 0);
    const applied = await Promise.all([
      recoverSignupGrant({ ...recovery, apply: true }),
      recoverSignupGrant({ ...recovery, apply: true }),
    ]);
    const granted = applied.filter((result) => result.action === "GRANTED");
    const duplicate = applied.filter((result) => result.action === "NOOP");
    assert.equal(granted.length, 1);
    assert.equal(duplicate.length, 1);
    assert.deepEqual(
      {
        balanceBefore: granted[0]?.balanceBefore,
        balanceAfter: granted[0]?.balanceAfter,
      },
      { balanceBefore: 0, balanceAfter: 7 },
    );
    assert.deepEqual(
      {
        balanceBefore: duplicate[0]?.balanceBefore,
        balanceAfter: duplicate[0]?.balanceAfter,
      },
      { balanceBefore: 7, balanceAfter: 7 },
    );
    assert.equal(
      (
        await prisma.ticketWallet.findUniqueOrThrow({
          where: { userId_kind: { userId: legacy, kind: "VOCAL_ANALYSIS" } },
        })
      ).balance,
      7,
    );
    const settled = await recoverSignupGrant(recovery);
    assert.equal(settled.action, "NOOP");
    assert.deepEqual(
      {
        balanceBefore: settled.balanceBefore,
        balanceAfter: settled.balanceAfter,
      },
      { balanceBefore: 7, balanceAfter: 7 },
    );
    assert.equal(await prisma.ticketLedger.count({ where: { userId: legacy } }), 2);
    assert.deepEqual(await prisma.ticketLedger.findMany({ where: { id: before[0].id } }), before);
    await assert.rejects(recoverSignupGrant({ ...recovery, amount: 3, apply: true }), /conflicts/);
    await assert.rejects(recoverSignupGrant({ ...recovery, userId: fresh, amount: 3, apply: true }), /conflicts/);
    Object.assign(process.env, { NODE_ENV: "test" });
    process.env.DEV_AUTH_BYPASS_ENABLED = "true";
    process.env.DEV_AUTH_BYPASS_USER_ID = fresh;
    const { getRequestSession } = await import("../src/features/authentication/api/session");
    const snapshot = await prisma.ticketLedger.findMany({ where: { userId: fresh } });
    assert.equal((await getRequestSession(new Request("http://localhost:3000/api/tickets")))?.user.id, fresh);
    assert.deepEqual(await prisma.ticketLedger.findMany({ where: { userId: fresh } }), snapshot);
  } finally {
    for (const key of [
      "SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT",
      "SIGNUP_MIXING_TICKET_GRANT",
      "NODE_ENV",
      "DEV_AUTH_BYPASS_ENABLED",
      "DEV_AUTH_BYPASS_USER_ID",
    ]) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    await prisma.signupGrantIntent.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
});
