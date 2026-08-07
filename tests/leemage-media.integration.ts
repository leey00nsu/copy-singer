import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("an analyzer reference is persisted as user-owned Leemage metadata", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }
  const previousFetch = globalThis.fetch;
  const previousEnv = {
    analyzerUrl: process.env.VOCAL_PROFILE_API_URL,
    baseUrl: process.env.LEEMAGE_BASE_URL,
    apiKey: process.env.LEEMAGE_API_KEY,
    projectId: process.env.LEEMAGE_PROJECT_ID,
  };
  process.env.VOCAL_PROFILE_API_URL = "https://analyzer.example";
  process.env.LEEMAGE_BASE_URL = "https://leemage.example/api/v1";
  process.env.LEEMAGE_API_KEY = "test-key";
  process.env.LEEMAGE_PROJECT_ID = "project";
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/v1/recordings/") && url.endsWith("/source")) {
      return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/wav" } });
    }
    if (url.includes("/v1/recordings/") && url.endsWith("/synthesis-reference")) {
      return new Response(new Uint8Array([4, 5, 6, 7]), { headers: { "Content-Type": "audio/wav" } });
    }
    if (url.endsWith("/files/presign")) {
      const body = JSON.parse(String(init?.body)) as { fileName: string };
      const kind = body.fileName.includes("-synthesis") ? "synthesis" : "reference";
      return Response.json({
        presignedUrl: `https://objects.example/upload-${kind}`,
        objectName: `project/${kind}.wav`,
        fileId: `${kind}-file`,
      });
    }
    if (url.startsWith("https://objects.example/upload-")) return new Response(null, { status: 200 });
    if (url.endsWith("/files/confirm")) {
      const body = JSON.parse(String(init?.body)) as { fileId: string };
      const kind = body.fileId.startsWith("synthesis") ? "synthesis" : "reference";
      return Response.json({ file: { id: body.fileId, url: `https://objects.example/${kind}.wav` } }, { status: 201 });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const { prisma } = await import("../lib/db/prisma");
  const { storeAnalyzerReferenceBytes, storeAnalyzerSynthesisReferenceBytes } = await import("../lib/leemage/media-service");
  const userId = `reference-owner-${crypto.randomUUID()}`;
  try {
    await prisma.user.create({
      data: { id: userId, name: "Reference owner", email: `${userId}@example.test`, emailVerified: true },
    });
    const asset = await storeAnalyzerReferenceBytes({
      userId,
      recordingId: crypto.randomUUID(),
      mimeType: "audio/wav",
      bytes: Uint8Array.from([1, 2, 3]),
    });
    assert.equal(asset.userId, userId);
    assert.equal(asset.kind, "REFERENCE");
    assert.equal(asset.externalFileId, "reference-file");
    assert.equal(asset.externalUrl, "https://objects.example/reference.wav");
    assert.equal(asset.sizeBytes, BigInt(3));
    const synthesis = await storeAnalyzerSynthesisReferenceBytes({
      userId,
      recordingId: crypto.randomUUID(),
      mimeType: "audio/wav",
      bytes: Uint8Array.from([4, 5, 6, 7]),
    });
    assert.equal(synthesis.userId, userId);
    assert.equal(synthesis.kind, "SYNTHESIS_REFERENCE");
    assert.equal(synthesis.externalFileId, "synthesis-file");
    assert.equal(synthesis.externalUrl, "https://objects.example/synthesis.wav");
    assert.equal(synthesis.sizeBytes, BigInt(4));
  } finally {
    globalThis.fetch = previousFetch;
    if (previousEnv.analyzerUrl === undefined) delete process.env.VOCAL_PROFILE_API_URL;
    else process.env.VOCAL_PROFILE_API_URL = previousEnv.analyzerUrl;
    if (previousEnv.baseUrl === undefined) delete process.env.LEEMAGE_BASE_URL;
    else process.env.LEEMAGE_BASE_URL = previousEnv.baseUrl;
    if (previousEnv.apiKey === undefined) delete process.env.LEEMAGE_API_KEY;
    else process.env.LEEMAGE_API_KEY = previousEnv.apiKey;
    if (previousEnv.projectId === undefined) delete process.env.LEEMAGE_PROJECT_ID;
    else process.env.LEEMAGE_PROJECT_ID = previousEnv.projectId;
    await prisma.mediaAsset.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
});

test("failed Leemage deletion leaves a retryable cleanup record", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }
  const previousFetch = globalThis.fetch;
  const previousEnv = {
    baseUrl: process.env.LEEMAGE_BASE_URL,
    apiKey: process.env.LEEMAGE_API_KEY,
    projectId: process.env.LEEMAGE_PROJECT_ID,
  };
  process.env.LEEMAGE_BASE_URL = "https://leemage.example/api/v1";
  process.env.LEEMAGE_API_KEY = "test-key";
  process.env.LEEMAGE_PROJECT_ID = "project";
  globalThis.fetch = async () =>
    Response.json({ message: "rate limited" }, { status: 429, headers: { "Retry-After": "0" } });

  const { prisma } = await import("../lib/db/prisma");
  const { deleteOrScheduleMediaAsset } = await import("../lib/leemage/media-service");
  const userId = `media-owner-${crypto.randomUUID()}`;
  let assetId: string | null = null;
  try {
    await prisma.user.create({
      data: { id: userId, name: "Media owner", email: `${userId}@example.test`, emailVerified: true },
    });
    const asset = await prisma.mediaAsset.create({
      data: {
        userId,
        kind: "REFERENCE",
        externalProjectId: "project",
        externalFileId: "file-1",
        externalUrl: "https://objects.example/file.wav",
        fileName: "reference.wav",
        mimeType: "audio/wav",
        sizeBytes: BigInt(3),
      },
    });
    assetId = asset.id;

    assert.deepEqual((await deleteOrScheduleMediaAsset(asset.id)).deleted, false);
    const stored = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: asset.id } });
    assert.equal(stored.status, "DELETE_PENDING");
    assert.equal(await prisma.mediaCleanupJob.count({ where: { mediaAssetId: asset.id, status: "PENDING" } }), 1);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousEnv.baseUrl === undefined) delete process.env.LEEMAGE_BASE_URL;
    else process.env.LEEMAGE_BASE_URL = previousEnv.baseUrl;
    if (previousEnv.apiKey === undefined) delete process.env.LEEMAGE_API_KEY;
    else process.env.LEEMAGE_API_KEY = previousEnv.apiKey;
    if (previousEnv.projectId === undefined) delete process.env.LEEMAGE_PROJECT_ID;
    else process.env.LEEMAGE_PROJECT_ID = previousEnv.projectId;
    if (assetId) await prisma.mediaCleanupJob.deleteMany({ where: { mediaAssetId: assetId } });
    await prisma.mediaAsset.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
});

test("the worker removes a pending Leemage asset after a successful retry", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }
  const previousEnv = {
    baseUrl: process.env.LEEMAGE_BASE_URL,
    apiKey: process.env.LEEMAGE_API_KEY,
    projectId: process.env.LEEMAGE_PROJECT_ID,
  };
  process.env.LEEMAGE_BASE_URL = "https://leemage.example/api/v1";
  process.env.LEEMAGE_API_KEY = "test-key";
  process.env.LEEMAGE_PROJECT_ID = "project";
  const { prisma } = await import("../lib/db/prisma");
  const { processOneMediaCleanup } = await import("../lib/leemage/cleanup");
  const userId = `cleanup-owner-${crypto.randomUUID()}`;
  let assetId: string | null = null;
  try {
    await prisma.user.create({
      data: { id: userId, name: "Cleanup owner", email: `${userId}@example.test`, emailVerified: true },
    });
    const asset = await prisma.mediaAsset.create({
      data: {
        userId,
        kind: "REFERENCE",
        externalProjectId: "project",
        externalFileId: `file-${userId}`,
        externalUrl: "https://objects.example/file.wav",
        fileName: "reference.wav",
        mimeType: "audio/wav",
        sizeBytes: BigInt(3),
        status: "DELETE_PENDING",
        cleanupJobs: { create: { status: "PENDING" } },
      },
    });
    assetId = asset.id;
    const fetchImpl: typeof fetch = async () => Response.json({ message: "deleted" });
    assert.equal(await processOneMediaCleanup(fetchImpl), true);
    assert.equal(await prisma.mediaAsset.findUnique({ where: { id: asset.id } }), null);
    assert.equal(await prisma.mediaCleanupJob.count({ where: { mediaAssetId: asset.id } }), 0);
  } finally {
    if (previousEnv.baseUrl === undefined) delete process.env.LEEMAGE_BASE_URL;
    else process.env.LEEMAGE_BASE_URL = previousEnv.baseUrl;
    if (previousEnv.apiKey === undefined) delete process.env.LEEMAGE_API_KEY;
    else process.env.LEEMAGE_API_KEY = previousEnv.apiKey;
    if (previousEnv.projectId === undefined) delete process.env.LEEMAGE_PROJECT_ID;
    else process.env.LEEMAGE_PROJECT_ID = previousEnv.projectId;
    if (assetId) await prisma.mediaCleanupJob.deleteMany({ where: { mediaAssetId: assetId } });
    await prisma.mediaAsset.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
