import assert from "node:assert/strict";
import test from "node:test";
import {
  mixingDeleteResponseSchema,
  mixingHistoryFiltersSchema,
  mixingHistoryPayloadSchema,
} from "@/entities/mixing-job";
import {
  notificationFiltersSchema,
  notificationListSchema,
  notificationReadAllResponseSchema,
  notificationReadResponseSchema,
} from "@/entities/notification";
import { recommendationRunResponseSchema } from "@/entities/recommendation";
import { ticketWalletsSchema } from "@/entities/ticket";
import { vocalProfileAnalysisJobResponseSchema } from "@/entities/vocal-profile";
import { adminCustomMixingJobSchema } from "@/features/admin-custom-mixing";
import {
  ANALYSIS_AUDIO_MIME_TYPES,
  analysisAudioFileSchema,
  analysisIdempotencyKeySchema,
  MAX_PROFILE_ANALYSIS_AUDIO_BYTES,
} from "@/features/analyze-vocal-profile";
import { createMixingRequestSchema } from "@/features/create-mixing";
import { createRecommendationRequestSchema } from "@/features/create-recommendation";
import { ticketAdjustmentRequestSchema, ticketAdjustmentResponseSchema } from "@/features/manage-tickets";
import { pageSearchParamSchema, resourceIdSchema } from "@/shared/api";

const RUN_ID = "10000000-0000-4000-8000-000000000001";
const PROFILE_ID = "10000000-0000-4000-8000-000000000002";
const JOB_ID = "10000000-0000-4000-8000-000000000003";

test("ticket wallet contract separates kinds and requires nonnegative integer balances", () => {
  assert.deepEqual(
    ticketWalletsSchema.parse({
      wallets: [
        { kind: "VOCAL_ANALYSIS", balance: 5 },
        { kind: "AI_MIXING", balance: 1 },
      ],
      ignored: true,
    }),
    {
      wallets: [
        { kind: "VOCAL_ANALYSIS", balance: 5 },
        { kind: "AI_MIXING", balance: 1 },
      ],
    },
  );
  assert.equal(ticketWalletsSchema.safeParse({ wallets: [{ kind: "VOCAL_ANALYSIS", balance: -1 }] }).success, false);
  assert.equal(ticketWalletsSchema.safeParse({ wallets: [{ kind: "UNKNOWN", balance: 1 }] }).success, false);
});

test("owned request schemas validate UUID, idempotency, pagination, and ticket bounds", () => {
  assert.deepEqual(createRecommendationRequestSchema.parse({ userVocalProfileId: PROFILE_ID }), {
    userVocalProfileId: PROFILE_ID,
  });
  assert.deepEqual(
    createMixingRequestSchema.parse({
      vocalProfileId: PROFILE_ID,
      songAnalysisId: RUN_ID,
      idempotencyKey: " request-1 ",
    }),
    {
      vocalProfileId: PROFILE_ID,
      songAnalysisId: RUN_ID,
      idempotencyKey: "request-1",
    },
  );
  assert.equal(resourceIdSchema.safeParse("not-a-uuid").success, false);
  assert.equal(analysisIdempotencyKeySchema.safeParse(" ").success, false);
  assert.equal(pageSearchParamSchema.parse("2.9"), 2);
  assert.equal(pageSearchParamSchema.parse("invalid"), 1);
  assert.equal(
    ticketAdjustmentRequestSchema.safeParse({
      userId: "user",
      kind: "AI_MIXING",
      amount: 0,
      reason: "valid",
      idempotencyKey: "x",
    }).success,
    false,
  );
  assert.equal(
    ticketAdjustmentRequestSchema.safeParse({
      userId: "user",
      kind: "VOCAL_ANALYSIS",
      amount: 1,
      reason: "no",
      idempotencyKey: "x",
    }).success,
    false,
  );
});

test("mixing history filters normalize URL values without inventing statuses", () => {
  assert.deepEqual(
    mixingHistoryFiltersSchema.parse({ page: ["2", "4"], q: ["  아이유  ", "ignored"], status: ["processing"] }),
    { page: 2, q: "아이유", status: "processing" },
  );
  assert.deepEqual(mixingHistoryFiltersSchema.parse({ page: "invalid", q: " ", status: "unknown" }), {
    page: 1,
    q: "",
    status: "all",
  });
  assert.equal(mixingHistoryFiltersSchema.parse({ page: "1", q: "x".repeat(100) }).q.length, 80);
});

test("notification contracts keep internal links, bounded pages, unread filters, and read envelopes", () => {
  assert.deepEqual(notificationFiltersSchema.parse({ page: "2", pageSize: "5", unreadOnly: "true" }), {
    page: 2,
    pageSize: 5,
    unreadOnly: true,
  });
  assert.deepEqual(notificationFiltersSchema.parse({ page: "bad", pageSize: "500", unreadOnly: "false" }), {
    page: 1,
    pageSize: 20,
    unreadOnly: false,
  });
  const item = {
    id: JOB_ID,
    type: "mixing_succeeded" as const,
    title: "AI 믹스가 완성되었습니다",
    message: "결과를 들어보세요.",
    href: `/library/mixes/${JOB_ID}`,
    sourceId: JOB_ID,
    readAt: null,
    createdAt: "2026-08-11T00:00:00.000Z",
  };
  assert.equal(
    notificationListSchema.parse({
      page: 1,
      pageSize: 5,
      total: 1,
      pageCount: 1,
      unreadCount: 1,
      notifications: [item],
    }).notifications[0]?.href,
    item.href,
  );
  assert.equal(
    notificationListSchema.safeParse({
      page: 1,
      pageSize: 5,
      total: 1,
      pageCount: 1,
      unreadCount: 1,
      notifications: [{ ...item, href: "https://evil.test" }],
    }).success,
    false,
  );
  assert.equal(notificationReadResponseSchema.parse({ notification: item }).notification?.id, JOB_ID);
  assert.deepEqual(notificationReadAllResponseSchema.parse({ updatedCount: 2, unreadCount: 0 }), {
    updatedCount: 2,
    unreadCount: 0,
  });
});

test("mixing deletion has a stable terminal cleanup envelope", () => {
  assert.deepEqual(
    mixingDeleteResponseSchema.parse({ status: "deleted", id: JOB_ID, mediaCleanupPending: true, ignored: true }),
    { status: "deleted", id: JOB_ID, mediaCleanupPending: true },
  );
  assert.equal(
    mixingDeleteResponseSchema.safeParse({ status: "ok", id: JOB_ID, mediaCleanupPending: false }).success,
    false,
  );
});

test("analysis upload schema checks the shared audio formats without reading file bytes", () => {
  const valid = new File([new Uint8Array([1, 2, 3])], "voice.wav", { type: ANALYSIS_AUDIO_MIME_TYPES[0] });
  assert.equal(analysisAudioFileSchema.safeParse(valid).success, true);

  for (const mimeType of ["audio/mp4", "audio/aac", "audio/x-m4a"]) {
    const m4a = new File([new Uint8Array([1])], "voice.m4a", { type: mimeType });
    assert.equal(analysisAudioFileSchema.safeParse(m4a).success, true);
  }

  const flac = new File([new Uint8Array([1])], "voice.flac", { type: "audio/flac" });
  assert.equal(analysisAudioFileSchema.safeParse(flac).success, false);

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
    catalogId: JOB_ID,
    catalogRevision: 1,
    scoringVersion: "key-fit-v2",
    calculatedAt: "2026-08-09T00:00:00.000Z",
    profileConfidence: 0.9,
    lowConfidence: false,
    profile: {
      analyzer: "modal",
      analyzerVersion: "1",
      tessituraLowMidi: 48,
      tessituraHighMidi: 72,
      minMidi: 45,
      maxMidi: 76,
      mixing: { available: false, unavailableReason: "missing_mid_reference" },
    },
    items: [],
  });
  assert.equal(recommendationRunResponseSchema.parse(recommendation).id, RUN_ID);
  assert.deepEqual(recommendation.profile.mixing, {
    available: false,
    unavailableReason: "missing_mid_reference",
  });

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
        vocalProfile: { id: PROFILE_ID, displayName: "보컬 프로필 1", createdAt: "2026-08-09T00:00:00.000Z" },
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

test("recommendation items accept legacy, additive, and unavailable song profile payloads", () => {
  const item = {
    id: "10000000-0000-4000-8000-000000000011",
    songAnalysisId: "10000000-0000-4000-8000-000000000011",
    targetAssetId: "10000000-0000-4000-8000-000000000013",
    rank: 1,
    songId: "10000000-0000-4000-8000-000000000012",
    catalogOrder: 1,
    title: "Stored song",
    artist: "Stored artist",
    sourceUrl: "https://example.test/source",
    sourceVideoId: "NbKH4iZqq1Y",
    originalKeyScore: 78,
    adjustedScore: 91,
    selectionScore: 90,
    recommendedShift: -2,
    reasonCodes: [],
    reasons: [],
    metrics: {
      confidence: 0.8,
      original: {
        shift: 0,
        tessituraOverlapRatio: 0.7,
        highTessituraExcess: 2,
        lowTessituraExcess: 0,
        highExtremeExcess: 1,
        lowExtremeExcess: 0,
        tessituraFit: 0.8,
        extremeFit: 0.7,
        confidence: 0.8,
        contributions: { overlap: 28, tessituraFit: 24, extremeFit: 14 },
        rawScore: 74,
        score: 78,
      },
      recommended: {
        shift: -2,
        tessituraOverlapRatio: 0.9,
        highTessituraExcess: 0,
        lowTessituraExcess: 0,
        highExtremeExcess: 0,
        lowExtremeExcess: 0,
        tessituraFit: 1,
        extremeFit: 1,
        confidence: 0.8,
        contributions: { overlap: 36, tessituraFit: 30, extremeFit: 20 },
        rawScore: 94,
        score: 91,
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
  };

  const legacy = recommendationRunResponseSchema.shape.items.element.parse(item);
  assert.equal(legacy.originalKey, null);
  assert.equal(legacy.songProfile, null);
  assert.equal(legacy.sourceVideoId, "NbKH4iZqq1Y");
  assert.equal(
    recommendationRunResponseSchema.shape.items.element.safeParse({ ...item, sourceVideoId: "invalid" }).success,
    false,
  );

  const additive = recommendationRunResponseSchema.shape.items.element.parse({
    ...item,
    originalKey: "C",
    songProfile: {
      minMidi: 50,
      maxMidi: 75,
      medianMidi: 63,
      tessituraLowMidi: 55,
      tessituraHighMidi: 72,
    },
  });
  assert.equal(additive.originalKey, "C");
  assert.equal(additive.songProfile?.medianMidi, 63);

  const unavailable = recommendationRunResponseSchema.shape.items.element.parse({
    ...item,
    originalKey: null,
    songProfile: null,
  });
  assert.equal(unavailable.songProfile, null);

  assert.equal(
    recommendationRunResponseSchema.shape.items.element.safeParse({
      ...item,
      originalKey: "C",
      songProfile: {
        minMidi: 75,
        maxMidi: 50,
        medianMidi: 63,
        tessituraLowMidi: 55,
        tessituraHighMidi: 72,
      },
    }).success,
    false,
  );
});

test("admin custom mixing and ticket response schemas preserve their current wire fields", () => {
  assert.deepEqual(
    adminCustomMixingJobSchema.parse({
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
      kind: "VOCAL_ANALYSIS",
      amount: 5,
      balanceAfter: 10,
      reason: "manual adjustment",
      createdAt: "2026-08-09T00:00:00.000Z",
    }).balanceAfter,
    10,
  );
});
