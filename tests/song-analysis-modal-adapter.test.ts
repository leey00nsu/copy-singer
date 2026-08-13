import assert from "node:assert/strict";
import test from "node:test";

import { pollSongAnalysis, submitSongAnalysis } from "../src/features/manage-song-catalog/api/analyzer";

test("Modal song analyzer submit sends authenticated audio and stable request identity", async () => {
  const result = await submitSongAnalysis({
    analyzerUrl: "https://catalog-analyzer.example",
    apiKey: "server-secret",
    requestId: "job-id",
    sourceVideoId: "HdTUQhHHJEg",
    bytes: Uint8Array.from([1, 2, 3]),
    fileName: "target.m4a",
    mimeType: "audio/mp4",
    fetchImpl: (async (request, init) => {
      assert.equal(String(request), "https://catalog-analyzer.example/v1/jobs");
      assert.equal(new Headers(init?.headers).get("X-API-Key"), "server-secret");
      assert.ok(init?.body instanceof FormData);
      assert.equal(init.body.get("requestId"), "job-id");
      assert.equal(init.body.get("sourceVideoId"), "HdTUQhHHJEg");
      assert.ok(init.body.get("audio") instanceof File);
      return Response.json({ status: "PROCESSING", externalJobId: "modal-call-id", reused: false }, { status: 202 });
    }) as typeof fetch,
  });
  assert.deepEqual(result, { status: "PROCESSING", externalJobId: "modal-call-id", reused: false });
});

test("Modal song analyzer poll distinguishes processing and terminal failure", async () => {
  let polls = 0;
  const fetchImpl = (async (request, init) => {
    assert.equal(String(request), "https://catalog-analyzer.example/v1/jobs/modal-call-id");
    assert.equal(new Headers(init?.headers).get("X-API-Key"), "server-secret");
    polls += 1;
    if (polls === 1) {
      return Response.json({ status: "PROCESSING", externalJobId: "modal-call-id" }, { status: 202 });
    }
    return Response.json({
      status: "FAILED",
      reasonCode: "MODAL_ANALYSIS_FAILED",
      detail: "Modal song analysis failed.",
      retryable: true,
    });
  }) as typeof fetch;

  assert.equal(
    (
      await pollSongAnalysis({
        analyzerUrl: "https://catalog-analyzer.example",
        apiKey: "server-secret",
        externalJobId: "modal-call-id",
        fetchImpl,
      })
    ).status,
    "PROCESSING",
  );
  assert.deepEqual(
    await pollSongAnalysis({
      analyzerUrl: "https://catalog-analyzer.example",
      apiKey: "server-secret",
      externalJobId: "modal-call-id",
      fetchImpl,
    }),
    {
      status: "FAILED",
      reasonCode: "MODAL_ANALYSIS_FAILED",
      detail: "Modal song analysis failed.",
      retryable: true,
    },
  );
});
