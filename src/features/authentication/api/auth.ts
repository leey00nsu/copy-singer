import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { ensureSignupTicketGrants } from "@/entities/ticket/index.server";
import { prisma } from "@/shared/db/index.server";
import { resolveAuthSecret } from "../model/auth-secret-policy";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  appName: "Copysinger",
  baseURL,
  secret: resolveAuthSecret(process.env),
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: false },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      scope: ["openid", "email", "profile"],
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await ensureSignupTicketGrants(user.id);
        },
      },
    },
  },
});

export function googleAuthConfigured() {
  return Boolean(
    process.env.BETTER_AUTH_SECRET &&
      process.env.BETTER_AUTH_URL &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET,
  );
}
