import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("upload crash windows remain durable and deletion cannot precede DB commit", async () => {
  const { prisma } = await import("../src/shared/db/index.server");
  const { uploadTrackedAsset, processMediaOperation, scheduleAssetDeletion } = await import(
    "../src/shared/media/index.server"
  );
  const saved = { ...process.env };
  Object.assign(process.env, {
    LEEMAGE_BASE_URL: "https://media.example",
    LEEMAGE_API_KEY: "test",
    LEEMAGE_PROJECT_ID: crypto.randomUUID(),
  });
  const project = process.env.LEEMAGE_PROJECT_ID;
  assert.ok(project);
  const userId = crypto.randomUUID();
  let deletes = 0;
  try {
    await prisma.user.create({ data: { id: userId, name: "Test", email: `${userId}@example.test` } });
    const fileId = crypto.randomUUID();
    const fetchImpl: typeof fetch = async (url, init) => {
      if (String(url).endsWith("presign"))
        return Response.json({ fileId, objectName: "test", presignedUrl: "https://object.example/put" });
      if (init?.method === "PUT") {
        assert.equal(await prisma.mediaOperation.count({ where: { externalFileId: fileId, objectName: "test" } }), 1);
        return new Response(null);
      }
      if (String(url).endsWith("confirm"))
        return Response.json({ file: { id: fileId, url: "https://object.example/file" } });
      if (init?.method === "DELETE") {
        deletes++;
        return new Response(null, { status: 404 });
      }
      throw new Error("Unexpected dependency call");
    };
    const input = {
      fileName: "test.wav",
      mimeType: "audio/wav",
      bytes: new Uint8Array([1]),
      assetType: "MEDIA" as const,
      userId,
      fetchImpl,
    };
    await assert.rejects(
      uploadTrackedAsset(input, async () => {
        throw new Error("DB write failed");
      }),
    );
    const known = await prisma.mediaOperation.findFirstOrThrow({ where: { externalFileId: fileId } });
    await processMediaOperation(known.id, fetchImpl);
    assert.equal(deletes, 1);
    assert.equal((await prisma.mediaOperation.findUniqueOrThrow({ where: { id: known.id } })).status, "COMPLETED");
    await assert.rejects(
      uploadTrackedAsset(
        {
          ...input,
          fetchImpl: async () => {
            throw new Error("presign response lost");
          },
        },
        async () => ({ id: crypto.randomUUID() }),
      ),
    );
    const unknown = await prisma.mediaOperation.findFirstOrThrow({
      where: { externalProjectId: project, externalFileId: null },
    });
    await processMediaOperation(unknown.id, fetchImpl);
    assert.equal((await prisma.mediaOperation.findUniqueOrThrow({ where: { id: unknown.id } })).status, "UNRESOLVED");
    assert.equal(deletes, 1);
    const asset = await prisma.mediaAsset.create({
      data: {
        userId,
        kind: "REFERENCE",
        externalProjectId: project,
        externalFileId: crypto.randomUUID(),
        externalUrl: "https://object.example/file",
        fileName: "test.wav",
        mimeType: "audio/wav",
        sizeBytes: 1,
      },
    });
    const recording = await prisma.recording.create({
      data: { kind: "USER_TEST", storagePath: "fixture://test", mimeType: "audio/wav", mediaAssetId: asset.id },
    });
    await assert.rejects(
      prisma.$transaction((tx) => scheduleAssetDeletion(tx, asset.id)),
      /MEDIA_ASSET_IN_USE/,
    );
    assert.equal(deletes, 1);
    await prisma.recording.delete({ where: { id: recording.id } });
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await scheduleAssetDeletion(tx, asset.id);
        throw new Error("crash before commit");
      }),
    );
    assert.ok(await prisma.mediaAsset.findUnique({ where: { id: asset.id } }));
    assert.equal(await prisma.mediaOperation.count({ where: { assetId: asset.id } }), 0);
    const cleanupId = await prisma.$transaction((tx) => scheduleAssetDeletion(tx, asset.id));
    assert.ok(cleanupId);
    assert.equal(deletes, 1);
    assert.equal(await prisma.mediaAsset.findUnique({ where: { id: asset.id } }), null);
    await processMediaOperation(cleanupId, fetchImpl);
    assert.equal(deletes, 2);
  } finally {
    await prisma.mediaOperation.deleteMany({ where: { externalProjectId: project } });
    await prisma.user.deleteMany({ where: { id: userId } });
    for (const key of ["LEEMAGE_BASE_URL", "LEEMAGE_API_KEY", "LEEMAGE_PROJECT_ID"]) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    await prisma.$disconnect();
  }
});
