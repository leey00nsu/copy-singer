import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("database statement budget cancels a slow query without poisoning the connection", async () => {
  const { prisma } = await import("../src/shared/db/index.server");
  try {
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '30ms'");
        await tx.$queryRawUnsafe("SELECT pg_sleep(1)");
      }),
      /statement timeout/,
    );
    const rows = await prisma.$queryRaw<Array<{ value: number }>>`SELECT 1 AS value`;
    assert.equal(rows[0]?.value, 1);
  } finally {
    await prisma.$disconnect();
  }
});
