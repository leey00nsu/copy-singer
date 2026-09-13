import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { runtimeLimits } from "@/shared/lib/runtime/index.server";
import { PrismaClient } from "./generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create the Prisma client.");
  }

  const limits = runtimeLimits();
  const adapter = new PrismaPg({
    connectionString,
    max: limits.dbPool,
    connectionTimeoutMillis: limits.dbConnectMs,
    statement_timeout: limits.dbQueryMs,
    query_timeout: limits.dbQueryMs,
    idle_in_transaction_session_timeout: limits.dbQueryMs,
    idleTimeoutMillis: 30_000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
