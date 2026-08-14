import "server-only";

import { createHash } from "node:crypto";
import path from "node:path";
import { prisma } from "@/shared/db/index.server";
import { isSupportedAudioUploadMimeType, normalizeAudioUploadMimeType } from "@/shared/lib/audio";
import { createLeemageClient } from "@/shared/media/index.server";
import { SongCatalogAdminError } from "../model/error";

export const ADMIN_CATALOG_TARGET_MAX_UPLOAD_BYTES = 49_000_000;

function safeExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(extension) ? extension : ".audio";
}

export async function uploadAdminCatalogTarget(input: { sourceId: string; file: File; fetchImpl?: typeof fetch }) {
  const source = await prisma.songSource.findUnique({
    where: { id: input.sourceId },
    select: { id: true, sourceVideoId: true },
  });
  if (!source) throw new SongCatalogAdminError("SOURCE_NOT_FOUND", "음원 출처를 찾을 수 없습니다.", 404);
  const mimeType = normalizeAudioUploadMimeType(input.file.type);
  if (!isSupportedAudioUploadMimeType(mimeType))
    throw new SongCatalogAdminError("UNSUPPORTED_AUDIO", "지원하지 않는 음원 형식입니다.", 415);
  if (input.file.size <= 0 || input.file.size > ADMIN_CATALOG_TARGET_MAX_UPLOAD_BYTES) {
    throw new SongCatalogAdminError("PAYLOAD_TOO_LARGE", "음원 파일은 49MB 이하여야 합니다.", 413);
  }
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  if (mimeType === "audio/wav" || mimeType === "audio/x-wav") {
    if (bytes.byteLength < 44 || Buffer.from(bytes.subarray(0, 4)).toString("ascii") !== "RIFF") {
      throw new SongCatalogAdminError("INVALID_AUDIO", "올바른 WAV 파일이 아닙니다.", 400);
    }
  }
  const digest = createHash("sha256").update(bytes).digest("hex");
  const existing = await prisma.catalogTargetAsset.findFirst({
    where: { sourceId: source.id, sha256: digest, status: "READY" },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  const client = createLeemageClient(input.fetchImpl);
  const stored = await client.uploadFile({
    fileName: `catalog-target-${source.sourceVideoId}${safeExtension(input.file.name)}`,
    mimeType,
    bytes,
  });
  try {
    return await prisma.catalogTargetAsset.create({
      data: {
        externalProjectId: stored.projectId,
        externalFileId: stored.fileId,
        externalUrl: stored.url,
        fileName: stored.fileName,
        mimeType,
        sizeBytes: BigInt(stored.sizeBytes),
        sha256: digest,
        sourceVideoId: source.sourceVideoId,
        sourceId: source.id,
        status: "READY",
      },
    });
  } catch (error) {
    await client.deleteFile(stored.projectId, stored.fileId).catch(() => undefined);
    throw error;
  }
}

export async function cleanupUnreferencedCatalogTarget(
  asset: { id: string; externalProjectId: string; externalFileId: string },
  fetchImpl?: typeof fetch,
) {
  const references = await prisma.mixingJob.count({ where: { targetAssetId: asset.id } });
  const activeReference = await prisma.song.count({ where: { targetAssetId: asset.id } });
  if (references > 0 || activeReference > 0) return false;
  try {
    await createLeemageClient(fetchImpl).deleteFile(asset.externalProjectId, asset.externalFileId);
    await prisma.catalogTargetAsset.delete({ where: { id: asset.id } });
    return true;
  } catch (error) {
    await prisma.catalogTargetAsset
      .update({
        where: { id: asset.id },
        data: {
          status: "DELETE_PENDING",
          lastError: error instanceof Error ? error.message.slice(0, 2_000) : "Target cleanup failed.",
        },
      })
      .catch(() => undefined);
    return false;
  }
}
