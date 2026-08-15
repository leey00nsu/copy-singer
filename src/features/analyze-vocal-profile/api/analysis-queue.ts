import "server-only";

import { applyTicketChangeInTransaction, InsufficientTicketsError } from "@/entities/ticket/index.server";
import { serializeProfile } from "@/entities/vocal-profile/index.server";
import { vocalProfileAnalysisMaxAttempts, vocalProfileAnalysisTicketCost } from "@/shared/config/index.server";
import { prisma } from "@/shared/db/index.server";
import { isSupportedAudioUploadMimeType, normalizeAudioUploadMimeType } from "@/shared/lib/audio";
import { discardMediaAsset, storeAnalyzerReferenceBytes } from "@/shared/media/index.server";

export type VocalProfileAnalysisJobStatus = "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED";

export type VocalProfileAnalysisJobRow = {
  id: string;
  userId: string;
  recordingId: string;
  sourceAssetId: string | null;
  vocalProfileId: string | null;
  status: VocalProfileAnalysisJobStatus;
  idempotencyKey: string;
  ticketCost: number;
  refundState: "NONE" | "REQUIRED" | "REFUNDED";
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

async function hasActiveAnalysisJob(userId: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "VocalProfileAnalysisJob"
    WHERE "userId" = ${userId}
      AND "status" IN ('PENDING'::"VocalProfileAnalysisJobStatus", 'PROCESSING'::"VocalProfileAnalysisJobStatus")
    LIMIT 1
  `;
  return rows.length > 0;
}

function prismaErrorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
}

function isTransactionWriteConflict(error: unknown) {
  return (
    prismaErrorCode(error) === "P2034" ||
    (error instanceof Error && /TransactionWriteConflict|write conflict|deadlock/i.test(error.message))
  );
}

export async function getVocalProfileAnalysisPolicy(userId: string) {
  const cost = vocalProfileAnalysisTicketCost();
  const wallet = await prisma.ticketWallet.findUnique({
    where: { userId_kind: { userId, kind: "VOCAL_ANALYSIS" } },
    select: { balance: true },
  });
  return {
    analysisTickets: { balance: wallet?.balance ?? 0, cost },
  };
}

export async function enqueueVocalProfileAnalysis(input: { userId: string; idempotencyKey: string; file: File }) {
  const key = input.idempotencyKey.trim();
  if (!key || key.length > 200) throw new Error("INVALID_IDEMPOTENCY_KEY");
  const existing = await findByIdempotency(input.userId, key);
  if (existing) return existing;
  if (await hasActiveAnalysisJob(input.userId)) throw new Error("ANALYSIS_BUSY");

  const policy = await getVocalProfileAnalysisPolicy(input.userId);

  const mimeType = normalizeAudioUploadMimeType(input.file.type);
  if (!isSupportedAudioUploadMimeType(mimeType)) throw new Error("UNSUPPORTED_AUDIO");
  if (input.file.size <= 0 || input.file.size > MAX_AUDIO_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  if (policy.analysisTickets.balance < policy.analysisTickets.cost) {
    throw new InsufficientTicketsError("VOCAL_ANALYSIS", policy.analysisTickets.cost, policy.analysisTickets.balance);
  }

  const recordingId = crypto.randomUUID();
  const sourceAsset = await storeAnalyzerReferenceBytes({
    userId: input.userId,
    recordingId,
    mimeType,
    bytes: new Uint8Array(await input.file.arrayBuffer()),
    fileName: input.file.name || `${recordingId}.audio`,
  });

  const id = crypto.randomUUID();
  const ticketCost = policy.analysisTickets.cost;
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = await prisma.$transaction(
          async (tx) => {
            const raced = await tx.vocalProfileAnalysisJob.findUnique({
              where: { userId_idempotencyKey: { userId: input.userId, idempotencyKey: key } },
            });
            if (raced) return { job: raced, created: false };

            const active = await tx.vocalProfileAnalysisJob.count({
              where: { userId: input.userId, status: { in: ["PENDING", "PROCESSING"] } },
            });
            if (active > 0) throw new Error("ANALYSIS_BUSY");

            const job = await tx.vocalProfileAnalysisJob.create({
              data: {
                id,
                userId: input.userId,
                recordingId,
                sourceAssetId: sourceAsset.id,
                idempotencyKey: key,
                ticketCost,
                maxAttempts: vocalProfileAnalysisMaxAttempts(),
              },
            });
            if (ticketCost > 0) {
              await applyTicketChangeInTransaction(tx, {
                userId: input.userId,
                kind: "VOCAL_ANALYSIS",
                type: "USAGE_DEBIT",
                amount: -ticketCost,
                idempotencyKey: `vocal-analysis:debit:${input.userId}:${key}`,
                reason: "보컬 프로필 분석",
                vocalProfileAnalysisJobId: job.id,
              });
            }
            return { job, created: true };
          },
          { isolationLevel: "Serializable" },
        );
        if (!result.created) await discardMediaAsset(sourceAsset.id);
        return result.job;
      } catch (error) {
        const code = prismaErrorCode(error);
        if (isTransactionWriteConflict(error) && attempt < 2) continue;
        if (code === "P2002") {
          const raced = await findByIdempotency(input.userId, key);
          if (raced) {
            await discardMediaAsset(sourceAsset.id);
            return raced;
          }
        }
        throw error;
      }
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
