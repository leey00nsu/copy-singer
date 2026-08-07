import "server-only";

import { prisma } from "@/lib/db/prisma";
import { analyzerUrl } from "@/lib/vocal-profile/server";
import { createLeemageClient, LeemageError } from "@/lib/leemage/client";

function audioExtension(mimeType: string) {
  if (mimeType === "audio/mp4" || mimeType === "audio/aac") return "m4a";
  if (mimeType === "audio/webm") return "webm";
  if (mimeType === "audio/mpeg") return "mp3";
  return "wav";
}

async function storeMediaAssetBytes(input: {
  userId: string;
  bytes: Uint8Array;
  mimeType: string;
  kind: "REFERENCE" | "SYNTHESIS_REFERENCE";
  fileName: string;
}) {
  const stored = await createLeemageClient().uploadFile({
    fileName: input.fileName,
    mimeType: input.mimeType,
    bytes: input.bytes,
  });
  return prisma.mediaAsset.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      externalProjectId: stored.projectId,
      externalFileId: stored.fileId,
      externalUrl: stored.url,
      fileName: stored.fileName,
      mimeType: stored.mimeType,
      sizeBytes: BigInt(stored.sizeBytes),
      status: "READY",
    },
  });
}

async function storeAnalyzerAsset(input: {
  userId: string;
  recordingId: string;
  mimeType: string;
  endpoint: "source" | "synthesis-reference";
  kind: "REFERENCE" | "SYNTHESIS_REFERENCE";
  fileName?: string;
}) {
  const baseUrl = analyzerUrl();
  if (!baseUrl) throw new LeemageError("The vocal analyzer is not configured.", null, false);
  const source = await fetch(`${baseUrl}/v1/recordings/${encodeURIComponent(input.recordingId)}/${input.endpoint}`, {
    cache: "no-store",
  });
  if (!source.ok) {
    throw new LeemageError(`Analyzer reference download failed (${source.status}).`, source.status, source.status >= 500);
  }
  const bytes = new Uint8Array(await source.arrayBuffer());
  return storeMediaAssetBytes({
    userId: input.userId,
    bytes,
    mimeType: input.mimeType,
    kind: input.kind,
    fileName: input.fileName ?? `${input.recordingId}${input.kind === "SYNTHESIS_REFERENCE" ? "-synthesis" : ""}.${audioExtension(input.mimeType)}`,
  });
}

export async function storeAnalyzerReference(input: {
  userId: string;
  recordingId: string;
  mimeType: string;
  fileName?: string;
}) {
  return storeAnalyzerAsset({ ...input, endpoint: "source", kind: "REFERENCE" });
}

export async function storeAnalyzerSynthesisReference(input: {
  userId: string;
  recordingId: string;
  fileName?: string;
}) {
  return storeAnalyzerAsset({
    ...input,
    mimeType: "audio/wav",
    endpoint: "synthesis-reference",
    kind: "SYNTHESIS_REFERENCE",
  });
}

export async function storeAnalyzerReferenceBytes(input: {
  userId: string;
  recordingId: string;
  mimeType: string;
  bytes: Uint8Array;
  fileName?: string;
}) {
  return storeMediaAssetBytes({
    userId: input.userId,
    bytes: input.bytes,
    mimeType: input.mimeType,
    kind: "REFERENCE",
    fileName: input.fileName ?? `${input.recordingId}.${audioExtension(input.mimeType)}`,
  });
}

export async function storeAnalyzerSynthesisReferenceBytes(input: {
  userId: string;
  recordingId: string;
  mimeType: string;
  bytes: Uint8Array;
  fileName?: string;
}) {
  return storeMediaAssetBytes({
    userId: input.userId,
    bytes: input.bytes,
    mimeType: input.mimeType,
    kind: "SYNTHESIS_REFERENCE",
    fileName: input.fileName ?? `${input.recordingId}-synthesis.${audioExtension(input.mimeType)}`,
  });
}

export async function deleteOrScheduleMediaAsset(mediaAssetId: string) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } });
  if (!asset) return { deleted: true as const };
  try {
    await createLeemageClient().deleteFile(asset.externalProjectId, asset.externalFileId);
    await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { status: "DELETED", deletedAt: new Date(), lastError: null },
    });
    return { deleted: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Leemage file deletion failed.";
    await prisma.$transaction([
      prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { status: "DELETE_PENDING", lastError: message },
      }),
      prisma.mediaCleanupJob.create({
        data: { mediaAssetId: asset.id, status: "PENDING", lastError: message },
      }),
    ]);
    return { deleted: false as const, error: message };
  }
}

export async function discardMediaAsset(mediaAssetId: string) {
  const outcome = await deleteOrScheduleMediaAsset(mediaAssetId);
  if (outcome.deleted) await prisma.mediaAsset.deleteMany({ where: { id: mediaAssetId } });
  return outcome;
}

export async function storeMixingResult(input: {
  userId: string;
  mixingJobId: string;
  bytes: Uint8Array;
  mimeType: string;
  extension: string;
  fetchImpl?: typeof fetch;
}) {
  const stored = await createLeemageClient(input.fetchImpl).uploadFile({
    fileName: `copy-singer-${input.mixingJobId}.${input.extension}`,
    mimeType: input.mimeType,
    bytes: input.bytes,
  });
  return prisma.mediaAsset.create({
    data: {
      userId: input.userId,
      kind: "MIX_RESULT",
      externalProjectId: stored.projectId,
      externalFileId: stored.fileId,
      externalUrl: stored.url,
      fileName: stored.fileName,
      mimeType: stored.mimeType,
      sizeBytes: BigInt(stored.sizeBytes),
      status: "READY",
    },
  });
}
