import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  loadOrCreateSongProfileArtifact,
  parseSongCatalogMarkdown,
  writeSongProfileArtifact,
} from "../src/entities/recommendation/index.server";

const catalogPath = path.join(process.cwd(), "data/catalogs/tj-2607-top100.md");
const artifactPath = path.join(process.cwd(), "data/catalogs/tj-2607-song-profiles.json");

const entries = parseSongCatalogMarkdown(await readFile(catalogPath, "utf8"));
const artifact = await loadOrCreateSongProfileArtifact(artifactPath, entries);
await writeSongProfileArtifact(artifactPath, artifact);
console.info(JSON.stringify({ status: "ok", count: artifact.songs.length, artifactPath }));
