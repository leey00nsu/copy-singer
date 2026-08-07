import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("development auth bypass policy is fail-closed outside development and test", async () => {
  const { developmentAuthBypassUserId } = await import("../lib/auth/dev-bypass-policy");
  const enabled = { DEV_AUTH_BYPASS_ENABLED: "true", DEV_AUTH_BYPASS_USER_ID: "user-1" };
  assert.equal(developmentAuthBypassUserId({ ...enabled, NODE_ENV: "production" }), null);
  assert.equal(developmentAuthBypassUserId({ ...enabled, NODE_ENV: undefined }), null);
  assert.equal(developmentAuthBypassUserId({ ...enabled, NODE_ENV: "development" }), "user-1");
  assert.equal(developmentAuthBypassUserId({ ...enabled, NODE_ENV: "test" }), "user-1");
  assert.equal(developmentAuthBypassUserId({ ...enabled, NODE_ENV: "development", DEV_AUTH_BYPASS_ENABLED: "false" }), null);
  assert.equal(developmentAuthBypassUserId({ ...enabled, NODE_ENV: "development", DEV_AUTH_BYPASS_USER_ID: " " }), null);
});

test("development auth bypass resolves only an existing database user", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }
  const { prisma } = await import("../lib/db/prisma");
  const { getDevelopmentAuthBypassSession } = await import("../lib/auth/dev-bypass");
  const userId = `dev-auth-${crypto.randomUUID()}`;
  const environment = { NODE_ENV: "test", DEV_AUTH_BYPASS_ENABLED: "true", DEV_AUTH_BYPASS_USER_ID: userId };
  try {
    await assert.rejects(() => getDevelopmentAuthBypassSession(environment), /existing local database user/);
    await prisma.user.create({
      data: { id: userId, name: "Development bypass", email: `${userId}@example.test`, emailVerified: true },
    });
    const session = await getDevelopmentAuthBypassSession(environment);
    assert.equal(session?.user.id, userId);
    assert.equal(session?.session.userId, userId);
    assert.equal(session?.session.token, "dev-auth-bypass");
  } finally {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
