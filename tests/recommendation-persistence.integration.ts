import assert from "node:assert/strict";
import test from "node:test";

import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("calculates recommendations on demand and changes cache identity with catalog revision", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }

  const { prisma } = await import("../src/shared/db/index.server");
  const { getRecommendationResult } = await import("../src/features/create-recommendation/index.server");
  const recordingId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const catalog = await prisma.catalog.findFirstOrThrow({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "asc" },
  });

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
            descriptors: {
              synthesisReference: {
                version: "smart-reference-mid-v1",
                status: "unavailable",
                fallbackReason: "no-quality-mid-phrase",
              },
            },
          },
        },
      },
    });

    const first = await getRecommendationResult(profileId);
    assert.equal(first.id, profileId);
    assert.equal(first.scoringVersion, "key-fit-v3");
    assert.ok(first.items.length > 0);
    assert.deepEqual(
      first.items.map((item) => item.rank),
      Array.from({ length: first.items.length }, (_, index) => index + 1),
    );
    assert.ok(first.items.every((item) => item.id === item.songAnalysisId));
    assert.ok(first.items.every((item) => item.synthesis.status === "not_started"));
    assert.ok(first.items.every((item) => item.sourceUrl.startsWith("https://www.youtube.com/")));
    assert.ok(first.items.every((item) => /^[A-Za-z0-9_-]{11}$/.test(item.sourceVideoId ?? "")));
    assert.deepEqual(first.profile.mixing, {
      available: false,
      unavailableReason: "missing_mid_reference",
    });

    const repeated = await getRecommendationResult(profileId);
    assert.equal(repeated.catalogRevision, first.catalogRevision);
    assert.equal(repeated.scoringVersion, first.scoringVersion);
    assert.deepEqual(repeated.items, first.items);

    const bumped = await prisma.catalog.update({
      where: { id: catalog.id },
      data: { revision: { increment: 1 } },
    });
    const refreshed = await getRecommendationResult(profileId);
    assert.equal(refreshed.catalogRevision, bumped.revision);
    assert.deepEqual(refreshed.items, first.items);
  } finally {
    await prisma.catalog.update({ where: { id: catalog.id }, data: { revision: catalog.revision } });
    await prisma.vocalProfile.deleteMany({ where: { id: profileId } });
    await prisma.recording.deleteMany({ where: { id: recordingId } });
    await prisma.$disconnect();
  }
});
