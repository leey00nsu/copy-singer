import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("profile history, detail, and reference are scoped to the owning user", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }
  const { prisma } = await import("../src/shared/db/index.server");
  const { getVocalProfileDetail, getVocalProfileHistory, getVocalProfileReference, getVocalProfileSynthesisReference } =
    await import("../lib/vocal-profile/history");
  const suffix = crypto.randomUUID();
  const ownerId = `profile-history-owner-${suffix}`;
  const otherId = `profile-history-other-${suffix}`;
  const assetId = crypto.randomUUID();
  const synthesisAssetId = crypto.randomUUID();
  const recordingId = crypto.randomUUID();
  const profileId = crypto.randomUUID();

  try {
    await prisma.user.createMany({
      data: [
        { id: ownerId, name: "Owner", email: `${ownerId}@example.test`, emailVerified: true },
        { id: otherId, name: "Other", email: `${otherId}@example.test`, emailVerified: true },
      ],
    });
    await prisma.mediaAsset.createMany({
      data: [
        {
          id: assetId,
          userId: ownerId,
          kind: "REFERENCE",
          externalProjectId: "project",
          externalFileId: `file-${suffix}`,
          externalUrl: "https://objects.example/private-reference.wav",
          fileName: "reference.wav",
          mimeType: "audio/wav",
          sizeBytes: BigInt(3),
        },
        {
          id: synthesisAssetId,
          userId: ownerId,
          kind: "SYNTHESIS_REFERENCE",
          externalProjectId: "project",
          externalFileId: `synthesis-${suffix}`,
          externalUrl: "https://objects.example/private-synthesis-reference.wav",
          fileName: "synthesis-reference.wav",
          mimeType: "audio/wav",
          sizeBytes: BigInt(2),
        },
      ],
    });
    await prisma.recording.create({
      data: {
        id: recordingId,
        kind: "USER_TEST",
        storagePath: `leemage://project/file-${suffix}`,
        mimeType: "audio/wav",
        durationMs: 12_000,
        sampleRate: 22_050,
        sizeBytes: BigInt(3),
        status: "READY",
        mediaAssetId: assetId,
      },
    });
    await prisma.vocalProfile.create({
      data: {
        id: profileId,
        userId: ownerId,
        sourceType: "USER",
        recordingId,
        minMidi: 46,
        maxMidi: 58,
        p10Midi: 48,
        medianMidi: 52,
        p90Midi: 56,
        tessituraLowMidi: 48,
        tessituraHighMidi: 56,
        voicedRatio: 0.82,
        pitchStability: 0.91,
        clippingRatio: 0,
        rmsDb: -24,
        analyzer: "test",
        analyzerVersion: "1",
        descriptors: {},
        synthesisReferenceAssetId: synthesisAssetId,
      },
    });

    const ownerHistory = await getVocalProfileHistory(ownerId);
    assert.equal(ownerHistory.total, 1);
    assert.equal(ownerHistory.profiles[0]?.id, profileId);
    assert.equal((await getVocalProfileHistory(otherId)).total, 0);
    assert.equal((await getVocalProfileDetail(ownerId, profileId))?.audioUrl, `/api/vocal-profiles/${profileId}/audio`);
    assert.equal(await getVocalProfileDetail(otherId, profileId), null);
    assert.equal(
      (await getVocalProfileReference(ownerId, profileId))?.externalUrl,
      "https://objects.example/private-reference.wav",
    );
    assert.equal(await getVocalProfileReference(otherId, profileId), null);
    assert.equal(
      (await getVocalProfileSynthesisReference(ownerId, profileId))?.externalUrl,
      "https://objects.example/private-synthesis-reference.wav",
    );
    assert.equal(await getVocalProfileSynthesisReference(otherId, profileId), null);
  } finally {
    await prisma.vocalProfile.deleteMany({ where: { id: profileId } });
    await prisma.recording.deleteMany({ where: { id: recordingId } });
    await prisma.mediaAsset.deleteMany({ where: { id: assetId } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
    await prisma.$disconnect();
  }
});
