import "server-only";

import { InsufficientTicketsError } from "@/entities/ticket/index.server";
import { synthesisReferenceContractVersion, type VocalProfileDescriptors } from "@/entities/vocal-profile";
import { MixingError } from "@/lib/mixing/contract";
import { selectMixingReference } from "@/lib/mixing/reference";
import { mixingMaxAttempts, mixingTicketCost } from "@/shared/config/index.server";
import { prisma } from "@/shared/db/index.server";

function prismaErrorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
}

export async function enqueueMixingJob(input: {
  userId: string;
  recommendationItemId: string;
  idempotencyKey: string;
}) {
  if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 200) {
    throw new MixingError("INVALID_REQUEST", "유효한 idempotency key가 필요합니다.", 400);
  }
  const cost = mixingTicketCost();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existing = await tx.mixingJob.findUnique({
            where: { userId_idempotencyKey: { userId: input.userId, idempotencyKey: input.idempotencyKey } },
          });
          if (existing) return existing;

          const item = await tx.recommendationItem.findFirst({
            where: { id: input.recommendationItemId, run: { userId: input.userId } },
            include: {
              song: { include: { targetAsset: true } },
              run: {
                include: {
                  userVocalProfile: {
                    include: {
                      synthesisReferenceAsset: true,
                      recording: { include: { mediaAsset: true } },
                    },
                  },
                },
              },
            },
          });
          const profile = item?.run.userVocalProfile;
          if (!item || !profile || profile.userId !== input.userId || profile.sourceType !== "USER") {
            throw new MixingError("MIXING_SOURCE_NOT_FOUND", "사용할 추천 또는 보컬 프로필을 찾을 수 없습니다.", 404);
          }
          const smartReference = profile.synthesisReferenceAsset;
          const sourceReference = profile.recording.mediaAsset;
          const contractVersion = synthesisReferenceContractVersion(
            profile.descriptors as VocalProfileDescriptors | null,
          );
          const reference = selectMixingReference({
            userId: input.userId,
            smart: smartReference,
            source: sourceReference,
            contractVersion,
          });
          if (!reference) {
            throw new MixingError("MIXING_REFERENCE_UNAVAILABLE", "저장된 레퍼런스 음성을 사용할 수 없습니다.", 422);
          }
          const targetAsset = item.song.targetAsset;
          if (!targetAsset || targetAsset.status !== "READY") {
            throw new MixingError(
              "MIXING_TARGET_UNAVAILABLE",
              "이 곡의 믹싱용 원곡 target이 아직 준비되지 않았습니다.",
              422,
            );
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
              songId: item.songId,
              recommendationItemId: item.id,
              referenceAssetId: reference.id,
              targetAssetId: targetAsset.id,
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
