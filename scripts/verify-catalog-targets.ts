import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const { catalogTargetStatus, ensureCatalogTargetStagingDir } = await import(
  "../src/entities/recommendation/index.target-assets.server"
);
const { prisma } = await import("../src/shared/db/index.server");

async function main() {
  const stagingDir = await ensureCatalogTargetStagingDir();
  const status = await catalogTargetStatus();
  const assets = await prisma.catalogTargetAsset.findMany({
    select: {
      id: true,
      mimeType: true,
      sizeBytes: true,
      status: true,
      song: { select: { id: true } },
      _count: { select: { mixingJobs: true } },
    },
  });
  const mimeTypes = assets.reduce<Record<string, number>>((summary, asset) => {
    summary[asset.mimeType] = (summary[asset.mimeType] ?? 0) + 1;
    return summary;
  }, {});
  const totalSizeBytes = assets.reduce((total, asset) => total + Number(asset.sizeBytes), 0);
  const orphanedUnreferenced = assets.filter((asset) => !asset.song && asset._count.mixingJobs === 0);
  const historicalReferenced = assets.filter((asset) => !asset.song && asset._count.mixingJobs > 0);
  console.info(
    JSON.stringify(
      {
        status: status.ready === status.total ? "ready" : "incomplete",
        stagingDir,
        total: status.total,
        ready: status.ready,
        missingCount: status.missing.length,
        missing: status.missing,
        linkedMimeTypes: status.songs.reduce<Record<string, number>>((summary, song) => {
          const mimeType = song.targetAsset?.mimeType ?? "missing";
          summary[mimeType] = (summary[mimeType] ?? 0) + 1;
          return summary;
        }, {}),
        storedAssetCount: assets.length,
        storedMimeTypes: mimeTypes,
        storedSizeBytes: totalSizeBytes,
        orphanedUnreferencedCount: orphanedUnreferenced.length,
        historicalReferencedCount: historicalReferenced.length,
      },
      null,
      2,
    ),
  );
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
