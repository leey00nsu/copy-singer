import "server-only";

import { pollSongAnalysis, SongAnalyzerError, submitSongAnalysis } from "@/features/manage-song-catalog/index.server";
import {
  SONG_ANALYSIS_PIPELINE_CONTRACT,
  songAnalysisLeaseSeconds,
  songAnalysisModalConfig,
  songAnalysisPollIntervalMs,
} from "@/shared/config/index.server";
import type { Prisma } from "@/shared/db/index.server";
import { prisma } from "@/shared/db/index.server";

type JobRow = {
  id: string;
  sourceId: string;
  analysisId: string | null;
  attempts: number;
  maxAttempts: number;
  leaseOwner: string | null;
  externalJobId: string | null;
};

export type SongAnalysisWorkerDependencies = {
  fetchImpl?: typeof fetch;
  analyzerUrl?: string;
  analyzerApiKey?: string;
  pollIntervalMs?: number;
};

export async function claimNextSongAnalysisJob(owner: string, candidateJobId: string | null = null) {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + songAnalysisLeaseSeconds() * 1_000);
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    WITH candidate AS (
      SELECT job."id" FROM "SongAnalysisJob" AS job
      WHERE job."attempts" < job."maxAttempts"
        AND job."nextAttemptAt" <= ${now}
        AND (${candidateJobId}::uuid IS NULL OR job."id" = ${candidateJobId}::uuid)
        AND EXISTS (
          SELECT 1 FROM "CatalogTargetAsset" AS target
          WHERE target."sourceId" = job."sourceId"
            AND target."status" = 'READY'::"MediaAssetStatus"
        )
        AND (
          job."status" = 'PENDING'::"SongAnalysisJobStatus"
          OR (job."status" = 'PROCESSING'::"SongAnalysisJobStatus" AND (job."leaseExpiresAt" IS NULL OR job."leaseExpiresAt" < ${now}))
        )
      ORDER BY job."createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE "SongAnalysisJob" AS job
    SET "status" = 'PROCESSING'::"SongAnalysisJobStatus",
        "leaseOwner" = ${owner}, "leaseExpiresAt" = ${leaseUntil}, "heartbeatAt" = ${now},
        "startedAt" = COALESCE(job."startedAt", ${now}), "attempts" = job."attempts" + 1,
        "updatedAt" = ${now}
    FROM candidate WHERE job."id" = candidate."id"
    RETURNING job."id"
  `;
  return rows[0]?.id ?? null;
}

async function heartbeat(jobId: string, owner: string) {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + songAnalysisLeaseSeconds() * 1_000);
  await prisma.songAnalysisJob.updateMany({
    where: { id: jobId, status: "PROCESSING", leaseOwner: owner },
    data: { heartbeatAt: now, leaseExpiresAt: leaseUntil },
  });
}

function startHeartbeat(jobId: string, owner: string) {
  const interval = setInterval(() => void heartbeat(jobId, owner).catch(() => undefined), 60_000);
  interval.unref();
  return () => clearInterval(interval);
}

async function failure(job: JobRow, error: unknown) {
  const normalized =
    error instanceof SongAnalyzerError
      ? { code: error.reasonCode, detail: error.detail, retryable: error.retryable }
      : {
          code: "SONG_ANALYSIS_WORKER_FAILED",
          detail: error instanceof Error ? error.message : "Song analysis failed.",
          retryable: true,
        };
  const retry = normalized.retryable && job.attempts < job.maxAttempts;
  const now = new Date();
  const nextAttemptAt = new Date(now.getTime() + Math.min(60, 5 * 2 ** Math.max(0, job.attempts - 1)) * 1_000);
  await prisma.$transaction(async (tx) => {
    await tx.songAnalysis.upsert({
      where: {
        sourceId_pipelineContract: { sourceId: job.sourceId, pipelineContract: SONG_ANALYSIS_PIPELINE_CONTRACT },
      },
      create: {
        songId: (await tx.songSource.findUniqueOrThrow({ where: { id: job.sourceId } })).songId,
        sourceId: job.sourceId,
        pipelineContract: SONG_ANALYSIS_PIPELINE_CONTRACT,
        status: "FAILED",
        errorCode: normalized.code,
        errorDetail: normalized.detail.slice(0, 2_000),
        completedAt: now,
      },
      update: {
        status: "FAILED",
        errorCode: normalized.code,
        errorDetail: normalized.detail.slice(0, 2_000),
        completedAt: now,
      },
    });
    await tx.songAnalysisJob.update({
      where: { id: job.id },
      data: {
        status: retry ? "PENDING" : "FAILED",
        nextAttemptAt,
        errorCode: normalized.code,
        errorDetail: normalized.detail.slice(0, 2_000),
        retryable: normalized.retryable,
        completedAt: retry ? null : now,
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    });
  });
}

export async function processClaimedSongAnalysisJob(
  jobId: string,
  owner: string,
  dependencies: SongAnalysisWorkerDependencies = {},
) {
  const job = await prisma.songAnalysisJob.findFirst({
    where: { id: jobId, leaseOwner: owner },
    include: { source: true },
  });
  if (!job) throw new Error("Claimed song analysis job was not found.");
  const stopHeartbeat = startHeartbeat(jobId, owner);
  try {
    const configured = songAnalysisModalConfig();
    const analyzerUrl = dependencies.analyzerUrl ?? configured?.url;
    const analyzerApiKey = dependencies.analyzerApiKey ?? configured?.apiKey;
    if (!analyzerUrl || !analyzerApiKey)
      throw new SongAnalyzerError("ANALYZER_NOT_CONFIGURED", "Modal song analyzer is not configured.", false);
    const target = await prisma.catalogTargetAsset.findFirst({
      where: { sourceId: job.sourceId, status: "READY" },
      orderBy: { createdAt: "desc" },
    });
    if (!target) throw new SongAnalyzerError("ANALYSIS_SOURCE_NOT_READY", "Catalog target is not ready.", true);
    const fetchImpl = dependencies.fetchImpl ?? fetch;
    let externalJobId = job.externalJobId;
    if (!externalJobId) {
      const sourceResponse = await fetchImpl(target.externalUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(60_000),
      });
      if (!sourceResponse.ok) {
        throw new SongAnalyzerError(
          "ANALYSIS_SOURCE_UNAVAILABLE",
          `Catalog target download failed (${sourceResponse.status}).`,
          sourceResponse.status === 429 || sourceResponse.status >= 500,
        );
      }
      const submitted = await submitSongAnalysis({
        analyzerUrl,
        apiKey: analyzerApiKey,
        requestId: job.id,
        sourceVideoId: job.source.sourceVideoId,
        bytes: new Uint8Array(await sourceResponse.arrayBuffer()),
        fileName: target.fileName,
        mimeType: target.mimeType,
        fetchImpl,
      });
      externalJobId = submitted.externalJobId;
      const persisted = await prisma.songAnalysisJob.updateMany({
        where: { id: job.id, status: "PROCESSING", leaseOwner: owner },
        data: { externalJobId, externalSubmittedAt: new Date() },
      });
      if (persisted.count !== 1) throw new Error("Song analysis lease was lost after Modal submission.");
    }

    let result: Extract<Awaited<ReturnType<typeof pollSongAnalysis>>, { status: "SUCCEEDED" }>["result"];
    for (;;) {
      const polled = await pollSongAnalysis({ analyzerUrl, apiKey: analyzerApiKey, externalJobId, fetchImpl });
      if (polled.status === "PROCESSING") {
        await new Promise((resolve) =>
          setTimeout(resolve, dependencies.pollIntervalMs ?? songAnalysisPollIntervalMs()),
        );
        continue;
      }
      if (polled.status === "FAILED") {
        await prisma.songAnalysisJob.updateMany({
          where: { id: job.id, status: "PROCESSING", leaseOwner: owner },
          data: { externalJobId: null, externalSubmittedAt: null },
        });
        throw new SongAnalyzerError(polled.reasonCode, polled.detail, polled.retryable);
      }
      result = polled.result;
      break;
    }
    const completedAt = new Date();
    await prisma.$transaction(async (tx) => {
      const analysis = await tx.songAnalysis.upsert({
        where: {
          sourceId_pipelineContract: { sourceId: job.sourceId, pipelineContract: SONG_ANALYSIS_PIPELINE_CONTRACT },
        },
        create: {
          songId: job.source.songId,
          sourceId: job.sourceId,
          pipelineContract: SONG_ANALYSIS_PIPELINE_CONTRACT,
          status: "READY",
          durationMs: result.durationMs,
          sampleRate: result.sampleRate,
          sourceSizeBytes: result.sourceSizeBytes === null ? null : BigInt(result.sourceSizeBytes),
          minMidi: result.minMidi,
          maxMidi: result.maxMidi,
          p10Midi: result.p10Midi,
          medianMidi: result.medianMidi,
          p90Midi: result.p90Midi,
          tessituraLowMidi: result.tessituraLowMidi,
          tessituraHighMidi: result.tessituraHighMidi,
          voicedRatio: result.voicedRatio,
          pitchStability: result.pitchStability,
          clippingRatio: result.clippingRatio,
          rmsDb: result.rmsDb,
          estimatedKey: result.estimatedKey,
          keyConfidence: result.keyConfidence,
          analyzer: result.analyzer,
          analyzerVersion: result.analyzerVersion,
          descriptors: (result.descriptors ?? {}) as Prisma.InputJsonValue,
          pipelineMetadata: {
            ytDlpVersion: result.ytDlpVersion,
            separator: result.separator,
            separatorVersion: result.separatorVersion,
            separatorModel: result.separatorModel,
          } as Prisma.InputJsonValue,
          cleanupConfirmed: true,
          errorCode: null,
          errorDetail: null,
          startedAt: job.startedAt,
          completedAt,
        },
        update: {
          status: "READY",
          durationMs: result.durationMs,
          sampleRate: result.sampleRate,
          sourceSizeBytes: result.sourceSizeBytes === null ? null : BigInt(result.sourceSizeBytes),
          minMidi: result.minMidi,
          maxMidi: result.maxMidi,
          p10Midi: result.p10Midi,
          medianMidi: result.medianMidi,
          p90Midi: result.p90Midi,
          tessituraLowMidi: result.tessituraLowMidi,
          tessituraHighMidi: result.tessituraHighMidi,
          voicedRatio: result.voicedRatio,
          pitchStability: result.pitchStability,
          clippingRatio: result.clippingRatio,
          rmsDb: result.rmsDb,
          estimatedKey: result.estimatedKey,
          keyConfidence: result.keyConfidence,
          analyzer: result.analyzer,
          analyzerVersion: result.analyzerVersion,
          descriptors: (result.descriptors ?? {}) as Prisma.InputJsonValue,
          pipelineMetadata: {
            ytDlpVersion: result.ytDlpVersion,
            separator: result.separator,
            separatorVersion: result.separatorVersion,
            separatorModel: result.separatorModel,
          } as Prisma.InputJsonValue,
          cleanupConfirmed: true,
          errorCode: null,
          errorDetail: null,
          completedAt,
        },
      });
      await tx.songAnalysisJob.update({
        where: { id: job.id },
        data: {
          analysisId: analysis.id,
          status: "SUCCEEDED",
          errorCode: null,
          errorDetail: null,
          retryable: null,
          completedAt,
          leaseOwner: null,
          leaseExpiresAt: null,
          heartbeatAt: completedAt,
        },
      });
    });
  } catch (error) {
    await failure(job, error);
  } finally {
    stopHeartbeat();
  }
}

export async function runSongAnalysisWorkerOnce(owner: string, dependencies: SongAnalysisWorkerDependencies = {}) {
  const jobId = await claimNextSongAnalysisJob(owner);
  if (!jobId) return false;
  await processClaimedSongAnalysisJob(jobId, owner, dependencies);
  return true;
}
