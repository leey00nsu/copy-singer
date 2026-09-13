import "server-only";

import { createHash } from "node:crypto";
import { createNotification } from "@/entities/notification/index.server";
import { applyTicketChangeInTransaction } from "@/entities/ticket/index.server";
import {
  AnalyzerClientError,
  analyzeVocalProfileBytes,
  persistQueuedAnalyzedVocalProfile,
  VocalProfilePersistenceError,
} from "@/entities/vocal-profile/index.server";
import type { VocalProfileAnalysisJobRow } from "@/features/analyze-vocal-profile/index.server";
import { vocalProfileAnalysisLeaseSeconds } from "@/shared/config/index.server";
import { type Prisma, prisma } from "@/shared/db/index.server";
import { fenceJob, JobDeadlineError, LeaseLostError, startJobLease } from "@/shared/lib/runtime/index.server";
import { scheduleAssetDeletion } from "@/shared/media/index.server";

export type VocalProfileAnalysisWorkerDependencies = {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function workerError(error: unknown) {
  if (error instanceof JobDeadlineError)
    return { code: "JOB_DEADLINE_EXCEEDED", detail: "Analysis recovery budget exhausted.", retryable: false };
  if (error instanceof AnalyzerClientError || error instanceof VocalProfilePersistenceError) {
    return { code: error.reasonCode, detail: error.detail, retryable: error.retryable };
  }
  if (error instanceof Error && error.message === "ANALYZER_SOURCE_MISMATCH") {
    return {
      code: "ANALYZER_SOURCE_MISMATCH",
      detail: "Analyzer source bytes did not match the queued upload.",
      retryable: false,
    };
  }
  return {
    code: "ANALYSIS_WORKER_FAILED",
    detail: error instanceof Error ? error.message : "Background vocal analysis failed.",
    retryable: true,
  };
}

export async function claimNextVocalProfileAnalysisJob(owner: string, candidateJobId: string | null = null) {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + vocalProfileAnalysisLeaseSeconds() * 1_000);
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    WITH candidate AS (
      SELECT "id"
      FROM "VocalProfileAnalysisJob"
      WHERE
        "nextAttemptAt" <= ${now}
        AND (${candidateJobId}::uuid IS NULL OR "id" = ${candidateJobId}::uuid)
        AND (
          "status" = 'PENDING'::"VocalProfileAnalysisJobStatus"
          OR (
            "status" = 'PROCESSING'::"VocalProfileAnalysisJobStatus"
            AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" < ${now})
          )
        )
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE "VocalProfileAnalysisJob" AS job
    SET
      "status" = 'PROCESSING'::"VocalProfileAnalysisJobStatus",
      "leaseOwner" = ${owner},
      "leaseExpiresAt" = ${leaseUntil},
      "heartbeatAt" = ${now},
      "deadlineAt" = COALESCE(job."deadlineAt", COALESCE(job."startedAt", ${now}) + interval '15 minutes'),
      "startedAt" = COALESCE(job."startedAt", ${now}),
      "attempts" = job."attempts" + 1,
      "updatedAt" = ${now}
    FROM candidate
    WHERE job."id" = candidate."id"
    RETURNING job."id"
  `;
  return rows[0]?.id ?? null;
}

async function loadClaimedJob(jobId: string, owner: string) {
  const rows = await prisma.$queryRaw<VocalProfileAnalysisJobRow[]>`
    SELECT * FROM "VocalProfileAnalysisJob"
    WHERE "id" = ${jobId}::uuid AND "leaseOwner" = ${owner}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function markSucceeded(
  job: VocalProfileAnalysisJobRow,
  profileId: string,
  tx?: Prisma.TransactionClient,
  recoverStored = false,
) {
  const now = new Date();
  const commit = async (transaction: Prisma.TransactionClient) => {
    await fenceJob(transaction, "VocalProfileAnalysisJob", job.id, job.leaseOwner, recoverStored);
    const profile = await transaction.vocalProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { profileNumber: true, displayName: true },
    });
    await transaction.vocalProfileAnalysisJob.update({
      where: { id: job.id },
      data: {
        status: "SUCCEEDED",
        vocalProfileId: profileId,
        errorCode: null,
        errorDetail: null,
        retryable: null,
        completedAt: now,
        leaseOwner: null,
        leaseExpiresAt: null,
        heartbeatAt: now,
      },
    });
    const displayName = profile.displayName?.trim() || `보컬 프로필 ${profile.profileNumber ?? 1}`;
    await createNotification(
      {
        userId: job.userId,
        type: "VOCAL_PROFILE_SUCCEEDED",
        title: "보컬 프로필 분석이 끝났어요",
        message: `${displayName}의 분석 결과를 확인할 수 있어요.`,
        href: `/vocal-profiles/${profileId}`,
        sourceId: job.id,
        dedupeKey: `vocal-analysis:${job.id}:succeeded`,
      },
      transaction,
    );
  };
  if (tx) await commit(tx);
  else await prisma.$transaction(commit);
}

export async function refundRequiredVocalProfileAnalysisTicket(jobId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "VocalProfileAnalysisJob" WHERE id = ${jobId}::uuid FOR UPDATE`;
    const job = await tx.vocalProfileAnalysisJob.findUnique({ where: { id: jobId } });
    if (!job || job.status !== "FAILED" || job.refundState !== "REQUIRED") return false;
    if (job.ticketCost > 0)
      await applyTicketChangeInTransaction(tx, {
        userId: job.userId,
        kind: "VOCAL_ANALYSIS",
        type: "USAGE_REFUND",
        amount: job.ticketCost,
        idempotencyKey: `vocal-analysis-refund:${job.id}`,
        vocalProfileAnalysisJobId: job.id,
        reason: "보컬 프로필 분석 실패 환불",
      });
    await tx.vocalProfileAnalysisJob.update({ where: { id: jobId }, data: { refundState: "REFUNDED" } });
    return true;
  });
}

export async function reconcileRequiredVocalProfileAnalysisRefunds(limit = 10) {
  const jobs = await prisma.vocalProfileAnalysisJob.findMany({
    where: { refundState: "REQUIRED" },
    orderBy: { updatedAt: "asc" },
    take: Math.max(1, Math.trunc(limit)),
    select: { id: true },
  });
  for (const job of jobs) await refundRequiredVocalProfileAnalysisTicket(job.id);
  return jobs.length;
}

async function releaseFailure(job: VocalProfileAnalysisJobRow, error: unknown) {
  const failure = workerError(error);
  console.error("[vocal-analysis] job failed", {
    jobId: job.id,
    code: failure.code,
    retryable: failure.retryable,
    attempts: job.attempts,
    detail: failure.detail.slice(0, 500),
  });
  const retry = !(error instanceof JobDeadlineError) && failure.retryable && job.attempts < job.maxAttempts;
  const now = new Date();
  if (retry) {
    const delaySeconds = Math.min(30, 2 ** Math.max(0, job.attempts - 1));
    const nextAttemptAt = new Date(now.getTime() + delaySeconds * 1_000);
    await prisma.$executeRaw`
      UPDATE "VocalProfileAnalysisJob"
      SET
        "status" = 'PENDING'::"VocalProfileAnalysisJobStatus",
        "nextAttemptAt" = ${nextAttemptAt},
        "errorCode" = ${failure.code},
        "errorDetail" = ${failure.detail.slice(0, 2000)},
        "retryable" = TRUE,
        "leaseOwner" = NULL,
        "leaseExpiresAt" = NULL,
        "updatedAt" = ${now}
      WHERE "id" = ${job.id}::uuid AND "leaseOwner" = ${job.leaseOwner} AND "leaseExpiresAt" > clock_timestamp() AND "status" = 'PROCESSING'
    `;
    return;
  }

  await prisma.$transaction(async (transaction) => {
    await fenceJob(transaction, "VocalProfileAnalysisJob", job.id, job.leaseOwner, true);
    await transaction.vocalProfileAnalysisJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        sourceAssetId: null,
        errorCode: failure.code,
        errorDetail: failure.detail.slice(0, 2_000),
        retryable: failure.retryable,
        refundState: job.ticketCost > 0 ? "REQUIRED" : "NONE",
        completedAt: now,
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    });
    if (job.sourceAssetId) await scheduleAssetDeletion(transaction, job.sourceAssetId);
    await createNotification(
      {
        userId: job.userId,
        type: "VOCAL_PROFILE_FAILED",
        title: "보컬 프로필 분석을 완료하지 못했어요",
        message: "새 음성으로 다시 분석해 주세요.",
        href: "/library?tab=profiles",
        sourceId: job.id,
        dedupeKey: `vocal-analysis:${job.id}:failed`,
      },
      transaction,
    );
  });
  if (job.ticketCost > 0) {
    try {
      await refundRequiredVocalProfileAnalysisTicket(job.id);
    } catch (refundError) {
      console.error("[vocal-analysis] ticket refund failed", { jobId: job.id, error: refundError });
    }
  }
}

export async function processClaimedVocalProfileAnalysisJob(
  jobId: string,
  owner: string,
  dependencies: VocalProfileAnalysisWorkerDependencies = {},
) {
  const job = await loadClaimedJob(jobId, owner);
  if (!job) throw new Error("Claimed vocal profile analysis job was not found.");

  const lease = await startJobLease(
    "VocalProfileAnalysisJob",
    jobId,
    owner,
    vocalProfileAnalysisLeaseSeconds(),
    dependencies.signal,
  );
  try {
    const alreadyStored = await prisma.vocalProfile.findFirst({
      where: { recordingId: job.recordingId, userId: job.userId },
      select: { id: true },
    });
    if (alreadyStored) {
      await markSucceeded(job, alreadyStored.id, undefined, true);
      return;
    }

    lease.check();
    if (job.attempts > job.maxAttempts) throw new JobDeadlineError();

    if (!job.sourceAssetId)
      throw new VocalProfilePersistenceError(
        "ANALYSIS_SOURCE_MISSING",
        "The queued analysis source is no longer available.",
        false,
        410,
      );
    const sourceAsset = await prisma.mediaAsset.findFirst({
      where: { id: job.sourceAssetId, userId: job.userId, kind: "REFERENCE", status: "READY" },
    });
    if (!sourceAsset)
      throw new VocalProfilePersistenceError(
        "ANALYSIS_SOURCE_MISSING",
        "The queued analysis source is no longer available.",
        false,
        410,
      );

    const fetchImpl = lease.fetch(dependencies.fetchImpl ?? fetch);
    const sourceResponse = await fetchImpl(sourceAsset.externalUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    if (!sourceResponse.ok) {
      throw new AnalyzerClientError(
        "ANALYSIS_SOURCE_UNAVAILABLE",
        `Queued analysis source download failed (${sourceResponse.status}).`,
        sourceResponse.status === 429 || sourceResponse.status >= 500,
        502,
      );
    }
    const sourceBytes = new Uint8Array(await sourceResponse.arrayBuffer());
    const analyzed = await analyzeVocalProfileBytes({
      recordingId: job.recordingId,
      bytes: sourceBytes,
      mimeType: sourceAsset.mimeType,
      fileName: sourceAsset.fileName,
      fetchImpl,
    });
    if (
      analyzed.source.bytes.byteLength !== sourceBytes.byteLength ||
      analyzed.source.mimeType !== sourceAsset.mimeType ||
      sha256(analyzed.source.bytes) !== sha256(sourceBytes)
    ) {
      throw new Error("ANALYZER_SOURCE_MISMATCH");
    }

    lease.check();
    await persistQueuedAnalyzedVocalProfile({
      userId: job.userId,
      recordingId: job.recordingId,
      sourceAssetId: sourceAsset.id,
      analyzed,
      signal: lease.signal,
      beforePersist: (tx) => fenceJob(tx, "VocalProfileAnalysisJob", job.id, owner),
      onStored: (tx, id) => markSucceeded(job, id, tx),
    });
  } catch (error) {
    if (error instanceof LeaseLostError || lease.signal.reason instanceof LeaseLostError) return;
    const existing = await prisma.vocalProfile.findFirst({
      where: { recordingId: job.recordingId, userId: job.userId },
      select: { id: true },
    });
    if (existing && !(error instanceof JobDeadlineError)) {
      await markSucceeded(job, existing.id);
      return;
    }
    try {
      await releaseFailure(job, lease.signal.reason instanceof JobDeadlineError ? lease.signal.reason : error);
    } catch (failure) {
      if (!(failure instanceof LeaseLostError)) throw failure;
    }
  } finally {
    await lease.stop();
  }
}

export async function runVocalProfileAnalysisWorkerOnce(
  owner: string,
  dependencies: VocalProfileAnalysisWorkerDependencies = {},
) {
  const jobId = await claimNextVocalProfileAnalysisJob(owner);
  if (!jobId) return false;
  await processClaimedVocalProfileAnalysisJob(jobId, owner, dependencies);
  return true;
}
