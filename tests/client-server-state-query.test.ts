import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { z } from "zod";
import { createQueryClient } from "@/_app/providers";
import {
  mixingDetailPollingInterval,
  mixingDetailQueryOptions,
  mixingHistoryPollingInterval,
  mixingHistoryQueryOptions,
  mixingJobKeys,
} from "@/entities/mixing-job";
import {
  type RecommendationRunResponse,
  recommendationKeys,
  recommendationPollingInterval,
} from "@/entities/recommendation";
import type { VocalProfileAnalysisJobResponse } from "@/entities/vocal-profile";
import {
  analysisJobPollingInterval,
  analysisJobsPollingInterval,
  vocalAnalysisKeys,
} from "@/features/analyze-vocal-profile";
import { mixingJobDetailHref, patchRecommendationSynthesis } from "@/features/create-mixing";
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

test("a created mixing job links directly to its durable detail route", () => {
  assert.equal(
    mixingJobDetailHref("10000000-0000-4000-8000-000000000014"),
    "/library/mixes/10000000-0000-4000-8000-000000000014",
  );

  const hook = readFileSync(
    new URL("../src/features/create-mixing/api/use-recommendation-mixing.ts", import.meta.url),
    "utf8",
  );
  assert.match(hook, /onSuccess: async \(job, input\)/);
  assert.match(hook, /router\.push\(mixingJobDetailHref\(job\.id\)\)/);
  assert.match(hook, /createdJob: mutation\.data \?\? null/);
});

test("recommendation and mixing polling stop at terminal state while item cache patches stay scoped", () => {
  const client = createQueryClient(true);
  const run: RecommendationRunResponse = {
    id: "10000000-0000-4000-8000-000000000010",
    userVocalProfileId: "10000000-0000-4000-8000-000000000011",
    scoringVersion: "key-fit-v2",
    createdAt: "2026-08-09T00:00:00.000Z",
    profileConfidence: 0.9,
    lowConfidence: false,
    profile: {
      analyzer: "test",
      analyzerVersion: "1",
      tessituraLowMidi: 48,
      tessituraHighMidi: 72,
      minMidi: 45,
      maxMidi: 76,
    },
    items: [
      {
        id: "10000000-0000-4000-8000-000000000012",
        rank: 1,
        songId: "10000000-0000-4000-8000-000000000013",
        catalogOrder: 1,
        title: "Song",
        artist: "Singer",
        sourceUrl: "https://example.test/song",
        sourceVideoId: null,
        originalKey: null,
        songProfile: null,
        originalKeyScore: 70,
        adjustedScore: 90,
        selectionScore: 90,
        recommendedShift: -1,
        reasonCodes: ["KEY_SHIFT_IMPROVES_FIT"],
        reasons: ["better fit"],
        metrics: {
          confidence: 0.9,
          original: {
            shift: 0,
            tessituraOverlapRatio: 0.5,
            highTessituraExcess: 0,
            lowTessituraExcess: 0,
            highExtremeExcess: 0,
            lowExtremeExcess: 0,
            tessituraFit: 1,
            extremeFit: 1,
            confidence: 0.9,
            contributions: { overlap: 1, tessituraFit: 1, extremeFit: 1, confidence: 1 },
            rawScore: 70,
            score: 70,
          },
          recommended: {
            shift: -1,
            tessituraOverlapRatio: 0.9,
            highTessituraExcess: 0,
            lowTessituraExcess: 0,
            highExtremeExcess: 0,
            lowExtremeExcess: 0,
            tessituraFit: 1,
            extremeFit: 1,
            confidence: 0.9,
            contributions: { overlap: 1, tessituraFit: 1, extremeFit: 1, confidence: 1 },
            rawScore: 90,
            score: 90,
          },
        },
        synthesis: {
          status: "not_started",
          jobId: null,
          error: null,
          startedAt: null,
          updatedAt: null,
          completedAt: null,
          expiresAt: null,
          attemptCount: 0,
          audioUrl: null,
        },
      },
    ],
  };
  const recommendationItem = run.items[0];
  assert.ok(recommendationItem);
  client.setQueryData(recommendationKeys.detail(run.id), run);
  patchRecommendationSynthesis(client, run.id, recommendationItem.id, { status: "preparing" });
  const patched = client.getQueryData<RecommendationRunResponse>(recommendationKeys.detail(run.id));
  assert.equal(patched?.items[0]?.synthesis.status, "preparing");
  assert.equal(recommendationPollingInterval(patched), 5_000);
  assert.equal(recommendationPollingInterval(run), false);

  const history = {
    page: 2,
    pageSize: 20,
    total: 1,
    pageCount: 2,
    jobs: [
      {
        id: "10000000-0000-4000-8000-000000000014",
        status: "processing" as const,
        ticketCost: 1,
        error: null,
        song: { title: "Song", artist: "Singer", catalogOrder: 1 },
        vocalProfile: { id: run.userVocalProfileId, displayName: "보컬 프로필 1", createdAt: run.createdAt },
        resultReady: false,
        audioUrl: null,
        createdAt: run.createdAt,
        updatedAt: run.createdAt,
        startedAt: run.createdAt,
        completedAt: null,
      },
    ],
  };
  const historyJob = history.jobs[0];
  assert.ok(historyJob);
  assert.equal(mixingHistoryPollingInterval(history), 5_000);
  assert.equal(mixingHistoryPollingInterval({ ...history, jobs: [{ ...historyJob, status: "succeeded" }] }), false);
  assert.notDeepEqual(mixingJobKeys.history(1), mixingJobKeys.history(2));
  assert.notDeepEqual(
    mixingJobKeys.history({ page: 1, q: "Song", status: "all" }),
    mixingJobKeys.history({ page: 1, q: "Singer", status: "all" }),
  );
  assert.notDeepEqual(
    mixingJobKeys.history({ page: 1, q: "", status: "processing" }),
    mixingJobKeys.history({ page: 1, q: "", status: "succeeded" }),
  );
  assert.deepEqual(mixingHistoryQueryOptions(history, { q: "Song", status: "processing" }).queryKey, [
    "mixing-job",
    "history",
    { page: 2, q: "Song", status: "processing" },
  ]);
  assert.equal(mixingDetailPollingInterval(historyJob), 5_000);
  assert.equal(mixingDetailPollingInterval({ ...historyJob, status: "failed" }), false);
  assert.deepEqual(mixingDetailQueryOptions(historyJob.id, historyJob).queryKey, [
    "mixing-job",
    "detail",
    historyJob.id,
  ]);
  client.clear();
});
