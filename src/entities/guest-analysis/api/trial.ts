import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/shared/db/index.server";
import { GUEST_TRIAL_COOKIE } from "../model/contract";

export function guestTokenFromHeaders(headers: Headers) {
  const token = headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GUEST_TRIAL_COOKIE}=`))
    ?.slice(GUEST_TRIAL_COOKIE.length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

export function hashGuestToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getGuestTrial(headers: Headers) {
  const token = guestTokenFromHeaders(headers);
  if (!token) return null;
  return prisma.guestAnalysisTrial.findUnique({
    where: { tokenHash: hashGuestToken(token) },
    include: { job: true },
  });
}

export async function createGuestTrial() {
  const token = randomBytes(32).toString("base64url");
  const userId = `guest-${crypto.randomUUID()}`;
  const trial = await prisma.guestAnalysisTrial.create({
    data: {
      tokenHash: hashGuestToken(token),
      user: {
        create: { id: userId, isGuest: true, name: "무료 분석", email: `${userId}@anonymous.placeholder.invalid` },
      },
    },
    include: { job: true },
  });
  return { trial, token };
}

export function guestTrialIsReadable(trial: NonNullable<Awaited<ReturnType<typeof getGuestTrial>>>, now = Date.now()) {
  return !trial.claimedAt && (!trial.expiresAt || trial.expiresAt.getTime() > now);
}

export async function canReadGuestResource(userId: string, resource: { jobId?: string; profileId?: string }) {
  const trial = await prisma.guestAnalysisTrial.findUnique({ where: { userId }, include: { job: true } });
  return Boolean(
    trial &&
      guestTrialIsReadable(trial) &&
      (resource.jobId ? trial.jobId === resource.jobId : trial.job?.vocalProfileId === resource.profileId),
  );
}
