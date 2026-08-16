import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("notifications are durable, deduplicated, paginated, and owner scoped", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }
  const { prisma } = await import("../src/shared/db/index.server");
  const { createNotification, getNotifications, markAllNotificationsRead, markNotificationRead } = await import(
    "../src/entities/notification/index.server"
  );
  const suffix = crypto.randomUUID();
  const userId = `notification-owner-${suffix}`;
  const otherUserId = `notification-other-${suffix}`;
  try {
    await prisma.user.createMany({
      data: [
        { id: userId, name: "Notification owner", email: `${userId}@example.test`, emailVerified: true },
        { id: otherUserId, name: "Other owner", email: `${otherUserId}@example.test`, emailVerified: true },
      ],
    });

    const input = {
      userId,
      type: "MIXING_SUCCEEDED" as const,
      title: "AI 믹스가 완성되었습니다",
      message: "서른 즈음에 결과를 들어보세요.",
      href: "/library/mixes/30000000-0000-4000-8000-000000000001",
      sourceId: "30000000-0000-4000-8000-000000000001",
      dedupeKey: `mixing:${suffix}:succeeded`,
    };
    const [first, duplicate] = await Promise.all([createNotification(input), createNotification(input)]);
    assert.equal(first.id, duplicate.id);
    assert.equal(await prisma.notification.count({ where: { userId } }), 1);

    const second = await createNotification({
      userId,
      type: "VOCAL_PROFILE_FAILED",
      title: "보컬 프로필 분석에 실패했습니다",
      message: "새 음성으로 다시 분석해 주세요.",
      href: "/library?tab=profiles",
      sourceId: crypto.randomUUID(),
      dedupeKey: `vocal-analysis:${suffix}:failed`,
    });
    const page = await getNotifications(userId, 1, 1);
    assert.equal(page.total, 2);
    assert.equal(page.unreadCount, 2);
    assert.equal(page.pageCount, 2);
    assert.equal(page.notifications.length, 1);
    assert.equal(page.notifications[0]?.id, second.id);
    assert.equal((await getNotifications(userId, 99, 1)).page, 2);
    assert.equal((await getNotifications(otherUserId)).total, 0);

    assert.equal(await markNotificationRead(otherUserId, first.id), null);
    assert.equal((await markNotificationRead(userId, first.id))?.readAt !== null, true);
    assert.equal((await markNotificationRead(userId, first.id))?.id, first.id);
    assert.equal((await getNotifications(userId)).unreadCount, 1);
    const unreadPage = await getNotifications(userId, 1, 5, true);
    assert.equal(unreadPage.total, 1);
    assert.equal(unreadPage.unreadCount, 1);
    assert.deepEqual(
      unreadPage.notifications.map((notification) => notification.id),
      [second.id],
    );

    assert.deepEqual(await markAllNotificationsRead(otherUserId), { updatedCount: 0, unreadCount: 0 });
    assert.deepEqual(await markAllNotificationsRead(userId), { updatedCount: 1, unreadCount: 0 });
    assert.equal((await getNotifications(userId)).unreadCount, 0);
    assert.equal((await getNotifications(userId, 1, 5, true)).total, 0);

    await assert.rejects(
      () => createNotification({ ...input, userId: otherUserId }),
      /dedupe key was reused with different input/,
    );
    await assert.rejects(
      () => createNotification({ ...input, dedupeKey: `unsafe:${suffix}`, href: "https://evil.test" }),
      /relative internal path/,
    );
  } finally {
    await prisma.notification.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
    await prisma.$disconnect();
  }
});
