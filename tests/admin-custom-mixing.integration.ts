import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("admin custom mixing profiles and reference resolution stay scoped to the admin owner", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }

  const { prisma } = await import("../src/shared/db/index.server");
  const { listAdminCustomMixingProfiles, getAdminCustomMixingReference } = await import(
    "../src/features/admin-custom-mixing/index.server"
  );
  const suffix = crypto.randomUUID();
  const ownerId = `custom-mixing-owner-${suffix}`;
  const otherId = `custom-mixing-other-${suffix}`;
  const ownerProfileId = crypto.randomUUID();
  const otherProfileId = crypto.randomUUID();
  const ownerRecordingId = crypto.randomUUID();
  const otherRecordingId = crypto.randomUUID();
  const referenceAssetId = crypto.randomUUID();
  const synthesisAssetId = crypto.randomUUID();

  try {
    await prisma.user.createMany({
      data: [
        { id: ownerId, name: "Owner", email: `${ownerId}@example.test`, emailVerified: true },
        { id: otherId, name: "Other", email: `${otherId}@example.test`, emailVerified: true },
      ],
    });
    await prisma.recording.createMany({
      data: [
        {
          id: ownerRecordingId,
          kind: "USER_TEST",
          storagePath: `/tmp/${ownerRecordingId}.wav`,
          mimeType: "audio/wav",
          status: "READY",
        },
        {
          id: otherRecordingId,
          kind: "USER_TEST",
          storagePath: `/tmp/${otherRecordingId}.wav`,
          mimeType: "audio/wav",
          status: "READY",
        },
      ],
    });
    await prisma.mediaAsset.createMany({
      data: [
        {
          id: referenceAssetId,
          userId: ownerId,
          kind: "REFERENCE",
          externalProjectId: `project-${suffix}`,
          externalFileId: `reference-${suffix}`,
          externalUrl: `https://storage.example/reference-${suffix}.wav`,
          fileName: "reference.wav",
          mimeType: "audio/wav",
          sizeBytes: 2048,
        },
        {
          id: synthesisAssetId,
          userId: ownerId,
          kind: "SYNTHESIS_REFERENCE",
          externalProjectId: `project-${suffix}`,
          externalFileId: `synthesis-${suffix}`,
          externalUrl: `https://storage.example/synthesis-${suffix}.wav`,
          fileName: "synthesis.wav",
          mimeType: "audio/wav",
          sizeBytes: 4096,
        },
      ],
    });
    await prisma.recording.update({
      where: { id: ownerRecordingId },
      data: { mediaAssetId: referenceAssetId },
    });
    await prisma.vocalProfile.createMany({
      data: [
        {
          id: ownerProfileId,
          userId: ownerId,
          sourceType: "USER",
          recordingId: ownerRecordingId,
          synthesisReferenceAssetId: synthesisAssetId,
          analyzer: "test",
          analyzerVersion: "1",
          displayName: "관리자 보컬",
        },
        {
          id: otherProfileId,
          userId: otherId,
          sourceType: "USER",
          recordingId: otherRecordingId,
          analyzer: "test",
          analyzerVersion: "1",
        },
      ],
    });

    const profiles = await listAdminCustomMixingProfiles(ownerId);
    assert.equal(profiles.length, 1);
    assert.equal(profiles[0]?.id, ownerProfileId);
    assert.equal(profiles[0]?.referenceKind, "SYNTHESIS_REFERENCE");
    assert.equal(profiles[0]?.referenceReady, true);

    const reference = await getAdminCustomMixingReference(ownerId, ownerProfileId);
    assert.ok(reference);
    assert.equal(reference.profileId, ownerProfileId);
    assert.equal(reference.externalUrl, `https://storage.example/synthesis-${suffix}.wav`);
    assert.equal(reference.fileName, "synthesis.wav");

    assert.equal(await getAdminCustomMixingReference(otherId, ownerProfileId), null);
    assert.equal(await getAdminCustomMixingReference(ownerId, otherProfileId), null);

    const rowsBefore = {
      mediaAssets: await prisma.mediaAsset.count(),
      catalogTargets: await prisma.catalogTargetAsset.count(),
      mixingJobs: await prisma.mixingJob.count(),
    };
    const { submitAdminCustomMixing } = await import("../src/features/admin-custom-mixing/index.server");
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url === reference?.externalUrl) {
        return Response.json({ bytes: "dummy" }, { status: 200, headers: { "Content-Type": "audio/wav" } });
      }
      if (url === "https://modal.example/v1/conversions") {
        return Response.json({ id: "modal-job-custom", status: "queued" }, { status: 202 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    };
    process.env.MODAL_API_URL = "https://modal.example";
    process.env.MODAL_API_KEY = "test-key";
    try {
      const target = new File([new Uint8Array(512)], "custom.wav", { type: "audio/wav" });
      const response = await submitAdminCustomMixing(reference, target);
      assert.ok(response, "expected a fetch response");
      assert.equal(response.status, 202);
      assert.deepEqual(await response.json(), { id: "modal-job-custom", status: "queued" });
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.MODAL_API_URL;
      delete process.env.MODAL_API_KEY;
    }
    assert.equal(await prisma.mediaAsset.count(), rowsBefore.mediaAssets);
    assert.equal(await prisma.catalogTargetAsset.count(), rowsBefore.catalogTargets);
    assert.equal(await prisma.mixingJob.count(), rowsBefore.mixingJobs);
  } finally {
    await prisma.vocalProfile.deleteMany({ where: { id: { in: [ownerProfileId, otherProfileId] } } });
    await prisma.recording.deleteMany({ where: { id: { in: [ownerRecordingId, otherRecordingId] } } });
    await prisma.mediaAsset.deleteMany({ where: { id: { in: [referenceAssetId, synthesisAssetId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
    await prisma.$disconnect();
  }
});
