import "server-only";

import { prisma } from "@/shared/db/index.server";
import { createLeemageClient, LeemageError } from "./client";

export async function processOneMediaCleanup(fetchImpl: typeof fetch = fetch) {
  const now = new Date();
  const stale = new Date(now.getTime() - 5 * 60 * 1_000);
  const rows = await prisma.$queryRaw<Array<{ id: string; mediaAssetId: string }>>`
    WITH candidate AS (
      SELECT "id"
      FROM "MediaCleanupJob"
      WHERE (
        ("status" IN ('PENDING'::"MediaCleanupStatus", 'FAILED'::"MediaCleanupStatus") AND "nextAttemptAt" <= ${now})
        OR ("status" = 'PROCESSING'::"MediaCleanupStatus" AND "updatedAt" < ${stale})
      )
      ORDER BY "nextAttemptAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE "MediaCleanupJob" AS cleanup
    SET "status" = 'PROCESSING'::"MediaCleanupStatus", "attempts" = cleanup."attempts" + 1, "updatedAt" = ${now}
    FROM candidate
    WHERE cleanup."id" = candidate."id"
    RETURNING cleanup."id", cleanup."mediaAssetId"
  `;
  const claimed = rows[0];
  if (!claimed) return false;
  const asset = await prisma.mediaAsset.findUnique({ where: { id: claimed.mediaAssetId } });
  if (!asset) {
    await prisma.mediaCleanupJob.deleteMany({ where: { id: claimed.id } });
    return true;
  }
  try {
    await createLeemageClient(fetchImpl).deleteFile(asset.externalProjectId, asset.externalFileId);
    await prisma.mediaAsset.delete({ where: { id: asset.id } });
  } catch (error) {
    if (error instanceof LeemageError && error.status === 404) {
      await prisma.mediaAsset.delete({ where: { id: asset.id } });
      return true;
    }
    const message = error instanceof Error ? error.message : "Leemage cleanup failed.";
    const cleanup = await prisma.mediaCleanupJob.findUniqueOrThrow({ where: { id: claimed.id } });
    const delayMinutes = Math.min(2 ** Math.min(cleanup.attempts, 8), 360);
    await prisma.$transaction([
      prisma.mediaCleanupJob.update({
        where: { id: cleanup.id },
        data: { status: "FAILED", lastError: message, nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000) },
      }),
      prisma.mediaAsset.update({ where: { id: asset.id }, data: { status: "DELETE_PENDING", lastError: message } }),
    ]);
  }
  return true;
}
