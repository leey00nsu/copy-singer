import "server-only";

import { createNotification } from "@/entities/notification/index.server";
import { SYNTHESIS_PRESET } from "@/entities/recommendation/index.model";
import { applyTicketChange } from "@/entities/ticket/index.server";
import { mixingLeaseSeconds, mixingPollIntervalMs } from "@/shared/config/index.server";
import { prisma } from "@/shared/db/index.server";
import { type CompressedMixingAudio, compressMixingResult } from "@/shared/lib/audio/index.server";
import { discardMediaAsset, processOneMediaCleanup, storeMixingResult } from "@/shared/media/index.server";

type ModalJob = {
  id: string;
  status: "queued" | "processing" | "succeeded" | "failed";
  error?: string | null;
};

type WorkerDependencies = {
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  pollIntervalMs?: number;
  compressResult?: (bytes: Uint8Array) => Promise<CompressedMixingAudio>;
};

function defaultSleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

class MixingStageError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "MixingStageError";
  }
}

function retryableHttpStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

async function stageFetch(
  fetchImpl: typeof fetch,
  input: string,
  init: RequestInit,
  options: {
    code: string;
    message: string;
    networkRetryable: boolean;
    retryableStatus?: (status: number) => boolean;
  },
) {
  let response: Response;
  try {
    response = await fetchImpl(input, init);
  } catch (error) {
    throw new MixingStageError(
      options.code,
      `${options.message}: ${error instanceof Error ? error.message : "network error"}`,
      options.networkRetryable,
    );
  }
  if (!response.ok) {
    throw new MixingStageError(
      options.code,
      `${options.message} (${response.status})`,
      options.retryableStatus ? options.retryableStatus(response.status) : retryableHttpStatus(response.status),
    );
  }
  return response;
}

function modalConfig() {
  const url = process.env.MODAL_API_URL?.replace(/\/$/, "");
  const key = process.env.MODAL_API_KEY;
  if (!url || !key) {
    throw new MixingStageError("MODAL_NOT_CONFIGURED", "The conversion API is not configured.", false);
  }
  return { url, key };
}

async function mediaBytes(response: Response, code: string, message: string) {
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0) throw new MixingStageError(code, `${message}: empty audio`, false);
  return {
    bytes,
    contentType: response.headers.get("Content-Type")?.split(";")[0] || "application/octet-stream",
  };
}

export async function claimNextMixingJob(owner: string, candidateJobId: string | null = null) {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + mixingLeaseSeconds() * 1_000);
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    WITH candidate AS (
      SELECT "id"
      FROM "MixingJob"
      WHERE
        "attempts" < "maxAttempts"
        AND "nextAttemptAt" <= ${now}
        AND (${candidateJobId}::uuid IS NULL OR "id" = ${candidateJobId}::uuid)
        AND (
          "status" = 'PENDING'::"MixingJobStatus"
          OR (
            "status" IN ('PREPARING'::"MixingJobStatus", 'SUBMITTED'::"MixingJobStatus", 'PROCESSING'::"MixingJobStatus")
            AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" < ${now})
          )
        )
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE "MixingJob" AS job
    SET
      "status" = CASE WHEN job."status" = 'PENDING'::"MixingJobStatus" THEN 'PREPARING'::"MixingJobStatus" ELSE job."status" END,
      "leaseOwner" = ${owner},
      "leaseExpiresAt" = ${leaseUntil},
      "heartbeatAt" = ${now},
      "startedAt" = COALESCE(job."startedAt", ${now}),
      "attempts" = job."attempts" + 1,
      "errorCode" = NULL,
      "errorDetail" = NULL,
      "retryable" = NULL,
      "updatedAt" = ${now}
    FROM candidate
    WHERE job."id" = candidate."id"
    RETURNING job."id"
  `;
  return rows[0]?.id ?? null;
}

async function heartbeat(jobId: string, owner: string, status?: "SUBMITTED" | "PROCESSING") {
  const now = new Date();
  const updated = await prisma.mixingJob.updateMany({
    where: { id: jobId, leaseOwner: owner },
    data: {
      ...(status ? { status } : {}),
      heartbeatAt: now,
      leaseExpiresAt: new Date(now.getTime() + mixingLeaseSeconds() * 1_000),
    },
  });
  if (updated.count !== 1) throw new Error("Mixing job lease was lost.");
}

export async function ensureMixingRefund(jobId: string) {
  const job = await prisma.mixingJob.findUnique({ where: { id: jobId } });
  if (!job || job.refundState === "REFUNDED" || job.refundState !== "REQUIRED") return;
  await applyTicketChange({
    userId: job.userId,
    type: "MIXING_REFUND",
    amount: job.ticketCost,
    idempotencyKey: `mixing:refund:${job.id}`,
    mixingJobId: job.id,
    reason: "변환 서비스 접수 전 믹싱 실패 자동 환불",
  });
  await prisma.mixingJob.update({ where: { id: job.id }, data: { refundState: "REFUNDED" } });
}

function mixingFailure(error: unknown, submitted: boolean) {
  if (error instanceof MixingStageError) {
    return { code: error.code, detail: error.message, retryable: error.retryable };
  }
  return {
    code: submitted ? "MODAL_JOB_FAILED" : "MIXING_PREFLIGHT_FAILED",
    detail: error instanceof Error ? error.message : "믹싱 작업이 실패했습니다.",
    retryable: false,
  };
}

async function releaseMixingFailure(jobId: string, error: unknown, submitted: boolean) {
  const failure = mixingFailure(error, submitted);
  const job = await prisma.mixingJob.findUnique({
    where: { id: jobId },
    select: { attempts: true, maxAttempts: true, userId: true, song: { select: { title: true } } },
  });
  if (!job) return;

  const now = new Date();
  if (failure.retryable && job.attempts < job.maxAttempts) {
    const delaySeconds = Math.min(30, 2 ** Math.max(0, job.attempts - 1));
    const nextAttemptAt = new Date(now.getTime() + delaySeconds * 1_000);
    if (submitted) {
      await prisma.$executeRaw`
        UPDATE "MixingJob"
        SET
          "status" = 'SUBMITTED'::"MixingJobStatus",
          "nextAttemptAt" = ${nextAttemptAt},
          "errorCode" = ${failure.code},
          "errorDetail" = ${failure.detail.slice(0, 2000)},
          "retryable" = TRUE,
          "completedAt" = NULL,
          "leaseOwner" = NULL,
          "leaseExpiresAt" = NULL,
          "heartbeatAt" = ${now},
          "updatedAt" = ${now}
        WHERE "id" = ${jobId}::uuid
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE "MixingJob"
        SET
          "status" = 'PENDING'::"MixingJobStatus",
          "nextAttemptAt" = ${nextAttemptAt},
          "errorCode" = ${failure.code},
          "errorDetail" = ${failure.detail.slice(0, 2000)},
          "retryable" = TRUE,
          "completedAt" = NULL,
          "leaseOwner" = NULL,
          "leaseExpiresAt" = NULL,
          "heartbeatAt" = ${now},
          "updatedAt" = ${now}
        WHERE "id" = ${jobId}::uuid
      `;
    }
    return;
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.mixingJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        refundState: submitted ? "NONE" : "REQUIRED",
        errorCode: failure.code,
        errorDetail: failure.detail.slice(0, 2_000),
        retryable: failure.retryable,
        completedAt: now,
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    });
    await createNotification(
      {
        userId: job.userId,
        type: "MIXING_FAILED",
        title: "AI 믹싱을 완료하지 못했습니다",
        message: `${job.song.title} 작업을 확인하고 다시 시도해 주세요.`,
        href: `/library/mixes/${jobId}`,
        sourceId: jobId,
        dedupeKey: `mixing:${jobId}:failed`,
      },
      transaction,
    );
  });
  if (!submitted) await ensureMixingRefund(jobId);
}

export async function processClaimedMixingJob(jobId: string, owner: string, dependencies: WorkerDependencies = {}) {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const sleep = dependencies.sleep ?? defaultSleep;
  const pollInterval = dependencies.pollIntervalMs ?? mixingPollIntervalMs();
  const compressResult = dependencies.compressResult ?? compressMixingResult;
  let submitted = false;
  try {
    let job = await prisma.mixingJob.findFirst({
      where: { id: jobId, leaseOwner: owner },
      include: { referenceAsset: true, targetAsset: true, song: true },
    });
    if (!job) throw new Error("Claimed mixing job was not found.");
    submitted = Boolean(job.modalJobId);

    if (!job.modalJobId) {
      const referenceResponse = await stageFetch(
        fetchImpl,
        job.referenceAsset.externalUrl,
        { cache: "no-store", signal: AbortSignal.timeout(60_000) },
        {
          code: "REFERENCE_FETCH_FAILED",
          message: "저장된 레퍼런스 음성을 불러오지 못했습니다",
          networkRetryable: true,
        },
      );
      const reference = await mediaBytes(
        referenceResponse,
        "REFERENCE_FETCH_FAILED",
        "저장된 레퍼런스 음성을 불러오지 못했습니다",
      );
      if (!job.targetAsset || job.targetAsset.status !== "READY") {
        throw new MixingStageError(
          "CATALOG_TARGET_UNAVAILABLE",
          "이 곡의 믹싱용 target asset이 준비되지 않았습니다.",
          false,
        );
      }
      const targetResponse = await stageFetch(
        fetchImpl,
        job.targetAsset.externalUrl,
        { cache: "no-store", signal: AbortSignal.timeout(60_000) },
        {
          code: "CATALOG_TARGET_FETCH_FAILED",
          message: "저장된 추천 곡 target을 불러오지 못했습니다",
          networkRetryable: true,
        },
      );
      const targetAudio = await mediaBytes(
        targetResponse,
        "CATALOG_TARGET_FETCH_FAILED",
        "저장된 추천 곡 target을 불러오지 못했습니다",
      );
      const form = new FormData();
      form.append("prompt_audio", new Blob([reference.bytes], { type: reference.contentType }), "prompt.wav");
      form.append(
        "target_audio",
        new Blob([targetAudio.bytes], { type: job.targetAsset.mimeType }),
        job.targetAsset.fileName,
      );
      for (const [name, value] of Object.entries(SYNTHESIS_PRESET)) form.append(name, String(value));

      const modal = modalConfig();
      const response = await stageFetch(
        fetchImpl,
        `${modal.url}/v1/conversions`,
        {
          method: "POST",
          headers: { "X-API-Key": modal.key },
          body: form,
          cache: "no-store",
          signal: AbortSignal.timeout(15 * 60_000),
        },
        {
          code: "MODAL_SUBMIT_FAILED",
          message: "변환 서비스가 합성 요청을 접수하지 못했습니다",
          networkRetryable: false,
          retryableStatus: (status) => status === 429,
        },
      );
      const modalJob = (await response.json()) as ModalJob;
      if (!modalJob.id || modalJob.status !== "queued") {
        throw new MixingStageError(
          "MODAL_SUBMIT_INVALID_RESPONSE",
          "변환 서비스가 올바른 job 정보를 반환하지 않았습니다.",
          false,
        );
      }
      submitted = true;
      const now = new Date();
      job = await prisma.mixingJob.update({
        where: { id: job.id },
        data: { status: "SUBMITTED", modalJobId: modalJob.id, submittedAt: now, heartbeatAt: now },
        include: { referenceAsset: true, targetAsset: true, song: true },
      });
    }

    const modal = modalConfig();
    while (true) {
      const response = await stageFetch(
        fetchImpl,
        `${modal.url}/v1/conversions/${encodeURIComponent(job.modalJobId!)}`,
        {
          headers: { "X-API-Key": modal.key },
          cache: "no-store",
          signal: AbortSignal.timeout(30_000),
        },
        {
          code: "MODAL_STATUS_FETCH_FAILED",
          message: "변환 작업 상태 조회에 실패했습니다",
          networkRetryable: true,
        },
      );
      const modalJob = (await response.json()) as ModalJob;
      if (modalJob.status === "failed") {
        throw new MixingStageError("MODAL_JOB_FAILED", modalJob.error || "음성 합성 작업이 실패했습니다.", false);
      }
      if (modalJob.status === "succeeded") {
        const audioResponse = await stageFetch(
          fetchImpl,
          `${modal.url}/v1/conversions/${encodeURIComponent(job.modalJobId!)}/audio`,
          {
            headers: { "X-API-Key": modal.key },
            cache: "no-store",
            signal: AbortSignal.timeout(60_000),
          },
          {
            code: "MODAL_RESULT_FETCH_FAILED",
            message: "음성 합성 결과를 불러오지 못했습니다",
            networkRetryable: true,
          },
        );
        const audio = await mediaBytes(
          audioResponse,
          "MODAL_RESULT_FETCH_FAILED",
          "음성 합성 결과를 불러오지 못했습니다",
        );
        let compressed: CompressedMixingAudio;
        try {
          compressed = await compressResult(new Uint8Array(audio.bytes));
        } catch (error) {
          throw new MixingStageError(
            "MIXING_FINALIZATION_FAILED",
            `최종 음원 보정에 실패했습니다: ${error instanceof Error ? error.message : "unknown error"}`,
            true,
          );
        }
        const resultAsset = await storeMixingResult({
          userId: job.userId,
          mixingJobId: job.id,
          bytes: compressed.bytes,
          mimeType: compressed.mimeType,
          extension: compressed.extension,
          fetchImpl,
        });
        try {
          await prisma.$transaction(async (transaction) => {
            await transaction.mixingJob.update({
              where: { id: job.id },
              data: {
                status: "SUCCEEDED",
                resultAssetId: resultAsset.id,
                completedAt: new Date(),
                errorCode: null,
                errorDetail: null,
                leaseOwner: null,
                leaseExpiresAt: null,
              },
            });
            await createNotification(
              {
                userId: job.userId,
                type: "MIXING_SUCCEEDED",
                title: "AI 믹스가 완성되었습니다",
                message: `${job.song.title} 결과를 들어보세요.`,
                href: `/library/mixes/${job.id}`,
                sourceId: job.id,
                dedupeKey: `mixing:${job.id}:succeeded`,
              },
              transaction,
            );
          });
        } catch (error) {
          await discardMediaAsset(resultAsset.id);
          throw error;
        }
        return;
      }
      await heartbeat(job.id, owner, modalJob.status === "processing" ? "PROCESSING" : "SUBMITTED");
      await sleep(pollInterval);
    }
  } catch (error) {
    await releaseMixingFailure(jobId, error, submitted);
  }
}

export async function reconcileRequiredRefunds(limit = 10) {
  const jobs = await prisma.mixingJob.findMany({
    where: { refundState: "REQUIRED" },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true },
  });
  for (const job of jobs) await ensureMixingRefund(job.id);
}

export async function runMixingWorkerOnce(owner: string, dependencies: WorkerDependencies = {}) {
  await reconcileRequiredRefunds();
  await processOneMediaCleanup(dependencies.fetchImpl);
  const jobId = await claimNextMixingJob(owner);
  if (!jobId) return false;
  await processClaimedMixingJob(jobId, owner, dependencies);
  return true;
}
