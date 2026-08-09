import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

type FailureMode = "source-storage" | "synthesis-storage" | "database";

function analyzedRecording(recordingId: string) {
  return {
    profile: {
      recordingId,
      mimeType: "audio/wav",
      sizeBytes: 3,
      durationMs: 7_000,
      sampleRate: 22_050,
      minMidi: 55,
      maxMidi: 72,
      p10Midi: 58,
      medianMidi: 64,
      p90Midi: 70,
      tessituraLowMidi: 58,
      tessituraHighMidi: 70,
      voicedRatio: 0.9,
      pitchStability: 0.8,
      clippingRatio: 0,
      rmsDb: -18,
      analyzer: "librosa-pyin",
      analyzerVersion: "fixture",
      descriptors: {
        synthesisReference: {
          algorithm: "voiced-phrase-band-selection",
          version: "smart-reference-v1",
          durationMs: 6_000,
          sourceRanges: [],
          bandSeconds: { low: 2, mid: 2, high: 2 },
          voicedDensity: 0.9,
          pitchCoverageSemitones: 12,
          crossfadeMs: 30,
          fallbackReason: null,
        },
      },
      synthesisReference: {
        mimeType: "audio/wav",
        sizeBytes: 4,
        durationMs: 6_000,
        algorithm: "voiced-phrase-band-selection",
        version: "smart-reference-v1",
        sourceRanges: [],
        bandSeconds: { low: 2, mid: 2, high: 2 },
        voicedDensity: 0.9,
        pitchCoverageSemitones: 12,
        crossfadeMs: 30,
        fallbackReason: null,
      },
    },
    source: {
      bytes: Uint8Array.from([1, 2, 3]),
      mimeType: "audio/wav",
      fileName: "source.wav",
    },
    synthesisReference: {
      bytes: Uint8Array.from([4, 5, 6, 7]),
      mimeType: "audio/wav",
      fileName: "synthesis-reference.wav",
    },
  };
}

async function runPersistenceFailureCase(mode: FailureMode) {
  const { prisma } = await import("../src/shared/db/index.server");
  const { persistAnalyzedVocalProfile, VocalProfilePersistenceError } = await import(
    "../lib/vocal-profile/persistence"
  );
  const userId = `modal-persist-${mode}-${crypto.randomUUID()}`;
  const recordingId = crypto.randomUUID();
  const previousFetch = globalThis.fetch;
  const previousEnv = {
    baseUrl: process.env.LEEMAGE_BASE_URL,
    apiKey: process.env.LEEMAGE_API_KEY,
    projectId: process.env.LEEMAGE_PROJECT_ID,
  };
  let conflictingRecording = false;
  let leemageUploadCount = 0;
  const deletedExternalFiles: string[] = [];

  process.env.LEEMAGE_BASE_URL = "https://leemage.example/api/v1";
  process.env.LEEMAGE_API_KEY = "test-key";
  process.env.LEEMAGE_PROJECT_ID = "project";
  await prisma.user.create({
    data: { id: userId, name: "Modal persistence fixture", email: `${userId}@example.test`, emailVerified: true },
  });
  if (mode === "database") {
    conflictingRecording = true;
    await prisma.recording.create({
      data: {
        id: recordingId,
        kind: "USER_TEST",
        storagePath: `fixture://${recordingId}`,
        mimeType: "audio/wav",
        status: "READY",
      },
    });
  }

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/files/presign")) {
      const body = JSON.parse(String(init?.body)) as { fileName: string };
      const synthesis = body.fileName.includes("synthesis");
      if (mode === "source-storage" || (mode === "synthesis-storage" && synthesis)) {
        return Response.json({ message: "fixture storage failure" }, { status: 400 });
      }
      leemageUploadCount += 1;
      const fileId = `${synthesis ? "synthesis" : "reference"}-${leemageUploadCount}`;
      return Response.json({
        presignedUrl: `https://objects.example/${fileId}`,
        objectName: `project/${fileId}.wav`,
        fileId,
      });
    }
    if (url.startsWith("https://objects.example/") && init?.method === "PUT") {
      return new Response(null, { status: 200 });
    }
    if (url.endsWith("/files/confirm")) {
      const body = JSON.parse(String(init?.body)) as { fileId: string };
      return Response.json(
        { file: { id: body.fileId, url: `https://objects.example/files/${body.fileId}` } },
        { status: 201 },
      );
    }
    if (url.includes("/files/") && init?.method === "DELETE") {
      deletedExternalFiles.push(decodeURIComponent(url.split("/").at(-1)!));
      return Response.json({ status: "deleted" });
    }
    throw new Error(`Unexpected URL: ${url}`);
  }) as typeof fetch;

  try {
    const operation = persistAnalyzedVocalProfile({
      userId,
      recordingId,
      analyzed: analyzedRecording(recordingId),
    });

    if (mode === "source-storage") {
      await assert.rejects(
        operation,
        (error: unknown) =>
          error instanceof VocalProfilePersistenceError && error.reasonCode === "STORAGE_UPLOAD_FAILED",
      );
      assert.equal(await prisma.vocalProfile.count({ where: { userId } }), 0);
      assert.equal(await prisma.mediaAsset.count({ where: { userId } }), 0);
    } else if (mode === "synthesis-storage") {
      const storedProfile = await operation;
      const stored = await prisma.vocalProfile.findUniqueOrThrow({
        where: { id: storedProfile.id },
        include: { recording: { include: { mediaAsset: true } }, synthesisReferenceAsset: true },
      });
      assert.ok(stored.recording.mediaAsset);
      assert.equal(stored.synthesisReferenceAsset, null);
      const descriptors = stored.descriptors as { synthesisReferenceStorage?: { status?: string; fallback?: string } };
      assert.deepEqual(descriptors.synthesisReferenceStorage, {
        status: "failed",
        fallback: "analysis-source",
      });
    } else {
      await assert.rejects(
        operation,
        (error: unknown) => error instanceof VocalProfilePersistenceError && error.reasonCode === "PROFILE_SAVE_FAILED",
      );
      assert.equal(await prisma.vocalProfile.count({ where: { userId } }), 0);
      assert.equal(await prisma.mediaAsset.count({ where: { userId } }), 0);
      assert.equal(deletedExternalFiles.length, 2);
    }
  } finally {
    globalThis.fetch = previousFetch;
    const profiles = await prisma.vocalProfile.findMany({ where: { userId }, select: { recordingId: true } });
    await prisma.vocalProfile.deleteMany({ where: { userId } });
    if (profiles.length) {
      await prisma.recording.deleteMany({ where: { id: { in: profiles.map((profile) => profile.recordingId) } } });
    }
    if (conflictingRecording) await prisma.recording.deleteMany({ where: { id: recordingId } });
    await prisma.mediaCleanupJob.deleteMany({ where: { mediaAsset: { userId } } });
    await prisma.mediaAsset.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    if (previousEnv.baseUrl === undefined) delete process.env.LEEMAGE_BASE_URL;
    else process.env.LEEMAGE_BASE_URL = previousEnv.baseUrl;
    if (previousEnv.apiKey === undefined) delete process.env.LEEMAGE_API_KEY;
    else process.env.LEEMAGE_API_KEY = previousEnv.apiKey;
    if (previousEnv.projectId === undefined) delete process.env.LEEMAGE_PROJECT_ID;
    else process.env.LEEMAGE_PROJECT_ID = previousEnv.projectId;
    await prisma.$disconnect();
  }
}

for (const mode of ["source-storage", "synthesis-storage", "database"] as const) {
  test(`profile persistence compensates ${mode} failure`, async (context) => {
    if (!process.env.DATABASE_URL) {
      context.skip("DATABASE_URL is not configured");
      return;
    }
    await runPersistenceFailureCase(mode);
  });
}
