import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  validateSongProfileArtifact,
} from "../lib/song-catalog/artifact";
import { parseSongCatalogMarkdown } from "../lib/song-catalog/catalog";

const catalogPath = path.join(process.cwd(), "data/catalogs/tj-2607-top100.md");
const artifactPath = path.join(process.cwd(), "data/catalogs/tj-2607-song-profiles.json");
const entries = parseSongCatalogMarkdown(await readFile(catalogPath, "utf8"));
const artifact = validateSongProfileArtifact(
  JSON.parse(await readFile(artifactPath, "utf8")) as unknown,
  entries,
);
const counts = artifact.songs.reduce(
  (result, entry) => ({ ...result, [entry.status]: result[entry.status] + 1 }),
  { READY: 0, FAILED: 0, PENDING: 0 },
);

if (process.argv.includes("--require-ready") && counts.READY !== entries.length) {
  throw new Error(`Expected ${entries.length} READY profiles, found ${counts.READY}.`);
}
console.info(JSON.stringify({ status: "ok", count: artifact.songs.length, ...counts }));
