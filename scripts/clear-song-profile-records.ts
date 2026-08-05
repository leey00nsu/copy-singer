import { PrismaPg } from "@prisma/adapter-pg";
import type { Prisma } from "../generated/prisma/client";
import { PrismaClient } from "../generated/prisma/client";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to clear catalog profile records.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function withoutPipeline(value: Prisma.JsonValue | null): Prisma.InputJsonValue | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const { pipeline: _, ...metadata } = value as Record<string, Prisma.JsonValue>;
  return metadata as Prisma.InputJsonValue;
}

async function main() {
  const songs = await prisma.song.findMany({
    where: { catalogOrder: { gte: 1, lte: 100 }, vocalProfileId: { not: null } },
    include: {
      vocalProfile: { include: { recommendationRuns: { select: { id: true } } } },
    },
  });
  let removed = 0;
  for (const song of songs) {
    const profile = song.vocalProfile;
    if (!profile) continue;
    if (profile.sourceType !== "SONG" || profile.recommendationRuns.length > 0) {
      throw new Error(`Refusing to remove non-catalog or referenced profile for song ${song.id}.`);
    }
    await prisma.$transaction(async (tx) => {
      await tx.song.update({
        where: { id: song.id },
        data: {
          vocalProfileId: null,
          analysisStatus: "PENDING",
          metadata: withoutPipeline(song.metadata),
        },
      });
      await tx.vocalProfile.delete({ where: { id: profile.id } });
      await tx.recording.delete({ where: { id: profile.recordingId } });
    });
    removed += 1;
  }
  const remaining = await prisma.song.count({
    where: { catalogOrder: { gte: 1, lte: 100 }, vocalProfileId: { not: null } },
  });
  if (remaining !== 0) throw new Error(`Expected no catalog database profiles, found ${remaining}.`);
  console.info(JSON.stringify({ status: "ok", removed, remaining }));
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
