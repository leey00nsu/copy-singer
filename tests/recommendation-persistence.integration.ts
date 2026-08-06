import assert from "node:assert/strict";
import test from "node:test";

import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("persists, reads, and cascade-deletes one recommendation run", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }

  const { prisma } = await import("../lib/db/prisma");
  const {
    createRecommendationRun,
    deleteRecommendationRun,
    getRecommendationRun,
  } = await import("../lib/recommendation/server");
  const recordingId = crypto.randomUUID();
  const profileId = crypto.randomUUID();

  try {
    await prisma.recording.create({
      data: {
        id: recordingId,
        kind: "USER_TEST",
        storagePath: `integration/${recordingId}.wav`,
        mimeType: "audio/wav",
        durationMs: 8_000,
        sizeBytes: BigInt(1_024),
        sampleRate: 22_050,
        status: "READY",
        vocalProfiles: {
          create: {
            id: profileId,
            sourceType: "USER",
            minMidi: 48,
            maxMidi: 72,
            p10Midi: 52,
            medianMidi: 60,
            p90Midi: 68,
            tessituraLowMidi: 52,
            tessituraHighMidi: 68,
            voicedRatio: 0.72,
            pitchStability: 0.84,
            clippingRatio: 0.001,
            analyzer: "librosa-pyin",
            analyzerVersion: "0.11.0",
          },
        },
      },
    });

    const created = await createRecommendationRun(profileId);
    assert.equal(created.scoringVersion, "key-fit-v2");
    assert.equal(created.items.length, 100);
    assert.deepEqual(created.items.map((item) => item.rank), Array.from({ length: 100 }, (_, index) => index + 1));
    assert.ok(created.items.every((item) => item.synthesis.status === "not_started"));
    assert.ok(created.items.every((item) => item.sourceUrl.startsWith("https://www.youtube.com/")));
    assert.ok(created.items.every((item) => Number.isFinite(item.selectionScore)));
    assert.ok(created.items.every((item) => item.selectionScore === item.metrics.selectionScore));

    const stored = await getRecommendationRun(created.id);
    assert.deepEqual(stored, created);
    assert.deepEqual(await deleteRecommendationRun(created.id), { status: "deleted", id: created.id });
    assert.equal(await prisma.recommendationItem.count({ where: { runId: created.id } }), 0);
  } finally {
    await prisma.recommendationRun.deleteMany({ where: { userVocalProfileId: profileId } });
    await prisma.vocalProfile.deleteMany({ where: { id: profileId } });
    await prisma.recording.deleteMany({ where: { id: recordingId } });
    await prisma.$disconnect();
  }
});
