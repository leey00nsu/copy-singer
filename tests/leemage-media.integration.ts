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
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/v1/recordings/") && url.endsWith("/source")) {
      return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/wav" } });
    }
    if (url.endsWith("/files/presign")) {
      return Response.json({
        presignedUrl: "https://objects.example/upload",
        objectName: "project/reference-source-wav.wav",
        fileId: "reference-file",
      });
    }
    if (url === "https://objects.example/upload") return new Response(null, { status: 200 });
    if (url.endsWith("/files/confirm")) {
      return Response.json({ file: { id: "reference-file", url: "https://objects.example/reference.wav" } }, { status: 201 });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const { prisma } = await import("../lib/db/prisma");
  const { storeAnalyzerReference } = await import("../lib/leemage/media-service");
  const userId = `reference-owner-${crypto.randomUUID()}`;
  try {
    await prisma.user.create({
      data: { id: userId, name: "Reference owner", email: `${userId}@example.test`, emailVerified: true },
    });
    const asset = await storeAnalyzerReference({
      userId,
      recordingId: crypto.randomUUID(),
      mimeType: "audio/wav",
    });
    assert.equal(asset.userId, userId);
    assert.equal(asset.kind, "REFERENCE");
    assert.equal(asset.externalFileId, "reference-file");
    assert.equal(asset.externalUrl, "https://objects.example/reference.wav");
    assert.equal(asset.sizeBytes, BigInt(3));
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
