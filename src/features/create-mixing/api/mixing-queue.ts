import "server-only";

import { MixingError } from "@/entities/mixing-job/index.server";
import { InsufficientTicketsError } from "@/entities/ticket/index.server";
import { synthesisReferenceContractVersion, type VocalProfileDescriptors } from "@/entities/vocal-profile/index.model";
import { getRecommendationItem } from "@/features/create-recommendation/index.server";
import { mixingMaxAttempts, mixingTicketCost } from "@/shared/config/index.server";
import { prisma } from "@/shared/db/index.server";
import { selectMixingReference } from "../model/reference";

function prismaErrorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
}

export async function enqueueMixingJob(input: {
  userId: string;
  vocalProfileId: string;
  songAnalysisId: string;
  idempotencyKey: string;
}) {
  if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 200) {
    throw new MixingError("INVALID_REQUEST", "유효한 idempotency key가 필요합니다.", 400);
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
              throw new MixingError("IDEMPOTENCY_CONFLICT", "다른 믹싱 요청에서 사용한 요청 키입니다.", 409);
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
            throw new MixingError("MIXING_SOURCE_NOT_FOUND", "사용할 추천 또는 보컬 프로필을 찾을 수 없습니다.", 404);
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
              "카탈로그가 변경되었습니다. 최신 추천 결과를 확인해주세요.",
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
            throw new MixingError("MIXING_REFERENCE_UNAVAILABLE", "저장된 레퍼런스 음성을 사용할 수 없습니다.", 422);
          }

          const debited = await tx.user.updateMany({
            where: { id: input.userId, ticketBalance: { gte: cost } },
            data: { ticketBalance: { decrement: cost } },
          });
          if (debited.count !== 1) {
            const owner = await tx.user.findUniqueOrThrow({
              where: { id: input.userId },
              select: { ticketBalance: true },
            });
            throw new InsufficientTicketsError(cost, owner.ticketBalance);
          }
          const owner = await tx.user.findUniqueOrThrow({
            where: { id: input.userId },
            select: { ticketBalance: true },
          });
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
          await tx.ticketLedger.create({
            data: {
              userId: input.userId,
              type: "MIXING_DEBIT",
              amount: -cost,
              balanceAfter: owner.ticketBalance,
              idempotencyKey: `mixing:debit:${job.id}`,
              mixingJobId: job.id,
              reason: "AI 믹싱",
            },
          });
          return job;
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (prismaErrorCode(error) === "P2034" && attempt < 2) continue;
      if (prismaErrorCode(error) === "P2002") {
        const existing = await prisma.mixingJob.findUnique({
          where: { userId_idempotencyKey: { userId: input.userId, idempotencyKey: input.idempotencyKey } },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }
  throw new MixingError("MIXING_ENQUEUE_FAILED", "믹싱 요청을 저장하지 못했습니다.", 503, true);
}
