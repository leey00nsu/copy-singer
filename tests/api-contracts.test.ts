import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { mixingHistoryPayloadSchema } from "@/entities/mixing-job";
import { recommendationRunResponseSchema } from "@/entities/recommendation";
import { vocalProfileAnalysisJobResponseSchema } from "@/entities/vocal-profile";
import {
  ANALYSIS_AUDIO_MIME_TYPES,
  analysisAudioFileSchema,
  analysisIdempotencyKeySchema,
  MAX_PROFILE_ANALYSIS_AUDIO_BYTES,
} from "@/features/analyze-vocal-profile";
import { createMixingRequestSchema } from "@/features/create-mixing";
import { createRecommendationRequestSchema } from "@/features/create-recommendation";
import { conversionHealthSchema, conversionJobSchema } from "@/features/development-conversion";
import { ticketAdjustmentRequestSchema, ticketAdjustmentResponseSchema } from "@/features/manage-tickets";
import { pageSearchParamSchema, resourceIdSchema } from "@/shared/api";

const RUN_ID = "10000000-0000-4000-8000-000000000001";
const PROFILE_ID = "10000000-0000-4000-8000-000000000002";
const JOB_ID = "10000000-0000-4000-8000-000000000003";

test("owned request schemas validate UUID, idempotency, pagination, and ticket bounds", () => {
  assert.deepEqual(createRecommendationRequestSchema.parse({ userVocalProfileId: PROFILE_ID }), {
    userVocalProfileId: PROFILE_ID,
  });
  assert.deepEqual(createMixingRequestSchema.parse({ recommendationItemId: RUN_ID, idempotencyKey: " request-1 " }), {
    recommendationItemId: RUN_ID,
    idempotencyKey: "request-1",
  });
  assert.equal(resourceIdSchema.safeParse("not-a-uuid").success, false);
  assert.equal(analysisIdempotencyKeySchema.safeParse(" ").success, false);
  assert.equal(pageSearchParamSchema.parse("2.9"), 2);
  assert.equal(pageSearchParamSchema.parse("invalid"), 1);
  assert.equal(
    ticketAdjustmentRequestSchema.safeParse({ userId: "user", amount: 0, reason: "valid", idempotencyKey: "x" })
      .success,
    false,
  );
  assert.equal(
    ticketAdjustmentRequestSchema.safeParse({ userId: "user", amount: 1, reason: "no", idempotencyKey: "x" }).success,
    false,
  );
});

test("analysis upload schema checks file metadata without reading file bytes", () => {
  const valid = new File([new Uint8Array([1, 2, 3])], "voice.wav", { type: ANALYSIS_AUDIO_MIME_TYPES[0] });
  assert.equal(analysisAudioFileSchema.safeParse(valid).success, true);

  const unsupported = new File([new Uint8Array([1])], "voice.txt", { type: "text/plain" });
  assert.equal(analysisAudioFileSchema.safeParse(unsupported).success, false);

  const oversized = new File([new Uint8Array(MAX_PROFILE_ANALYSIS_AUDIO_BYTES + 1)], "voice.wav", {
    type: ANALYSIS_AUDIO_MIME_TYPES[0],
  });
  assert.equal(analysisAudioFileSchema.safeParse(oversized).success, false);
});

test("entity response schemas accept representative legacy payloads", () => {
  const analysisJob = vocalProfileAnalysisJobResponseSchema.parse({
    id: JOB_ID,
    status: "pending",
    vocalProfileId: null,
    attempts: 0,
    maxAttempts: 3,
    error: null,
    createdAt: "2026-08-09T00:00:00.000Z",
    updatedAt: "2026-08-09T00:00:00.000Z",
  });
  assert.equal(analysisJob.status, "pending");

  const recommendation = recommendationRunResponseSchema.parse({
    id: RUN_ID,
    userVocalProfileId: PROFILE_ID,
    scoringVersion: "key-fit-v2",
    createdAt: "2026-08-09T00:00:00.000Z",
    profileConfidence: 0.9,
    lowConfidence: false,
    profile: {
      analyzer: "modal",
      analyzerVersion: "1",
      tessituraLowMidi: 48,
      tessituraHighMidi: 72,
      minMidi: 45,
      maxMidi: 76,
    },
    items: [],
  });
  assert.equal(recommendationRunResponseSchema.parse(recommendation).id, RUN_ID);

  const history = mixingHistoryPayloadSchema.parse({
    page: 1,
    pageSize: 20,
    total: 1,
    pageCount: 1,
    jobs: [
      {
        id: JOB_ID,
        status: "processing",
        ticketCost: 1,
        error: null,
        song: { title: "Song", artist: "Singer", catalogOrder: 1 },
        vocalProfile: { id: PROFILE_ID, createdAt: "2026-08-09T00:00:00.000Z" },
        resultReady: false,
        audioUrl: null,
        createdAt: "2026-08-09T00:00:00.000Z",
        updatedAt: "2026-08-09T00:00:00.000Z",
        startedAt: null,
        completedAt: null,
      },
    ],
  });
  assert.equal(history.jobs[0]?.status, "processing");
});

test("development conversion and ticket response schemas preserve their current wire fields", () => {
  assert.equal(conversionHealthSchema.parse({ status: "ok", platform: "modal", gpu: "L4" }).status, "ok");
  assert.deepEqual(
    conversionJobSchema.parse({
      id: "modal-job-1",
      status: "queued",
      created_at: 1,
      error: null,
      result_url: null,
      internal: "removed",
    }),
    { id: "modal-job-1", status: "queued", created_at: 1, error: null, result_url: null },
  );
  assert.equal(
    ticketAdjustmentResponseSchema.parse({
      id: JOB_ID,
      amount: 5,
      balanceAfter: 10,
      reason: "manual adjustment",
      createdAt: "2026-08-09T00:00:00.000Z",
    }).balanceAfter,
    10,
  );
});

test("the Modal upload proxy forwards request.body without parsing multipart data", async () => {
  const source = await readFile("src/_app/api-routes/conversions/conversions-route.ts", "utf8");
  assert.match(source, /body: request\.body/);
  assert.doesNotMatch(source, /await request\.formData\(\)/);
});
