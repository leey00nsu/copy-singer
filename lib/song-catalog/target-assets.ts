import "server-only";

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import artifactJson from "../../data/catalogs/tj-2607-song-profiles.json";
import { prisma } from "@/lib/db/prisma";
import { createLeemageClient } from "@/lib/leemage/client";

const execFileAsync = promisify(execFile);
const SUPPORTED_SOURCE_EXTENSIONS = ["wav", "mp3", "m4a", "aac", "webm", "flac"] as const;

export const CATALOG_TARGET_STAGING_DIR = path.join(process.cwd(), "tmp", "catalog-targets");

export type CatalogTargetImportResult = {
  catalogOrder: number;
  title: string;
  artist: string;
  sourceVideoId: string;
  sourcePath: string;
  wavPath: string;
  assetId: string;
  sizeBytes: number;
  sha256: string;
  skipped: boolean;
};

type CatalogArtifactSong = {
  catalogOrder: number;
  title: string;
  artist: string;
  sourceVideoId: string;
};

function artifactSong(catalogOrder: number): CatalogArtifactSong {
  const song = artifactJson.songs[catalogOrder - 1] as CatalogArtifactSong | undefined;
  if (!song || song.catalogOrder !== catalogOrder) {
    throw new Error(`Catalog order ${catalogOrder} does not exist in the song artifact.`);
  }
  return song;
}

export function catalogTargetStem(catalogOrder: number, sourceVideoId: string) {
  if (!Number.isInteger(catalogOrder) || catalogOrder < 1 || catalogOrder > 100) {
    throw new Error("Catalog order must be an integer between 1 and 100.");
  }
  if (!/^[A-Za-z0-9_-]{11}$/.test(sourceVideoId)) {
    throw new Error("sourceVideoId must be an 11-character YouTube video ID.");
  }
  return `${String(catalogOrder).padStart(3, "0")}-${sourceVideoId}`;
}

export function expectedCatalogTargetPath(catalogOrder: number, sourceVideoId: string, stagingDir = CATALOG_TARGET_STAGING_DIR) {
  return path.join(stagingDir, `${catalogTargetStem(catalogOrder, sourceVideoId)}.wav`);
}

export async function ensureCatalogTargetStagingDir(stagingDir = CATALOG_TARGET_STAGING_DIR) {
  await mkdir(stagingDir, { recursive: true });
  return stagingDir;
}

async function findStagedSource(catalogOrder: number, sourceVideoId: string, stagingDir: string) {
  await ensureCatalogTargetStagingDir(stagingDir);
  const stem = catalogTargetStem(catalogOrder, sourceVideoId);
  const entries = await readdir(stagingDir, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => {
      const parsed = path.parse(name);
      return parsed.name === stem && SUPPORTED_SOURCE_EXTENSIONS.includes(parsed.ext.slice(1).toLowerCase() as typeof SUPPORTED_SOURCE_EXTENSIONS[number]);
    })
    .sort((left, right) => {
      if (left.endsWith(".wav")) return -1;
      if (right.endsWith(".wav")) return 1;
      return left.localeCompare(right);
    });

  if (candidates.length === 0) return null;
  if (candidates.length > 1 && !candidates[0]?.endsWith(".wav")) {
    throw new Error(`Multiple staged source files exist for catalog order ${catalogOrder}. Keep only one source file.`);
  }
  return path.join(stagingDir, candidates[0]!);
}

async function ensureWav(sourcePath: string, catalogOrder: number, sourceVideoId: string, stagingDir: string) {
  const wavPath = expectedCatalogTargetPath(catalogOrder, sourceVideoId, stagingDir);
  if (path.extname(sourcePath).toLowerCase() === ".wav") return sourcePath;
  await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel", "error",
    "-y",
    "-i", sourcePath,
    "-vn",
    "-c:a", "pcm_s16le",
    wavPath,
  ], { timeout: 10 * 60_000, maxBuffer: 1024 * 1024 });
  return wavPath;
}

function assertWav(bytes: Uint8Array) {
  if (bytes.byteLength < 44 || Buffer.from(bytes.subarray(0, 4)).toString("ascii") !== "RIFF") {
    throw new Error("Catalog target must be a valid RIFF WAV after normalization.");
  }
}

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function cleanupSupersededAsset(asset: {
  id: string;
  externalProjectId: string;
  externalFileId: string;
}, fetchImpl?: typeof fetch) {
  const references = await prisma.mixingJob.count({ where: { targetAssetId: asset.id } });
  if (references > 0) return;
  try {
    await createLeemageClient(fetchImpl).deleteFile(asset.externalProjectId, asset.externalFileId);
    await prisma.catalogTargetAsset.delete({ where: { id: asset.id } });
  } catch (error) {
    await prisma.catalogTargetAsset.update({
      where: { id: asset.id },
      data: {
        status: "DELETE_PENDING",
        lastError: error instanceof Error ? error.message.slice(0, 2_000) : "Catalog target cleanup failed.",
      },
    }).catch(() => undefined);
  }
}

export async function importCatalogTargetAsset(input: {
  catalogOrder: number;
  stagingDir?: string;
  fetchImpl?: typeof fetch;
}): Promise<CatalogTargetImportResult> {
  const catalog = artifactSong(input.catalogOrder);
  const song = await prisma.song.findUnique({
    where: { catalogOrder: input.catalogOrder },
    include: { targetAsset: true },
  });
  if (!song || song.title !== catalog.title || song.artist !== catalog.artist) {
    throw new Error(`Database song does not match catalog order ${input.catalogOrder}. Run catalog import/verify first.`);
  }

  const stagingDir = input.stagingDir ?? CATALOG_TARGET_STAGING_DIR;
  const sourcePath = await findStagedSource(input.catalogOrder, catalog.sourceVideoId, stagingDir);
  if (!sourcePath) {
    throw new Error(`Missing authorized source file: ${catalogTargetStem(input.catalogOrder, catalog.sourceVideoId)}.{wav,mp3,m4a,aac,webm,flac}`);
  }
  const wavPath = await ensureWav(sourcePath, input.catalogOrder, catalog.sourceVideoId, stagingDir);
  const bytes = new Uint8Array(await readFile(wavPath));
  assertWav(bytes);
  const digest = sha256(bytes);

  if (
    song.targetAsset?.status === "READY" &&
    song.targetAsset.sha256 === digest &&
    song.targetAsset.sourceVideoId === catalog.sourceVideoId
  ) {
    return {
      catalogOrder: input.catalogOrder,
      title: catalog.title,
      artist: catalog.artist,
      sourceVideoId: catalog.sourceVideoId,
      sourcePath,
      wavPath,
      assetId: song.targetAsset.id,
      sizeBytes: Number(song.targetAsset.sizeBytes),
      sha256: digest,
      skipped: true,
    };
  }

  const stored = await createLeemageClient(input.fetchImpl).uploadFile({
    fileName: `catalog-target-${catalogTargetStem(input.catalogOrder, catalog.sourceVideoId)}.wav`,
    mimeType: "audio/wav",
    bytes,
  });

  let assetId: string | null = null;
  try {
    const created = await prisma.$transaction(async (tx) => {
      const asset = await tx.catalogTargetAsset.create({
        data: {
          externalProjectId: stored.projectId,
          externalFileId: stored.fileId,
          externalUrl: stored.url,
          fileName: stored.fileName,
          mimeType: "audio/wav",
          sizeBytes: BigInt(stored.sizeBytes),
          sha256: digest,
          sourceVideoId: catalog.sourceVideoId,
          status: "READY",
        },
      });
      await tx.song.update({ where: { id: song.id }, data: { targetAssetId: asset.id } });
      return asset;
    });
    assetId = created.id;
  } catch (error) {
    await createLeemageClient(input.fetchImpl).deleteFile(stored.projectId, stored.fileId).catch(() => undefined);
    throw error;
  }

  if (song.targetAsset && song.targetAsset.id !== assetId) {
    await cleanupSupersededAsset(song.targetAsset, input.fetchImpl);
  }

  return {
    catalogOrder: input.catalogOrder,
    title: catalog.title,
    artist: catalog.artist,
    sourceVideoId: catalog.sourceVideoId,
    sourcePath,
    wavPath,
    assetId,
    sizeBytes: stored.sizeBytes,
    sha256: digest,
    skipped: false,
  };
}

export async function catalogTargetStatus() {
  const songs = await prisma.song.findMany({
    where: { catalogOrder: { gte: 1, lte: 100 } },
    orderBy: { catalogOrder: "asc" },
    select: {
      catalogOrder: true,
      title: true,
      artist: true,
      targetAsset: {
        select: { id: true, status: true, sizeBytes: true, sha256: true, sourceVideoId: true },
      },
    },
  });
  return {
    total: songs.length,
    ready: songs.filter((song) => song.targetAsset?.status === "READY").length,
    missing: songs.filter((song) => !song.targetAsset || song.targetAsset.status !== "READY").map((song) => {
      const catalog = artifactSong(song.catalogOrder);
      return {
        catalogOrder: song.catalogOrder,
        title: song.title,
        artist: song.artist,
        sourceVideoId: catalog.sourceVideoId,
        expectedFile: `${catalogTargetStem(song.catalogOrder, catalog.sourceVideoId)}.wav`,
      };
    }),
    songs,
  };
}
