import { config } from "dotenv";
import artifactJson from "../data/catalogs/tj-2607-song-profiles.json";
import type { BootstrapSongCatalogArtifact } from "../src/entities/song-catalog/index.server";

config({ path: [".env.local", ".env"], quiet: true });

const { bootstrapSongCatalog } = await import("../src/entities/song-catalog/index.server");
const { prisma } = await import("../src/shared/db/index.server");

try {
  const result = await bootstrapSongCatalog(prisma, artifactJson as BootstrapSongCatalogArtifact);
  console.info(JSON.stringify({ status: "ok", ...result }, null, 2));
} finally {
  await prisma.$disconnect();
}
