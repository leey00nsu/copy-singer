import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

type JobRow = {
  id: string;
  status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED";
  sourceAssetId: string | null;
  vocalProfileId: string | null;
  attempts: number;
  maxAttempts: number;
  errorCode: string | null;
  retryable: boolean | null;
};

function encodedArtifact(bytes: Uint8Array, fileName = "source.wav") {
  return {
    fileName,
    mimeType: "audio/wav",
    sizeBytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    contentBase64: Buffer.from(bytes).toString("base64"),
  };
}

function modalEnvelope(recordingId: string, source: Uint8Array) {
  return {
    transportVersion: "modal-analysis-envelope-v1",
    profile: {
      recordingId,
      mimeType: "audio/wav",
      sizeBytes: source.byteLength,
      durationMs: 5_000,
      sampleRate: 16_000,
      minMidi: 55,
      maxMidi: 72,
      p10Midi: 58,
      medianMidi: 64,
      p90Midi: 70,
      tessituraLowMidi: 58,
      tessituraHighMidi: 70,
      voicedRatio: 0.9,
      pitchStability: 0.8,
      clippingRatio: 0,
      rmsDb: -18,
      analyzer: "librosa-pyin",
      analyzerVersion: "0.11.0",
      descriptors: {
        synthesisReference: {
          algorithm: "voiced-phrase-band-selection",
          version: "smart-reference-v1",
          status: "unavailable",
          fallbackReason: "no-quality-phrase",
        },
      },
      synthesisReference: null,
    },
    artifacts: { source: encodedArtifact(source), synthesisReference: null },
    cleanupConfirmed: true,
  };
}

async function withUser() {
  const { prisma } = await import("../lib/db/prisma");
  const userId = `analysis-queue-${crypto.randomUUID()}`;
  await prisma.user.create({
    data: { id: userId, name: "Analysis queue", email: `${userId}@example.test`, emailVerified: true },
  });
  return { prisma, userId };
}

async function createSourceAsset(userId: string, source: Uint8Array) {
  const { prisma } = await import("../lib/db/prisma");
  return prisma.mediaAsset.create({
    data: {
      userId,
      kind: "REFERENCE",
      externalProjectId: "project",
      externalFileId: `source-${crypto.randomUUID()}`,
      externalUrl: `https://objects.example/${crypto.randomUUID()}.wav`,
      fileName: "source.wav",
      mimeType: "audio/wav",
      sizeBytes: BigInt(source.byteLength),
      status: "READY",
    },
  });
}

async function insertJob(input: { userId: string; sourceAssetId: string; recordingId?: string; maxAttempts?: number }) {
  const { prisma } = await import("../lib/db/prisma");
  const id = crypto.randomUUID();
  const recordingId = input.recordingId ?? crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "VocalProfileAnalysisJob" (
      "id", "userId", "recordingId", "sourceAssetId", "status", "idempotencyKey",
      "maxAttempts", "nextAttemptAt", "createdAt", "updatedAt"
    ) VALUES (
      ${id}::uuid, ${input.userId}, ${recordingId}::uuid, ${input.sourceAssetId}::uuid,
      'PENDING'::"VocalProfileAnalysisJobStatus", ${`test:${id}`}, ${input.maxAttempts ?? 3},
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `;
  return { id, recordingId };
}

async function readJob(id: string) {
  const { prisma } = await import("../lib/db/prisma");
  const rows = await prisma.$queryRaw<JobRow[]>`
    SELECT "id", "status", "sourceAssetId", "vocalProfileId", "attempts", "maxAttempts", "errorCode", "retryable"
    FROM "VocalProfileAnalysisJob" WHERE "id" = ${id}::uuid
  `;
  return rows[0]!;
}

async function cleanupUser(userId: string) {
  const { prisma } = await import("../lib/db/prisma");
  await prisma.$executeRaw`DELETE FROM "VocalProfileAnalysisJob" WHERE "userId" = ${userId}`;
  const profiles = await prisma.vocalProfile.findMany({ where: { userId }, select: { recordingId: true } });
  await prisma.vocalProfile.deleteMany({ where: { userId } });
  if (profiles.length)
    await prisma.recording.deleteMany({ where: { id: { in: profiles.map((profile) => profile.recordingId) } } });
  await prisma.mediaCleanupJob.deleteMany({ where: { mediaAsset: { userId } } });
  await prisma.mediaAsset.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

test("enqueue is idempotent and job reads are owner-scoped", async (context) => {
  if (!process.env.DATABASE_URL) return context.skip("DATABASE_URL is not configured");
  const { prisma, userId } = await withUser();
  const otherId = `analysis-other-${crypto.randomUUID()}`;
  const previousFetch = globalThis.fetch;
  const previousEnv = {
    baseUrl: process.env.LEEMAGE_BASE_URL,
    apiKey: process.env.LEEMAGE_API_KEY,
    projectId: process.env.LEEMAGE_PROJECT_ID,
  };
  process.env.LEEMAGE_BASE_URL = "https://leemage.example/api/v1";
  process.env.LEEMAGE_API_KEY = "test-key";
  process.env.LEEMAGE_PROJECT_ID = "project";
  let presigns = 0;
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url.endsWith("/files/presign")) {
      presigns += 1;
      return Response.json({
        presignedUrl: "https://objects.example/upload",
        objectName: "project/source.wav",
        fileId: `file-${userId}`,
      });
    }
    if (url === "https://objects.example/upload") return new Response(null, { status: 200 });
    if (url.endsWith("/files/confirm")) {
      return Response.json(
        { file: { id: `file-${userId}`, url: "https://objects.example/source.wav" } },
        { status: 201 },
      );
    }
    throw new Error(`Unexpected URL ${url} ${init?.method ?? "GET"}`);
  }) as typeof fetch;

  try {
    await prisma.user.create({
      data: { id: otherId, name: "Other", email: `${otherId}@example.test`, emailVerified: true },
    });
    const { enqueueVocalProfileAnalysis, getVocalProfileAnalysisJob, listVisibleVocalProfileAnalysisJobs } =
      await import("../lib/vocal-profile/analysis-queue");
    const file = new File([Uint8Array.from([1, 2, 3, 4])], "voice.wav", { type: "audio/wav" });
    const first = await enqueueVocalProfileAnalysis({ userId, idempotencyKey: "same-request", file });
    const second = await enqueueVocalProfileAnalysis({ userId, idempotencyKey: "same-request", file });
    assert.equal(second.id, first.id);
    assert.equal(presigns, 1);
    assert.equal(await prisma.mediaAsset.count({ where: { userId } }), 1);
    assert.equal((await getVocalProfileAnalysisJob(userId, first.id))?.job.id, first.id);
    assert.equal(await getVocalProfileAnalysisJob(otherId, first.id), null);
    assert.deepEqual(
      (await listVisibleVocalProfileAnalysisJobs(userId)).map((job) => job.id),
      [first.id],
    );
    assert.deepEqual(await listVisibleVocalProfileAnalysisJobs(otherId), []);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousEnv.baseUrl === undefined) delete process.env.LEEMAGE_BASE_URL;
    else process.env.LEEMAGE_BASE_URL = previousEnv.baseUrl;
    if (previousEnv.apiKey === undefined) delete process.env.LEEMAGE_API_KEY;
    else process.env.LEEMAGE_API_KEY = previousEnv.apiKey;
    if (previousEnv.projectId === undefined) delete process.env.LEEMAGE_PROJECT_ID;
    else process.env.LEEMAGE_PROJECT_ID = previousEnv.projectId;
    await cleanupUser(userId);
    await prisma.user.deleteMany({ where: { id: otherId } });
  }
});

test("expired analysis leases are recoverable by another worker", async (context) => {
  if (!process.env.DATABASE_URL) return context.skip("DATABASE_URL is not configured");
  const { prisma, userId } = await withUser();
  const source = await createSourceAsset(userId, Uint8Array.from([1, 2, 3]));
  const job = await insertJob({ userId, sourceAssetId: source.id });
  try {
    const { claimNextVocalProfileAnalysisJob } = await import("../lib/vocal-profile/analysis-worker");
    assert.equal(await claimNextVocalProfileAnalysisJob("worker-a", job.id), job.id);
    assert.equal(await claimNextVocalProfileAnalysisJob("worker-b", job.id), null);
    await prisma.$executeRaw`
      UPDATE "VocalProfileAnalysisJob"
      SET "leaseExpiresAt" = ${new Date(0)}
      WHERE "id" = ${job.id}::uuid
    `;
    assert.equal(await claimNextVocalProfileAnalysisJob("worker-b", job.id), job.id);
    assert.equal((await readJob(job.id)).attempts, 2);
  } finally {
    await cleanupUser(userId);
  }
});

test("worker persists a profile while reusing the durable source asset", async (context) => {
  if (!process.env.DATABASE_URL) return context.skip("DATABASE_URL is not configured");
  const { prisma, userId } = await withUser();
  const bytes = Uint8Array.from([1, 2, 3, 4, 5, 6]);
  const source = await createSourceAsset(userId, bytes);
  const job = await insertJob({ userId, sourceAssetId: source.id });
  const previous = {
    backend: process.env.VOCAL_PROFILE_ANALYZER_BACKEND,
    url: process.env.VOCAL_PROFILE_MODAL_URL,
    key: process.env.VOCAL_PROFILE_MODAL_API_KEY,
  };
  process.env.VOCAL_PROFILE_ANALYZER_BACKEND = "modal";
  process.env.VOCAL_PROFILE_MODAL_URL = "https://modal.example";
  process.env.VOCAL_PROFILE_MODAL_API_KEY = "test-key";
  const fetchImpl = (async (input) => {
    const url = String(input);
    if (url === source.externalUrl) return new Response(bytes, { headers: { "Content-Type": "audio/wav" } });
    if (url === "https://modal.example/v1/analyze") return Response.json(modalEnvelope(job.recordingId, bytes));
    throw new Error(`Unexpected URL: ${url}`);
  }) as typeof fetch;

  try {
    const { claimNextVocalProfileAnalysisJob, processClaimedVocalProfileAnalysisJob } = await import(
      "../lib/vocal-profile/analysis-worker"
    );
    assert.equal(await claimNextVocalProfileAnalysisJob("worker", job.id), job.id);
    await processClaimedVocalProfileAnalysisJob(job.id, "worker", { fetchImpl });
    const storedJob = await readJob(job.id);
    assert.equal(storedJob.status, "SUCCEEDED");
    assert.ok(storedJob.vocalProfileId);
    const profile = await prisma.vocalProfile.findUniqueOrThrow({
      where: { id: storedJob.vocalProfileId! },
      include: { recording: true },
    });
    assert.equal(profile.recording.mediaAssetId, source.id);
    assert.equal(profile.recordingId, job.recordingId);
    assert.equal(await prisma.mediaAsset.count({ where: { userId, kind: "REFERENCE" } }), 1);
  } finally {
    if (previous.backend === undefined) delete process.env.VOCAL_PROFILE_ANALYZER_BACKEND;
    else process.env.VOCAL_PROFILE_ANALYZER_BACKEND = previous.backend;
    if (previous.url === undefined) delete process.env.VOCAL_PROFILE_MODAL_URL;
    else process.env.VOCAL_PROFILE_MODAL_URL = previous.url;
    if (previous.key === undefined) delete process.env.VOCAL_PROFILE_MODAL_API_KEY;
    else process.env.VOCAL_PROFILE_MODAL_API_KEY = previous.key;
    await cleanupUser(userId);
  }
});

test("transient Modal failure requeues without deleting the source", async (context) => {
  if (!process.env.DATABASE_URL) return context.skip("DATABASE_URL is not configured");
  const { userId } = await withUser();
  const bytes = Uint8Array.from([1, 2, 3]);
  const source = await createSourceAsset(userId, bytes);
  const job = await insertJob({ userId, sourceAssetId: source.id, maxAttempts: 3 });
  const previous = {
    backend: process.env.VOCAL_PROFILE_ANALYZER_BACKEND,
    url: process.env.VOCAL_PROFILE_MODAL_URL,
    key: process.env.VOCAL_PROFILE_MODAL_API_KEY,
  };
  process.env.VOCAL_PROFILE_ANALYZER_BACKEND = "modal";
  process.env.VOCAL_PROFILE_MODAL_URL = "https://modal.example";
  process.env.VOCAL_PROFILE_MODAL_API_KEY = "test-key";
  const fetchImpl = (async (input) =>
    String(input) === source.externalUrl
      ? new Response(bytes)
      : new Response("temporary", { status: 500 })) as typeof fetch;
  try {
    const { claimNextVocalProfileAnalysisJob, processClaimedVocalProfileAnalysisJob } = await import(
      "../lib/vocal-profile/analysis-worker"
    );
    await claimNextVocalProfileAnalysisJob("worker", job.id);
    await processClaimedVocalProfileAnalysisJob(job.id, "worker", { fetchImpl });
    const stored = await readJob(job.id);
    assert.equal(stored.status, "PENDING");
    assert.equal(stored.sourceAssetId, source.id);
    assert.equal(stored.errorCode, "ANALYZER_UNAVAILABLE");
    assert.equal(stored.retryable, true);
  } finally {
    if (previous.backend === undefined) delete process.env.VOCAL_PROFILE_ANALYZER_BACKEND;
    else process.env.VOCAL_PROFILE_ANALYZER_BACKEND = previous.backend;
    if (previous.url === undefined) delete process.env.VOCAL_PROFILE_MODAL_URL;
    else process.env.VOCAL_PROFILE_MODAL_URL = previous.url;
    if (previous.key === undefined) delete process.env.VOCAL_PROFILE_MODAL_API_KEY;
    else process.env.VOCAL_PROFILE_MODAL_API_KEY = previous.key;
    await cleanupUser(userId);
  }
});

test("terminal analysis failure detaches and deletes the queued source", async (context) => {
  if (!process.env.DATABASE_URL) return context.skip("DATABASE_URL is not configured");
  const { prisma, userId } = await withUser();
  const bytes = Uint8Array.from([1, 2, 3]);
  const source = await createSourceAsset(userId, bytes);
  const job = await insertJob({ userId, sourceAssetId: source.id, maxAttempts: 1 });
  const previousFetch = globalThis.fetch;
  const previous = {
    backend: process.env.VOCAL_PROFILE_ANALYZER_BACKEND,
    url: process.env.VOCAL_PROFILE_MODAL_URL,
    key: process.env.VOCAL_PROFILE_MODAL_API_KEY,
    baseUrl: process.env.LEEMAGE_BASE_URL,
    leemageKey: process.env.LEEMAGE_API_KEY,
    projectId: process.env.LEEMAGE_PROJECT_ID,
  };
  process.env.VOCAL_PROFILE_ANALYZER_BACKEND = "modal";
  process.env.VOCAL_PROFILE_MODAL_URL = "https://modal.example";
  process.env.VOCAL_PROFILE_MODAL_API_KEY = "test-key";
  process.env.LEEMAGE_BASE_URL = "https://leemage.example/api/v1";
  process.env.LEEMAGE_API_KEY = "leemage-key";
  process.env.LEEMAGE_PROJECT_ID = "project";
  globalThis.fetch = (async () => Response.json({ message: "deleted" })) as typeof fetch;
  const fetchImpl = (async (input) => {
    if (String(input) === source.externalUrl) return new Response(bytes);
    return Response.json(
      { reasonCode: "TOO_SILENT", detail: "Audio is too quiet.", retryable: false },
      { status: 422 },
    );
  }) as typeof fetch;

  try {
    const { claimNextVocalProfileAnalysisJob, processClaimedVocalProfileAnalysisJob } = await import(
      "../lib/vocal-profile/analysis-worker"
    );
    await claimNextVocalProfileAnalysisJob("worker", job.id);
    await processClaimedVocalProfileAnalysisJob(job.id, "worker", { fetchImpl });
    const stored = await readJob(job.id);
    assert.equal(stored.status, "FAILED");
    assert.equal(stored.sourceAssetId, null);
    assert.equal(stored.errorCode, "TOO_SILENT");
    assert.equal(stored.retryable, false);
    assert.equal(await prisma.mediaAsset.findUnique({ where: { id: source.id } }), null);
  } finally {
    globalThis.fetch = previousFetch;
    if (previous.backend === undefined) delete process.env.VOCAL_PROFILE_ANALYZER_BACKEND;
    else process.env.VOCAL_PROFILE_ANALYZER_BACKEND = previous.backend;
    if (previous.url === undefined) delete process.env.VOCAL_PROFILE_MODAL_URL;
    else process.env.VOCAL_PROFILE_MODAL_URL = previous.url;
    if (previous.key === undefined) delete process.env.VOCAL_PROFILE_MODAL_API_KEY;
    else process.env.VOCAL_PROFILE_MODAL_API_KEY = previous.key;
    if (previous.baseUrl === undefined) delete process.env.LEEMAGE_BASE_URL;
    else process.env.LEEMAGE_BASE_URL = previous.baseUrl;
    if (previous.leemageKey === undefined) delete process.env.LEEMAGE_API_KEY;
    else process.env.LEEMAGE_API_KEY = previous.leemageKey;
    if (previous.projectId === undefined) delete process.env.LEEMAGE_PROJECT_ID;
    else process.env.LEEMAGE_PROJECT_ID = previous.projectId;
    await cleanupUser(userId);
  }
});
