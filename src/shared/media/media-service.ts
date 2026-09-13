import "server-only";

import { prisma } from "@/shared/db/index.server";
import { processMediaOperation, scheduleAssetDeletion, uploadTrackedAsset } from "./operations";

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
  kind: "REFERENCE" | "SYNTHESIS_REFERENCE" | "MIX_RESULT";
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  fileName: string;
}) {
  return uploadTrackedAsset({ ...input, assetType: "MEDIA" }, (tx, stored) =>
    tx.mediaAsset.create({
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
    }),
  );
}

export async function storeAnalyzerReferenceBytes(input: {
  userId: string;
  recordingId: string;
  mimeType: string;
  bytes: Uint8Array;
  fileName?: string;
  signal?: AbortSignal;
}) {
  return storeMediaAssetBytes({
    userId: input.userId,
    bytes: input.bytes,
    signal: input.signal,
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
  signal?: AbortSignal;
}) {
  return storeMediaAssetBytes({
    userId: input.userId,
    bytes: input.bytes,
    signal: input.signal,
    mimeType: input.mimeType,
    kind: "SYNTHESIS_REFERENCE",
    fileName: input.fileName ?? `${input.recordingId}-synthesis.${audioExtension(input.mimeType)}`,
  });
}

export async function deleteOrScheduleMediaAsset(mediaAssetId: string) {
  const operationId = await prisma.$transaction((tx) => scheduleAssetDeletion(tx, mediaAssetId));
  if (!operationId) return { deleted: true as const };
  await processMediaOperation(operationId);
  const operation = await prisma.mediaOperation.findUniqueOrThrow({ where: { id: operationId } });
  return { deleted: operation.status === "COMPLETED" };
}

export async function discardMediaAsset(mediaAssetId: string) {
  return deleteOrScheduleMediaAsset(mediaAssetId);
}

export async function storeMixingResult(input: {
  userId: string;
  mixingJobId: string;
  bytes: Uint8Array;
  mimeType: string;
  extension: string;
  fetchImpl?: typeof fetch;
}) {
  return storeMediaAssetBytes({
    ...input,
    kind: "MIX_RESULT",
    fileName: `copy-singer-${input.mixingJobId}.${input.extension}`,
  });
}
