import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { config } from "dotenv";

import { parseSongCatalogMarkdown } from "../lib/song-catalog/catalog";

config({ path: [".env.local", ".env"], quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to verify the song catalog.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const catalogPath = path.join(process.cwd(), "data/catalogs/tj-2607-top100.md");
  const entries = parseSongCatalogMarkdown(await readFile(catalogPath, "utf8"));
  const songs = await prisma.song.findMany({
    where: { catalogOrder: { gte: 1, lte: entries.length } },
    orderBy: { catalogOrder: "asc" },
  });

  if (songs.length !== entries.length) {
    throw new Error(`Expected ${entries.length} imported songs, found ${songs.length}.`);
  }

  for (const [index, entry] of entries.entries()) {
    const song = songs[index];
    const metadata = song?.metadata as { catalog?: { sourceVideoId?: string } } | null;
    if (
      song?.catalogOrder !== entry.catalogOrder ||
      song.title !== entry.title ||
      song.artist !== entry.artist ||
      metadata?.catalog?.sourceVideoId !== entry.sourceVideoId
    ) {
      throw new Error(`Catalog mismatch at rank ${entry.catalogOrder}.`);
    }
  }

  console.info(JSON.stringify({ status: "ok", count: songs.length }));
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
