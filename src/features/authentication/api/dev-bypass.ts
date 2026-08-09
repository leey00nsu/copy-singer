import "server-only";

import { prisma } from "@/shared/db/index.server";
import { type AuthBypassEnvironment, developmentAuthBypassUserId } from "../model/dev-bypass-policy";
import type { auth } from "./auth";

type AuthSession = typeof auth.$Infer.Session;

export async function getDevelopmentAuthBypassSession(
  environment: AuthBypassEnvironment = process.env,
): Promise<AuthSession | null> {
  const userId = developmentAuthBypassUserId(environment);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("DEV_AUTH_BYPASS_USER_ID must identify an existing local database user.");
  }
  const now = new Date();
  return {
    user,
    session: {
      id: `dev-auth-bypass:${user.id}`,
      userId: user.id,
      token: "dev-auth-bypass",
      ipAddress: null,
      userAgent: "copy-singer-development-auth-bypass",
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1_000),
    },
  };
}
