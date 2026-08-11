import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("notification routes require auth, scope IDs, and return validated read state", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    bypassEnabled: process.env.DEV_AUTH_BYPASS_ENABLED,
    bypassUserId: process.env.DEV_AUTH_BYPASS_USER_ID,
    signupGrant: process.env.SIGNUP_TICKET_GRANT,
  };
  const suffix = crypto.randomUUID();
  const userId = `notification-route-${suffix}`;
  const otherUserId = `notification-route-other-${suffix}`;
  Reflect.set(process.env, "NODE_ENV", "test");
  process.env.DEV_AUTH_BYPASS_ENABLED = "true";
  process.env.DEV_AUTH_BYPASS_USER_ID = userId;
  process.env.SIGNUP_TICKET_GRANT = "0";

  const { prisma } = await import("../src/shared/db/index.server");
  const { createNotification } = await import("../src/entities/notification/index.server");
  const { notificationsGet, notificationReadPatch, notificationsReadAllPost } = await import(
    "../src/_app/api-routes/notifications/index.server"
  );
  try {
    await prisma.user.createMany({
      data: [
        { id: userId, name: "Route owner", email: `${userId}@example.test`, emailVerified: true },
        { id: otherUserId, name: "Other owner", email: `${otherUserId}@example.test`, emailVerified: true },
      ],
    });
    const own = await createNotification({
      userId,
      type: "TICKET_CREDIT",
      title: "티켓이 추가되었습니다",
      message: "티켓 2개가 추가되었습니다.",
      href: "/account",
      dedupeKey: `route-own:${suffix}`,
    });
    const other = await createNotification({
      userId: otherUserId,
      type: "TICKET_CREDIT",
      title: "티켓이 추가되었습니다",
      message: "티켓 1개가 추가되었습니다.",
      href: "/account",
      dedupeKey: `route-other:${suffix}`,
    });

    const listResponse = await notificationsGet(new Request("http://copy-singer.test/api/notifications?pageSize=5"));
    assert.equal(listResponse.status, 200);
    const list = (await listResponse.json()) as { total: number; unreadCount: number };
    assert.deepEqual(list, { ...list, total: 1, unreadCount: 1 });

    const invalidResponse = await notificationReadPatch(new Request("http://copy-singer.test/api/notifications/x"), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    assert.equal(invalidResponse.status, 404);
    const otherResponse = await notificationReadPatch(
      new Request(`http://copy-singer.test/api/notifications/${other.id}`),
      {
        params: Promise.resolve({ id: other.id }),
      },
    );
    assert.equal(otherResponse.status, 404);
    const ownResponse = await notificationReadPatch(
      new Request(`http://copy-singer.test/api/notifications/${own.id}`),
      {
        params: Promise.resolve({ id: own.id }),
      },
    );
    assert.equal(ownResponse.status, 200);

    const allResponse = await notificationsReadAllPost(
      new Request("http://copy-singer.test/api/notifications/read-all", { method: "POST" }),
    );
    assert.equal(allResponse.status, 200);
    assert.deepEqual(await allResponse.json(), { updatedCount: 0, unreadCount: 0 });

    process.env.DEV_AUTH_BYPASS_ENABLED = "false";
    const unauthorized = await notificationsGet(new Request("http://copy-singer.test/api/notifications"));
    assert.equal(unauthorized.status, 401);
  } finally {
    for (const [name, value] of Object.entries({
      NODE_ENV: previous.nodeEnv,
      DEV_AUTH_BYPASS_ENABLED: previous.bypassEnabled,
      DEV_AUTH_BYPASS_USER_ID: previous.bypassUserId,
      SIGNUP_TICKET_GRANT: previous.signupGrant,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await prisma.ticketLedger.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
    await prisma.notification.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
    await prisma.$disconnect();
  }
});
