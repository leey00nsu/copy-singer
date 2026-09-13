import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

for (const mode of ["race", "mixing-first"])
  test(`profile deletion and mixing admission preserve files and tickets: ${mode}`, async () => {
    const { prisma } = await import("../src/shared/db/index.server");
    const { enqueueMixingJob } = await import("../src/features/create-mixing/index.server");
    const { DELETE } = await import("../src/_app/api-routes/vocal-profiles/vocal-profile-detail-route");
    const originalFetch = globalThis.fetch;
    const previous = { ...process.env };
    const suffix = crypto.randomUUID();
    const userId = `race-${suffix}`;
    const recordingId = crypto.randomUUID();
    const profileId = crypto.randomUUID();
    const assetId = crypto.randomUUID();
    const smartAssetId = crypto.randomUUID();
    const profileDisplayName = "Race fixture";
    Object.assign(process.env, {
      NODE_ENV: "test",
      DEV_AUTH_BYPASS_ENABLED: "true",
      DEV_AUTH_BYPASS_USER_ID: userId,
      MIXING_TICKET_COST: "1",
      LEEMAGE_BASE_URL: "https://leemage.example/api/v1",
      LEEMAGE_API_KEY: "test-only",
      LEEMAGE_PROJECT_ID: "project",
    });
    const deletedFiles: string[] = [];
    globalThis.fetch = async (url, init) => {
      assert.equal(init?.method, "DELETE");
      assert.ok(String(url).startsWith("https://leemage.example/"));
      deletedFiles.push(String(url));
      return new Response(null, { status: 204 });
    };
    try {
      const entry = await prisma.catalogEntry.findFirstOrThrow({
        where: { position: 1, status: "PUBLISHED" },
        include: { song: true },
      });
      assert.ok(entry.song.currentAnalysisId);
      assert.ok(entry.song.targetAssetId);
      await prisma.user.create({
        data: {
          id: userId,
          name: "Mixing owner",
          email: `${userId}@example.test`,
          emailVerified: true,
          ticketWallets: { create: { kind: "AI_MIXING", balance: 1 } },
        },
      });
      await prisma.mediaAsset.create({
        data: {
          id: assetId,
          userId,
          kind: "REFERENCE",
          externalProjectId: "project",
          externalFileId: `reference-${suffix}`,
          externalUrl: "https://objects.example/reference.wav",
          fileName: "reference.wav",
          mimeType: "audio/wav",
          sizeBytes: BigInt(3),
        },
      });
      await prisma.mediaAsset.create({
        data: {
          id: smartAssetId,
          userId,
          kind: "SYNTHESIS_REFERENCE",
          externalProjectId: "project",
          externalFileId: `smart-reference-${suffix}`,
          externalUrl: "https://objects.example/smart-reference.wav",
          fileName: "smart-reference.wav",
          mimeType: "audio/wav",
          sizeBytes: BigInt(3),
        },
      });
      await prisma.recording.create({
        data: {
          id: recordingId,
          kind: "USER_TEST",
          storagePath: `leemage://project/reference-${suffix}`,
          mimeType: "audio/wav",
          status: "READY",
          mediaAssetId: assetId,
        },
      });
      await prisma.vocalProfile.create({
        data: {
          id: profileId,
          userId,
          profileNumber: 1,
          displayName: profileDisplayName,
          sourceType: "USER",
          recordingId,
          minMidi: 48,
          maxMidi: 72,
          p10Midi: 52,
          medianMidi: 60,
          p90Midi: 68,
          tessituraLowMidi: 52,
          tessituraHighMidi: 68,
          voicedRatio: 0.72,
          pitchStability: 0.84,
          clippingRatio: 0.001,
          rmsDb: -18,
          analyzer: "librosa-pyin",
          analyzerVersion: "0.11.0",
          synthesisReferenceAssetId: smartAssetId,
          descriptors: { synthesisReference: { version: "smart-reference-mid-v1" } },
        },
      });

      const submit = () =>
        enqueueMixingJob({
          userId,
          vocalProfileId: profileId,
          songAnalysisId: entry.song.currentAnalysisId!,
          idempotencyKey: suffix,
        });
      const accepted = mode === "mixing-first" ? await submit() : null;
      const [deletion, submission] = await Promise.allSettled([
        DELETE(new Request(`http://localhost/api/vocal-profiles/${profileId}`, { method: "DELETE" }), {
          params: Promise.resolve({ id: profileId }),
        }),
        accepted ? Promise.resolve(accepted) : submit(),
      ]);
      if (deletion.status !== "fulfilled") throw deletion.reason;
      const jobs = await prisma.mixingJob.findMany({ where: { userId } });
      const balance = await prisma.ticketWallet.findUniqueOrThrow({
        where: { userId_kind: { userId, kind: "AI_MIXING" } },
      });
      if (submission.status === "fulfilled") {
        assert.equal(deletion.value.status, 409);
        assert.equal(jobs.length, 1);
        assert.equal(balance.balance, 0);
        assert.equal(deletedFiles.length, 0);
        assert.ok(await prisma.vocalProfile.findUnique({ where: { id: profileId } }));
        assert.equal(await prisma.mediaAsset.count({ where: { id: { in: [assetId, smartAssetId] } } }), 2);
      } else {
        assert.ok([200, 202].includes(deletion.value.status));
        assert.equal(jobs.length, 0);
        assert.equal(balance.balance, 1);
        assert.equal(await prisma.vocalProfile.count({ where: { id: profileId } }), 0);
        assert.equal(await prisma.mediaAsset.count({ where: { id: { in: [assetId, smartAssetId] } } }), 0);
        assert.equal(
          await prisma.mediaOperation.count({
            where: { assetId: { in: [assetId, smartAssetId] }, operation: "DELETE" },
          }),
          2,
        );
      }
    } finally {
      globalThis.fetch = originalFetch;
      await prisma.mixingJob.deleteMany({ where: { userId } });
      await prisma.vocalProfile.deleteMany({ where: { id: profileId } });
      await prisma.recording.deleteMany({ where: { id: recordingId } });
      await prisma.mediaAsset.deleteMany({ where: { userId } });
      await prisma.mediaOperation.deleteMany({ where: { assetId: { in: [assetId, smartAssetId] } } });
      await prisma.user.deleteMany({ where: { id: userId } });
      for (const key of [
        "NODE_ENV",
        "DEV_AUTH_BYPASS_ENABLED",
        "DEV_AUTH_BYPASS_USER_ID",
        "MIXING_TICKET_COST",
        "LEEMAGE_BASE_URL",
        "LEEMAGE_API_KEY",
        "LEEMAGE_PROJECT_ID",
      ]) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
      await prisma.$disconnect();
    }
  });
