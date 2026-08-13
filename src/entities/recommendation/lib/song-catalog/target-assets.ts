import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { TJ_2607_CATALOG_SLUG } from "@/shared/config/index.server";
import { prisma } from "@/shared/db/index.server";
import { createLeemageClient } from "@/shared/media/index.server";

const SUPPORTED_SOURCE_EXTENSIONS = ["wav", "mp3", "m4a", "aac", "webm", "flac"] as const;
const CATALOG_TARGET_MAX_UPLOAD_BYTES = 49_000_000;

export const CATALOG_TARGET_STAGING_DIR = path.join(process.cwd(), "tmp", "catalog-targets");

export type CatalogTargetImportResult = {
  catalogOrder: number;
  title: string;
  artist: string;
  sourceVideoId: string;
  sourcePath: string;
  uploadPath: string;
  mimeType: string;
  assetId: string;
  sizeBytes: number;
  sha256: string;
  skipped: boolean;
};

type CatalogArtifactSong = {
  id: string;
  catalogOrder: number;
  title: string;
  artist: string;
  sourceId: string;
  sourceVideoId: string;
};

async function catalogSong(catalogOrder: number): Promise<CatalogArtifactSong> {
  const entry = await prisma.catalogEntry.findFirst({
    where: { catalog: { slug: TJ_2607_CATALOG_SLUG }, position: catalogOrder },
    include: { song: { include: { activeSource: true } } },
  });
  const source = entry?.song.activeSource;
  if (!entry || !source || entry.song.activeSourceId !== source.id || source.status !== "READY") {
    throw new Error(`Catalog position ${catalogOrder} does not have a READY active source.`);
  }
  return {
    id: entry.song.id,
    catalogOrder: entry.position,
    title: entry.song.title,
    artist: entry.song.artist,
    sourceId: source.id,
    sourceVideoId: source.sourceVideoId,
  };
}

export function catalogTargetStem(catalogOrder: number, sourceVideoId: string) {
  if (!Number.isInteger(catalogOrder) || catalogOrder < 1) {
    throw new Error("Catalog position must be a positive integer.");
  }
  if (!/^[A-Za-z0-9_-]{11}$/.test(sourceVideoId)) {
    throw new Error("sourceVideoId must be an 11-character YouTube video ID.");
  }
  return `${String(catalogOrder).padStart(3, "0")}-${sourceVideoId}`;
}

export function expectedCatalogTargetPath(
  catalogOrder: number,
  sourceVideoId: string,
  stagingDir = CATALOG_TARGET_STAGING_DIR,
) {
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
  const supported = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) =>
      SUPPORTED_SOURCE_EXTENSIONS.includes(
        path.extname(name).slice(1).toLowerCase() as (typeof SUPPORTED_SOURCE_EXTENSIONS)[number],
      ),
    );

  const ytDlpSuffix = `[${sourceVideoId}]`;
  const byVideoId = supported.filter((name) => path.parse(name).name.endsWith(ytDlpSuffix));
  if (byVideoId.length > 1) {
    throw new Error(
      `Multiple staged source files contain video ID ${sourceVideoId} for catalog order ${catalogOrder}. Keep only one source file.`,
    );
  }
  const videoMatch = byVideoId[0];
  if (videoMatch) return path.join(stagingDir, videoMatch);

  const exact = supported.filter((name) => path.parse(name).name === stem);
  if (exact.length === 0) return null;
  if (exact.length > 1) {
    throw new Error(`Multiple staged source files exist for catalog order ${catalogOrder}. Keep only one source file.`);
  }
  const exactMatch = exact[0];
  return exactMatch ? path.join(stagingDir, exactMatch) : null;
}

function sourceMimeType(sourcePath: string) {
  switch (path.extname(sourcePath).slice(1).toLowerCase()) {
    case "wav":
      return "audio/wav";
    case "mp3":
      return "audio/mpeg";
    case "m4a":
      return "audio/mp4";
    case "aac":
      return "audio/aac";
    case "webm":
      return "audio/webm";
    case "flac":
      return "audio/flac";
    default:
      throw new Error(`Unsupported catalog target extension: ${path.extname(sourcePath)}`);
  }
}

async function validateUploadSource(sourcePath: string) {
  const sourceStat = await stat(sourcePath);
  if (sourceStat.size <= 0) throw new Error("Catalog target source file is empty.");
  if (sourceStat.size > CATALOG_TARGET_MAX_UPLOAD_BYTES) {
    throw new Error(`Catalog target source exceeds the storage upload limit (${sourceStat.size} bytes).`);
  }
  const mimeType = sourceMimeType(sourcePath);
  const bytes = new Uint8Array(await readFile(sourcePath));
  if (
    mimeType === "audio/wav" &&
    (bytes.byteLength < 44 || Buffer.from(bytes.subarray(0, 4)).toString("ascii") !== "RIFF")
  ) {
    throw new Error("Catalog target WAV must have a valid RIFF header.");
  }
  return { bytes, mimeType };
}

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function cleanupDerivedWav(catalogOrder: number, sourceVideoId: string, stagingDir: string, sourcePath: string) {
  const derivedWavPath = expectedCatalogTargetPath(catalogOrder, sourceVideoId, stagingDir);
  if (path.resolve(derivedWavPath) === path.resolve(sourcePath)) return;
  await unlink(derivedWavPath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}

async function cleanupSupersededAsset(
  asset: {
    id: string;
    externalProjectId: string;
    externalFileId: string;
  },
  fetchImpl?: typeof fetch,
) {
  const references = await prisma.mixingJob.count({ where: { targetAssetId: asset.id } });
  if (references > 0) return;
  try {
    await createLeemageClient(fetchImpl).deleteFile(asset.externalProjectId, asset.externalFileId);
    await prisma.catalogTargetAsset.delete({ where: { id: asset.id } });
  } catch (error) {
    await prisma.catalogTargetAsset
      .update({
        where: { id: asset.id },
        data: {
          status: "DELETE_PENDING",
          lastError: error instanceof Error ? error.message.slice(0, 2_000) : "Catalog target cleanup failed.",
        },
      })
      .catch(() => undefined);
  }
}

export async function importCatalogTargetAsset(input: {
  catalogOrder: number;
  stagingDir?: string;
  fetchImpl?: typeof fetch;
}): Promise<CatalogTargetImportResult> {
  const catalog = await catalogSong(input.catalogOrder);
  const song = await prisma.song.findUnique({
    where: { id: catalog.id },
    include: { targetAsset: true },
  });
  if (!song || song.title !== catalog.title || song.artist !== catalog.artist) {
    throw new Error(
      `Database song does not match catalog order ${input.catalogOrder}. Run catalog import/verify first.`,
    );
  }

  const stagingDir = input.stagingDir ?? CATALOG_TARGET_STAGING_DIR;
  const sourcePath = await findStagedSource(input.catalogOrder, catalog.sourceVideoId, stagingDir);
  if (!sourcePath) {
    throw new Error(
      `Missing authorized source file: ${catalogTargetStem(input.catalogOrder, catalog.sourceVideoId)}.{wav,mp3,m4a,aac,webm,flac}`,
    );
  }
  const { bytes, mimeType } = await validateUploadSource(sourcePath);
  const uploadPath = sourcePath;
  const digest = sha256(bytes);

  if (
    song.targetAsset?.status === "READY" &&
    song.targetAsset.sha256 === digest &&
    song.targetAsset.sourceVideoId === catalog.sourceVideoId &&
    song.targetAsset.sourceId === catalog.sourceId
  ) {
    await cleanupDerivedWav(input.catalogOrder, catalog.sourceVideoId, stagingDir, sourcePath);
    return {
      catalogOrder: input.catalogOrder,
      title: catalog.title,
      artist: catalog.artist,
      sourceVideoId: catalog.sourceVideoId,
      sourcePath,
      uploadPath,
      mimeType,
      assetId: song.targetAsset.id,
      sizeBytes: Number(song.targetAsset.sizeBytes),
      sha256: digest,
      skipped: true,
    };
  }

  const extension = path.extname(sourcePath).toLowerCase();
  const stored = await createLeemageClient(input.fetchImpl).uploadFile({
    fileName: `catalog-target-${catalogTargetStem(input.catalogOrder, catalog.sourceVideoId)}${extension}`,
    mimeType,
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
          mimeType,
          sizeBytes: BigInt(stored.sizeBytes),
          sha256: digest,
          sourceVideoId: catalog.sourceVideoId,
          sourceId: catalog.sourceId,
          status: "READY",
        },
      });
      await tx.song.update({ where: { id: song.id }, data: { targetAssetId: asset.id } });
      return asset;
    });
    assetId = created.id;
  } catch (error) {
    await createLeemageClient(input.fetchImpl)
      .deleteFile(stored.projectId, stored.fileId)
      .catch(() => undefined);
    throw error;
  }

  if (song.targetAsset && song.targetAsset.id !== assetId) {
    await cleanupSupersededAsset(song.targetAsset, input.fetchImpl);
  }
  await cleanupDerivedWav(input.catalogOrder, catalog.sourceVideoId, stagingDir, sourcePath);

  return {
    catalogOrder: input.catalogOrder,
    title: catalog.title,
    artist: catalog.artist,
    sourceVideoId: catalog.sourceVideoId,
    sourcePath,
    uploadPath,
    mimeType,
    assetId,
    sizeBytes: stored.sizeBytes,
    sha256: digest,
    skipped: false,
  };
}

export async function catalogTargetStatus() {
  const entries = await prisma.catalogEntry.findMany({
    where: { catalog: { slug: TJ_2607_CATALOG_SLUG } },
    orderBy: { position: "asc" },
    select: {
      position: true,
      song: {
        select: {
          title: true,
          artist: true,
          activeSource: { select: { id: true, sourceVideoId: true } },
          targetAsset: {
            select: {
              id: true,
              sourceId: true,
              status: true,
              sizeBytes: true,
              sha256: true,
              sourceVideoId: true,
              mimeType: true,
              fileName: true,
            },
          },
        },
      },
    },
  });
  const songs = entries.map((entry) => ({
    catalogOrder: entry.position,
    title: entry.song.title,
    artist: entry.song.artist,
    sourceId: entry.song.activeSource?.id ?? null,
    sourceVideoId: entry.song.activeSource?.sourceVideoId ?? null,
    targetAsset: entry.song.targetAsset,
  }));
  return {
    total: songs.length,
    ready: songs.filter((song) => song.targetAsset?.status === "READY" && song.targetAsset.sourceId === song.sourceId)
      .length,
    missing: songs
      .filter((song) => song.targetAsset?.status !== "READY" || song.targetAsset.sourceId !== song.sourceId)
      .map((song) => {
        return {
          catalogOrder: song.catalogOrder,
          title: song.title,
          artist: song.artist,
          sourceVideoId: song.sourceVideoId,
          expectedFile: song.sourceVideoId ? `${catalogTargetStem(song.catalogOrder, song.sourceVideoId)}.wav` : null,
        };
      }),
    songs,
  };
}
