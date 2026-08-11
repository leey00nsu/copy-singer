import assert from "node:assert/strict";
import test from "node:test";

import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("persists, reads, and cascade-deletes one recommendation run", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }

  const { prisma } = await import("../src/shared/db/index.server");
  const { createRecommendationRun, deleteRecommendationRun, getRecommendationRun } = await import(
    "../src/features/create-recommendation/index.server"
  );
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
    assert.deepEqual(
      created.items.map((item) => item.rank),
      Array.from({ length: 100 }, (_, index) => index + 1),
    );
    assert.ok(created.items.every((item) => item.synthesis.status === "not_started"));
    assert.ok(created.items.every((item) => item.sourceUrl.startsWith("https://www.youtube.com/")));
    assert.ok(created.items.every((item) => /^[A-Za-z0-9_-]{11}$/.test(item.sourceVideoId ?? "")));
    assert.ok(created.items.every((item) => Number.isFinite(item.selectionScore)));
    assert.ok(created.items.every((item) => item.selectionScore === item.metrics.selectionScore));

    const repeated = await createRecommendationRun(profileId);
    assert.deepEqual(repeated, created);
    assert.equal(await prisma.recommendationRun.count({ where: { userVocalProfileId: profileId } }), 1);

    const concurrent = await Promise.all(Array.from({ length: 3 }, () => createRecommendationRun(profileId)));
    assert.ok(concurrent.every((run) => run.id === created.id));
    assert.equal(await prisma.recommendationRun.count({ where: { userVocalProfileId: profileId } }), 1);

    const storedSongs = await prisma.song.findMany({
      where: { id: { in: created.items.map((item) => item.songId) } },
      include: { vocalProfile: true },
    });
    const storedSongById = new Map(storedSongs.map((song) => [song.id, song]));
    for (const item of created.items) {
      const song = storedSongById.get(item.songId);
      assert.ok(song);
      assert.equal(item.originalKey, song.originalKey?.trim() || null);
      if (item.songProfile) {
        assert.equal(item.songProfile.minMidi, song.vocalProfile?.minMidi);
        assert.equal(item.songProfile.maxMidi, song.vocalProfile?.maxMidi);
        assert.equal(item.songProfile.medianMidi, song.vocalProfile?.medianMidi);
        assert.equal(item.songProfile.tessituraLowMidi, song.vocalProfile?.tessituraLowMidi);
        assert.equal(item.songProfile.tessituraHighMidi, song.vocalProfile?.tessituraHighMidi);
      } else {
        assert.ok(
          !song.vocalProfile ||
            [
              song.vocalProfile.minMidi,
              song.vocalProfile.maxMidi,
              song.vocalProfile.medianMidi,
              song.vocalProfile.tessituraLowMidi,
              song.vocalProfile.tessituraHighMidi,
            ].some((value) => value === null),
        );
      }
    }

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
