import { randomUUID } from "node:crypto";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const outputArgument = process.argv.indexOf("--output");
const requestedOutput = outputArgument >= 0 ? process.argv[outputArgument + 1] : undefined;
const outputPath = requestedOutput
  ? path.resolve(requestedOutput)
  : path.join(process.cwd(), "tmp", "catalog-exports", "song-catalog.json");
const temporaryPath = `${outputPath}.${randomUUID()}.tmp`;
const { exportDatabaseSongCatalog } = await import("../src/entities/song-catalog/index.server");
const { prisma } = await import("../src/shared/db/index.server");

try {
  const snapshot = await exportDatabaseSongCatalog(prisma);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await rename(temporaryPath, outputPath);
  console.info(JSON.stringify({ status: "ok", outputPath, count: snapshot.songs.length }, null, 2));
} finally {
  await unlink(temporaryPath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
  await prisma.$disconnect();
}
