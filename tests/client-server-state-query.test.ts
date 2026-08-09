import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { createQueryClient } from "@/_app/providers";
import type { VocalProfileAnalysisJobResponse } from "@/entities/vocal-profile";
import {
  analysisJobPollingInterval,
  analysisJobsPollingInterval,
  vocalAnalysisKeys,
} from "@/features/analyze-vocal-profile";
import { ApiError, requestJson, shouldRetryQuery } from "@/shared/api";

const payloadSchema = z.object({ id: z.string(), status: z.enum(["pending", "succeeded"]) });

function responseFetch(payload: unknown, init: ResponseInit = {}): typeof fetch {
  return async () => Response.json(payload, init);
}

test("requestJson returns only a Zod-validated payload", async () => {
  const payload = await requestJson(
    "https://copy-singer.test/api/jobs/1",
    { schema: payloadSchema },
    responseFetch({ id: "job-1", status: "pending", ignored: true }),
  );
  assert.deepEqual(payload, { id: "job-1", status: "pending" });
});

test("requestJson rejects malformed success responses as non-retryable contract errors", async () => {
  await assert.rejects(
    requestJson(
      "https://copy-singer.test/api/jobs/1",
      { schema: payloadSchema },
      responseFetch({ id: "job-1", status: "unknown", privatePayload: "do-not-expose" }),
    ),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.kind, "contract");
      assert.equal(error.code, "INVALID_API_RESPONSE");
      assert.equal(error.retryable, false);
      assert.doesNotMatch(error.message, /privatePayload|do-not-expose/);
      return true;
    },
  );
});

test("requestJson preserves HTTP error metadata without retrying ordinary 4xx responses", async () => {
  await assert.rejects(
    requestJson(
      "https://copy-singer.test/api/jobs/1",
      { schema: payloadSchema },
      responseFetch(
        { error: { code: "JOB_NOT_FOUND", message: "작업을 찾을 수 없습니다.", retryable: false } },
        { status: 404 },
      ),
    ),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.kind, "http");
      assert.equal(error.status, 404);
      assert.equal(error.code, "JOB_NOT_FOUND");
      assert.equal(error.retryable, false);
      return true;
    },
  );
});

test("requestJson marks retryable server responses and network failures", async () => {
  const errors = await Promise.all([
    requestJson(
      "https://copy-singer.test/api/jobs/1",
      { schema: payloadSchema },
      responseFetch({ detail: "Temporary failure" }, { status: 503 }),
    ).catch((error: unknown) => error),
    requestJson("https://copy-singer.test/api/jobs/1", { schema: payloadSchema }, async () => {
      throw new TypeError("fetch failed");
    }).catch((error: unknown) => error),
  ]);
  for (const error of errors) {
    assert.ok(error instanceof ApiError);
    assert.equal(error.retryable, true);
  }
});

test("the QueryClient defaults preserve the documented cache and retry policy", () => {
  const client = createQueryClient(false);
  const defaults = client.getDefaultOptions();
  assert.equal(defaults.queries?.staleTime, 30_000);
  assert.equal(defaults.queries?.gcTime, 5 * 60_000);
  assert.equal(defaults.queries?.refetchOnWindowFocus, false);
  assert.equal(defaults.queries?.refetchOnReconnect, true);
  assert.equal(defaults.mutations?.retry, false);
  assert.equal(createQueryClient(true).getDefaultOptions().queries?.gcTime, Number.POSITIVE_INFINITY);

  const retryable = new ApiError("Temporary", { kind: "http", status: 503, retryable: true });
  const forbidden = new ApiError("Forbidden", { kind: "http", status: 403 });
  assert.equal(shouldRetryQuery(0, retryable), true);
  assert.equal(shouldRetryQuery(1, retryable), true);
  assert.equal(shouldRetryQuery(2, retryable), false);
  assert.equal(shouldRetryQuery(0, forbidden), false);
});

test("vocal analysis polling continues only for active jobs or retryable transport errors", () => {
  const job: VocalProfileAnalysisJobResponse = {
    id: "10000000-0000-4000-8000-000000000001",
    status: "pending",
    vocalProfileId: null,
    attempts: 0,
    maxAttempts: 3,
    error: null,
    createdAt: "2026-08-09T00:00:00.000Z",
    updatedAt: "2026-08-09T00:00:00.000Z",
  };
  assert.equal(analysisJobPollingInterval(job, null), 1_500);
  assert.equal(analysisJobsPollingInterval({ jobs: [job] }), 3_000);

  const succeeded = { ...job, status: "succeeded" as const };
  assert.equal(analysisJobPollingInterval(succeeded, null), false);
  assert.equal(analysisJobsPollingInterval({ jobs: [succeeded] }), false);
  assert.equal(
    analysisJobPollingInterval(undefined, new ApiError("offline", { kind: "network", retryable: true })),
    1_500,
  );
  assert.equal(analysisJobPollingInterval(undefined, new ApiError("missing", { kind: "http", status: 404 })), false);
  assert.deepEqual(vocalAnalysisKeys.job(job.id), ["vocal-analysis", "jobs", job.id]);
});

test("requestJson preserves root vocal-profile error codes", async () => {
  await assert.rejects(
    requestJson(
      "https://copy-singer.test/api/vocal-profile-analysis-jobs",
      { schema: payloadSchema },
      responseFetch(
        { reasonCode: "UNSUPPORTED_AUDIO", detail: "Use a supported file.", retryable: false },
        { status: 415 },
      ),
    ),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, "UNSUPPORTED_AUDIO");
      assert.equal(error.retryable, false);
      return true;
    },
  );
});
