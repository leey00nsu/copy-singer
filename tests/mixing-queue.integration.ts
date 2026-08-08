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
    analyzerBackend: process.env.VOCAL_PROFILE_ANALYZER_BACKEND,
    analyzer: process.env.VOCAL_PROFILE_API_URL,
    vocalModalUrl: process.env.VOCAL_PROFILE_MODAL_URL,
    vocalModalKey: process.env.VOCAL_PROFILE_MODAL_API_KEY,
    modalUrl: process.env.MODAL_API_URL,
    modalKey: process.env.MODAL_API_KEY,
    leemageUrl: process.env.LEEMAGE_BASE_URL,
    leemageKey: process.env.LEEMAGE_API_KEY,
    leemageProject: process.env.LEEMAGE_PROJECT_ID,
  };
  process.env.MIXING_TICKET_COST = "1";
  process.env.MIXING_MAX_ATTEMPTS = "3";
  process.env.MIXING_LEASE_SECONDS = "30";
  process.env.VOCAL_PROFILE_ANALYZER_BACKEND = "local";
  process.env.VOCAL_PROFILE_API_URL = "https://analyzer.example";
  process.env.VOCAL_PROFILE_MODAL_URL = "https://vocal-modal.example";
  process.env.VOCAL_PROFILE_MODAL_API_KEY = "vocal-modal-key";
  process.env.MODAL_API_URL = "https://modal.example";
  process.env.MODAL_API_KEY = "modal-key";
  process.env.LEEMAGE_BASE_URL = "https://leemage.example/api/v1";
  process.env.LEEMAGE_API_KEY = "leemage-key";
  process.env.LEEMAGE_PROJECT_ID = "project";

  const { prisma } = await import("../lib/db/prisma");
  const { enqueueMixingJob } = await import("../lib/mixing/queue");
  const { claimNextMixingJob, mixingSongTargetConfig, processClaimedMixingJob } = await import("../lib/mixing/worker");
  const { InsufficientTicketsError } = await import("../lib/tickets/service");
  const { MixingError } = await import("../lib/mixing/contract");
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
    assert.deepEqual(mixingSongTargetConfig(), {
      backend: "local",
      url: "https://analyzer.example",
      headers: { "Content-Type": "application/json" },
    });
    process.env.VOCAL_PROFILE_ANALYZER_BACKEND = "modal";
    assert.deepEqual(mixingSongTargetConfig(), {
      backend: "modal",
      url: "https://vocal-modal.example",
      headers: { "Content-Type": "application/json", "X-API-Key": "vocal-modal-key" },
    });
    process.env.VOCAL_PROFILE_ANALYZER_BACKEND = "local";

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
        analyzer: "test",
        analyzerVersion: "1",
        descriptors: { synthesisReference: { version: "smart-reference-mid-v1" } },
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

    const missingReferenceKey = `missing-reference-${suffix}`;
    await assert.rejects(
      () => enqueueMixingJob({ userId, recommendationItemId: itemId, idempotencyKey: missingReferenceKey }),
      (error) => error instanceof MixingError && error.code === "MIXING_REFERENCE_UNAVAILABLE",
    );
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).ticketBalance, 1);
    assert.equal(await prisma.mixingJob.count({ where: { userId, idempotencyKey: missingReferenceKey } }), 0);
    assert.equal(await prisma.ticketLedger.count({ where: { userId, type: "MIXING_DEBIT" } }), 0);

    await prisma.vocalProfile.update({
      where: { id: profileId },
      data: { synthesisReferenceAssetId: smartAssetId },
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
    assert.equal(preflightFailed.errorCode, "REFERENCE_FETCH_FAILED");
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).ticketBalance, 1);

    const retrying = await enqueueMixingJob({
      userId,
      recommendationItemId: itemId,
      idempotencyKey: `retrying-${suffix}`,
    });
    await prisma.mixingJob.update({ where: { id: retrying.id }, data: { maxAttempts: 2 } });
    assert.equal(await claimNextMixingJob("retry-worker-a", retrying.id), retrying.id);
    const transientTargetFetch: typeof fetch = async (request) => {
      const url = String(request);
      if (url === "https://objects.example/smart-reference.wav") {
        return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/wav" } });
      }
      if (url === "https://analyzer.example/v1/song-target") throw new TypeError("fetch failed");
      throw new Error(`Unexpected transient URL: ${url}`);
    };
    await processClaimedMixingJob(retrying.id, "retry-worker-a", {
      fetchImpl: transientTargetFetch,
      sleep: async () => {},
      pollIntervalMs: 0,
    });
    const retryPending = await prisma.mixingJob.findUniqueOrThrow({ where: { id: retrying.id } });
    assert.equal(retryPending.status, "PENDING");
    assert.equal(retryPending.errorCode, "SONG_TARGET_FETCH_FAILED");
    assert.equal(retryPending.refundState, "NONE");
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).ticketBalance, 0);
    assert.equal((await getMixingJobForUser(userId, retrying.id))?.error, null);
    assert.equal(await claimNextMixingJob("too-early-worker", retrying.id), null);
    await prisma.$executeRaw`
      UPDATE "MixingJob" SET "nextAttemptAt" = ${new Date(Date.now() - 1_000)}
      WHERE "id" = ${retrying.id}::uuid
    `;
    assert.equal(await claimNextMixingJob("retry-worker-b", retrying.id), retrying.id);
    await processClaimedMixingJob(retrying.id, "retry-worker-b", {
      fetchImpl: transientTargetFetch,
      sleep: async () => {},
      pollIntervalMs: 0,
    });
    const retryExhausted = await prisma.mixingJob.findUniqueOrThrow({ where: { id: retrying.id } });
    assert.equal(retryExhausted.status, "FAILED");
    assert.equal(retryExhausted.errorCode, "SONG_TARGET_FETCH_FAILED");
    assert.equal(retryExhausted.refundState, "REFUNDED");
    assert.equal(retryExhausted.attempts, 2);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).ticketBalance, 1);
    assert.equal(await prisma.ticketLedger.count({ where: { mixingJobId: retrying.id, type: "MIXING_REFUND" } }), 1);

    const submitNetworkFailure = await enqueueMixingJob({
      userId,
      recommendationItemId: itemId,
      idempotencyKey: `submit-network-${suffix}`,
    });
    assert.equal(await claimNextMixingJob("submit-network-worker", submitNetworkFailure.id), submitNetworkFailure.id);
    const submitNetworkFetch: typeof fetch = async (request) => {
      const url = String(request);
      if (url === "https://objects.example/smart-reference.wav") {
        return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/wav" } });
      }
      if (url === "https://analyzer.example/v1/song-target") {
        return new Response(new Uint8Array([4, 5, 6]), { headers: { "Content-Type": "audio/wav" } });
      }
      if (url === "https://modal.example/v1/conversions") throw new TypeError("fetch failed");
      throw new Error(`Unexpected submit URL: ${url}`);
    };
    await processClaimedMixingJob(submitNetworkFailure.id, "submit-network-worker", {
      fetchImpl: submitNetworkFetch,
      sleep: async () => {},
      pollIntervalMs: 0,
    });
    const submitNetworkFailed = await prisma.mixingJob.findUniqueOrThrow({ where: { id: submitNetworkFailure.id } });
    assert.equal(submitNetworkFailed.status, "FAILED");
    assert.equal(submitNetworkFailed.errorCode, "MODAL_SUBMIT_FAILED");
    assert.equal(submitNetworkFailed.refundState, "REFUNDED");
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
    assert.equal(postSubmitFailed.errorCode, "MODAL_JOB_FAILED");
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
          objectName: `project/result-${suffix}.m4a`,
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
      compressResult: async () => ({ bytes: new Uint8Array([10, 11]), mimeType: "audio/mp4", extension: "m4a" }),
    });
    const completed = await prisma.mixingJob.findUniqueOrThrow({
      where: { id: successful.id },
      include: { resultAsset: true },
    });
    assert.equal(completed.status, "SUCCEEDED");
    assert.equal(completed.resultAsset?.kind, "MIX_RESULT");
    assert.equal(completed.resultAsset?.mimeType, "audio/mp4");
    assert.match(completed.resultAsset?.fileName ?? "", /\.m4a$/);
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
      VOCAL_PROFILE_ANALYZER_BACKEND: previousEnv.analyzerBackend,
      VOCAL_PROFILE_API_URL: previousEnv.analyzer,
      VOCAL_PROFILE_MODAL_URL: previousEnv.vocalModalUrl,
      VOCAL_PROFILE_MODAL_API_KEY: previousEnv.vocalModalKey,
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
