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
        },
      ],
    });
    await prisma.ticketWallet.create({ data: { userId: targetId, kind: "AI_MIXING", balance: 1 } });
    assert.equal(isAdminEmail(adminEmail), true);
    assert.equal(isAdminEmail("viewer@example.test"), false);

    const granted = await adjustUserTickets({
      actorUserId: adminId,
      targetUserId: targetId,
      kind: "AI_MIXING",
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
      kind: "AI_MIXING",
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
      kind: "AI_MIXING",
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
          kind: "AI_MIXING",
          amount: -3,
          reason: "잔액 초과 회수",
          idempotencyKey: `invalid-${suffix}`,
        }),
      (error) => error instanceof InsufficientTicketsError,
    );
    assert.equal(
      (await prisma.ticketWallet.findUniqueOrThrow({ where: { userId_kind: { userId: targetId, kind: "AI_MIXING" } } }))
        .balance,
      2,
    );

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

test("admin separates members and trials, resolves saved members, and bounds filtered pages", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }
  const { prisma } = await import("../src/shared/db/index.server");
  const { getAdminOverview, listAdminUsers, listAdminGuests, listAdminMixingJobs } = await import(
    "../src/features/inspect-admin-operations/index.server"
  );
  const { adjustUserTickets } = await import("../src/features/manage-tickets/index.server");
  const suffix = crypto.randomUUID();
  const memberId = `admin-member-${suffix}`;
  const guestIds = [0, 1, 2, 3].map((i) => `guest-${suffix}-${i}`);
  const now = new Date();
  try {
    await prisma.user.createMany({
      data: [
        { id: memberId, name: `Member ${suffix}`, email: `${memberId}@example.test` },
        ...guestIds.map((id) => ({ id, name: "무료 분석", email: `${id}@example.test`, isGuest: true })),
      ],
    });
    await prisma.guestAnalysisTrial.createMany({
      data: guestIds.map((userId, i) => ({
        userId,
        tokenHash: `sensitive-token-${userId}`,
        consumedAt: i < 3 ? now : null,
        claimedAt: i === 0 ? now : null,
        claimedByUserId: i === 0 ? memberId : null,
        expiresAt: i === 0 || i === 3 ? null : new Date(now.getTime() + (i === 1 ? 60_000 : -60_000)),
      })),
    });
    const members = await listAdminUsers(suffix, 1, 100);
    assert.equal(members.total, 1);
    assert.equal(members.users[0]?.id, memberId);
    assert.equal((await listAdminUsers("", 1, 10, guestIds[0])).total, 0);
    assert.equal((await listAdminUsers("", 1, 10, memberId)).users[0]?.id, memberId);

    const first = await listAdminGuests({ query: suffix, pageSize: 2 });
    const second = await listAdminGuests({ query: suffix, pageSize: 2, page: 2 });
    assert.equal(first.total, 4);
    assert.equal(first.pageCount, 2);
    assert.equal(new Set([...first.trials, ...second.trials].map((t) => t.id)).size, 4);
    assert.equal((await listAdminGuests({ query: suffix, pageSize: 2, page: 999 })).page, 2);
    assert.equal((await listAdminGuests({ query: suffix, pageSize: Number.NaN, page: Number.NaN })).page, 1);
    const claimed = await listAdminGuests({ query: `Member ${suffix}`, status: "claimed", now });
    assert.equal(claimed.total, 1);
    assert.equal(claimed.trials[0]?.claimedBy?.id, memberId);
    assert.equal((await listAdminGuests({ query: suffix, status: "expired", now })).total, 1);
    assert.equal((await listAdminGuests({ query: suffix, status: "unclaimed", now })).total, 2);
    assert.equal((await listAdminGuests({ query: `none-${suffix}`, page: 999 })).page, 1);
    assert.equal(JSON.stringify(first).includes("tokenHash"), false);
    assert.equal(JSON.stringify(first).includes("sensitive-token"), false);
    assert.equal(JSON.stringify(first).includes("externalUrl"), false);
    const overview = await getAdminOverview();
    const all = await prisma.user.findMany({ select: { isGuest: true } });
    assert.equal(overview.users, all.filter((user) => !user.isGuest).length);
    assert.ok(overview.guests >= 4);
    assert.ok(overview.claimedTrials >= 1);
    const jobs = await listAdminMixingJobs(`none-${suffix}`, "failed", 999, 0);
    assert.equal(jobs.total, 0);
    assert.equal(jobs.page, 1);
    await assert.rejects(
      adjustUserTickets({
        actorUserId: memberId,
        targetUserId: guestIds[0],
        kind: "AI_MIXING",
        amount: 1,
        reason: "체험 지급 차단",
        idempotencyKey: suffix,
      }),
      /정식 회원/,
    );
    assert.equal(await prisma.ticketWallet.count({ where: { userId: { in: guestIds } } }), 0);
    assert.equal(await prisma.ticketLedger.count({ where: { userId: { in: guestIds } } }), 0);
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: [...guestIds, memberId] } } });
    await prisma.$disconnect();
  }
});
