import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/shared/db/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to verify the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const run = await prisma.recommendationRun.findFirst({
    where: { scoringVersion: "fixture-1.0.0" },
    include: {
      userVocalProfile: { include: { recording: true } },
      items: {
        orderBy: { rank: "asc" },
        include: {
          song: { include: { vocalProfile: true } },
        },
      },
    },
  });

  if (!run) {
    throw new Error("Seeded recommendation run was not found.");
  }

  if (run.userVocalProfile.recording.kind !== "USER_TEST") {
    throw new Error("User profile is not connected to a USER_TEST recording.");
  }

  if (run.items.length !== 1 || !run.items[0]?.song.vocalProfile) {
    throw new Error("Seeded recommendation relation graph is incomplete.");
  }

  if (run.items[0].recommendedShift !== -2) {
    throw new Error("Seeded recommended shift does not match the fixture.");
  }

  console.info(
    JSON.stringify({
      recommendationRunId: run.id,
      userProfileId: run.userVocalProfileId,
      songId: run.items[0].songId,
      recommendedShift: run.items[0].recommendedShift,
    }),
  );
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
