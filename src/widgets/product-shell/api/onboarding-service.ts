import "server-only";

import { getTicketWallets } from "@/entities/ticket/index.server";
import { prisma } from "@/shared/db/index.server";
import type { OnboardingCompletion, OnboardingSnapshot } from "../model/onboarding-contract";

export async function getOnboardingSnapshot(userId: string): Promise<OnboardingSnapshot> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { onboardingCompletedAt: true },
  });

  if (user.onboardingCompletedAt) return { required: false };

  return {
    required: true,
    ...(await getTicketWallets(userId)),
  };
}

export async function completeOnboarding(userId: string): Promise<OnboardingCompletion> {
  return prisma.$transaction(async (transaction) => {
    await transaction.user.updateMany({
      where: { id: userId, onboardingCompletedAt: null },
      data: { onboardingCompletedAt: new Date() },
    });
    const user = await transaction.user.findUniqueOrThrow({
      where: { id: userId },
      select: { onboardingCompletedAt: true },
    });

    if (!user.onboardingCompletedAt) throw new Error("Onboarding completion was not persisted.");
    return { completedAt: user.onboardingCompletedAt.toISOString() };
  });
}
