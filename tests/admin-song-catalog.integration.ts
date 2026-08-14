import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("admin catalog mutations are idempotent and publish only matching READY revisions", async (context) => {
  if (!process.env.DATABASE_URL) return context.skip("DATABASE_URL is not configured");
  const previousEnv = {
    base: process.env.LEEMAGE_BASE_URL,
    key: process.env.LEEMAGE_API_KEY,
    project: process.env.LEEMAGE_PROJECT_ID,
  };
  process.env.LEEMAGE_BASE_URL = "https://leemage.example/api/v1";
  process.env.LEEMAGE_API_KEY = "test";
  process.env.LEEMAGE_PROJECT_ID = "project";
  const { prisma } = await import("../src/shared/db/index.server");
  const suffix = crypto.randomUUID().replaceAll("-", "");
  const sourceVideoId = suffix.slice(0, 11);
  const position = 1_000_000_000 + Number.parseInt(suffix.slice(0, 6), 16);
  const api = await import("../src/features/manage-song-catalog/index.server");
  const input = {
    title: `Admin song ${suffix}`,
    artist: "Admin artist",
    catalogPosition: position,
    sourceUrl: `https://youtu.be/${sourceVideoId}`,
    sourceVideoId,
    sourceLabel: "Admin fixture",
    idempotencyKey: `admin:${suffix}`,
  };
  const song = await api.createAdminSong(input, null);
  const repeated = await api.createAdminSong(input, null);
  assert.equal(repeated.id, song.id);
  const source = song.sources.at(0);
  assert.ok(source);
  let assetId: string | null = null;
  let uploadCount = 0;
  const fetchImpl: typeof fetch = async (request, init) => {
    const url = String(request);
    if (url.endsWith("/files/presign")) {
      uploadCount += 1;
      return Response.json({
        presignedUrl: "https://objects.example/upload",
        objectName: "target.m4a",
        fileId: `target-${suffix}`,
      });
    }
    if (url === "https://objects.example/upload" && init?.method === "PUT") return new Response(null, { status: 200 });
    if (url.endsWith("/files/confirm"))
      return Response.json(
        { file: { id: `target-${suffix}`, url: "https://objects.example/target.m4a" } },
        { status: 201 },
      );
    if (init?.method === "DELETE") return Response.json({ ok: true });
    throw new Error(`Unexpected media request: ${url}`);
  };
  try {
    await assert.rejects(
      () => api.publishAdminSongSource(song.id, source.id),
      (error: unknown) => error instanceof api.SongCatalogAdminError && error.code === "ANALYSIS_NOT_READY",
    );
    const analysis = await prisma.songAnalysis.create({
      data: {
        songId: song.id,
        sourceId: source.id,
        pipelineContract: "yt-dlp-demucs-librosa-pyin-v1",
        status: "READY",
        estimatedKey: "F#",
        keyConfidence: 0.38,
        cleanupConfirmed: true,
      },
    });
    await assert.rejects(
      () => api.publishAdminSongSource(song.id, source.id),
      (error: unknown) => error instanceof api.SongCatalogAdminError && error.code === "TARGET_NOT_READY",
    );
    await assert.rejects(
      () =>
        api.uploadAdminCatalogTarget({
          sourceId: source.id,
          file: new File([Buffer.from("fixture-flac")], "target.flac", { type: "audio/flac" }),
          fetchImpl,
        }),
      (error: unknown) =>
        error instanceof api.SongCatalogAdminError && error.code === "UNSUPPORTED_AUDIO" && error.status === 415,
    );
    await assert.rejects(
      () =>
        api.uploadAdminCatalogTarget({
          sourceId: source.id,
          file: new File([Buffer.from("fixture-ogg")], "target.ogg", { type: "audio/ogg" }),
          fetchImpl,
        }),
      (error: unknown) =>
        error instanceof api.SongCatalogAdminError && error.code === "UNSUPPORTED_AUDIO" && error.status === 415,
    );
    assert.equal(uploadCount, 0);

    const file = new File([Buffer.from("fixture-audio")], "target.m4a", { type: "audio/x-m4a" });
    const asset = await api.uploadAdminCatalogTarget({ sourceId: source.id, file, fetchImpl });
    assetId = asset.id;
    const repeatedAsset = await api.uploadAdminCatalogTarget({ sourceId: source.id, file, fetchImpl });
    assert.equal(repeatedAsset.id, asset.id);
    assert.equal(uploadCount, 1);
    const catalogId = song.catalogEntries[0]?.catalogId;
    assert.ok(catalogId);
    const revisionBeforePublish = (await prisma.catalog.findUniqueOrThrow({ where: { id: catalogId } })).revision;
    await api.publishAdminSongSource(song.id, source.id, fetchImpl);
    const active = await prisma.song.findUniqueOrThrow({ where: { id: song.id }, include: { catalogEntries: true } });
    assert.equal(active.lifecycleStatus, "ACTIVE");
    assert.equal(active.activeSourceId, source.id);
    assert.equal(active.currentAnalysisId, analysis.id);
    assert.equal(active.targetAssetId, asset.id);
    assert.equal(active.originalKey, "F#");
    assert.equal(active.catalogEntries[0]?.status, "PUBLISHED");
    assert.equal(
      (await prisma.catalog.findUniqueOrThrow({ where: { id: catalogId } })).revision,
      revisionBeforePublish + 1,
    );
    await api.publishAdminSongSource(song.id, source.id, fetchImpl);
    assert.equal(
      (await prisma.catalog.findUniqueOrThrow({ where: { id: catalogId } })).revision,
      revisionBeforePublish + 1,
    );
    await api.archiveAdminSong(song.id);
    assert.equal((await prisma.song.findUniqueOrThrow({ where: { id: song.id } })).lifecycleStatus, "ARCHIVED");
    assert.equal(
      (await prisma.catalog.findUniqueOrThrow({ where: { id: catalogId } })).revision,
      revisionBeforePublish + 2,
    );
  } finally {
    await prisma.song.update({
      where: { id: song.id },
      data: { activeSourceId: null, currentAnalysisId: null, targetAssetId: null },
    });
    await prisma.songAnalysisJob.deleteMany({ where: { source: { songId: song.id } } });
    await prisma.songAnalysis.deleteMany({ where: { songId: song.id } });
    if (assetId) await prisma.catalogTargetAsset.deleteMany({ where: { id: assetId } });
    await prisma.catalogEntry.deleteMany({ where: { songId: song.id } });
    await prisma.songSource.deleteMany({ where: { songId: song.id } });
    await prisma.song.delete({ where: { id: song.id } });
    for (const [name, value] of Object.entries({
      LEEMAGE_BASE_URL: previousEnv.base,
      LEEMAGE_API_KEY: previousEnv.key,
      LEEMAGE_PROJECT_ID: previousEnv.project,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await prisma.$disconnect();
  }
});

test("admin catalog route rejects an unauthenticated request", async () => {
  const { adminCatalogPost } = await import("../src/_app/api-routes/admin/index.server");
  const response = await adminCatalogPost(
    new Request("http://localhost/api/admin/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }),
  );
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "UNAUTHENTICATED");
});
