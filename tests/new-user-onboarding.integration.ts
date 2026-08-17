import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("onboarding migration backfills existing users without a default for future accounts", async () => {
  const migration = await readFile(
    new URL("../prisma/migrations/20260817143000_add_user_onboarding_completion/migration.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /ADD COLUMN "onboardingCompletedAt" TIMESTAMP\(3\)/);
  assert.match(migration, /SET "onboardingCompletedAt" = CURRENT_TIMESTAMP/);
  assert.doesNotMatch(migration, /ADD COLUMN[\s\S]+DEFAULT/i);
});

test("onboarding completion route rejects unauthenticated requests", async () => {
  const previousBypass = process.env.DEV_AUTH_BYPASS_ENABLED;
  process.env.DEV_AUTH_BYPASS_ENABLED = "false";
  try {
    const { POST } = await import("@/_app/api-routes/account/onboarding-completion-route");
    const response = await POST(new Request("http://localhost/api/account/onboarding/completion", { method: "POST" }));
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, "UNAUTHENTICATED");
  } finally {
    if (previousBypass === undefined) delete process.env.DEV_AUTH_BYPASS_ENABLED;
    else process.env.DEV_AUTH_BYPASS_ENABLED = previousBypass;
  }
});

test("onboarding snapshot and completion are account-owned and idempotent", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }

  const { getOnboardingSnapshot, completeOnboarding } = await import("@/widgets/product-shell/index.server");
  const { prisma } = await import("@/shared/db/index.server");
  const suffix = crypto.randomUUID();
  const userId = `onboarding-${suffix}`;
  const otherUserId = `onboarding-other-${suffix}`;

  try {
    await prisma.user.createMany({
      data: [
        { id: userId, name: "New user", email: `${userId}@example.test`, emailVerified: true },
        { id: otherUserId, name: "Other user", email: `${otherUserId}@example.test`, emailVerified: true },
      ],
    });
    await prisma.ticketWallet.createMany({
      data: [
        { userId, kind: "VOCAL_ANALYSIS", balance: 5 },
        { userId, kind: "AI_MIXING", balance: 1 },
      ],
    });

    assert.deepEqual(await getOnboardingSnapshot(userId), {
      required: true,
      wallets: [
        { kind: "VOCAL_ANALYSIS", balance: 5 },
        { kind: "AI_MIXING", balance: 1 },
      ],
    });

    const [first, repeated] = await Promise.all([completeOnboarding(userId), completeOnboarding(userId)]);
    assert.equal(repeated.completedAt, first.completedAt);
    assert.deepEqual(await getOnboardingSnapshot(userId), { required: false });

    const users = await prisma.user.findMany({
      where: { id: { in: [userId, otherUserId] } },
      select: { id: true, onboardingCompletedAt: true },
    });
    assert.ok(users.find((user) => user.id === userId)?.onboardingCompletedAt);
    assert.equal(users.find((user) => user.id === otherUserId)?.onboardingCompletedAt, null);
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
    await prisma.$disconnect();
  }
});
