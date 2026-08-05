import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  TJ_2607_CATALOG_METADATA,
  type SongCatalogEntry,
} from "./catalog";

export const SONG_PROFILE_ARTIFACT_SCHEMA_VERSION = 1;
export const SONG_PROFILE_PIPELINE_CONTRACT = "yt-dlp-demucs-librosa-pyin-v1";

export type SongProfileMetrics = {
  durationMs: number;
  sampleRate: number;
  sourceSizeBytes: number;
  minMidi: number;
  maxMidi: number;
  p10Midi: number;
  medianMidi: number;
  p90Midi: number;
  tessituraLowMidi: number;
  tessituraHighMidi: number;
  voicedRatio: number;
  pitchStability: number;
  clippingRatio: number;
  rmsDb: number;
  analyzer: string;
  analyzerVersion: string;
  descriptors: Record<string, unknown>;
  ytDlpVersion: string;
  separator: string;
  separatorVersion: string;
  separatorModel: string;
  cleanupConfirmed: true;
};

export type SongProfileArtifactEntry = SongCatalogEntry & {
  status: "PENDING" | "READY" | "FAILED";
  profile: SongProfileMetrics | null;
  error: { reasonCode: string; detail: string; updatedAt: string } | null;
};

export type SongProfileArtifact = {
  schemaVersion: number;
  catalog: typeof TJ_2607_CATALOG_METADATA;
  pipelineContract: string;
  generatedAt: string | null;
  songs: SongProfileArtifactEntry[];
};

export function createSongProfileArtifact(entries: SongCatalogEntry[]): SongProfileArtifact {
  return {
    schemaVersion: SONG_PROFILE_ARTIFACT_SCHEMA_VERSION,
    catalog: TJ_2607_CATALOG_METADATA,
    pipelineContract: SONG_PROFILE_PIPELINE_CONTRACT,
    generatedAt: null,
    songs: entries.map((entry) => ({
      ...entry,
      status: "PENDING",
      profile: null,
      error: null,
    })),
  };
}

export function validateSongProfileArtifact(
  value: unknown,
  entries: SongCatalogEntry[],
): SongProfileArtifact {
  if (!value || typeof value !== "object") throw new Error("Song profile artifact must be an object.");
  const artifact = value as SongProfileArtifact;
  if (artifact.schemaVersion !== SONG_PROFILE_ARTIFACT_SCHEMA_VERSION) {
    throw new Error(`Unsupported song profile artifact schema: ${artifact.schemaVersion}.`);
  }
  if (artifact.pipelineContract !== SONG_PROFILE_PIPELINE_CONTRACT) {
    throw new Error("Song profile artifact pipeline contract does not match this build.");
  }
  if (!Array.isArray(artifact.songs) || artifact.songs.length !== entries.length) {
    throw new Error(`Song profile artifact must contain ${entries.length} songs.`);
  }

  for (const [index, catalogEntry] of entries.entries()) {
    const entry = artifact.songs[index];
    if (
      !entry ||
      entry.catalogOrder !== catalogEntry.catalogOrder ||
      entry.title !== catalogEntry.title ||
      entry.artist !== catalogEntry.artist ||
      entry.sourceUrl !== catalogEntry.sourceUrl ||
      entry.sourceVideoId !== catalogEntry.sourceVideoId
    ) {
      throw new Error(`Song profile artifact catalog mismatch at rank ${catalogEntry.catalogOrder}.`);
    }
    if (!(["PENDING", "READY", "FAILED"] as const).includes(entry.status)) {
      throw new Error(`Invalid artifact status at rank ${catalogEntry.catalogOrder}.`);
    }
    if (entry.status === "READY" && (!entry.profile || entry.profile.cleanupConfirmed !== true)) {
      throw new Error(`Ready artifact entry is missing a cleanup-confirmed profile at rank ${catalogEntry.catalogOrder}.`);
    }
    if (entry.status !== "READY" && entry.profile !== null) {
      throw new Error(`Non-ready artifact entry contains a profile at rank ${catalogEntry.catalogOrder}.`);
    }
  }
  return artifact;
}

export async function loadOrCreateSongProfileArtifact(
  artifactPath: string,
  entries: SongCatalogEntry[],
) {
  try {
    return validateSongProfileArtifact(JSON.parse(await readFile(artifactPath, "utf8")), entries);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return createSongProfileArtifact(entries);
  }
}

export async function writeSongProfileArtifact(
  artifactPath: string,
  artifact: SongProfileArtifact,
) {
  const directory = path.dirname(artifactPath);
  await mkdir(directory, { recursive: true });
  const temporaryPath = path.join(directory, `.${path.basename(artifactPath)}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporaryPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    await rename(temporaryPath, artifactPath);
  } finally {
    await unlink(temporaryPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}
