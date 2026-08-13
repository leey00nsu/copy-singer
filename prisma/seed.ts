import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  RecordingKind,
  RecordingStatus,
  SongAnalysisStatus,
  VocalProfileSourceType,
} from "../src/shared/db/generated/prisma/client";

const ids = {
  userRecording: "00000000-0000-4000-8000-000000000001",
  songRecording: "00000000-0000-4000-8000-000000000002",
  userProfile: "00000000-0000-4000-8000-000000000011",
  songProfile: "00000000-0000-4000-8000-000000000012",
  song: "00000000-0000-4000-8000-000000000021",
  recommendationRun: "00000000-0000-4000-8000-000000000031",
  recommendationItem: "00000000-0000-4000-8000-000000000041",
} as const;

function createClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to seed the database.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

const prisma = createClient();

async function main() {
  await prisma.recording.upsert({
    where: { id: ids.userRecording },
    update: {},
    create: {
      id: ids.userRecording,
      kind: RecordingKind.USER_TEST,
      storagePath: "seed://recordings/user-test.wav",
      mimeType: "audio/wav",
      durationMs: 15_000,
      sizeBytes: BigInt(1_440_000),
      sampleRate: 48_000,
      status: RecordingStatus.READY,
    },
  });

  await prisma.recording.upsert({
    where: { id: ids.songRecording },
    update: {},
    create: {
      id: ids.songRecording,
      kind: RecordingKind.SONG_SOURCE,
      storagePath: "seed://recordings/example-song.wav",
      mimeType: "audio/wav",
      durationMs: 180_000,
      sizeBytes: BigInt(17_280_000),
      sampleRate: 48_000,
      status: RecordingStatus.READY,
    },
  });

  await prisma.vocalProfile.upsert({
    where: { id: ids.userProfile },
    update: {},
    create: {
      id: ids.userProfile,
      sourceType: VocalProfileSourceType.USER,
      recordingId: ids.userRecording,
      minMidi: 48,
      maxMidi: 72,
      p10Midi: 52,
      medianMidi: 60,
      p90Midi: 69,
      tessituraLowMidi: 53,
      tessituraHighMidi: 67,
      voicedRatio: 0.74,
      pitchStability: 0.82,
      clippingRatio: 0.001,
      rmsDb: -18.5,
      descriptors: { fixture: true },
      analyzer: "copy-singer-fixture",
      analyzerVersion: "1.0.0",
    },
  });

  await prisma.vocalProfile.upsert({
    where: { id: ids.songProfile },
    update: {},
    create: {
      id: ids.songProfile,
      sourceType: VocalProfileSourceType.SONG,
      recordingId: ids.songRecording,
      minMidi: 50,
      maxMidi: 74,
      p10Midi: 54,
      medianMidi: 62,
      p90Midi: 71,
      tessituraLowMidi: 55,
      tessituraHighMidi: 69,
      voicedRatio: 0.79,
      pitchStability: 0.87,
      clippingRatio: 0,
      rmsDb: -17.2,
      descriptors: { fixture: true },
      analyzer: "copy-singer-fixture",
      analyzerVersion: "1.0.0",
    },
  });

  await prisma.song.upsert({
    where: { id: ids.song },
    update: { vocalProfileId: ids.songProfile },
    create: {
      id: ids.song,
      title: "Example Song",
      artist: "Copysinger Fixture",
      originalKey: "C",
      vocalProfileId: ids.songProfile,
      analysisStatus: SongAnalysisStatus.READY,
      metadata: { fixture: true },
    },
  });

  await prisma.recommendationRun.upsert({
    where: { id: ids.recommendationRun },
    update: {},
    create: {
      id: ids.recommendationRun,
      userVocalProfileId: ids.userProfile,
      scoringVersion: "fixture-1.0.0",
    },
  });

  await prisma.recommendationItem.upsert({
    where: { id: ids.recommendationItem },
    update: {},
    create: {
      id: ids.recommendationItem,
      runId: ids.recommendationRun,
      songId: ids.song,
      catalogPosition: 1,
      rank: 1,
      originalKeyScore: 0.81,
      adjustedScore: 0.93,
      recommendedShift: -2,
      reasonCodes: ["TESSITURA_OVERLAP", "LOWER_HIGH_NOTE_LOAD"],
      metrics: { overlapRatio: 0.88 },
    },
  });

  console.info("Seeded copy-singer data foundation fixtures.");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
