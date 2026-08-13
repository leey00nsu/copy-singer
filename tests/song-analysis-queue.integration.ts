import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

function analyzerResult() {
  return {
    durationMs: 180_000,
    sampleRate: 44_100,
    sourceSizeBytes: 1_024,
    minMidi: 48,
    maxMidi: 72,
    p10Midi: 52,
    medianMidi: 60,
    p90Midi: 69,
    tessituraLowMidi: 53,
    tessituraHighMidi: 68,
    voicedRatio: 0.8,
    pitchStability: 0.7,
    clippingRatio: 0.01,
    rmsDb: -16,
    analyzer: "librosa-pyin",
    analyzerVersion: "test",
    descriptors: {},
    cleanupConfirmed: true,
    ytDlpVersion: "test",
    separator: "demucs",
    separatorVersion: "test",
    separatorModel: "htdemucs",
  };
}

test("song analysis lease is exclusive, recoverable, and persists a READY revision", async (context) => {
  if (!process.env.DATABASE_URL) return context.skip("DATABASE_URL is not configured");
  const { prisma } = await import("../src/shared/db/index.server");
  const suffix = crypto.randomUUID();
  const position = 1_100_000_000 + Number.parseInt(suffix.replaceAll("-", "").slice(0, 6), 16);
  const { createAdminSong } = await import("../src/features/manage-song-catalog/index.server");
  const song = await createAdminSong(
    {
      title: `Queue song ${suffix}`,
      artist: "Queue artist",
      catalogPosition: position,
      sourceUrl: `https://www.youtube.com/watch?v=${suffix.replaceAll("-", "").slice(0, 11)}`,
      sourceVideoId: suffix.replaceAll("-", "").slice(0, 11),
      sourceLabel: "Queue fixture",
      idempotencyKey: `queue:${suffix}`,
    },
    null,
  );
  const source = song.sources.at(0);
  assert.ok(source);
  const job = await prisma.songAnalysisJob.findUniqueOrThrow({ where: { sourceId: source.id } });
  try {
    const { claimNextSongAnalysisJob, processClaimedSongAnalysisJob } = await import(
      "../src/_app/background-jobs/song-analysis/index.server"
    );
    assert.equal(await claimNextSongAnalysisJob("worker-a", job.id), job.id);
    assert.equal(await claimNextSongAnalysisJob("worker-b", job.id), null);
    await prisma.songAnalysisJob.update({ where: { id: job.id }, data: { leaseExpiresAt: new Date(0) } });
    assert.equal(await claimNextSongAnalysisJob("worker-b", job.id), job.id);
    await processClaimedSongAnalysisJob(job.id, "worker-b", {
      analyzerUrl: "https://analyzer.example",
      fetchImpl: (async () => Response.json(analyzerResult())) as typeof fetch,
    });
    const stored = await prisma.songAnalysisJob.findUniqueOrThrow({
      where: { id: job.id },
      include: { analysis: true },
    });
    assert.equal(stored.status, "SUCCEEDED");
    assert.equal(stored.attempts, 2);
    assert.equal(stored.analysis?.status, "READY");
    assert.equal(stored.analysis?.sourceId, source.id);
    assert.equal(stored.analysis?.cleanupConfirmed, true);
  } finally {
    await prisma.songAnalysisJob.deleteMany({ where: { source: { songId: song.id } } });
    await prisma.songAnalysis.deleteMany({ where: { songId: song.id } });
    await prisma.catalogEntry.deleteMany({ where: { songId: song.id } });
    await prisma.songSource.deleteMany({ where: { songId: song.id } });
    await prisma.song.delete({ where: { id: song.id } });
    await prisma.$disconnect();
  }
});

test("retryable analyzer failures return the durable job to PENDING", async (context) => {
  if (!process.env.DATABASE_URL) return context.skip("DATABASE_URL is not configured");
  const { prisma } = await import("../src/shared/db/index.server");
  const suffix = crypto.randomUUID().replaceAll("-", "");
  const sourceVideoId = suffix.slice(0, 11);
  const position = 1_200_000_000 + Number.parseInt(suffix.slice(0, 6), 16);
  const { createAdminSong } = await import("../src/features/manage-song-catalog/index.server");
  const song = await createAdminSong(
    {
      title: `Retry song ${suffix}`,
      artist: "Retry artist",
      catalogPosition: position,
      sourceUrl: `https://youtu.be/${sourceVideoId}`,
      sourceVideoId,
      sourceLabel: "Retry fixture",
      idempotencyKey: `retry:${suffix}`,
    },
    null,
  );
  const source = song.sources.at(0);
  assert.ok(source);
  const job = await prisma.songAnalysisJob.findUniqueOrThrow({ where: { sourceId: source.id } });
  try {
    const { claimNextSongAnalysisJob, processClaimedSongAnalysisJob } = await import(
      "../src/_app/background-jobs/song-analysis/index.server"
    );
    await claimNextSongAnalysisJob("worker", job.id);
    await processClaimedSongAnalysisJob(job.id, "worker", {
      analyzerUrl: "https://analyzer.example",
      fetchImpl: (async () =>
        Response.json({ reasonCode: "PIPELINE_TIMEOUT", detail: "temporary" }, { status: 503 })) as typeof fetch,
    });
    const stored = await prisma.songAnalysisJob.findUniqueOrThrow({ where: { id: job.id } });
    assert.equal(stored.status, "PENDING");
    assert.equal(stored.retryable, true);
    assert.equal(stored.errorCode, "PIPELINE_TIMEOUT");
  } finally {
    await prisma.songAnalysisJob.deleteMany({ where: { source: { songId: song.id } } });
    await prisma.songAnalysis.deleteMany({ where: { songId: song.id } });
    await prisma.catalogEntry.deleteMany({ where: { songId: song.id } });
    await prisma.songSource.deleteMany({ where: { songId: song.id } });
    await prisma.song.delete({ where: { id: song.id } });
    await prisma.$disconnect();
  }
});
