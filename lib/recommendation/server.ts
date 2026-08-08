import "server-only";

import artifactJson from "../../data/catalogs/tj-2607-song-profiles.json";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../db/prisma";
import type { KeyFitProfile, KeyFitReasonCode } from "../key-fit/contract";
import {
  RecommendationError,
  type RecommendationRunResponse,
  type RecommendationScoreMetrics,
} from "./contract";
import { buildRankedRecommendations } from "./data";
import { formatRecommendationReasons } from "./ranking";
import { parseSynthesisAttempts, toPublicSynthesisStatus } from "./synthesis-state";

const runInclude = {
  userVocalProfile: true,
  items: {
    include: {
      song: true,
      mixingJobs: {
        include: { resultAsset: true },
        orderBy: { createdAt: "desc" as const },
        take: 1,
      },
    },
    orderBy: { rank: "asc" as const },
  },
};

type StoredRun = Prisma.RecommendationRunGetPayload<{ include: typeof runInclude }>;

function requiredProfile(profile: {
  sourceType: string;
  minMidi: number | null;
  maxMidi: number | null;
  p10Midi: number | null;
  medianMidi: number | null;
  p90Midi: number | null;
  tessituraLowMidi: number | null;
  tessituraHighMidi: number | null;
  voicedRatio: number | null;
  pitchStability: number | null;
  clippingRatio: number | null;
  analyzer: string;
  analyzerVersion: string;
}): KeyFitProfile {
  if (profile.sourceType !== "USER") {
    throw new RecommendationError("INVALID_PROFILE", "Only USER vocal profiles can create recommendations.", {
      status: 422,
    });
  }
  const fields = [
    "minMidi",
    "maxMidi",
    "p10Midi",
    "medianMidi",
    "p90Midi",
    "tessituraLowMidi",
    "tessituraHighMidi",
    "voicedRatio",
    "pitchStability",
    "clippingRatio",
  ] as const;
  for (const field of fields) {
    if (!Number.isFinite(profile[field])) {
      throw new RecommendationError("INVALID_PROFILE", `Vocal profile is missing ${field}.`, {
        status: 422,
        details: { field },
      });
    }
  }
  return profile as KeyFitProfile;
}

function parseMetrics(value: Prisma.JsonValue): RecommendationScoreMetrics {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RecommendationError("RECOMMENDATION_SAVE_FAILED", "Stored recommendation metrics are invalid.", {
      status: 500,
    });
  }
  return value as unknown as RecommendationScoreMetrics;
}

function parseReasonCodes(value: Prisma.JsonValue): KeyFitReasonCode[] {
  if (!Array.isArray(value) || value.some((code) => typeof code !== "string")) {
    throw new RecommendationError("RECOMMENDATION_SAVE_FAILED", "Stored recommendation reasons are invalid.", {
      status: 500,
    });
  }
  return value as KeyFitReasonCode[];
}

export function serializeRecommendationRun(run: StoredRun): RecommendationRunResponse {
  const profile = requiredProfile(run.userVocalProfile);
  const items = run.items.map((item) => {
    const metrics = parseMetrics(item.metrics);
    const reasonCodes = parseReasonCodes(item.reasonCodes);
    const mixing = item.mixingJobs[0];
    const mixingStatus = mixing
      ? ({
          PENDING: "preparing",
          PREPARING: "preparing",
          SUBMITTED: "queued",
          PROCESSING: "processing",
          SUCCEEDED: "succeeded",
          FAILED: "failed",
          CANCELED: "failed",
        } as const)[mixing.status]
      : null;
    return {
      id: item.id,
      rank: item.rank,
      songId: item.songId,
      catalogOrder: item.song.catalogOrder,
      title: item.song.title,
      artist: item.song.artist,
      sourceUrl:
        item.song.metadata && typeof item.song.metadata === "object" && !Array.isArray(item.song.metadata)
          ? (() => {
              const catalog = item.song.metadata.catalog;
              return catalog && typeof catalog === "object" && !Array.isArray(catalog)
                ? String(catalog.sourceUrl ?? "")
                : "";
            })()
          : "",
      originalKeyScore: item.originalKeyScore,
      adjustedScore: item.adjustedScore,
      selectionScore: Number.isFinite(metrics.selectionScore) ? metrics.selectionScore! : null,
      recommendedShift: item.recommendedShift,
      reasonCodes,
      reasons: formatRecommendationReasons({
        reasonCodes,
        originalKeyScore: item.originalKeyScore,
        adjustedScore: item.adjustedScore,
        recommendedShift: item.recommendedShift,
        original: metrics.original,
        recommended: metrics.recommended,
      }),
      metrics,
      synthesis: {
        status: mixingStatus ?? (item.synthesisStatus ? toPublicSynthesisStatus(item.synthesisStatus) : "not_started" as const),
        jobId: mixing?.id ?? item.synthesisJobId,
        error: mixing?.status === "FAILED" && mixing.errorCode
          ? {
              code: mixing.errorCode,
              detail: mixing.errorDetail ?? "합성 작업을 완료하지 못했습니다.",
              retryable: mixing.retryable ?? false,
            }
          : item.synthesisErrorCode
          ? {
              code: item.synthesisErrorCode,
              detail: item.synthesisErrorDetail ?? "합성 작업을 완료하지 못했습니다.",
              retryable: item.synthesisRetryable ?? false,
            }
          : null,
        startedAt: mixing?.startedAt?.toISOString() ?? item.synthesisStartedAt?.toISOString() ?? null,
        updatedAt: mixing?.updatedAt.toISOString() ?? item.synthesisUpdatedAt?.toISOString() ?? null,
        completedAt: mixing?.completedAt?.toISOString() ?? item.synthesisCompletedAt?.toISOString() ?? null,
        expiresAt: mixing ? null : item.synthesisExpiresAt?.toISOString() ?? null,
        attemptCount: mixing?.attempts ?? parseSynthesisAttempts(item.synthesisAttempts).length + (item.synthesisStatus ? 1 : 0),
        audioUrl:
          mixing?.status === "SUCCEEDED" && mixing.resultAsset?.status === "READY"
            ? `/api/mixing-jobs/${mixing.id}/audio`
            : item.synthesisStatus === "SUCCEEDED"
            ? `/api/recommendations/${run.id}/items/${item.id}/synthesis/audio`
            : null,
      },
    };
  });
  const profileConfidence = items[0]?.metrics.confidence ?? 0;
  return {
    id: run.id,
    userVocalProfileId: run.userVocalProfileId,
    scoringVersion: run.scoringVersion,
    createdAt: run.createdAt.toISOString(),
    profileConfidence,
    lowConfidence: profileConfidence < 0.6,
    profile: {
      analyzer: profile.analyzer,
      analyzerVersion: profile.analyzerVersion,
      tessituraLowMidi: profile.tessituraLowMidi,
      tessituraHighMidi: profile.tessituraHighMidi,
      minMidi: profile.minMidi,
      maxMidi: profile.maxMidi,
    },
    items,
  };
}

export async function createRecommendationRun(userVocalProfileId: string, userId?: string) {
  const profileRow = await prisma.vocalProfile.findFirst({
    where: { id: userVocalProfileId, ...(userId ? { userId } : {}) },
  });
  if (!profileRow) {
    throw new RecommendationError("INVALID_PROFILE", "Vocal profile was not found.", { status: 404 });
  }
  const profile = requiredProfile(profileRow);
  const songs = await prisma.song.findMany({
    where: { catalogOrder: { gte: 1, lte: 100 } },
    orderBy: { catalogOrder: "asc" },
  });
  const ranked = buildRankedRecommendations(profile, songs, artifactJson);

  try {
    const run = await prisma.recommendationRun.create({
      data: {
        userId,
        userVocalProfileId,
        scoringVersion: ranked[0]!.scoringVersion,
        items: {
          create: ranked.map((item) => ({
            songId: item.songId,
            rank: item.rank,
            originalKeyScore: item.originalKeyScore,
            adjustedScore: item.adjustedScore,
            recommendedShift: item.recommendedShift,
            reasonCodes: item.reasonCodes as Prisma.InputJsonValue,
            metrics: {
              confidence: item.confidence,
              selectionScore: item.selectionScore,
              original: item.original,
              recommended: item.recommended,
            } as Prisma.InputJsonValue,
          })),
        },
      },
      include: runInclude,
    });
    return serializeRecommendationRun(run);
  } catch (error) {
    console.error("Could not persist recommendation run", error instanceof Error ? error.message : "unknown error");
    throw new RecommendationError("RECOMMENDATION_SAVE_FAILED", "Recommendation could not be saved.", {
      status: 500,
      retryable: true,
    });
  }
}

export async function getRecommendationRun(id: string, userId?: string) {
  const run = await prisma.recommendationRun.findFirst({
    where: { id, ...(userId ? { userId } : {}) },
    include: runInclude,
  });
  if (!run) {
    throw new RecommendationError("RECOMMENDATION_NOT_FOUND", "Recommendation was not found.", {
      status: 404,
    });
  }
  return serializeRecommendationRun(run);
}

export async function deleteRecommendationRun(id: string, userId?: string) {
  const run = await prisma.recommendationRun.findFirst({
    where: { id, ...(userId ? { userId } : {}) },
    select: { id: true },
  });
  if (!run) {
    throw new RecommendationError("RECOMMENDATION_NOT_FOUND", "Recommendation was not found.", {
      status: 404,
    });
  }
  const { cleanupRecommendationSyntheses } = await import("./synthesis");
  await cleanupRecommendationSyntheses(id);
  await prisma.recommendationRun.delete({ where: { id } });
  return { status: "deleted" as const, id };
}
