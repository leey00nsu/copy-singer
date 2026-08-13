import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const { verifyDatabaseSongCatalog } = await import("../src/entities/song-catalog/index.server");
const { prisma } = await import("../src/shared/db/index.server");

try {
  const result = await verifyDatabaseSongCatalog(prisma);
  if (result.total === 0 || result.invalid.length > 0) process.exitCode = 1;
  console.info(JSON.stringify({ status: process.exitCode ? "invalid" : "ready", ...result }, null, 2));
} finally {
  await prisma.$disconnect();
}
