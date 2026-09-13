import "server-only";
import { randomUUID } from "node:crypto";
import { type Prisma, prisma } from "@/shared/db/index.server";
import { createLeemageClient, type LeemageStoredFile, leemageConfigFromEnv } from "./client";

export async function uploadTrackedAsset<T extends { id: string }>(
  input: {
    fileName: string;
    mimeType: string;
    bytes: Uint8Array;
    userId?: string;
    assetType: "MEDIA" | "CATALOG";
    fetchImpl?: typeof fetch;
    signal?: AbortSignal;
  },
  persist: (tx: Prisma.TransactionClient, stored: LeemageStoredFile) => Promise<T>,
): Promise<T> {
  const config = leemageConfigFromEnv();
  const intent = await prisma.mediaOperation.create({
    data: {
      operation: "UPLOAD",
      status: "UPLOADING",
      userId: input.userId,
      assetType: input.assetType,
      externalProjectId: config.projectId,
      nextAttemptAt: new Date(Date.now() + 15 * 60_000),
    },
  });
  try {
    const stored = await createLeemageClient(input.fetchImpl).uploadFile({
      ...input,
      onAllocated: async (allocation) => {
        await prisma.mediaOperation.update({
          where: { id: intent.id },
          data: {
            externalFileId: allocation.fileId,
            objectName: allocation.objectName,
          },
        });
      },
    });
    return await prisma.$transaction(async (tx) => {
      const asset = await persist(tx, stored);
      await tx.mediaOperation.update({ where: { id: intent.id }, data: { status: "STORED", assetId: asset.id } });
      return asset;
    });
  } catch (error) {
    // If DB is also down, the original UPLOADING intent remains eligible after its deadline.
    await prisma.mediaOperation
      .update({
        where: { id: intent.id },
        data: {
          status: "RECOVER",
          lastError: "UPLOAD_OR_PERSIST_FAILED",
          nextAttemptAt: new Date(),
        },
      })
      .catch(() => undefined);
    throw error;
  }
}

async function hasReferences(tx: Prisma.TransactionClient, id: string, assetType: string) {
  if (assetType === "CATALOG") {
    const asset = await tx.catalogTargetAsset.findUnique({ where: { id }, select: { sourceId: true } });
    if (
      asset?.sourceId &&
      (await tx.songAnalysisJob.count({
        where: { sourceId: asset.sourceId, status: { in: ["PENDING", "PROCESSING"] } },
      }))
    )
      return true;
    return (
      (await tx.song.count({ where: { targetAssetId: id } })) > 0 ||
      (await tx.mixingJob.count({ where: { targetAssetId: id } })) > 0
    );
  }
  return (
    (await tx.recording.count({ where: { mediaAssetId: id } })) > 0 ||
    (await tx.vocalProfile.count({ where: { synthesisReferenceAssetId: id } })) > 0 ||
    (await tx.mixingJob.count({ where: { OR: [{ referenceAssetId: id }, { resultAssetId: id }] } })) > 0 ||
    (await tx.vocalProfileAnalysisJob.count({ where: { sourceAssetId: id } })) > 0
  );
}

// Remove the domain row and retain an independent cleanup intent atomically, before external I/O.
export async function scheduleAssetDeletion(
  tx: Prisma.TransactionClient,
  id: string,
  assetType: "MEDIA" | "CATALOG" = "MEDIA",
) {
  if (assetType === "MEDIA") await tx.$queryRaw`SELECT id FROM "MediaAsset" WHERE id = ${id}::uuid FOR UPDATE`;
  else await tx.$queryRaw`SELECT id FROM "CatalogTargetAsset" WHERE id = ${id}::uuid FOR UPDATE`;
  const asset =
    assetType === "MEDIA"
      ? await tx.mediaAsset.findUnique({ where: { id } })
      : await tx.catalogTargetAsset.findUnique({ where: { id } });
  if (!asset) return null;
  if (await hasReferences(tx, id, assetType)) throw new Error("MEDIA_ASSET_IN_USE");
  const operation = await tx.mediaOperation.create({
    data: {
      operation: "DELETE",
      assetId: id,
      assetType,
      externalProjectId: asset.externalProjectId,
      externalFileId: asset.externalFileId,
    },
  });
  if (assetType === "MEDIA") await tx.mediaAsset.delete({ where: { id } });
  else await tx.catalogTargetAsset.delete({ where: { id } });
  return operation.id;
}

export async function processMediaOperation(id?: string, fetchImpl: typeof fetch = fetch) {
  const now = new Date();
  const owner = randomUUID();
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    WITH candidate AS (
      SELECT id FROM "MediaOperation"
      WHERE (${id ?? null}::uuid IS NULL OR id = ${id ?? null}::uuid)
      AND ((status IN ('PENDING', 'RECOVER', 'UPLOADING', 'STORED') AND "nextAttemptAt" <= ${now})
        OR (status = 'PROCESSING' AND "leaseExpiresAt" < ${now}))
      ORDER BY "nextAttemptAt" FOR UPDATE SKIP LOCKED LIMIT 1
    ) UPDATE "MediaOperation" AS op SET status = 'PROCESSING', "leaseOwner" = ${owner},
      "leaseExpiresAt" = ${new Date(now.getTime() + 180_000)}, attempts = attempts + 1, "updatedAt" = ${now}
      FROM candidate WHERE op.id = candidate.id RETURNING op.id`;
  if (!rows[0]) return false;
  const operation = await prisma.mediaOperation.findUniqueOrThrow({ where: { id: rows[0].id } });
  const owned = { id: operation.id, leaseOwner: owner, status: "PROCESSING" };
  if (!operation.externalFileId) {
    await prisma.mediaOperation.updateMany({
      where: owned,
      data: { status: "UNRESOLVED", lastError: "PROVIDER_IDENTITY_UNKNOWN", leaseOwner: null, leaseExpiresAt: null },
    });
    return true;
  }
  try {
    if (operation.operation === "UPLOAD" && operation.assetId) {
      const inUse = await prisma.$transaction(async (tx) => {
        const current = await tx.mediaOperation.findFirst({ where: owned });
        if (!current) return true;
        if (await hasReferences(tx, operation.assetId as string, operation.assetType ?? "MEDIA")) return true;
        await scheduleAssetDeletion(
          tx,
          operation.assetId as string,
          operation.assetType === "CATALOG" ? "CATALOG" : "MEDIA",
        );
        return false;
      });
      await prisma.mediaOperation.updateMany({
        where: owned,
        data: {
          status: "COMPLETED",
          resolution: inUse ? "DOMAIN_LINKED" : "CLEANUP_SCHEDULED",
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      });
      return true;
    }
    await createLeemageClient(fetchImpl).deleteFile(operation.externalProjectId, operation.externalFileId);
    await prisma.mediaOperation.updateMany({
      where: owned,
      data: { status: "COMPLETED", leaseOwner: null, leaseExpiresAt: null },
    });
  } catch {
    await prisma.mediaOperation.updateMany({
      where: owned,
      data: {
        status: operation.attempts >= 10 ? "UNRESOLVED" : "RECOVER",
        lastError: "MEDIA_CLEANUP_FAILED",
        nextAttemptAt: new Date(Date.now() + Math.min(2 ** operation.attempts, 360) * 60_000),
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    });
  }
  return true;
}
