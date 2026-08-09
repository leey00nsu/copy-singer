import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("legacy rows remain unowned while new profiles and runs are user-scoped", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }

  const { prisma } = await import("../src/shared/db/index.server");
  const suffix = crypto.randomUUID();
  const firstUserId = `auth-owner-${suffix}`;
  const secondUserId = `auth-other-${suffix}`;
  const recordingId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const runId = crypto.randomUUID();
  const googleAccountId = `google-account-${suffix}`;

  try {
    await prisma.user.createMany({
      data: [
        { id: firstUserId, name: "Owner", email: `${firstUserId}@example.test`, emailVerified: true },
        { id: secondUserId, name: "Other", email: `${secondUserId}@example.test`, emailVerified: true },
      ],
    });
    await prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: googleAccountId,
        providerId: "google",
        userId: firstUserId,
      },
    });
    await prisma.recording.create({
      data: {
        id: recordingId,
        kind: "USER_TEST",
        storagePath: `/tmp/${recordingId}.wav`,
        mimeType: "audio/wav",
        status: "READY",
      },
    });
    await prisma.vocalProfile.create({
      data: {
        id: profileId,
        userId: firstUserId,
        sourceType: "USER",
        recordingId,
        analyzer: "test",
        analyzerVersion: "1",
      },
    });
    await prisma.recommendationRun.create({
      data: { id: runId, userId: firstUserId, userVocalProfileId: profileId, scoringVersion: "test" },
    });

    assert.equal(await prisma.vocalProfile.count({ where: { id: profileId, userId: firstUserId } }), 1);
    assert.equal(await prisma.vocalProfile.count({ where: { id: profileId, userId: secondUserId } }), 0);
    assert.equal(await prisma.recommendationRun.count({ where: { id: runId, userId: firstUserId } }), 1);
    assert.equal(await prisma.recommendationRun.count({ where: { id: runId, userId: secondUserId } }), 0);
    const { getAuthenticationSummary } = await import("../src/features/authentication/index.server");
    assert.equal((await getAuthenticationSummary(firstUserId)).googleConnected, true);
    assert.equal((await getAuthenticationSummary(secondUserId)).googleConnected, false);
  } finally {
    await prisma.recommendationRun.deleteMany({ where: { id: runId } });
    await prisma.vocalProfile.deleteMany({ where: { id: profileId } });
    await prisma.recording.deleteMany({ where: { id: recordingId } });
    await prisma.user.deleteMany({ where: { id: { in: [firstUserId, secondUserId] } } });
    await prisma.$disconnect();
  }
});
