import type { Prisma, PrismaClient } from "../../generated/prisma/client";

import { TJ_2607_CATALOG_METADATA, type SongCatalogEntry } from "./catalog";

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

function objectMetadata(value: Prisma.JsonValue | null): Record<string, Prisma.JsonValue> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, Prisma.JsonValue>;
  }
  return {};
}

function songKey(entry: Pick<SongCatalogEntry, "title" | "artist">) {
  return `${entry.title}\u0000${entry.artist}`;
}

export async function importSongCatalog(prisma: PrismaClient, entries: SongCatalogEntry[]) {
  const targetKeys = new Set(entries.map(songKey));

  return prisma.$transaction(async (tx: TransactionClient) => {
    const occupiedRanks = await tx.song.findMany({
      where: { catalogOrder: { in: entries.map((entry) => entry.catalogOrder) } },
      select: { id: true, title: true, artist: true, catalogOrder: true },
      orderBy: { catalogOrder: "asc" },
    });

    for (const [index, song] of occupiedRanks.entries()) {
      await tx.song.update({
        where: { id: song.id },
        data: { catalogOrder: -2_000_000 - index },
      });
    }

    let fallbackOrder =
      ((await tx.song.aggregate({ _max: { catalogOrder: true } }))._max.catalogOrder ?? 0) + 1_000;

    for (const song of occupiedRanks) {
      if (!targetKeys.has(songKey(song))) {
        await tx.song.update({
          where: { id: song.id },
          data: { catalogOrder: fallbackOrder++ },
        });
      }
    }

    for (const entry of entries) {
      const existing = await tx.song.findUnique({
        where: { title_artist: { title: entry.title, artist: entry.artist } },
        select: { metadata: true },
      });
      const previousMetadata = objectMetadata(existing?.metadata ?? null);
      const metadata = {
        ...previousMetadata,
        catalog: {
          ...TJ_2607_CATALOG_METADATA,
          sourceLabel: entry.sourceLabel,
          sourceUrl: entry.sourceUrl,
          sourceVideoId: entry.sourceVideoId,
        },
      } satisfies Prisma.InputJsonValue;

      await tx.song.upsert({
        where: { title_artist: { title: entry.title, artist: entry.artist } },
        create: {
          title: entry.title,
          artist: entry.artist,
          catalogOrder: entry.catalogOrder,
          metadata,
        },
        update: {
          catalogOrder: entry.catalogOrder,
          metadata,
        },
      });
    }

    return tx.song.count({
      where: { catalogOrder: { gte: 1, lte: entries.length } },
    });
  });
}
