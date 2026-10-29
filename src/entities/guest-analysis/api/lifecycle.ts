import "server-only";

import { type Prisma, prisma } from "@/shared/db/index.server";
import { scheduleAssetDeletion } from "@/shared/media/index.server";
import { GUEST_RESULT_RETENTION_MS, type GuestAnalysisPolicy } from "../model/contract";
import { getGuestTrial, guestTrialIsReadable } from "./trial";

type Trial = NonNullable<Awaited<ReturnType<typeof getGuestTrial>>>;

export class GuestAnalysisError extends Error {
  constructor(
    readonly code: string,
    readonly status = 409,
  ) {
    super(code);
  }
}

export function guestAnalysisPolicy(trial: Trial | null, available: boolean): GuestAnalysisPolicy {
  const readable = trial && guestTrialIsReadable(trial);
  return {
    state:
      trial?.consumedAt || trial?.claimedAt
        ? "used"
        : trial?.job && ["PENDING", "PROCESSING"].includes(trial.job.status)
          ? "processing"
          : available
            ? "available"
            : "full",
    profileId: readable ? (trial.job?.vocalProfileId ?? null) : null,
  };
}

export async function assertGuestCanSubmit(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT id FROM "GuestAnalysisTrial" WHERE "userId" = ${userId} FOR UPDATE`;
  const trial = await tx.guestAnalysisTrial.findUnique({ where: { userId }, include: { job: true } });
  if (!trial) throw new GuestAnalysisError("GUEST_TRIAL_NOT_FOUND", 401);
  if (trial.consumedAt || trial.claimedAt) throw new GuestAnalysisError("GUEST_ANALYSIS_USED");
  if (trial.job && ["PENDING", "PROCESSING"].includes(trial.job.status)) throw new Error("ANALYSIS_BUSY");
  return trial;
}

export async function markGuestAnalysisTerminal(
  tx: Prisma.TransactionClient,
  userId: string,
  jobId: string,
  succeeded: boolean,
  now: Date,
) {
  const result = await tx.guestAnalysisTrial.updateMany({
    where: { userId, jobId, claimedAt: null },
    data: { ...(succeeded ? { consumedAt: now } : {}), expiresAt: new Date(now.getTime() + GUEST_RESULT_RETENTION_MS) },
  });
  return result.count > 0;
}

export async function claimGuestAnalysis(headers: Headers, memberId: string) {
  const proof = await getGuestTrial(headers);
  if (!proof) throw new GuestAnalysisError("GUEST_TRIAL_NOT_FOUND", 404);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "GuestAnalysisTrial" WHERE id = ${proof.id}::uuid FOR UPDATE`;
    const trial = await tx.guestAnalysisTrial.findUniqueOrThrow({ where: { id: proof.id }, include: { job: true } });
    const member = await tx.user.findUniqueOrThrow({ where: { id: memberId }, select: { isGuest: true } });
    if (member.isGuest) throw new GuestAnalysisError("MEMBER_REQUIRED", 401);
    if (trial.claimedAt) {
      if (trial.claimedByUserId !== memberId) throw new GuestAnalysisError("GUEST_TRIAL_ALREADY_SAVED", 403);
      if (!trial.job?.vocalProfileId) throw new GuestAnalysisError("GUEST_RESULT_NOT_FOUND", 404);
      const profile = await tx.vocalProfile.findFirst({
        where: { id: trial.job.vocalProfileId, userId: memberId },
      });
      if (!profile) throw new GuestAnalysisError("GUEST_RESULT_NOT_FOUND", 404);
      return { profileId: profile.id };
    }
    if (trial.job && ["PENDING", "PROCESSING"].includes(trial.job.status))
      throw new GuestAnalysisError("GUEST_ANALYSIS_PROCESSING");
    if (!guestTrialIsReadable(trial)) throw new GuestAnalysisError("GUEST_RESULT_EXPIRED", 410);
    if (!trial.consumedAt || trial.job?.status !== "SUCCEEDED" || !trial.job.vocalProfileId)
      throw new GuestAnalysisError("GUEST_RESULT_NOT_FOUND", 404);
    const profile = await tx.vocalProfile.findFirst({
      where: { id: trial.job.vocalProfileId, userId: trial.userId },
      include: { recording: true },
    });
    if (!profile) throw new GuestAnalysisError("GUEST_RESULT_NOT_FOUND", 404);
    const identity = await tx.user.update({
      where: { id: memberId },
      data: { nextVocalProfileNumber: { increment: 1 } },
      select: { nextVocalProfileNumber: true },
    });
    const profileNumber = identity.nextVocalProfileNumber - 1;
    await tx.vocalProfile.update({
      where: { id: profile.id },
      data: { userId: memberId, profileNumber, displayName: `보컬 프로필 ${profileNumber}` },
    });
    await tx.vocalProfileAnalysisJob.update({
      where: { id: trial.job.id },
      data: { userId: memberId, idempotencyKey: `guest-claim:${trial.id}:${trial.job.id}` },
    });
    const assets = [profile.recording.mediaAssetId, profile.synthesisReferenceAssetId].filter((id): id is string =>
      Boolean(id),
    );
    await tx.mediaAsset.updateMany({ where: { id: { in: assets }, userId: trial.userId }, data: { userId: memberId } });
    await tx.mediaOperation.updateMany({
      where: { assetId: { in: assets }, userId: trial.userId },
      data: { userId: memberId },
    });
    await tx.guestAnalysisTrial.update({
      where: { id: trial.id },
      data: { claimedByUserId: memberId, claimedAt: new Date(), expiresAt: null },
    });
    return { profileId: profile.id };
  });
}

async function purgeGuestResult(tx: Prisma.TransactionClient, trial: Trial) {
  const active = await tx.vocalProfileAnalysisJob.count({
    where: { userId: trial.userId, status: { in: ["PENDING", "PROCESSING"] } },
  });
  if (active) throw new GuestAnalysisError("GUEST_ANALYSIS_PROCESSING");
  const profiles = await tx.vocalProfile.findMany({
    where: { userId: trial.userId },
    select: { id: true, recordingId: true },
  });
  await tx.vocalProfile.deleteMany({ where: { id: { in: profiles.map((profile) => profile.id) } } });
  await tx.recording.deleteMany({ where: { id: { in: profiles.map((profile) => profile.recordingId) } } });
  await tx.vocalProfileAnalysisJob.updateMany({ where: { userId: trial.userId }, data: { sourceAssetId: null } });
  const assets = await tx.mediaAsset.findMany({
    where: { userId: trial.userId, status: { not: "DELETED" } },
    select: { id: true },
  });
  for (const asset of assets) await scheduleAssetDeletion(tx, asset.id);
  await tx.guestAnalysisTrial.update({ where: { id: trial.id }, data: { expiresAt: null } });
}

export async function deleteGuestResult(userId: string, profileId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "GuestAnalysisTrial" WHERE "userId" = ${userId} FOR UPDATE`;
    const trial = await tx.guestAnalysisTrial.findUnique({ where: { userId }, include: { job: true } });
    if (!trial || !guestTrialIsReadable(trial) || trial.job?.vocalProfileId !== profileId)
      throw new GuestAnalysisError("GUEST_RESULT_NOT_FOUND", 404);
    await purgeGuestResult(tx, trial);
  });
}

export async function cleanupExpiredGuestAnalysis(now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const candidates = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "GuestAnalysisTrial" WHERE "claimedAt" IS NULL AND "expiresAt" <= ${now}
      ORDER BY "expiresAt" FOR UPDATE SKIP LOCKED LIMIT 1
    `;
    if (!candidates[0]) return false;
    const trial = await tx.guestAnalysisTrial.findUniqueOrThrow({
      where: { id: candidates[0].id },
      include: { job: true },
    });
    await purgeGuestResult(tx, trial);
    return true;
  });
}
