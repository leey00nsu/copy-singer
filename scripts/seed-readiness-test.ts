import { importDatabaseSongCatalog } from "../src/entities/song-catalog/index.server";
import { prisma } from "../src/shared/db/index.server";
import { syntheticCatalogSnapshot } from "../tests/fixtures/synthetic-song-catalog";

const url = new URL(process.env.DATABASE_URL ?? "");
if (url.hostname !== "127.0.0.1" || url.pathname !== "/readiness")
  throw new Error("Only isolated localhost /readiness DB is supported.");
try {
  const snapshot = syntheticCatalogSnapshot(100);
  const last = snapshot.songs[99];
  last.source.sourceVideoId = "5x_CM7x5BQA";
  last.source.sourceUrl = "https://www.youtube.com/watch?v=5x_CM7x5BQA";
  last.targetAsset.sourceVideoId = "5x_CM7x5BQA";
  await importDatabaseSongCatalog(prisma, snapshot);
  const entry = await prisma.catalogEntry.findFirstOrThrow({ where: { position: 100 }, select: { songId: true } });
  await prisma.song.update({ where: { id: entry.songId }, data: { targetAssetId: null } });
} finally {
  await prisma.$disconnect();
}
