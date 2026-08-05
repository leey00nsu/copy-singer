import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

import {
  loadOrCreateSongProfileArtifact,
  writeSongProfileArtifact,
} from "../lib/song-catalog/artifact";
import { parseSongCatalogMarkdown } from "../lib/song-catalog/catalog";
import {
  analyzeSongProfileArtifact,
  parseSongBatchOptions,
} from "../lib/song-catalog/pipeline";

config({ path: [".env.local", ".env"], quiet: true });

const analyzerUrl = process.env.VOCAL_PROFILE_API_URL ?? "http://127.0.0.1:8001";
const catalogPath = path.join(process.cwd(), "data/catalogs/tj-2607-top100.md");
const artifactPath = path.join(process.cwd(), "data/catalogs/tj-2607-song-profiles.json");

async function main() {
  const options = parseSongBatchOptions(process.argv.slice(2));
  const entries = parseSongCatalogMarkdown(await readFile(catalogPath, "utf8"));
  const artifact = await loadOrCreateSongProfileArtifact(artifactPath, entries);
  await writeSongProfileArtifact(artifactPath, artifact);

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
    dependencies.songPipeline.catalogEntries !== entries.length
  ) {
    throw new Error("The analyzer is missing its catalog allowlist, yt-dlp, Demucs, or FFmpeg.");
  }

  const summary = await analyzeSongProfileArtifact(
    artifact,
    analyzerUrl,
    options,
    (updated) => writeSongProfileArtifact(artifactPath, updated),
  );
  console.info(JSON.stringify({ status: summary.failed === 0 ? "ok" : "partial", ...summary }));
  if (summary.failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
