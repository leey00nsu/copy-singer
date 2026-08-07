import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("mixing enqueue, claim, lease recovery, and refund boundary are durable", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }
  const previousEnv = {
    cost: process.env.MIXING_TICKET_COST,
    maxAttempts: process.env.MIXING_MAX_ATTEMPTS,
    lease: process.env.MIXING_LEASE_SECONDS,
    analyzer: process.env.VOCAL_PROFILE_API_URL,
    modalUrl: process.env.MODAL_API_URL,
    modalKey: process.env.MODAL_API_KEY,
    leemageUrl: process.env.LEEMAGE_BASE_URL,
    leemageKey: process.env.LEEMAGE_API_KEY,
    leemageProject: process.env.LEEMAGE_PROJECT_ID,
  };
  process.env.MIXING_TICKET_COST = "1";
  process.env.MIXING_MAX_ATTEMPTS = "3";
  process.env.MIXING_LEASE_SECONDS = "30";
  process.env.VOCAL_PROFILE_API_URL = "https://analyzer.example";
  process.env.MODAL_API_URL = "https://modal.example";
  process.env.MODAL_API_KEY = "modal-key";
  process.env.LEEMAGE_BASE_URL = "https://leemage.example/api/v1";
  process.env.LEEMAGE_API_KEY = "leemage-key";
  process.env.LEEMAGE_PROJECT_ID = "project";

  const { prisma } = await import("../lib/db/prisma");
  const { enqueueMixingJob } = await import("../lib/mixing/queue");
  const { claimNextMixingJob, processClaimedMixingJob } = await import("../lib/mixing/worker");
  const { InsufficientTicketsError } = await import("../lib/tickets/service");
  const { applyTicketChange } = await import("../lib/tickets/service");
  const { getMixingHistory, getMixingJobForUser } = await import("../lib/mixing/history");
  const suffix = crypto.randomUUID();
  const userId = `mixing-owner-${suffix}`;
  const recordingId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const assetId = crypto.randomUUID();
  const smartAssetId = crypto.randomUUID();
  const runId = crypto.randomUUID();
  const itemId = crypto.randomUUID();

  try {
    const song = await prisma.song.findFirstOrThrow({ where: { catalogOrder: 1 } });
    await prisma.user.create({
      data: {
        id: userId,
        name: "Mixing owner",
        email: `${userId}@example.test`,
        emailVerified: true,
        ticketBalance: 1,
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
        sourceType: "USER",
        recordingId,
        synthesisReferenceAssetId: smartAssetId,
        analyzer: "test",
        analyzerVersion: "1",
      },
    });
    await prisma.recommendationRun.create({
      data: { id: runId, userId, userVocalProfileId: profileId, scoringVersion: "test" },
    });
    await prisma.recommendationItem.create({
      data: {
        id: itemId,
        runId,
        songId: song.id,
        rank: 1,
        originalKeyScore: 80,
        adjustedScore: 85,
        recommendedShift: 1,
        reasonCodes: [],
        metrics: {},
      },
    });

    const input = { userId, recommendationItemId: itemId, idempotencyKey: `request-${suffix}` };
    const [first, duplicate] = await Promise.all([enqueueMixingJob(input), enqueueMixingJob(input)]);
    assert.equal(first.id, duplicate.id);
    assert.equal(first.referenceAssetId, smartAssetId);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).ticketBalance, 0);
    assert.equal(await prisma.ticketLedger.count({ where: { mixingJobId: first.id, type: "MIXING_DEBIT" } }), 1);

    await assert.rejects(
      () => enqueueMixingJob({ ...input, idempotencyKey: `${input.idempotencyKey}:insufficient` }),
      (error) => error instanceof InsufficientTicketsError,
    );

    const owners = ["worker-a", "worker-b"];
    const claims = await Promise.all(owners.map((owner) => claimNextMixingJob(owner, first.id)));
    assert.equal(claims.filter(Boolean).length, 1);
    const winner = owners[claims.findIndex(Boolean)]!;
    await processClaimedMixingJob(first.id, winner, {
      fetchImpl: async () => new Response(null, { status: 404 }),
      sleep: async () => {},
      pollIntervalMs: 0,
    });
    const preflightFailed = await prisma.mixingJob.findUniqueOrThrow({ where: { id: first.id } });
    assert.equal(preflightFailed.status, "FAILED");
    assert.equal(preflightFailed.refundState, "REFUNDED");
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).ticketBalance, 1);

    const submittedFailure = await enqueueMixingJob({
      userId,
      recommendationItemId: itemId,
      idempotencyKey: `submitted-${suffix}`,
    });
    assert.equal(await claimNextMixingJob("crashed-worker", submittedFailure.id), submittedFailure.id);
    await prisma.mixingJob.update({
      where: { id: submittedFailure.id },
      data: { leaseExpiresAt: new Date(Date.now() - 1_000) },
    });
    assert.equal(await claimNextMixingJob("recovery-worker", submittedFailure.id), submittedFailure.id);

    const workerFetch: typeof fetch = async (request, init) => {
      const url = String(request);
      if (url === "https://objects.example/smart-reference.wav") {
        return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/wav" } });
      }
      if (url === "https://analyzer.example/v1/song-target") {
        return new Response(new Uint8Array([4, 5, 6]), { headers: { "Content-Type": "audio/wav" } });
      }
      if (url === "https://modal.example/v1/conversions" && init?.method === "POST") {
        return Response.json({ id: "modal-job", status: "queued" });
      }
      if (url === "https://modal.example/v1/conversions/modal-job") {
        return Response.json({ id: "modal-job", status: "failed", error: "GPU failed" });
      }
      throw new Error(`Unexpected worker URL: ${url}`);
    };
    await processClaimedMixingJob(submittedFailure.id, "recovery-worker", {
      fetchImpl: workerFetch,
      sleep: async () => {},
      pollIntervalMs: 0,
    });
    const postSubmitFailed = await prisma.mixingJob.findUniqueOrThrow({ where: { id: submittedFailure.id } });
    assert.equal(postSubmitFailed.status, "FAILED");
    assert.equal(postSubmitFailed.refundState, "NONE");
    assert.equal(postSubmitFailed.attempts, 2);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).ticketBalance, 0);
    assert.equal(await prisma.ticketLedger.count({ where: { mixingJobId: submittedFailure.id, type: "MIXING_REFUND" } }), 0);

    await applyTicketChange({
      userId,
      type: "ADMIN_ADJUSTMENT",
      amount: 1,
      idempotencyKey: `test:topup:${suffix}`,
      reason: "result storage test",
    });
    const successful = await enqueueMixingJob({
      userId,
      recommendationItemId: itemId,
      idempotencyKey: `successful-${suffix}`,
    });
    assert.equal(await claimNextMixingJob("result-worker", successful.id), successful.id);
    const successFetch: typeof fetch = async (request, init) => {
      const url = String(request);
      if (url === "https://objects.example/smart-reference.wav") {
        return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/wav" } });
      }
      if (url === "https://analyzer.example/v1/song-target") {
        return new Response(new Uint8Array([4, 5, 6]), { headers: { "Content-Type": "audio/wav" } });
      }
      if (url === "https://modal.example/v1/conversions" && init?.method === "POST") {
        return Response.json({ id: "modal-success", status: "queued" });
      }
      if (url === "https://modal.example/v1/conversions/modal-success") {
        return Response.json({ id: "modal-success", status: "succeeded" });
      }
      if (url === "https://modal.example/v1/conversions/modal-success/audio") {
        return new Response(new Uint8Array([7, 8, 9]), { headers: { "Content-Type": "audio/wav" } });
      }
      if (url.endsWith("/files/presign")) {
        return Response.json({
          presignedUrl: "https://objects.example/result-upload",
          objectName: `project/result-${suffix}.wav`,
          fileId: `result-${suffix}`,
        });
      }
      if (url === "https://objects.example/result-upload") return new Response(null, { status: 200 });
      if (url.endsWith("/files/confirm")) {
        return Response.json({
          file: { id: `result-${suffix}`, url: "https://objects.example/result.wav" },
        }, { status: 201 });
      }
      throw new Error(`Unexpected successful worker URL: ${url}`);
    };
    await processClaimedMixingJob(successful.id, "result-worker", {
      fetchImpl: successFetch,
      sleep: async () => {},
      pollIntervalMs: 0,
    });
    const completed = await prisma.mixingJob.findUniqueOrThrow({
      where: { id: successful.id },
      include: { resultAsset: true },
    });
    assert.equal(completed.status, "SUCCEEDED");
    assert.equal(completed.resultAsset?.kind, "MIX_RESULT");
    assert.equal(completed.resultAsset?.externalUrl, "https://objects.example/result.wav");
    const history = await getMixingHistory(userId, 1, 20);
    assert.equal(history.jobs[0]?.id, successful.id);
    assert.equal(history.jobs[0]?.resultReady, true);
    assert.equal(history.jobs[0]?.audioUrl, `/api/mixing-jobs/${successful.id}/audio`);
    assert.equal(await getMixingJobForUser("another-user", successful.id), null);
  } finally {
    for (const [name, value] of Object.entries({
      MIXING_TICKET_COST: previousEnv.cost,
      MIXING_MAX_ATTEMPTS: previousEnv.maxAttempts,
      MIXING_LEASE_SECONDS: previousEnv.lease,
      VOCAL_PROFILE_API_URL: previousEnv.analyzer,
      MODAL_API_URL: previousEnv.modalUrl,
      MODAL_API_KEY: previousEnv.modalKey,
      LEEMAGE_BASE_URL: previousEnv.leemageUrl,
      LEEMAGE_API_KEY: previousEnv.leemageKey,
      LEEMAGE_PROJECT_ID: previousEnv.leemageProject,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await prisma.ticketLedger.deleteMany({ where: { userId } });
    await prisma.mixingJob.deleteMany({ where: { userId } });
    await prisma.recommendationItem.deleteMany({ where: { id: itemId } });
    await prisma.recommendationRun.deleteMany({ where: { id: runId } });
    await prisma.vocalProfile.deleteMany({ where: { id: profileId } });
    await prisma.recording.deleteMany({ where: { id: recordingId } });
    await prisma.mediaAsset.deleteMany({ where: { id: { in: [assetId, smartAssetId] } } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
