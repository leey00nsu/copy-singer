import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("admin allowlist and ticket adjustments preserve actor, reason, and nonnegative balance", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }
  const previousAdmins = process.env.ADMIN_EMAILS;
  const suffix = crypto.randomUUID();
  const adminId = `admin-${suffix}`;
  const targetId = `target-${suffix}`;
  const adminEmail = `${adminId}@example.test`;
  process.env.ADMIN_EMAILS = `other@example.test, ${adminEmail.toUpperCase()} `;

  const { prisma } = await import("../src/shared/db/index.server");
  const { isAdminEmail } = await import("../src/features/authentication/index.server");
  const { listAdminUsers } = await import("../src/features/inspect-admin-operations/index.server");
  const { adjustUserTickets } = await import("../src/features/manage-tickets/index.server");
  const { InsufficientTicketsError } = await import("../src/entities/ticket/index.server");
  try {
    await prisma.user.createMany({
      data: [
        { id: adminId, name: "Admin", email: adminEmail, emailVerified: true },
        {
          id: targetId,
          name: "Target singer",
          email: `${targetId}@example.test`,
          emailVerified: true,
          ticketBalance: 1,
        },
      ],
    });
    assert.equal(isAdminEmail(adminEmail), true);
    assert.equal(isAdminEmail("viewer@example.test"), false);

    const granted = await adjustUserTickets({
      actorUserId: adminId,
      targetUserId: targetId,
      amount: 2,
      reason: "고객 지원 지급",
      idempotencyKey: `grant-${suffix}`,
    });
    assert.equal(granted.balanceAfter, 3);
    assert.equal(granted.actorUserId, adminId);
    assert.equal(granted.reason, "고객 지원 지급");
    const grantedAgain = await adjustUserTickets({
      actorUserId: adminId,
      targetUserId: targetId,
      amount: 2,
      reason: "고객 지원 지급",
      idempotencyKey: `grant-${suffix}`,
    });
    assert.equal(grantedAgain.id, granted.id);
    const creditNotifications = await prisma.notification.findMany({ where: { userId: targetId } });
    assert.equal(creditNotifications.length, 1);
    assert.equal(creditNotifications[0]?.type, "TICKET_CREDIT");
    assert.equal(creditNotifications[0]?.sourceId, granted.id);
    assert.equal(creditNotifications[0]?.href, "/account");

    const removed = await adjustUserTickets({
      actorUserId: adminId,
      targetUserId: targetId,
      amount: -1,
      reason: "중복 지급 회수",
      idempotencyKey: `remove-${suffix}`,
    });
    assert.equal(removed.balanceAfter, 2);
    assert.equal(await prisma.notification.count({ where: { userId: targetId } }), 1);
    await assert.rejects(
      () =>
        adjustUserTickets({
          actorUserId: adminId,
          targetUserId: targetId,
          amount: -3,
          reason: "잔액 초과 회수",
          idempotencyKey: `invalid-${suffix}`,
        }),
      (error) => error instanceof InsufficientTicketsError,
    );
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: targetId } })).ticketBalance, 2);

    const users = await listAdminUsers("Target singer", 1, 10);
    assert.equal(users.total, 1);
    assert.equal(users.users[0]?.id, targetId);
    assert.equal(JSON.stringify(users).includes("externalUrl"), false);
  } finally {
    if (previousAdmins === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previousAdmins;
    await prisma.ticketLedger.deleteMany({ where: { userId: targetId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, targetId] } } });
    await prisma.$disconnect();
  }
});
