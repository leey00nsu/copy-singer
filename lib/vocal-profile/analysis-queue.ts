import "server-only";

import { prisma } from "@/lib/db/prisma";
import { discardMediaAsset, storeAnalyzerReferenceBytes } from "@/lib/leemage/media-service";
import { vocalProfileAnalysisMaxAttempts } from "@/lib/config/server-env";
import { serializeProfile } from "@/lib/vocal-profile/server";

export type VocalProfileAnalysisJobStatus = "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED";

export type VocalProfileAnalysisJobRow = {
  id: string;
  userId: string;
  recordingId: string;
  sourceAssetId: string | null;
  vocalProfileId: string | null;
  status: VocalProfileAnalysisJobStatus;
  idempotencyKey: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  leaseOwner: string | null;
  leaseExpiresAt: Date | null;
  heartbeatAt: Date | null;
  errorCode: string | null;
  errorDetail: string | null;
  retryable: boolean | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp4", "audio/aac", "audio/webm"]);

function normalizedMimeType(value: string) {
  return value.split(";", 1)[0]?.trim().toLowerCase() || "";
}

export function analysisJobPayload(row: VocalProfileAnalysisJobRow) {
  return {
    id: row.id,
    status: row.status.toLowerCase() as "pending" | "processing" | "succeeded" | "failed",
    vocalProfileId: row.vocalProfileId,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    error: row.errorCode
      ? { reasonCode: row.errorCode, detail: row.errorDetail ?? "Analysis failed.", retryable: row.retryable === true }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function findByIdempotency(userId: string, idempotencyKey: string) {
  const rows = await prisma.$queryRaw<VocalProfileAnalysisJobRow[]>`
    SELECT * FROM "VocalProfileAnalysisJob"
    WHERE "userId" = ${userId} AND "idempotencyKey" = ${idempotencyKey}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function enqueueVocalProfileAnalysis(input: {
  userId: string;
  idempotencyKey: string;
  file: File;
}) {
  const key = input.idempotencyKey.trim();
  if (!key || key.length > 200) throw new Error("INVALID_IDEMPOTENCY_KEY");
  const existing = await findByIdempotency(input.userId, key);
  if (existing) return existing;

  const mimeType = normalizedMimeType(input.file.type);
  if (!ALLOWED_MIME_TYPES.has(mimeType)) throw new Error("UNSUPPORTED_AUDIO");
  if (input.file.size <= 0 || input.file.size > MAX_AUDIO_BYTES) throw new Error("PAYLOAD_TOO_LARGE");

  const recordingId = crypto.randomUUID();
  const sourceAsset = await storeAnalyzerReferenceBytes({
    userId: input.userId,
    recordingId,
    mimeType,
    bytes: new Uint8Array(await input.file.arrayBuffer()),
    fileName: input.file.name || `${recordingId}.audio`,
  });

  try {
    const id = crypto.randomUUID();
    const rows = await prisma.$queryRaw<VocalProfileAnalysisJobRow[]>`
      INSERT INTO "VocalProfileAnalysisJob" (
        "id", "userId", "recordingId", "sourceAssetId", "status", "idempotencyKey",
        "maxAttempts", "nextAttemptAt", "createdAt", "updatedAt"
      ) VALUES (
        ${id}::uuid, ${input.userId}, ${recordingId}::uuid, ${sourceAsset.id}::uuid,
        'PENDING'::"VocalProfileAnalysisJobStatus", ${key}, ${vocalProfileAnalysisMaxAttempts()},
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("userId", "idempotencyKey") DO NOTHING
      RETURNING *
    `;
    if (rows[0]) return rows[0];
    const raced = await findByIdempotency(input.userId, key);
    if (raced) {
      await discardMediaAsset(sourceAsset.id);
      return raced;
    }
    throw new Error("ANALYSIS_ENQUEUE_FAILED");
  } catch (error) {
    await discardMediaAsset(sourceAsset.id);
    throw error;
  }
}

export async function listVisibleVocalProfileAnalysisJobs(userId: string, failedLimit = 3) {
  const [active, failed] = await Promise.all([
    prisma.$queryRaw<VocalProfileAnalysisJobRow[]>`
      SELECT * FROM "VocalProfileAnalysisJob"
      WHERE "userId" = ${userId}
        AND "status" IN ('PENDING'::"VocalProfileAnalysisJobStatus", 'PROCESSING'::"VocalProfileAnalysisJobStatus")
      ORDER BY "createdAt" DESC, "id" DESC
    `,
    prisma.$queryRaw<VocalProfileAnalysisJobRow[]>`
      SELECT * FROM "VocalProfileAnalysisJob"
      WHERE "userId" = ${userId}
        AND "status" = 'FAILED'::"VocalProfileAnalysisJobStatus"
      ORDER BY COALESCE("completedAt", "updatedAt") DESC, "id" DESC
      LIMIT ${Math.max(0, Math.trunc(failedLimit))}
    `,
  ]);
  return [...active, ...failed].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
}

export async function getVocalProfileAnalysisJob(userId: string, id: string) {
  const rows = await prisma.$queryRaw<VocalProfileAnalysisJobRow[]>`
    SELECT * FROM "VocalProfileAnalysisJob"
    WHERE "id" = ${id}::uuid AND "userId" = ${userId}
    LIMIT 1
  `;
  const job = rows[0] ?? null;
  if (!job) return null;
  if (job.status !== "SUCCEEDED" || !job.vocalProfileId) return { job, profile: null };
  const profile = await prisma.vocalProfile.findFirst({
    where: { id: job.vocalProfileId, userId },
    include: { recording: true },
  });
  return { job, profile: profile ? serializeProfile(profile) : null };
}
