import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { config } from "dotenv";

import artifactJson from "../data/catalogs/tj-2607-song-profiles.json";

config({ path: [".env.local", ".env"], quiet: true });

test("catalog target import uploads once, links Song, and is idempotent by SHA-256", async (context) => {
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
  process.env.LEEMAGE_API_KEY = "catalog-target-test-key";
  process.env.LEEMAGE_PROJECT_ID = "catalog-target-project";

  const { prisma } = await import("../src/shared/db/index.server");
  const { importCatalogTargetAsset } = await import("../src/entities/recommendation/index.target-assets.server");

  const catalogOrder = 100;
  const catalog = artifactJson.songs[catalogOrder - 1]!;
  const song = await prisma.song.findUniqueOrThrow({ where: { catalogOrder } });
  const originalTargetAssetId = song.targetAssetId;
  const stagingDir = await mkdtemp(path.join(os.tmpdir(), "copy-singer-catalog-targets-"));
  const sourcePath = path.join(stagingDir, `Fixture Song [${catalog.sourceVideoId}].m4a`);
  const sourceBytes = Buffer.from("fixture-compressed-audio");
  const fileId = `catalog-target-${crypto.randomUUID()}`;
  let presignCount = 0;

  const fetchImpl: typeof fetch = async (request, init) => {
    const url = String(request);
    if (url.endsWith("/files/presign")) {
      presignCount += 1;
      return Response.json({
        presignedUrl: "https://objects.example/catalog-target-upload",
        objectName: `catalog/${fileId}.wav`,
        fileId,
      });
    }
    if (url === "https://objects.example/catalog-target-upload" && init?.method === "PUT") {
      return new Response(null, { status: 200 });
    }
    if (url.endsWith("/files/confirm")) {
      return Response.json(
        { file: { id: fileId, url: "https://objects.example/catalog-target.wav" } },
        { status: 201 },
      );
    }
    throw new Error(`Unexpected Leemage URL: ${url}`);
  };

  let importedAssetId: string | null = null;
  try {
    await prisma.song.update({ where: { id: song.id }, data: { targetAssetId: null } });
    await writeFile(sourcePath, sourceBytes);

    const first = await importCatalogTargetAsset({ catalogOrder, stagingDir, fetchImpl });
    importedAssetId = first.assetId;
    assert.equal(first.skipped, false);
    assert.equal(first.sizeBytes, sourceBytes.byteLength);
    assert.equal(first.mimeType, "audio/mp4");
    assert.equal(first.uploadPath, sourcePath);
    assert.equal(first.sourceVideoId, catalog.sourceVideoId);
    assert.equal(presignCount, 1);

    const linked = await prisma.song.findUniqueOrThrow({
      where: { id: song.id },
      include: { targetAsset: true },
    });
    assert.equal(linked.targetAssetId, first.assetId);
    assert.equal(linked.targetAsset?.status, "READY");
    assert.equal(linked.targetAsset?.mimeType, "audio/mp4");
    assert.match(linked.targetAsset?.fileName ?? "", /\.m4a$/);
    assert.equal(linked.targetAsset?.sourceVideoId, catalog.sourceVideoId);
    assert.equal(linked.targetAsset?.sha256, first.sha256);

    const second = await importCatalogTargetAsset({ catalogOrder, stagingDir, fetchImpl });
    assert.equal(second.assetId, first.assetId);
    assert.equal(second.skipped, true);
    assert.equal(presignCount, 1);
  } finally {
    await prisma.song.update({ where: { id: song.id }, data: { targetAssetId: originalTargetAssetId } });
    if (importedAssetId) await prisma.catalogTargetAsset.deleteMany({ where: { id: importedAssetId } });
    await rm(stagingDir, { recursive: true, force: true });
    for (const [name, value] of Object.entries({
      LEEMAGE_BASE_URL: previousEnv.baseUrl,
      LEEMAGE_API_KEY: previousEnv.apiKey,
      LEEMAGE_PROJECT_ID: previousEnv.projectId,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await prisma.$disconnect();
  }
});
