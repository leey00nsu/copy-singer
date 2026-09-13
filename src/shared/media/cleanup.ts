import "server-only";

import { prisma } from "@/shared/db/index.server";
import { processMediaOperation, scheduleAssetDeletion } from "./operations";

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
  if (!claimed) return processMediaOperation(undefined, fetchImpl);
  const asset = await prisma.mediaAsset.findUnique({ where: { id: claimed.mediaAssetId } });
  if (!asset) {
    await prisma.mediaCleanupJob.deleteMany({ where: { id: claimed.id } });
    return true;
  }
  // Migrate old cleanup records into independent durable operations before external deletion.
  try {
    const operationId = await prisma.$transaction((tx) => scheduleAssetDeletion(tx, asset.id));
    if (operationId) await processMediaOperation(operationId, fetchImpl);
  } catch {
    await prisma.mediaCleanupJob.updateMany({
      where: { id: claimed.id },
      data: {
        status: "FAILED",
        lastError: "MEDIA_ASSET_IN_USE_OR_DB_UNAVAILABLE",
        nextAttemptAt: new Date(Date.now() + 60_000),
      },
    });
  }
  return true;
}
