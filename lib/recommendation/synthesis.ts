import "server-only";

import { vocalProfileAnalyzerUrl } from "@/shared/config/index.server";
import { prisma } from "@/shared/db/index.server";
import artifactJson from "../../data/catalogs/tj-2607-song-profiles.json";
import type { Prisma } from "../../generated/prisma/client";
import { RecommendationError } from "./contract";
import { getRecommendationRun } from "./server";
import {
  appendSynthesisAttempt,
  type StoredSynthesisStatus,
  SYNTHESIS_PRESET,
  toPublicSynthesisStatus,
} from "./synthesis-state";

const MODAL_RESULT_TTL_MS = 24 * 60 * 60 * 1_000;
const PREPARING_STALE_MS = 15 * 60 * 1_000;

type ModalJob = {
  id: string;
  status: "queued" | "processing" | "succeeded" | "failed";
  created_at: number;
  error?: string | null;
};

function modalConfig() {
  const url = process.env.MODAL_API_URL?.replace(/\/$/, "");
  const key = process.env.MODAL_API_KEY;
  if (!url || !key) {
    throw new RecommendationError("SYNTHESIS_UPSTREAM_FAILED", "Modal API is not configured.", {
      status: 503,
      retryable: true,
    });
  }
  return { url, key };
}

function safeDetail(error: unknown, fallback: string) {
  return error instanceof RecommendationError ? error.message : fallback;
}

async function requireMedia(response: Response, code: "SYNTHESIS_PREFLIGHT_FAILED" | "SYNTHESIS_MEDIA_FAILED") {
  if (!response.ok) {
    throw new RecommendationError(
      code,
      code === "SYNTHESIS_PREFLIGHT_FAILED"
        ? "보컬 원본을 찾을 수 없습니다. 다시 녹음해주세요."
        : "추천 곡의 임시 오디오를 준비하지 못했습니다.",
      {
        status: response.status === 404 ? 422 : 502,
        retryable: code === "SYNTHESIS_MEDIA_FAILED",
      },
    );
  }
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0) {
    throw new RecommendationError(code, "준비된 오디오가 비어 있습니다.", {
      status: 502,
      retryable: true,
    });
  }
  return {
    bytes,
    contentType: response.headers.get("content-type")?.split(";")[0] || "application/octet-stream",
  };
}

function catalogMedia(song: {
  catalogOrder: number;
  title: string;
  artist: string;
  metadata: Prisma.JsonValue | null;
}) {
  const artifact = artifactJson.songs[song.catalogOrder - 1];
  const metadata =
    song.metadata && typeof song.metadata === "object" && !Array.isArray(song.metadata) ? song.metadata.catalog : null;
  if (
    !artifact ||
    artifact.catalogOrder !== song.catalogOrder ||
    artifact.title !== song.title ||
    artifact.artist !== song.artist ||
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata) ||
    metadata.sourceUrl !== artifact.sourceUrl ||
    metadata.sourceVideoId !== artifact.sourceVideoId
  ) {
    throw new RecommendationError("SYNTHESIS_PREFLIGHT_FAILED", "추천 곡 정보가 allowlist와 일치하지 않습니다.", {
      status: 422,
      retryable: false,
    });
  }
  return { sourceUrl: artifact.sourceUrl, sourceVideoId: artifact.sourceVideoId };
}

async function acquireStart(runId: string, itemId: string, retry: boolean) {
  const item = await prisma.recommendationItem.findFirst({
    where: { id: itemId, runId },
    include: {
      song: true,
      run: { include: { userVocalProfile: { include: { recording: true } } } },
    },
  });
  if (!item) {
    throw new RecommendationError("SYNTHESIS_NOT_FOUND", "추천 곡을 찾을 수 없습니다.", { status: 404 });
  }
  const recording = item.run.userVocalProfile.recording;
  if (
    item.run.userVocalProfile.sourceType !== "USER" ||
    recording.kind !== "USER_TEST" ||
    recording.status !== "READY" ||
    !recording.expiresAt ||
    recording.expiresAt <= new Date()
  ) {
    throw new RecommendationError("SYNTHESIS_PREFLIGHT_FAILED", "보컬 원본이 만료됐습니다. 다시 녹음해주세요.", {
      status: 422,
      retryable: false,
    });
  }

  const expectedStatus = retry ? "FAILED" : null;
  if (item.synthesisStatus !== expectedStatus) return { owned: false as const, item };
  const now = new Date();
  const previousHistory = retry
    ? appendSynthesisAttempt(item.synthesisAttempts, {
        jobId: item.synthesisJobId,
        status: toPublicSynthesisStatus(item.synthesisStatus!),
        errorCode: item.synthesisErrorCode,
        errorDetail: item.synthesisErrorDetail,
        startedAt: item.synthesisStartedAt?.toISOString() ?? null,
        completedAt: item.synthesisCompletedAt?.toISOString() ?? null,
      })
    : item.synthesisAttempts;
  const claimed = await prisma.recommendationItem.updateMany({
    where: { id: item.id, runId, synthesisStatus: expectedStatus },
    data: {
      synthesisStatus: "PREPARING",
      synthesisJobId: null,
      synthesisErrorCode: null,
      synthesisErrorDetail: null,
      synthesisRetryable: null,
      synthesisAttempts: previousHistory as Prisma.InputJsonValue,
      synthesisStartedAt: now,
      synthesisUpdatedAt: now,
      synthesisCompletedAt: null,
      synthesisExpiresAt: null,
    },
  });
  return { owned: claimed.count === 1, item } as const;
}

async function markFailed(itemId: string, error: unknown) {
  const known = error instanceof RecommendationError ? error : null;
  await prisma.recommendationItem.update({
    where: { id: itemId },
    data: {
      synthesisStatus: "FAILED",
      synthesisErrorCode: known?.code ?? "SYNTHESIS_UPSTREAM_FAILED",
      synthesisErrorDetail: safeDetail(error, "합성 작업을 시작하지 못했습니다."),
      synthesisRetryable: known?.retryable ?? true,
      synthesisUpdatedAt: new Date(),
      synthesisCompletedAt: new Date(),
    },
  });
}

export async function startRecommendationSynthesis(runId: string, itemId: string, retry = false) {
  const acquired = await acquireStart(runId, itemId, retry);
  if (!acquired.owned) return getRecommendationRun(runId);

  try {
    const analyzer = vocalProfileAnalyzerUrl();
    if (!analyzer) {
      throw new RecommendationError("SYNTHESIS_PREFLIGHT_FAILED", "Local vocal analyzer is not configured.", {
        status: 503,
        retryable: true,
      });
    }
    const recording = acquired.item.run.userVocalProfile.recording;
    const target = catalogMedia(acquired.item.song);

    // Reference preflight always completes before target download to avoid unnecessary work and cost.
    const referenceResponse = await fetch(`${analyzer}/v1/recordings/${encodeURIComponent(recording.id)}/source`, {
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    const reference = await requireMedia(referenceResponse, "SYNTHESIS_PREFLIGHT_FAILED");
    const targetResponse = await fetch(`${analyzer}/v1/song-target`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceUrl: target.sourceUrl, expectedVideoId: target.sourceVideoId }),
      cache: "no-store",
      signal: AbortSignal.timeout(15 * 60_000),
    });
    const targetAudio = await requireMedia(targetResponse, "SYNTHESIS_MEDIA_FAILED");

    const form = new FormData();
    form.append(
      "prompt_audio",
      new Blob([reference.bytes], { type: reference.contentType }),
      `prompt.${reference.contentType.includes("wav") ? "wav" : "audio"}`,
    );
    form.append("target_audio", new Blob([targetAudio.bytes], { type: targetAudio.contentType }), "target.wav");
    for (const [name, value] of Object.entries(SYNTHESIS_PRESET)) form.append(name, String(value));

    const modal = modalConfig();
    const response = await fetch(`${modal.url}/v1/conversions`, {
      method: "POST",
      headers: { "X-API-Key": modal.key },
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(15 * 60_000),
    });
    if (!response.ok) {
      throw new RecommendationError(
        "SYNTHESIS_UPSTREAM_FAILED",
        `Modal이 합성 요청을 거부했습니다. (${response.status})`,
        {
          status: 502,
          retryable: response.status >= 500 || response.status === 429,
        },
      );
    }
    const job = (await response.json()) as ModalJob;
    if (!job.id || job.status !== "queued") {
      throw new RecommendationError("SYNTHESIS_UPSTREAM_FAILED", "Modal이 올바른 job 정보를 반환하지 않았습니다.", {
        status: 502,
        retryable: true,
      });
    }
    const now = new Date();
    await prisma.recommendationItem.update({
      where: { id: itemId },
      data: {
        synthesisStatus: "QUEUED",
        synthesisJobId: job.id,
        synthesisUpdatedAt: now,
        synthesisExpiresAt: new Date(now.getTime() + MODAL_RESULT_TTL_MS),
      },
    });
  } catch (error) {
    await markFailed(itemId, error);
  }
  return getRecommendationRun(runId);
}

function storedModalStatus(status: ModalJob["status"]): StoredSynthesisStatus {
  return status.toUpperCase() as StoredSynthesisStatus;
}

async function fetchModalJob(jobId: string) {
  const modal = modalConfig();
  const response = await fetch(`${modal.url}/v1/conversions/${encodeURIComponent(jobId)}`, {
    headers: { "X-API-Key": modal.key },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 410) return { id: jobId, status: "failed", error: "RESULT_EXPIRED" } as ModalJob;
  if (!response.ok) throw new Error(`Modal status ${response.status}`);
  return response.json() as Promise<ModalJob>;
}

export async function reconcileRecommendationSyntheses(runId: string) {
  const now = new Date();
  await prisma.recommendationItem.updateMany({
    where: {
      runId,
      synthesisStatus: "PREPARING",
      synthesisUpdatedAt: { lt: new Date(now.getTime() - PREPARING_STALE_MS) },
    },
    data: {
      synthesisStatus: "FAILED",
      synthesisErrorCode: "SYNTHESIS_PREPARING_TIMEOUT",
      synthesisErrorDetail: "오디오 준비 시간이 초과됐습니다. 이 곡을 다시 시도해주세요.",
      synthesisRetryable: true,
      synthesisUpdatedAt: now,
      synthesisCompletedAt: now,
    },
  });
  const items = await prisma.recommendationItem.findMany({
    where: { runId, synthesisStatus: { in: ["QUEUED", "PROCESSING"] }, synthesisJobId: { not: null } },
  });
  await Promise.all(
    items.map(async (item) => {
      try {
        const job = await fetchModalJob(item.synthesisJobId!);
        const next = storedModalStatus(job.status);
        if (item.synthesisStatus === "PROCESSING" && next === "QUEUED") return;
        await prisma.recommendationItem.update({
          where: { id: item.id },
          data: {
            synthesisStatus: next,
            synthesisErrorCode:
              next === "FAILED"
                ? job.error === "RESULT_EXPIRED"
                  ? "SYNTHESIS_EXPIRED"
                  : "SYNTHESIS_UPSTREAM_FAILED"
                : null,
            synthesisErrorDetail:
              next === "FAILED"
                ? job.error === "RESULT_EXPIRED"
                  ? "합성 결과가 만료됐습니다."
                  : "Modal 합성 작업이 실패했습니다."
                : null,
            synthesisRetryable: next === "FAILED" ? true : null,
            synthesisUpdatedAt: new Date(),
            synthesisCompletedAt: ["SUCCEEDED", "FAILED"].includes(next) ? new Date() : null,
          },
        });
      } catch {
        // A transient status failure must not replace a live job with a terminal failure.
      }
    }),
  );
}

export async function recommendationSynthesisAudio(runId: string, itemId: string, range: string | null) {
  const item = await prisma.recommendationItem.findFirst({ where: { id: itemId, runId } });
  if (!item || item.synthesisStatus !== "SUCCEEDED" || !item.synthesisJobId) {
    throw new RecommendationError("SYNTHESIS_NOT_FOUND", "완료된 합성 결과를 찾을 수 없습니다.", { status: 404 });
  }
  const modal = modalConfig();
  return fetch(`${modal.url}/v1/conversions/${encodeURIComponent(item.synthesisJobId)}/audio`, {
    headers: { "X-API-Key": modal.key, ...(range ? { Range: range } : {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
}

export async function cleanupRecommendationSyntheses(runId: string) {
  const items = await prisma.recommendationItem.findMany({
    where: { runId, synthesisJobId: { not: null } },
    select: { synthesisJobId: true },
  });
  const modal = items.length ? modalConfig() : null;
  for (const item of items) {
    const response = await fetch(`${modal!.url}/v1/conversions/${encodeURIComponent(item.synthesisJobId!)}`, {
      method: "DELETE",
      headers: { "X-API-Key": modal!.key },
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok && response.status !== 404) {
      throw new RecommendationError("SYNTHESIS_CLEANUP_FAILED", "외부 합성 파일을 정리하지 못했습니다.", {
        status: 502,
        retryable: true,
      });
    }
  }
}
