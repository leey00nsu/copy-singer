import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { analyzeWithLocalAdapter } from "../lib/vocal-profile/analyzer/local-adapter";
import { analyzeWithModalAdapter } from "../lib/vocal-profile/analyzer/modal-adapter";
import { AnalyzerClientError } from "../lib/vocal-profile/analyzer/types";
import { vocalProfileAnalyzerBackend } from "../lib/vocal-profile/analyzer";

function requestBody(bytes = [9, 8, 7]) {
  return new Blob([Uint8Array.from(bytes)]).stream() as ReadableStream<Uint8Array>;
}

function profile(recordingId: string) {
  return {
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
        version: "smart-reference-v1",
        sourceRanges: [],
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
  };
}

function encodedArtifact(bytes: number[], fileName: string) {
  const payload = Uint8Array.from(bytes);
  return {
    fileName,
    mimeType: "audio/wav",
    sizeBytes: payload.byteLength,
    sha256: createHash("sha256").update(payload).digest("hex"),
    contentBase64: Buffer.from(payload).toString("base64"),
  };
}

test("local adapter copies analyzer artifacts then removes local temporary recording", async () => {
  const previousUrl = process.env.VOCAL_PROFILE_API_URL;
  process.env.VOCAL_PROFILE_API_URL = "https://local-analyzer.example";
  const recordingId = crypto.randomUUID();
  const deleted: string[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/v1/analyze")) {
      assert.equal(init?.method, "POST");
      return Response.json({
        ...profile(recordingId),
        storagePath: `${recordingId}/source.wav`,
        expiresAt: "2026-08-09T00:00:00.000Z",
        synthesisReference: {
          ...profile(recordingId).synthesisReference,
          storagePath: `${recordingId}/synthesis-reference.wav`,
        },
      });
    }
    if (url.endsWith(`/v1/recordings/${recordingId}/source`)) {
      return new Response(Uint8Array.from([1, 2, 3]));
    }
    if (url.endsWith(`/v1/recordings/${recordingId}/synthesis-reference`)) {
      return new Response(Uint8Array.from([4, 5, 6, 7]));
    }
    if (url.endsWith(`/v1/recordings/${recordingId}`) && init?.method === "DELETE") {
      deleted.push(recordingId);
      return Response.json({ status: "deleted" });
    }
    throw new Error(`Unexpected URL: ${url}`);
  }) as typeof fetch;

  try {
    const analyzed = await analyzeWithLocalAdapter({
      recordingId,
      contentType: "multipart/form-data; boundary=fixture",
      body: requestBody(),
      fetchImpl,
    });

    assert.equal(analyzed.profile.recordingId, recordingId);
    assert.equal("storagePath" in analyzed.profile, false);
    assert.deepEqual([...analyzed.source.bytes], [1, 2, 3]);
    assert.deepEqual([...analyzed.synthesisReference!.bytes], [4, 5, 6, 7]);
    assert.deepEqual(deleted, [recordingId]);
  } finally {
    if (previousUrl === undefined) delete process.env.VOCAL_PROFILE_API_URL;
    else process.env.VOCAL_PROFILE_API_URL = previousUrl;
  }
});

test("modal adapter authenticates and validates the ephemeral envelope", async () => {
  const previous = {
    url: process.env.VOCAL_PROFILE_MODAL_URL,
    key: process.env.VOCAL_PROFILE_MODAL_KEY,
    secret: process.env.VOCAL_PROFILE_MODAL_SECRET,
  };
  process.env.VOCAL_PROFILE_MODAL_URL = "https://modal-analyzer.example";
  process.env.VOCAL_PROFILE_MODAL_KEY = "wk-test";
  process.env.VOCAL_PROFILE_MODAL_SECRET = "ws-test";
  const recordingId = crypto.randomUUID();
  const fetchImpl = (async (_input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("Modal-Key"), "wk-test");
    assert.equal(headers.get("Modal-Secret"), "ws-test");
    return Response.json({
      transportVersion: "modal-analysis-envelope-v1",
      profile: profile(recordingId),
      artifacts: {
        source: encodedArtifact([1, 2, 3], "source.wav"),
        synthesisReference: encodedArtifact([4, 5, 6, 7], "synthesis-reference.wav"),
      },
      cleanupConfirmed: true,
    });
  }) as typeof fetch;

  try {
    const analyzed = await analyzeWithModalAdapter({
      recordingId,
      contentType: "multipart/form-data; boundary=fixture",
      body: requestBody(),
      fetchImpl,
    });
    assert.equal(analyzed.profile.analyzerVersion, "fixture");
    assert.deepEqual([...analyzed.source.bytes], [1, 2, 3]);
    assert.deepEqual([...analyzed.synthesisReference!.bytes], [4, 5, 6, 7]);
  } finally {
    if (previous.url === undefined) delete process.env.VOCAL_PROFILE_MODAL_URL;
    else process.env.VOCAL_PROFILE_MODAL_URL = previous.url;
    if (previous.key === undefined) delete process.env.VOCAL_PROFILE_MODAL_KEY;
    else process.env.VOCAL_PROFILE_MODAL_KEY = previous.key;
    if (previous.secret === undefined) delete process.env.VOCAL_PROFILE_MODAL_SECRET;
    else process.env.VOCAL_PROFILE_MODAL_SECRET = previous.secret;
  }
});

test("modal adapter maps proxy authentication failure without falling back", async () => {
  const previous = {
    url: process.env.VOCAL_PROFILE_MODAL_URL,
    key: process.env.VOCAL_PROFILE_MODAL_KEY,
    secret: process.env.VOCAL_PROFILE_MODAL_SECRET,
  };
  process.env.VOCAL_PROFILE_MODAL_URL = "https://modal-analyzer.example";
  process.env.VOCAL_PROFILE_MODAL_KEY = "wk-test";
  process.env.VOCAL_PROFILE_MODAL_SECRET = "ws-test";
  const fetchImpl = (async () => new Response("unauthorized", { status: 401 })) as typeof fetch;

  try {
    await assert.rejects(
      analyzeWithModalAdapter({
        recordingId: crypto.randomUUID(),
        contentType: "multipart/form-data; boundary=fixture",
        body: requestBody(),
        fetchImpl,
      }),
      (error: unknown) => error instanceof AnalyzerClientError
        && error.reasonCode === "ANALYZER_AUTH_FAILED"
        && error.retryable === false,
    );
  } finally {
    if (previous.url === undefined) delete process.env.VOCAL_PROFILE_MODAL_URL;
    else process.env.VOCAL_PROFILE_MODAL_URL = previous.url;
    if (previous.key === undefined) delete process.env.VOCAL_PROFILE_MODAL_KEY;
    else process.env.VOCAL_PROFILE_MODAL_KEY = previous.key;
    if (previous.secret === undefined) delete process.env.VOCAL_PROFILE_MODAL_SECRET;
    else process.env.VOCAL_PROFILE_MODAL_SECRET = previous.secret;
  }
});

test("production analyzer backend must be explicit", () => {
  const mutableEnv = process.env as Record<string, string | undefined>;
  const previousBackend = mutableEnv.VOCAL_PROFILE_ANALYZER_BACKEND;
  const previousNodeEnv = mutableEnv.NODE_ENV;
  delete mutableEnv.VOCAL_PROFILE_ANALYZER_BACKEND;
  mutableEnv.NODE_ENV = "production";
  try {
    assert.throws(
      () => vocalProfileAnalyzerBackend(),
      (error: unknown) => error instanceof AnalyzerClientError
        && error.reasonCode === "ANALYZER_NOT_CONFIGURED",
    );
  } finally {
    if (previousBackend === undefined) delete mutableEnv.VOCAL_PROFILE_ANALYZER_BACKEND;
    else mutableEnv.VOCAL_PROFILE_ANALYZER_BACKEND = previousBackend;
    if (previousNodeEnv === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = previousNodeEnv;
  }
});
