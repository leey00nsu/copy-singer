import "server-only";

import { MixingJobStatus, prisma } from "@/shared/db/index.server";
import { deleteOrScheduleMediaAsset } from "@/shared/media/index.server";
import { MixingError } from "../model/contract";

const TERMINAL_STATUSES = [MixingJobStatus.SUCCEEDED, MixingJobStatus.FAILED, MixingJobStatus.CANCELED] as const;

export async function deleteMixingJobForUser(userId: string, id: string) {
  const resultAssetId = await prisma.$transaction(async (transaction) => {
    const job = await transaction.mixingJob.findFirst({
      where: { id, userId },
      select: {
        status: true,
        resultAsset: { select: { id: true, userId: true, kind: true } },
      },
    });
    if (!job) throw new MixingError("MIXING_NOT_FOUND", "믹싱 작업을 찾을 수 없어요.", 404);
    if (!TERMINAL_STATUSES.includes(job.status as (typeof TERMINAL_STATUSES)[number])) {
      throw new MixingError("MIXING_ACTIVE", "진행 중인 믹싱 작업은 삭제할 수 없어요.", 409);
    }
    if (job.resultAsset && (job.resultAsset.userId !== userId || job.resultAsset.kind !== "MIX_RESULT")) {
      throw new MixingError("MIXING_RESULT_INVALID", "믹싱 결과 파일을 확인할 수 없어요.", 500);
    }

    const deleted = await transaction.mixingJob.deleteMany({
      where: { id, userId, status: { in: [...TERMINAL_STATUSES] } },
    });
    if (deleted.count !== 1) {
      throw new MixingError("MIXING_DELETE_CONFLICT", "믹싱 작업 상태가 바뀌어 삭제하지 못했어요.", 409);
    }
    return job.resultAsset?.id ?? null;
  });

  let mediaCleanupPending = false;
  if (resultAssetId) {
    const outcome = await deleteOrScheduleMediaAsset(resultAssetId);
    mediaCleanupPending = !outcome.deleted;
    if (outcome.deleted) {
      await prisma.mediaAsset.deleteMany({
        where: { id: resultAssetId, userId, kind: "MIX_RESULT", status: "DELETED" },
      });
    }
  }

  return { status: "deleted" as const, id, mediaCleanupPending };
}
