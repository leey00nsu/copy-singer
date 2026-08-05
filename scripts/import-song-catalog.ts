import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { config } from "dotenv";

import { parseSongCatalogMarkdown } from "../lib/song-catalog/catalog";
import { importSongCatalog } from "../lib/song-catalog/import";

config({ path: [".env.local", ".env"], quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to import the song catalog.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const catalogPath = path.join(process.cwd(), "data/catalogs/tj-2607-top100.md");
  const entries = parseSongCatalogMarkdown(await readFile(catalogPath, "utf8"));
  const importedCount = await importSongCatalog(prisma, entries);
  console.info(JSON.stringify({ status: "ok", importedCount, source: catalogPath }));
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
