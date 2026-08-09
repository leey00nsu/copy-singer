import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const { ensureCatalogTargetStagingDir, importCatalogTargetAsset } = await import("../lib/song-catalog/target-assets");
const { prisma } = await import("../src/shared/db/index.server");

function parseOrders() {
  const raw = process.argv
    .slice(2)
    .filter((value) => value !== "--")
    .join(",")
    .trim();
  if (!raw) return Array.from({ length: 100 }, (_, index) => index + 1);
  const orders = raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value));
  if (orders.length === 0 || orders.some((value) => !Number.isInteger(value) || value < 1 || value > 100)) {
    throw new Error("Catalog orders must be comma-separated integers between 1 and 100.");
  }
  return [...new Set(orders)];
}

async function main() {
  const orders = parseOrders();
  const stagingDir = await ensureCatalogTargetStagingDir();
  const imported = [];
  const missing = [];

  for (const catalogOrder of orders) {
    try {
      const result = await importCatalogTargetAsset({ catalogOrder, stagingDir });
      imported.push({
        catalogOrder: result.catalogOrder,
        title: result.title,
        artist: result.artist,
        assetId: result.assetId,
        sizeBytes: result.sizeBytes,
        sha256: result.sha256,
        skipped: result.skipped,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.startsWith("Missing authorized source file:")) {
        missing.push({ catalogOrder, detail: message });
        continue;
      }
      throw error;
    }
  }

  console.info(JSON.stringify({ status: "ok", stagingDir, imported, missing }, null, 2));
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
