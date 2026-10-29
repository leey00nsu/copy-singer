import "server-only";

import {
  assertGuestCanSubmit,
  canReadGuestResource,
  GuestAnalysisError,
  guestAnalysisPolicy,
} from "@/entities/guest-analysis/index.server";
import { applyTicketChangeInTransaction, InsufficientTicketsError } from "@/entities/ticket/index.server";
import { serializeProfile } from "@/entities/vocal-profile/index.server";
import {
  guestAnalysisDailyLimit,
  vocalProfileAnalysisMaxAttempts,
  vocalProfileAnalysisTicketCost,
} from "@/shared/config/index.server";
import { prisma } from "@/shared/db/index.server";
import {
  AdmissionError,
  checkQueueCapacity,
  guestAnalysisQuota,
  lockQueueAdmission,
} from "@/shared/lib/admission/index.server";
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
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { isGuest: true } });
  if (user.isGuest) {
    const trial = await prisma.guestAnalysisTrial.findUnique({ where: { userId }, include: { job: true } });
    return {
      analysisTickets: { balance: 0, cost: 0 },
      guest: guestAnalysisPolicy(trial, guestAnalysisQuota.policy(guestAnalysisDailyLimit()).available),
    };
  }
  const cost = vocalProfileAnalysisTicketCost();
  const wallet = await prisma.ticketWallet.findUnique({
    where: { userId_kind: { userId, kind: "VOCAL_ANALYSIS" } },
    select: { balance: true },
  });
  return {
    analysisTickets: { balance: wallet?.balance ?? 0, cost },
  };
}

export async function preflightVocalProfileAnalysis(userId: string, idempotencyKey: string, hasReservation = false) {
  const key = idempotencyKey.trim();
  if (!key || key.length > 200) throw new Error("INVALID_IDEMPOTENCY_KEY");
  const existing = await findByIdempotency(userId, key);
  if (existing) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { isGuest: true } });
    if (user.isGuest && !(await canReadGuestResource(userId, { jobId: existing.id })))
      throw new GuestAnalysisError("GUEST_RESULT_EXPIRED", 410);
    return existing;
  }
  if (await hasActiveAnalysisJob(userId)) throw new Error("ANALYSIS_BUSY");
  const policy = await getVocalProfileAnalysisPolicy(userId);
  if (policy.guest?.state === "used") throw new GuestAnalysisError("GUEST_ANALYSIS_USED");
  if (policy.guest?.state === "full" && !hasReservation) {
    const quota = guestAnalysisQuota.policy(guestAnalysisDailyLimit());
    throw new AdmissionError("GUEST_ANALYSIS_DAILY_LIMIT", 429, quota.retryAfter);
  }
  if (policy.analysisTickets.balance < policy.analysisTickets.cost)
    throw new InsufficientTicketsError("VOCAL_ANALYSIS", policy.analysisTickets.cost, policy.analysisTickets.balance);
  return null;
}

export async function enqueueVocalProfileAnalysis(input: {
  userId: string;
  idempotencyKey: string;
  file: File;
  guestReservation?: ReturnType<typeof guestAnalysisQuota.reserve>;
}) {
  const key = input.idempotencyKey.trim();
  const existing = await preflightVocalProfileAnalysis(input.userId, key, Boolean(input.guestReservation));
  if (existing) return existing;
  const policy = await getVocalProfileAnalysisPolicy(input.userId);
  const mimeType = normalizeAudioUploadMimeType(input.file.type);
  if (!isSupportedAudioUploadMimeType(mimeType)) throw new Error("UNSUPPORTED_AUDIO");
  if (input.file.size <= 0 || input.file.size > MAX_AUDIO_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  const reservation = policy.guest
    ? (input.guestReservation ?? guestAnalysisQuota.reserve(guestAnalysisDailyLimit()))
    : null;
  let sourceAsset: Awaited<ReturnType<typeof storeAnalyzerReferenceBytes>> | null = null;
  try {
    const recordingId = crypto.randomUUID();
    sourceAsset = await storeAnalyzerReferenceBytes({
      userId: input.userId,
      recordingId,
      mimeType,
      bytes: new Uint8Array(await input.file.arrayBuffer()),
      fileName: input.file.name || `${recordingId}.audio`,
    });
    const sourceAssetId = sourceAsset.id;
    const id = crypto.randomUUID();
    const ticketCost = policy.analysisTickets.cost;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = await prisma.$transaction(
          async (tx) => {
            await lockQueueAdmission(tx, "VOCAL");
            const raced = await tx.vocalProfileAnalysisJob.findUnique({
              where: { userId_idempotencyKey: { userId: input.userId, idempotencyKey: key } },
            });
            if (raced) return { job: raced, created: false };
            if (policy.guest) await assertGuestCanSubmit(tx, input.userId);
            const active = await tx.vocalProfileAnalysisJob.count({
              where: { userId: input.userId, status: { in: ["PENDING", "PROCESSING"] } },
            });
            if (active > 0) throw new Error("ANALYSIS_BUSY");
            await checkQueueCapacity(tx, "VOCAL", input.userId);
            const job = await tx.vocalProfileAnalysisJob.create({
              data: {
                id,
                userId: input.userId,
                recordingId,
                sourceAssetId,
                idempotencyKey: key,
                ticketCost,
                maxAttempts: vocalProfileAnalysisMaxAttempts(),
              },
            });
            if (policy.guest)
              await tx.guestAnalysisTrial.update({
                where: { userId: input.userId },
                data: { jobId: job.id, expiresAt: null },
              });
            else if (ticketCost > 0)
              await applyTicketChangeInTransaction(tx, {
                userId: input.userId,
                kind: "VOCAL_ANALYSIS",
                type: "USAGE_DEBIT",
                amount: -ticketCost,
                idempotencyKey: `vocal-analysis:debit:${input.userId}:${key}`,
                reason: "보컬 프로필 분석",
                vocalProfileAnalysisJobId: job.id,
              });
            return { job, created: true };
          },
          { isolationLevel: "Serializable" },
        );
        if (result.created) reservation?.commit();
        else await discardMediaAsset(sourceAssetId);
        return result.job;
      } catch (error) {
        if (isTransactionWriteConflict(error) && attempt < 2) continue;
        if (prismaErrorCode(error) === "P2002") {
          const raced = await findByIdempotency(input.userId, key);
          if (raced) {
            await discardMediaAsset(sourceAssetId);
            return raced;
          }
        }
        throw error;
      }
    }
    throw new Error("ANALYSIS_ENQUEUE_FAILED");
  } catch (error) {
    if (sourceAsset) await discardMediaAsset(sourceAsset.id);
    throw error;
  } finally {
    reservation?.release();
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
