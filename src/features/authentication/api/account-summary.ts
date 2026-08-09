import "server-only";

import { prisma } from "@/shared/db/index.server";

export async function getAuthenticationSummary(userId: string) {
  const googleAccount = await prisma.account.findFirst({
    where: { userId, providerId: "google" },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  return {
    googleConnected: Boolean(googleAccount),
    googleConnectedAt: googleAccount?.createdAt ?? null,
  };
}
