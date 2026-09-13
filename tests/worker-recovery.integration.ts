import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("expired final claims converge and stale leases cannot commit", async () => {
  const { prisma } = await import("../src/shared/db/index.server");
  const { fenceJob, startJobLease } = await import("../src/shared/lib/runtime/index.server");
  const vocal = await import("../src/_app/background-jobs/vocal-profile-analysis/worker");
  const mixing = await import("../src/_app/background-jobs/mixing/worker");
  const song = await import("../src/_app/background-jobs/song-analysis/worker");
  const userId = crypto.randomUUID();
  let profileId: string | undefined;
  let recordingId: string | undefined;
  let assetId: string | undefined;
  let songJobId: string | undefined;
  let recoverySongId: string | undefined;
  try {
    await prisma.user.create({ data: { id: userId, name: "Recovery", email: `${userId}@example.test` } });
    const asset = await prisma.mediaAsset.create({
      data: {
        userId,
        kind: "REFERENCE",
        externalProjectId: "fixture",
        externalFileId: crypto.randomUUID(),
        externalUrl: "https://invalid.example",
        fileName: "test.wav",
        mimeType: "audio/wav",
        sizeBytes: 1,
      },
    });
    assetId = asset.id;
    const recording = await prisma.recording.create({
      data: {
        kind: "USER_TEST",
        status: "READY",
        storagePath: "fixture://audio",
        mimeType: "audio/wav",
        mediaAssetId: asset.id,
      },
    });
    recordingId = recording.id;
    const profile = await prisma.vocalProfile.create({
      data: { userId, sourceType: "USER", recordingId: recording.id, analyzer: "fixture", analyzerVersion: "1" },
    });
    profileId = profile.id;
    const source = await prisma.songSource.findFirstOrThrow({
      where: { status: "READY", targetAssets: { some: { status: "READY" } }, analysisJob: null },
      include: { song: true, targetAssets: true },
    });
    assert.ok(source.song.currentAnalysisId);
    const mix = await prisma.mixingJob.create({
      data: {
        userId,
        vocalProfileId: profile.id,
        songId: source.songId,
        songAnalysisId: source.song.currentAnalysisId,
        referenceAssetId: asset.id,
        targetAssetId: source.targetAssets[0].id,
        catalogPosition: 1,
        recommendedShift: 0,
        catalogRevision: 1,
        scoringVersion: "test",
        ticketCost: 0,
        idempotencyKey: crypto.randomUUID(),
        status: "PROCESSING",
        attempts: 1,
        maxAttempts: 1,
        leaseOwner: "crashed",
        leaseExpiresAt: new Date(0),
      },
    });
    const v = await prisma.vocalProfileAnalysisJob.create({
      data: {
        userId,
        recordingId: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
        status: "PROCESSING",
        attempts: 1,
        maxAttempts: 1,
        leaseOwner: "crashed",
        leaseExpiresAt: new Date(0),
      },
    });
    const recoverySong = await prisma.song.create({ data: { title: `recovery-${userId}`, artist: "fixture" } });
    recoverySongId = recoverySong.id;
    const recoverySource = await prisma.songSource.create({
      data: {
        songId: recoverySong.id,
        revision: 1,
        sourceUrl: "https://example.invalid",
        sourceVideoId: crypto.randomUUID().replaceAll("-", "").slice(0, 11),
        sourceLabel: "fixture",
      },
    });
    const s = await prisma.songAnalysisJob.create({
      data: {
        sourceId: recoverySource.id,
        idempotencyKey: crypto.randomUUID(),
        status: "PROCESSING",
        attempts: 1,
        maxAttempts: 1,
        leaseOwner: "crashed",
        leaseExpiresAt: new Date(0),
      },
    });
    songJobId = s.id;
    const neverFetch: typeof fetch = async () => {
      throw new Error("External submission must not occur after exhausted attempts");
    };
    for (const [table, id, claim, processJob] of [
      ["MixingJob", mix.id, mixing.claimNextMixingJob, mixing.processClaimedMixingJob],
      [
        "VocalProfileAnalysisJob",
        v.id,
        vocal.claimNextVocalProfileAnalysisJob,
        vocal.processClaimedVocalProfileAnalysisJob,
      ],
      ["SongAnalysisJob", s.id, song.claimNextSongAnalysisJob, song.processClaimedSongAnalysisJob],
    ] as const) {
      assert.equal(await claim("recovery", id), id);
      await assert.rejects(
        prisma.$transaction((tx) => fenceJob(tx, table, id, "crashed")),
        /LEASE_LOST/,
      );
      await processJob(id, "recovery", { fetchImpl: neverFetch });
      const rows = await prisma.$queryRawUnsafe<Array<{ status: string }>>(
        `SELECT status FROM "${table}" WHERE id = $1::uuid`,
        id,
      );
      assert.equal(rows[0]?.status, "FAILED");
      assert.equal(await claim("again", id), null);
    }
    const { retryAdminSongAnalysis } = await import("../src/features/manage-song-catalog/index.server");
    const retries = await Promise.allSettled([
      retryAdminSongAnalysis(recoverySource.id),
      retryAdminSongAnalysis(recoverySource.id),
    ]);
    assert.equal(retries.filter((result) => result.status === "fulfilled").length, 1);
    const retried = await prisma.songAnalysisJob.findUniqueOrThrow({ where: { id: s.id } });
    assert.ok(retried.externalRequestId);
    assert.equal(retried.deadlineAt, null);
    assert.equal(retried.submissionState, "NOT_SUBMITTED");
    const heartbeatJob = await prisma.vocalProfileAnalysisJob.create({
      data: {
        userId,
        recordingId: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
        status: "PROCESSING",
        leaseOwner: "heartbeat",
        leaseExpiresAt: new Date(Date.now() + 1000),
        deadlineAt: new Date(Date.now() + 5000),
      },
    });
    const lease = await startJobLease("VocalProfileAnalysisJob", heartbeatJob.id, "heartbeat", 0.3);
    try {
      await new Promise((resolve) => setTimeout(resolve, 160));
      assert.ok(
        (await prisma.vocalProfileAnalysisJob.findUniqueOrThrow({ where: { id: heartbeatJob.id } })).heartbeatAt,
      );
      await prisma.vocalProfileAnalysisJob.update({
        where: { id: heartbeatJob.id },
        data: { leaseOwner: "replacement" },
      });
      await new Promise((resolve) => setTimeout(resolve, 160));
      assert.equal(lease.signal.aborted, true);
    } finally {
      await lease.stop();
    }
  } finally {
    if (songJobId) await prisma.songAnalysisJob.deleteMany({ where: { id: songJobId } });
    if (recoverySongId) {
      await prisma.songAnalysis.deleteMany({ where: { songId: recoverySongId } });
      await prisma.songSource.deleteMany({ where: { songId: recoverySongId } });
      await prisma.song.deleteMany({ where: { id: recoverySongId } });
    }
    await prisma.mixingJob.deleteMany({ where: { userId } });
    await prisma.vocalProfileAnalysisJob.deleteMany({ where: { userId } });
    if (profileId) await prisma.vocalProfile.deleteMany({ where: { id: profileId } });
    if (recordingId) await prisma.recording.deleteMany({ where: { id: recordingId } });
    if (assetId) await prisma.mediaAsset.deleteMany({ where: { id: assetId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
