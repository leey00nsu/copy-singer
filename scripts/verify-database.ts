import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/shared/db/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to verify the database.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const profile = await prisma.vocalProfile.findFirst({
    where: { sourceType: "USER" },
    include: { recording: true },
  });
  const song = await prisma.song.findFirst({ include: { vocalProfile: true } });
  if (!profile || profile.recording.kind !== "USER_TEST") {
    throw new Error("Seeded user profile relation graph is incomplete.");
  }
  if (!song?.vocalProfile) throw new Error("Seeded song profile relation graph is incomplete.");
  console.info(JSON.stringify({ userProfileId: profile.id, songId: song.id }));
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
