import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { config } from "dotenv";

import { analyzeSongCatalog, parseSongBatchOptions } from "../lib/song-catalog/pipeline";

config({ path: [".env.local", ".env"], quiet: true });

const connectionString = process.env.DATABASE_URL;
const analyzerUrl = process.env.VOCAL_PROFILE_API_URL ?? "http://127.0.0.1:8001";
if (!connectionString) throw new Error("DATABASE_URL is required to analyze the song catalog.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const options = parseSongBatchOptions(process.argv.slice(2));
  const health = await fetch(`${analyzerUrl.replace(/\/$/, "")}/health`);
  if (!health.ok) throw new Error("The local analyzer health check failed.");
  const dependencies = (await health.json()) as {
    songPipeline?: { ytDlp?: string; demucs?: string; ffmpeg?: boolean; catalogEntries?: number };
  };
  if (
    !dependencies.songPipeline ||
    dependencies.songPipeline.ytDlp === "unavailable" ||
    dependencies.songPipeline.demucs === "unavailable" ||
    dependencies.songPipeline.ffmpeg !== true ||
    dependencies.songPipeline.catalogEntries !== 100
  ) {
    throw new Error("The analyzer is missing its 100-song allowlist, yt-dlp, Demucs, or FFmpeg.");
  }

  const summary = await analyzeSongCatalog(prisma, analyzerUrl, options);
  console.info(JSON.stringify({ status: summary.failed === 0 ? "ok" : "partial", ...summary }));
  if (summary.failed > 0) process.exitCode = 1;
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
