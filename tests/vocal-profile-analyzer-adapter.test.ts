import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { analyzeVocalProfile, vocalProfileAnalyzerBackend } from "../lib/vocal-profile/analyzer";
import { analyzeWithLocalAdapter } from "../lib/vocal-profile/analyzer/local-adapter";
import { analyzeWithModalAdapter } from "../lib/vocal-profile/analyzer/modal-adapter";
import { AnalyzerClientError } from "../lib/vocal-profile/analyzer/types";

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

async function withModalEnvironment<T>(callback: () => Promise<T>) {
  const previous = {
    url: process.env.VOCAL_PROFILE_MODAL_URL,
    apiKey: process.env.VOCAL_PROFILE_MODAL_API_KEY,
    backend: process.env.VOCAL_PROFILE_ANALYZER_BACKEND,
  };
  process.env.VOCAL_PROFILE_MODAL_URL = "https://modal-analyzer.example";
  process.env.VOCAL_PROFILE_MODAL_API_KEY = "modal-test-key";
  try {
    return await callback();
  } finally {
    if (previous.url === undefined) delete process.env.VOCAL_PROFILE_MODAL_URL;
    else process.env.VOCAL_PROFILE_MODAL_URL = previous.url;
    if (previous.apiKey === undefined) delete process.env.VOCAL_PROFILE_MODAL_API_KEY;
    else process.env.VOCAL_PROFILE_MODAL_API_KEY = previous.apiKey;
    if (previous.backend === undefined) delete process.env.VOCAL_PROFILE_ANALYZER_BACKEND;
    else process.env.VOCAL_PROFILE_ANALYZER_BACKEND = previous.backend;
  }
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
    apiKey: process.env.VOCAL_PROFILE_MODAL_API_KEY,
  };
  process.env.VOCAL_PROFILE_MODAL_URL = "https://modal-analyzer.example";
  process.env.VOCAL_PROFILE_MODAL_API_KEY = "modal-test-key";
  const recordingId = crypto.randomUUID();
  const fetchImpl = (async (_input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("X-API-Key"), "modal-test-key");
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
    if (previous.apiKey === undefined) delete process.env.VOCAL_PROFILE_MODAL_API_KEY;
    else process.env.VOCAL_PROFILE_MODAL_API_KEY = previous.apiKey;
  }
});

test("modal adapter maps API-key authentication failure without falling back", async () => {
  const previous = {
    url: process.env.VOCAL_PROFILE_MODAL_URL,
    apiKey: process.env.VOCAL_PROFILE_MODAL_API_KEY,
  };
  process.env.VOCAL_PROFILE_MODAL_URL = "https://modal-analyzer.example";
  process.env.VOCAL_PROFILE_MODAL_API_KEY = "modal-test-key";
  const fetchImpl = (async () => new Response("unauthorized", { status: 401 })) as typeof fetch;

  try {
    await assert.rejects(
      analyzeWithModalAdapter({
        recordingId: crypto.randomUUID(),
        contentType: "multipart/form-data; boundary=fixture",
        body: requestBody(),
        fetchImpl,
      }),
      (error: unknown) =>
        error instanceof AnalyzerClientError &&
        error.reasonCode === "ANALYZER_AUTH_FAILED" &&
        error.retryable === false,
    );
  } finally {
    if (previous.url === undefined) delete process.env.VOCAL_PROFILE_MODAL_URL;
    else process.env.VOCAL_PROFILE_MODAL_URL = previous.url;
    if (previous.apiKey === undefined) delete process.env.VOCAL_PROFILE_MODAL_API_KEY;
    else process.env.VOCAL_PROFILE_MODAL_API_KEY = previous.apiKey;
  }
});

test("modal adapter preserves expected analysis rejection without retrying it", async () => {
  await withModalEnvironment(async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return Response.json(
        { reasonCode: "TOO_SILENT", detail: "Audio is too quiet.", retryable: false },
        { status: 422 },
      );
    }) as typeof fetch;
    await assert.rejects(
      analyzeWithModalAdapter({
        recordingId: crypto.randomUUID(),
        contentType: "multipart/form-data; boundary=fixture",
        body: requestBody(),
        fetchImpl,
      }),
      (error: unknown) =>
        error instanceof AnalyzerClientError &&
        error.reasonCode === "TOO_SILENT" &&
        error.retryable === false &&
        error.status === 422,
    );
    assert.equal(calls, 1);
  });
});

test("modal adapter marks 429 and 5xx failures as retryable infrastructure errors", async () => {
  await withModalEnvironment(async () => {
    for (const [status, reasonCode] of [
      [429, "ANALYZER_BUSY"],
      [500, "ANALYZER_UNAVAILABLE"],
    ] as const) {
      let calls = 0;
      const fetchImpl = (async () => {
        calls += 1;
        return new Response("failure", { status });
      }) as typeof fetch;
      await assert.rejects(
        analyzeWithModalAdapter({
          recordingId: crypto.randomUUID(),
          contentType: "multipart/form-data; boundary=fixture",
          body: requestBody(),
          fetchImpl,
        }),
        (error: unknown) =>
          error instanceof AnalyzerClientError && error.reasonCode === reasonCode && error.retryable === true,
      );
      assert.equal(calls, 1);
    }
  });
});

test("modal adapter maps network and timeout failures without retrying inside the request budget", async () => {
  await withModalEnvironment(async () => {
    for (const [thrown, reasonCode] of [
      [new Error("network down"), "ANALYZER_UNAVAILABLE"],
      [Object.assign(new Error("timed out"), { name: "TimeoutError" }), "ANALYZER_TIMEOUT"],
    ] as const) {
      let calls = 0;
      const fetchImpl = (async () => {
        calls += 1;
        throw thrown;
      }) as typeof fetch;
      await assert.rejects(
        analyzeWithModalAdapter({
          recordingId: crypto.randomUUID(),
          contentType: "multipart/form-data; boundary=fixture",
          body: requestBody(),
          fetchImpl,
        }),
        (error: unknown) =>
          error instanceof AnalyzerClientError && error.reasonCode === reasonCode && error.retryable === true,
      );
      assert.equal(calls, 1);
    }
  });
});

test("incompatible Modal capability is rejected before persistence can start", async () => {
  await withModalEnvironment(async () => {
    process.env.VOCAL_PROFILE_ANALYZER_BACKEND = "modal";
    const recordingId = crypto.randomUUID();
    const fetchImpl = (async () =>
      Response.json({
        transportVersion: "modal-analysis-envelope-v1",
        profile: {
          ...profile(recordingId),
          descriptors: {},
          synthesisReference: null,
        },
        artifacts: {
          source: encodedArtifact([1, 2, 3], "source.wav"),
          synthesisReference: null,
        },
        cleanupConfirmed: true,
      })) as typeof fetch;

    await assert.rejects(
      analyzeVocalProfile({
        recordingId,
        contentType: "multipart/form-data; boundary=fixture",
        body: requestBody(),
        fetchImpl,
      }),
      (error: unknown) =>
        error instanceof AnalyzerClientError &&
        error.reasonCode === "ANALYZER_UPDATE_REQUIRED" &&
        error.retryable === false,
    );
  });
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
      (error: unknown) => error instanceof AnalyzerClientError && error.reasonCode === "ANALYZER_NOT_CONFIGURED",
    );
  } finally {
    if (previousBackend === undefined) delete mutableEnv.VOCAL_PROFILE_ANALYZER_BACKEND;
    else mutableEnv.VOCAL_PROFILE_ANALYZER_BACKEND = previousBackend;
    if (previousNodeEnv === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = previousNodeEnv;
  }
});
