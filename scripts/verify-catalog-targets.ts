import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const { catalogTargetStatus, ensureCatalogTargetStagingDir } = await import("../lib/song-catalog/target-assets");
const { prisma } = await import("../lib/db/prisma");

async function main() {
  const stagingDir = await ensureCatalogTargetStagingDir();
  const status = await catalogTargetStatus();
  console.info(JSON.stringify({
    status: status.ready === status.total ? "ready" : "incomplete",
    stagingDir,
    total: status.total,
    ready: status.ready,
    missingCount: status.missing.length,
    missing: status.missing,
  }, null, 2));
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
