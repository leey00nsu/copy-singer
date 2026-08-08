import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { vocalProfileAnalysisLeaseSeconds } from "@/lib/config/server-env";
import { discardMediaAsset } from "@/lib/leemage/media-service";
import { AnalyzerClientError, analyzeVocalProfileBytes } from "@/lib/vocal-profile/analyzer";
import { VocalProfilePersistenceError, persistQueuedAnalyzedVocalProfile } from "@/lib/vocal-profile/persistence";
import type { VocalProfileAnalysisJobRow } from "@/lib/vocal-profile/analysis-queue";

export type VocalProfileAnalysisWorkerDependencies = {
  fetchImpl?: typeof fetch;
};

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function workerError(error: unknown) {
  if (error instanceof AnalyzerClientError || error instanceof VocalProfilePersistenceError) {
    return { code: error.reasonCode, detail: error.detail, retryable: error.retryable };
  }
  if (error instanceof Error && error.message === "ANALYZER_SOURCE_MISMATCH") {
    return { code: "ANALYZER_SOURCE_MISMATCH", detail: "Analyzer source bytes did not match the queued upload.", retryable: false };
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
        "attempts" < "maxAttempts"
        AND "nextAttemptAt" <= ${now}
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

async function markSucceeded(job: VocalProfileAnalysisJobRow, profileId: string) {
  const now = new Date();
  await prisma.$executeRaw`
    UPDATE "VocalProfileAnalysisJob"
    SET
      "status" = 'SUCCEEDED'::"VocalProfileAnalysisJobStatus",
      "vocalProfileId" = ${profileId}::uuid,
      "errorCode" = NULL,
      "errorDetail" = NULL,
      "retryable" = NULL,
      "completedAt" = ${now},
      "leaseOwner" = NULL,
      "leaseExpiresAt" = NULL,
      "heartbeatAt" = ${now},
      "updatedAt" = ${now}
    WHERE "id" = ${job.id}::uuid
  `;
}

async function releaseFailure(job: VocalProfileAnalysisJobRow, error: unknown) {
  const failure = workerError(error);
  const retry = failure.retryable && job.attempts < job.maxAttempts;
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
      WHERE "id" = ${job.id}::uuid
    `;
    return;
  }

  await prisma.$executeRaw`
    UPDATE "VocalProfileAnalysisJob"
    SET
      "status" = 'FAILED'::"VocalProfileAnalysisJobStatus",
      "sourceAssetId" = NULL,
      "errorCode" = ${failure.code},
      "errorDetail" = ${failure.detail.slice(0, 2000)},
      "retryable" = ${failure.retryable},
      "completedAt" = ${now},
      "leaseOwner" = NULL,
      "leaseExpiresAt" = NULL,
      "updatedAt" = ${now}
    WHERE "id" = ${job.id}::uuid
  `;
  if (job.sourceAssetId) await discardMediaAsset(job.sourceAssetId);
}

export async function processClaimedVocalProfileAnalysisJob(
  jobId: string,
  owner: string,
  dependencies: VocalProfileAnalysisWorkerDependencies = {},
) {
  const job = await loadClaimedJob(jobId, owner);
  if (!job) throw new Error("Claimed vocal profile analysis job was not found.");

  const alreadyStored = await prisma.vocalProfile.findFirst({
    where: { recordingId: job.recordingId, userId: job.userId },
    select: { id: true },
  });
  if (alreadyStored) {
    await markSucceeded(job, alreadyStored.id);
    return;
  }

  try {
    if (!job.sourceAssetId) throw new VocalProfilePersistenceError(
      "ANALYSIS_SOURCE_MISSING",
      "The queued analysis source is no longer available.",
      false,
      410,
    );
    const sourceAsset = await prisma.mediaAsset.findFirst({
      where: { id: job.sourceAssetId, userId: job.userId, kind: "REFERENCE", status: "READY" },
    });
    if (!sourceAsset) throw new VocalProfilePersistenceError(
      "ANALYSIS_SOURCE_MISSING",
      "The queued analysis source is no longer available.",
      false,
      410,
    );

    const fetchImpl = dependencies.fetchImpl ?? fetch;
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
      analyzed.source.bytes.byteLength !== sourceBytes.byteLength
      || analyzed.source.mimeType !== sourceAsset.mimeType
      || sha256(analyzed.source.bytes) !== sha256(sourceBytes)
    ) {
      throw new Error("ANALYZER_SOURCE_MISMATCH");
    }

    const profile = await persistQueuedAnalyzedVocalProfile({
      userId: job.userId,
      recordingId: job.recordingId,
      sourceAssetId: sourceAsset.id,
      analyzed,
    });
    await markSucceeded(job, profile.id);
  } catch (error) {
    const existing = await prisma.vocalProfile.findFirst({
      where: { recordingId: job.recordingId, userId: job.userId },
      select: { id: true },
    });
    if (existing) {
      await markSucceeded(job, existing.id);
      return;
    }
    await releaseFailure(job, error);
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
