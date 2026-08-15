import "server-only";

import { MixingError } from "@/entities/mixing-job/index.server";
import { applyTicketChangeInTransaction } from "@/entities/ticket/index.server";
import { synthesisReferenceContractVersion, type VocalProfileDescriptors } from "@/entities/vocal-profile/index.model";
import { getRecommendationItem } from "@/features/create-recommendation/index.server";
import { mixingMaxAttempts, mixingTicketCost } from "@/shared/config/index.server";
import { prisma } from "@/shared/db/index.server";
import { selectMixingReference } from "../model/reference";

function prismaErrorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
}

function isTransactionWriteConflict(error: unknown) {
  return prismaErrorCode(error) === "P2034" || (error instanceof Error && error.message === "TransactionWriteConflict");
}

export async function enqueueMixingJob(input: {
  userId: string;
  vocalProfileId: string;
  songAnalysisId: string;
  idempotencyKey: string;
}) {
  if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 200) {
    throw new MixingError("INVALID_REQUEST", "올바른 요청 키가 필요해요.", 400);
  }
  const { result, item } = await getRecommendationItem(input.vocalProfileId, input.songAnalysisId, input.userId);
  const cost = mixingTicketCost();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existing = await tx.mixingJob.findUnique({
            where: { userId_idempotencyKey: { userId: input.userId, idempotencyKey: input.idempotencyKey } },
          });
          if (existing) {
            if (existing.vocalProfileId !== input.vocalProfileId || existing.songAnalysisId !== input.songAnalysisId) {
              throw new MixingError("IDEMPOTENCY_CONFLICT", "다른 믹싱 요청에서 이미 사용한 요청 키예요.", 409);
            }
            return existing;
          }

          const profile = await tx.vocalProfile.findFirst({
            where: { id: input.vocalProfileId, userId: input.userId, sourceType: "USER" },
            include: {
              synthesisReferenceAsset: true,
              recording: { include: { mediaAsset: true } },
            },
          });
          const analysis = await tx.songAnalysis.findUnique({
            where: { id: input.songAnalysisId },
            include: {
              song: {
                include: {
                  targetAsset: true,
                  catalogEntries: {
                    where: { status: "PUBLISHED" },
                    include: { catalog: true },
                  },
                },
              },
            },
          });
          if (!profile || !analysis || analysis.status !== "READY") {
            throw new MixingError("MIXING_SOURCE_NOT_FOUND", "사용할 추천 또는 보컬 프로필을 찾을 수 없어요.", 404);
          }

          const entry = analysis.song.catalogEntries.find((candidate) => candidate.catalogId === result.catalogId);
          const targetAsset = analysis.song.targetAsset;
          if (
            analysis.song.lifecycleStatus !== "ACTIVE" ||
            analysis.song.currentAnalysisId !== analysis.id ||
            !entry ||
            entry.catalog.status !== "PUBLISHED" ||
            entry.catalog.revision !== result.catalogRevision ||
            entry.position !== item.catalogOrder ||
            !targetAsset ||
            targetAsset.id !== item.targetAssetId ||
            targetAsset.sourceId !== analysis.sourceId ||
            targetAsset.status !== "READY"
          ) {
            throw new MixingError(
              "MIXING_RECOMMENDATION_STALE",
              "카탈로그가 변경됐어요. 최신 추천 결과를 확인해 주세요.",
              409,
              true,
            );
          }

          const contractVersion = synthesisReferenceContractVersion(
            profile.descriptors as VocalProfileDescriptors | null,
          );
          const reference = selectMixingReference({
            userId: input.userId,
            smart: profile.synthesisReferenceAsset,
            source: profile.recording.mediaAsset,
            contractVersion,
          });
          if (!reference) {
            throw new MixingError("MIXING_REFERENCE_UNAVAILABLE", "저장된 레퍼런스 음성을 사용할 수 없어요.", 422);
          }

          const job = await tx.mixingJob.create({
            data: {
              userId: input.userId,
              vocalProfileId: profile.id,
              songId: analysis.songId,
              songAnalysisId: analysis.id,
              referenceAssetId: reference.id,
              targetAssetId: targetAsset.id,
              catalogPosition: item.catalogOrder,
              recommendedShift: item.recommendedShift,
              catalogRevision: result.catalogRevision,
              scoringVersion: result.scoringVersion,
              ticketCost: cost,
              idempotencyKey: input.idempotencyKey,
              maxAttempts: mixingMaxAttempts(),
            },
          });
          if (cost > 0) {
            await applyTicketChangeInTransaction(tx, {
              userId: input.userId,
              kind: "AI_MIXING",
              type: "USAGE_DEBIT",
              amount: -cost,
              idempotencyKey: `mixing:debit:${job.id}`,
              mixingJobId: job.id,
              reason: "AI 믹싱",
            });
          }
          return job;
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (isTransactionWriteConflict(error) && attempt < 2) continue;
      if (prismaErrorCode(error) === "P2002") {
        const existing = await prisma.mixingJob.findUnique({
          where: { userId_idempotencyKey: { userId: input.userId, idempotencyKey: input.idempotencyKey } },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }
  throw new MixingError("MIXING_ENQUEUE_FAILED", "믹싱 요청을 저장하지 못했어요.", 503, true);
}
