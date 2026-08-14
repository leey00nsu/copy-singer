import "server-only";

import {
  formatRecommendationReasons,
  type KeyFitProfile,
  parseYouTubeVideoId,
  projectRecommendationSongProfile,
  RecommendationError,
  type RecommendationRunResponse,
} from "@/entities/recommendation/index.model";
import { loadPublishedCatalog } from "@/entities/song-catalog/index.server";
import {
  mixingReferenceCapability,
  synthesisReferenceContractVersion,
  type VocalProfileDescriptors,
} from "@/entities/vocal-profile/index.model";
import { prisma } from "@/shared/db/index.server";
import { buildRankedDatabaseRecommendations } from "../lib/recommendation-data";

const profileInclude = {
  synthesisReferenceAsset: { select: { userId: true, kind: true, status: true } },
  recording: {
    include: { mediaAsset: { select: { userId: true, kind: true, status: true } } },
  },
} as const;

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

function publicMixingStatus(status: string) {
  return (
    {
      PENDING: "preparing",
      PREPARING: "preparing",
      SUBMITTED: "queued",
      PROCESSING: "processing",
      SUCCEEDED: "succeeded",
      FAILED: "failed",
      CANCELED: "failed",
    } as const
  )[status as "PENDING" | "PREPARING" | "SUBMITTED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELED"];
}

export async function getRecommendationResult(
  userVocalProfileId: string,
  userId?: string,
): Promise<RecommendationRunResponse> {
  const profileRow = await prisma.vocalProfile.findFirst({
    where: { id: userVocalProfileId, ...(userId ? { userId } : {}) },
    include: profileInclude,
  });
  if (!profileRow) {
    throw new RecommendationError("RECOMMENDATION_NOT_FOUND", "Recommendation profile was not found.", {
      status: 404,
    });
  }

  const profile = requiredProfile(profileRow);
  const { catalog, rows } = await prisma.$transaction(
    async (tx) => {
      const catalog = await tx.catalog.findFirst({ where: { status: "PUBLISHED" }, orderBy: { createdAt: "asc" } });
      if (!catalog) {
        throw new RecommendationError("CATALOG_NOT_READY", "Published catalog was not found.", {
          status: 503,
          retryable: true,
        });
      }
      return { catalog, rows: await loadPublishedCatalog(tx, catalog.slug) };
    },
    { isolationLevel: "RepeatableRead" },
  );
  const ranked = buildRankedDatabaseRecommendations(profile, rows);
  const scoringVersion = ranked[0]?.scoringVersion;
  if (!scoringVersion) {
    throw new RecommendationError("CATALOG_NOT_READY", "Published catalog could not be scored.", {
      status: 503,
      retryable: true,
    });
  }

  const analysisIds = ranked.map((item) => item.songAnalysisId);
  const mixingJobs = userId
    ? await prisma.mixingJob.findMany({
        where: { userId, vocalProfileId: userVocalProfileId, songAnalysisId: { in: analysisIds } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: { resultAsset: { select: { status: true } } },
      })
    : [];
  const latestMixingByAnalysis = new Map<string, (typeof mixingJobs)[number]>();
  for (const job of mixingJobs) {
    if (!latestMixingByAnalysis.has(job.songAnalysisId)) latestMixingByAnalysis.set(job.songAnalysisId, job);
  }
  const rowByPosition = new Map(rows.map((row) => [row.position, row]));

  const profileOwnerId = profileRow.userId;
  const smartReference = profileRow.synthesisReferenceAsset;
  const sourceReference = profileRow.recording.mediaAsset;
  const mixing = mixingReferenceCapability({
    smartReady:
      profileOwnerId !== null &&
      smartReference?.userId === profileOwnerId &&
      smartReference.kind === "SYNTHESIS_REFERENCE" &&
      smartReference.status === "READY",
    sourceReady:
      profileOwnerId !== null &&
      sourceReference?.userId === profileOwnerId &&
      sourceReference.kind === "REFERENCE" &&
      sourceReference.status === "READY",
    contractVersion: synthesisReferenceContractVersion(profileRow.descriptors as VocalProfileDescriptors | null),
  });

  const items = ranked.map((item) => {
    const row = rowByPosition.get(item.catalogOrder);
    const analysis = row?.song.currentAnalysis;
    const source = row?.song.activeSource;
    const target = row?.song.targetAsset;
    if (!row || !analysis || !source || !target || analysis.id !== item.songAnalysisId) {
      throw new RecommendationError("CATALOG_NOT_READY", "Ranked catalog revision could not be resolved.", {
        status: 503,
        retryable: true,
        details: { catalogPosition: item.catalogOrder },
      });
    }
    const job = latestMixingByAnalysis.get(analysis.id);
    const status = job ? publicMixingStatus(job.status) : ("not_started" as const);
    return {
      id: analysis.id,
      songAnalysisId: analysis.id,
      targetAssetId: target.id,
      rank: item.rank,
      songId: row.song.id,
      catalogOrder: row.position,
      title: row.song.title,
      artist: row.song.artist,
      originalKey: row.song.originalKey?.trim() || null,
      songProfile: projectRecommendationSongProfile(analysis),
      sourceUrl: source.sourceUrl,
      sourceVideoId: parseYouTubeVideoId(source.sourceVideoId),
      originalKeyScore: item.originalKeyScore,
      adjustedScore: item.adjustedScore,
      selectionScore: item.selectionScore,
      recommendedShift: item.recommendedShift,
      reasonCodes: item.reasonCodes,
      reasons: formatRecommendationReasons(item),
      metrics: {
        confidence: item.confidence,
        selectionScore: item.selectionScore,
        original: item.original,
        recommended: item.recommended,
      },
      synthesis: {
        status,
        jobId: job?.id ?? null,
        error:
          job?.status === "FAILED" && job.errorCode
            ? {
                code: job.errorCode,
                detail: job.errorDetail ?? "믹싱 작업을 완료하지 못했어요.",
                retryable: job.retryable ?? false,
              }
            : null,
        startedAt: job?.startedAt?.toISOString() ?? null,
        updatedAt: job?.updatedAt.toISOString() ?? null,
        completedAt: job?.completedAt?.toISOString() ?? null,
        expiresAt: null,
        attemptCount: job?.attempts ?? 0,
        audioUrl:
          job?.status === "SUCCEEDED" && job.resultAsset?.status === "READY"
            ? `/api/mixing-jobs/${job.id}/audio`
            : null,
      },
    };
  });

  const profileConfidence = items[0]?.metrics.confidence ?? 0;
  return {
    id: profileRow.id,
    userVocalProfileId: profileRow.id,
    catalogId: catalog.id,
    catalogRevision: catalog.revision,
    scoringVersion,
    calculatedAt: new Date().toISOString(),
    profileConfidence,
    lowConfidence: profileConfidence < 0.6,
    profile: {
      analyzer: profile.analyzer,
      analyzerVersion: profile.analyzerVersion,
      tessituraLowMidi: profile.tessituraLowMidi,
      tessituraHighMidi: profile.tessituraHighMidi,
      minMidi: profile.minMidi,
      maxMidi: profile.maxMidi,
      mixing,
    },
    items,
  };
}

export async function getRecommendationItem(userVocalProfileId: string, songAnalysisId: string, userId: string) {
  const result = await getRecommendationResult(userVocalProfileId, userId);
  const item = result.items.find((candidate) => candidate.songAnalysisId === songAnalysisId);
  if (!item) {
    throw new RecommendationError("RECOMMENDATION_NOT_FOUND", "Recommendation item was not found.", { status: 404 });
  }
  return { result, item };
}
