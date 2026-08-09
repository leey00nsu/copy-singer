import assert from "node:assert/strict";
import test from "node:test";

import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("concurrent item starts create one Modal job with the fixed preset", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }
  const { prisma } = await import("../lib/db/prisma");
  const { createRecommendationRun, getRecommendationRun } = await import("../lib/recommendation/server");
  const { cleanupRecommendationSyntheses, reconcileRecommendationSyntheses, startRecommendationSynthesis } =
    await import("../lib/recommendation/synthesis");
  const recordingId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const originalFetch = globalThis.fetch;
  const originalAnalyzerUrl = process.env.VOCAL_PROFILE_API_URL;
  const originalModalUrl = process.env.MODAL_API_URL;
  const originalModalKey = process.env.MODAL_API_KEY;
  let modalCreates = 0;
  let modalDeletes = 0;

  try {
    process.env.VOCAL_PROFILE_API_URL = "http://analyzer.test";
    process.env.MODAL_API_URL = "https://modal.test";
    process.env.MODAL_API_KEY = "fixture-secret";
    await prisma.recording.create({
      data: {
        id: recordingId,
        kind: "USER_TEST",
        storagePath: `${recordingId}/source.wav`,
        mimeType: "audio/wav",
        durationMs: 8_000,
        sizeBytes: BigInt(1_024),
        sampleRate: 22_050,
        status: "READY",
        expiresAt: new Date(Date.now() + 60 * 60_000),
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
    const run = await createRecommendationRun(profileId);
    assert.equal(run.items.length, 100);
    assert.equal(modalCreates, 0);
    assert.ok(run.items.every((candidate) => candidate.synthesis.status === "not_started"));
    const item = run.items[0]!;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("/v1/recordings/"))
        return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/wav" } });
      if (url.endsWith("/v1/song-target"))
        return new Response(new Uint8Array([4, 5, 6]), { headers: { "Content-Type": "audio/wav" } });
      if (url.endsWith("/v1/conversions") && init?.method === "POST") {
        modalCreates += 1;
        const form = init.body as FormData;
        assert.equal(form.get("auto_pitch_shift"), "true");
        assert.equal(form.get("pitch_shift"), "0");
        assert.equal(form.get("target_vocal_separation"), "true");
        assert.equal(form.get("auto_mix_accompaniment"), "true");
        await new Promise((resolve) => setTimeout(resolve, 20));
        return Response.json({ id: "modal-job-1", status: "queued", created_at: Date.now() / 1_000 }, { status: 202 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    await Promise.all([startRecommendationSynthesis(run.id, item.id), startRecommendationSynthesis(run.id, item.id)]);
    const stored = await getRecommendationRun(run.id);
    assert.equal(modalCreates, 1);
    assert.equal(stored.items[0]!.synthesis.status, "queued");
    assert.equal(stored.items[0]!.synthesis.jobId, "modal-job-1");
    assert.ok(stored.items.slice(1).every((candidate) => candidate.synthesis.status === "not_started"));

    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith("/v1/conversions/modal-job-1") && init?.method === "DELETE") {
        modalDeletes += 1;
        return new Response(null, { status: 204 });
      }
      if (url.endsWith("/v1/conversions/modal-job-1")) {
        return Response.json({ id: "modal-job-1", status: "succeeded", created_at: Date.now() / 1_000 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };
    await reconcileRecommendationSyntheses(run.id);
    const completed = await getRecommendationRun(run.id);
    assert.equal(completed.items[0]!.synthesis.status, "succeeded");
    assert.ok(completed.items[0]!.synthesis.audioUrl?.endsWith("/synthesis/audio"));
    await cleanupRecommendationSyntheses(run.id);
    assert.equal(modalDeletes, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalAnalyzerUrl === undefined) delete process.env.VOCAL_PROFILE_API_URL;
    else process.env.VOCAL_PROFILE_API_URL = originalAnalyzerUrl;
    if (originalModalUrl === undefined) delete process.env.MODAL_API_URL;
    else process.env.MODAL_API_URL = originalModalUrl;
    if (originalModalKey === undefined) delete process.env.MODAL_API_KEY;
    else process.env.MODAL_API_KEY = originalModalKey;
    await prisma.recommendationRun.deleteMany({ where: { userVocalProfileId: profileId } });
    await prisma.vocalProfile.deleteMany({ where: { id: profileId } });
    await prisma.recording.deleteMany({ where: { id: recordingId } });
    await prisma.$disconnect();
  }
});

test("expired reference fails before target download or Modal creation", async (context) => {
  if (!process.env.DATABASE_URL) {
    context.skip("DATABASE_URL is not configured");
    return;
  }
  const { prisma } = await import("../lib/db/prisma");
  const { createRecommendationRun } = await import("../lib/recommendation/server");
  const { reconcileRecommendationSyntheses, startRecommendationSynthesis } = await import(
    "../lib/recommendation/synthesis"
  );
  const recordingId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  try {
    await prisma.recording.create({
      data: {
        id: recordingId,
        kind: "USER_TEST",
        storagePath: `${recordingId}/source.wav`,
        mimeType: "audio/wav",
        status: "READY",
        expiresAt: new Date(Date.now() - 1_000),
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
    const run = await createRecommendationRun(profileId);
    globalThis.fetch = async () => {
      fetchCount += 1;
      return new Response();
    };
    await assert.rejects(() => startRecommendationSynthesis(run.id, run.items[0]!.id), /만료/);
    assert.equal(fetchCount, 0);
    await prisma.recommendationItem.update({
      where: { id: run.items[0]!.id },
      data: { synthesisStatus: "PREPARING", synthesisUpdatedAt: new Date(Date.now() - 16 * 60_000) },
    });
    await reconcileRecommendationSyntheses(run.id);
    const recovered = await prisma.recommendationItem.findUniqueOrThrow({ where: { id: run.items[0]!.id } });
    assert.equal(recovered.synthesisStatus, "FAILED");
    assert.equal(recovered.synthesisErrorCode, "SYNTHESIS_PREPARING_TIMEOUT");
    assert.equal(recovered.synthesisRetryable, true);
  } finally {
    globalThis.fetch = originalFetch;
    await prisma.recommendationRun.deleteMany({ where: { userVocalProfileId: profileId } });
    await prisma.vocalProfile.deleteMany({ where: { id: profileId } });
    await prisma.recording.deleteMany({ where: { id: recordingId } });
    await prisma.$disconnect();
  }
});
