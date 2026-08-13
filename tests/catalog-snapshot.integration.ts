import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("catalog snapshot import restores a fresh catalog and is idempotent", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }

  const { prisma } = await import("../src/shared/db/index.server");
  const { exportDatabaseSongCatalog, importDatabaseSongCatalog, parseCatalogSnapshot } = await import(
    "../src/entities/song-catalog/index.server"
  );
  const { verifyDatabaseSongCatalog } = await import("../src/entities/song-catalog/index.server");

  const suffix = randomUUID().slice(0, 8);
  const testSlug = `catalog-snapshot-${suffix}`;
  const exported = await exportDatabaseSongCatalog(prisma);
  assert.equal(parseCatalogSnapshot(exported).success, true);
  // serialized JSON must not contain raw bytes / base64 / temp paths
  const serialized = JSON.stringify(exported);
  assert.equal(/audioBytes|audio_bytes|base64|tempPath|tmpPath/i.test(serialized), false);
  // pipelineMetadata should be sanitized to allowlisted keys only
  for (const song of exported.songs) {
    if (song.analysis.pipelineMetadata) {
      for (const k of Object.keys(song.analysis.pipelineMetadata)) {
        assert.ok(
          ["ytDlpVersion", "separator", "separatorVersion", "separatorModel", "analyzer", "analyzerVersion"].includes(
            k,
          ),
        );
      }
    }
  }
  const songCount = exported.songs.length;
  assert.ok(songCount > 0);

  const snapshot = {
    ...exported,
    catalog: { ...exported.catalog, slug: testSlug, name: "Snapshot Test", issue: null, revision: 1 },
    songs: exported.songs.map((song, index) => {
      const sourceVideoId = `snap${suffix}${String(index).padStart(2, "0")}`;
      const sourceUrl = `https://www.youtube.com/watch?v=${sourceVideoId}`;
      return {
        ...song,
        title: `${song.title} [${suffix}]`,
        artist: `${song.artist} [${suffix}]`,
        source: { ...song.source, sourceUrl, sourceVideoId },
        targetAsset: {
          ...song.targetAsset,
          externalProjectId: `snap-project-${suffix}`,
          externalFileId: `snap-file-${suffix}-${index}`,
          sourceVideoId,
        },
      };
    }),
  };

  try {
    const first = await importDatabaseSongCatalog(prisma, snapshot);
    assert.equal(first.total, songCount);
    assert.equal(first.published, songCount);
    assert.equal(first.songsCreated, songCount);
    assert.equal(first.sourcesCreated, songCount);
    assert.equal(first.analysesCreated, songCount);
    assert.equal(first.targetsCreated, songCount);
    assert.equal(first.entriesCreated, songCount);

    const second = await importDatabaseSongCatalog(prisma, snapshot);
    assert.equal(second.published, songCount);
    assert.equal(second.songsCreated, 0);
    assert.equal(second.sourcesCreated, 0);
    assert.equal(second.analysesCreated, 0);
    assert.equal(second.targetsCreated, 0);
    assert.equal(second.entriesCreated, 0);

    const count = await prisma.song.count({
      where: { title: { contains: `[${suffix}]` } },
    });
    assert.equal(count, songCount);

    const snapshotCatalog = await prisma.catalog.findUniqueOrThrow({ where: { slug: testSlug } });
    assert.equal(snapshotCatalog.revision, 1);
    assert.equal(
      await prisma.catalogEntry.count({ where: { catalogId: snapshotCatalog.id, status: "PUBLISHED" } }),
      songCount,
    );

    const verification = await verifyDatabaseSongCatalog(prisma, testSlug);
    assert.equal(verification.total, songCount);
    assert.equal(verification.ready, songCount);
    assert.deepEqual(verification.invalid, []);

    // sourceUrl / sourceVideoId mismatch should be rejected by schema validation
    const badUrl = {
      ...snapshot,
      songs: [
        {
          ...snapshot.songs[0],
          source: { ...snapshot.songs[0].source, sourceUrl: "https://www.youtube.com/watch?v=ABCDEFGHIJK" },
        },
      ],
    };
    assert.equal(parseCatalogSnapshot(badUrl).success, false);

    // forbidden analysis metadata should be rejected
    const badMeta = {
      ...snapshot,
      songs: [
        {
          ...snapshot.songs[0],
          analysis: { ...snapshot.songs[0].analysis, descriptors: { audioBytes: "xxx", ok: 1 } },
        },
      ],
    };
    assert.equal(parseCatalogSnapshot(badMeta as unknown as typeof snapshot).success, false);

    // duplicate position / sourceVideoId / target / target-source mismatch should throw on import
    const dupPos = {
      ...snapshot,
      songs: [snapshot.songs[0], { ...snapshot.songs[1], position: snapshot.songs[0].position }],
    };
    await assert.rejects(() => importDatabaseSongCatalog(prisma, dupPos as typeof snapshot));
    const dupVideo = {
      ...snapshot,
      songs: [
        snapshot.songs[0],
        {
          ...snapshot.songs[1],
          source: {
            ...snapshot.songs[1].source,
            sourceUrl: snapshot.songs[0].source.sourceUrl,
            sourceVideoId: snapshot.songs[0].source.sourceVideoId,
          },
        },
      ],
    };
    await assert.rejects(() => importDatabaseSongCatalog(prisma, dupVideo as typeof snapshot));
    const badTarget = {
      ...snapshot,
      songs: [
        { ...snapshot.songs[0], targetAsset: { ...snapshot.songs[0].targetAsset, sourceVideoId: "ABCDEFGHIJK" } },
      ],
    };
    assert.equal(parseCatalogSnapshot(badTarget).success, false);
  } finally {
    const snapshotCatalog = await prisma.catalog.findUnique({ where: { slug: testSlug } });
    if (snapshotCatalog) {
      const songIds = (
        await prisma.song.findMany({
          where: { title: { contains: `[${suffix}]` } },
          select: { id: true },
        })
      ).map((row) => row.id);
      await prisma.catalog.delete({ where: { id: snapshotCatalog.id } });
      await prisma.catalogTargetAsset.deleteMany({
        where: { externalProjectId: `snap-project-${suffix}` },
      });
      if (songIds.length > 0) {
        await prisma.songAnalysis.deleteMany({ where: { songId: { in: songIds } } });
        await prisma.songSource.deleteMany({ where: { songId: { in: songIds } } });
        await prisma.song.deleteMany({ where: { id: { in: songIds } } });
      }
    }
    await prisma.$disconnect();
  }
});

test("catalog snapshot import does not lower existing revision", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }
  const { prisma } = await import("../src/shared/db/index.server");
  const { exportDatabaseSongCatalog, importDatabaseSongCatalog } = await import(
    "../src/entities/song-catalog/index.server"
  );
  const suffix = randomUUID().slice(0, 8);
  const testSlug = `catalog-snapshot-rev-${suffix}`;
  const exported = await exportDatabaseSongCatalog(prisma);
  const base = {
    ...exported,
    catalog: { ...exported.catalog, slug: testSlug, name: "Snapshot Rev", issue: null, revision: 5 },
    songs: exported.songs.slice(0, 1).map((song) => {
      const sourceVideoId = `rev${suffix}AAA`;
      return {
        ...song,
        title: `${song.title} [${suffix}]`,
        artist: `${song.artist} [${suffix}]`,
        source: { ...song.source, sourceUrl: `https://www.youtube.com/watch?v=${sourceVideoId}`, sourceVideoId },
        targetAsset: {
          ...song.targetAsset,
          externalProjectId: `snap-project-${suffix}`,
          externalFileId: `snap-file-rev-${suffix}`,
          sourceVideoId,
        },
      };
    }),
  };
  try {
    await importDatabaseSongCatalog(prisma, base);
    const afterFirst = await prisma.catalog.findUniqueOrThrow({ where: { slug: testSlug } });
    assert.equal(afterFirst.revision, 5);
    const lower = { ...base, catalog: { ...base.catalog, revision: 1 } };
    await importDatabaseSongCatalog(prisma, lower);
    const afterSecond = await prisma.catalog.findUniqueOrThrow({ where: { slug: testSlug } });
    assert.equal(afterSecond.revision, 5);
  } finally {
    const c = await prisma.catalog.findUnique({ where: { slug: testSlug } });
    if (c) {
      const s = await prisma.song.findMany({ where: { title: { contains: `[${suffix}]` } }, select: { id: true } });
      const ids = s.map((r) => r.id);
      await prisma.catalog.delete({ where: { id: c.id } });
      await prisma.catalogTargetAsset.deleteMany({ where: { externalProjectId: `snap-project-${suffix}` } });
      if (ids.length) {
        await prisma.songAnalysis.deleteMany({ where: { songId: { in: ids } } });
        await prisma.songSource.deleteMany({ where: { songId: { in: ids } } });
        await prisma.song.deleteMany({ where: { id: { in: ids } } });
      }
    }
    await prisma.$disconnect();
  }
});
