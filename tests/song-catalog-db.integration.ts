import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("catalog revisions persist a publish-ready song with matching active pointers", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }

  const { catalogReadiness } = await import("../src/entities/song-catalog/index.model");
  const { prisma } = await import("../src/shared/db/index.server");
  const suffix = crypto.randomUUID();
  const videoId = suffix.replaceAll("-", "").slice(0, 11);
  const catalogSlug = `catalog-${suffix}`;
  let songId: string | null = null;
  let sourceId: string | null = null;
  let analysisId: string | null = null;
  let targetAssetId: string | null = null;
  let catalogId: string | null = null;

  try {
    const song = await prisma.song.create({
      data: {
        title: `Revision Song ${suffix}`,
        artist: "Catalog Test",
      },
    });
    songId = song.id;

    const source = await prisma.songSource.create({
      data: {
        songId: song.id,
        revision: 1,
        sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
        sourceVideoId: videoId,
        sourceLabel: "테스트 출처",
        status: "READY",
      },
    });
    sourceId = source.id;

    const analysis = await prisma.songAnalysis.create({
      data: {
        songId: song.id,
        sourceId: source.id,
        status: "READY",
        pipelineContract: "test-pipeline-v1",
        minMidi: 48,
        maxMidi: 72,
        p10Midi: 52,
        medianMidi: 60,
        p90Midi: 68,
        tessituraLowMidi: 53,
        tessituraHighMidi: 67,
        voicedRatio: 0.8,
        pitchStability: 0.9,
        clippingRatio: 0,
        rmsDb: -18,
        analyzer: "test-analyzer",
        analyzerVersion: "1.0.0",
        cleanupConfirmed: true,
        completedAt: new Date(),
      },
    });
    analysisId = analysis.id;

    const targetAsset = await prisma.catalogTargetAsset.create({
      data: {
        sourceId: source.id,
        externalProjectId: `project-${suffix}`,
        externalFileId: `file-${suffix}`,
        externalUrl: `https://objects.example/${suffix}.m4a`,
        fileName: `${videoId}.m4a`,
        mimeType: "audio/mp4",
        sizeBytes: BigInt(1_024),
        sha256: suffix.replaceAll("-", "").padEnd(64, "0").slice(0, 64),
        sourceVideoId: videoId,
      },
    });
    targetAssetId = targetAsset.id;

    const catalog = await prisma.catalog.create({
      data: { slug: catalogSlug, name: "Catalog test", status: "PUBLISHED" },
    });
    catalogId = catalog.id;
    await prisma.catalogEntry.create({
      data: {
        catalogId: catalog.id,
        songId: song.id,
        position: 1,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    await prisma.song.update({
      where: { id: song.id },
      data: {
        lifecycleStatus: "ACTIVE",
        activeSourceId: source.id,
        currentAnalysisId: analysis.id,
        targetAssetId: targetAsset.id,
      },
    });

    const stored = await prisma.song.findUniqueOrThrow({
      where: { id: song.id },
      include: {
        activeSource: true,
        currentAnalysis: true,
        targetAsset: true,
        catalogEntries: { where: { catalogId: catalog.id }, take: 1 },
      },
    });
    assert.deepEqual(
      catalogReadiness({
        lifecycleStatus: stored.lifecycleStatus,
        activeSourceId: stored.activeSourceId,
        currentAnalysisId: stored.currentAnalysisId,
        targetAssetId: stored.targetAssetId,
        activeSource: stored.activeSource,
        currentAnalysis: stored.currentAnalysis,
        targetAsset: stored.targetAsset,
        catalogEntry: stored.catalogEntries[0] ?? null,
      }),
      { ready: true, reasons: [] },
    );

    await assert.rejects(
      () =>
        prisma.songSource.create({
          data: {
            songId: song.id,
            revision: 2,
            sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
            sourceVideoId: videoId,
            sourceLabel: "중복 출처",
          },
        }),
      (error: unknown) => Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002"),
    );
  } finally {
    if (songId) {
      await prisma.song.updateMany({
        where: { id: songId },
        data: { activeSourceId: null, currentAnalysisId: null, targetAssetId: null },
      });
    }
    if (catalogId) await prisma.catalog.deleteMany({ where: { id: catalogId } });
    if (targetAssetId) await prisma.catalogTargetAsset.deleteMany({ where: { id: targetAssetId } });
    if (analysisId) await prisma.songAnalysis.deleteMany({ where: { id: analysisId } });
    if (sourceId) await prisma.songSource.deleteMany({ where: { id: sourceId } });
    if (songId) await prisma.song.deleteMany({ where: { id: songId } });
    await prisma.$disconnect();
  }
});
