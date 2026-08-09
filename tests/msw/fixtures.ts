import type { MixingJobResponse } from "@/entities/mixing-job";
import type { RecommendationRunResponse } from "@/entities/recommendation";
import type { ConversionHealth, ConversionJob } from "@/features/development-conversion";
import type { TicketAdjustmentResponse } from "@/features/manage-tickets";

export const MSW_API_ORIGIN = "http://copy-singer.test";

export const conversionHealthFixture: ConversionHealth = {
  status: "ok",
  platform: "modal",
  gpu: "L4",
};

export const queuedConversionFixture: ConversionJob = {
  id: "modal-job-1",
  status: "queued",
  created_at: 1,
  error: null,
  result_url: null,
};

export const succeededConversionFixture: ConversionJob = {
  ...queuedConversionFixture,
  status: "succeeded",
  result_url: "/api/conversions/modal-job-1/audio",
};

export const ticketAdjustmentFixture: TicketAdjustmentResponse = {
  id: "10000000-0000-4000-8000-000000000020",
  amount: 2,
  balanceAfter: 4,
  reason: "support credit",
  createdAt: "2026-08-09T00:00:00.000Z",
};

const scoreBreakdown = {
  shift: 0,
  tessituraOverlapRatio: 0.9,
  highTessituraExcess: 0,
  lowTessituraExcess: 0,
  highExtremeExcess: 0,
  lowExtremeExcess: 0,
  tessituraFit: 0.9,
  extremeFit: 0.95,
  confidence: 0.88,
  contributions: {
    overlap: 36,
    tessituraFit: 27,
    extremeFit: 19,
    confidence: 8,
  },
  rawScore: 90,
  score: 90,
};

const recommendationItemId = "20000000-0000-4000-8000-000000000003";

export const recommendationRunFixture: RecommendationRunResponse = {
  id: "20000000-0000-4000-8000-000000000001",
  userVocalProfileId: "20000000-0000-4000-8000-000000000002",
  scoringVersion: "key-fit-v2",
  createdAt: "2026-08-09T00:00:00.000Z",
  profileConfidence: 0.88,
  lowConfidence: false,
  profile: {
    analyzer: "vocal-profile-modal",
    analyzerVersion: "1.2.0",
    tessituraLowMidi: 57,
    tessituraHighMidi: 70,
    minMidi: 52,
    maxMidi: 76,
  },
  items: [
    {
      id: recommendationItemId,
      rank: 1,
      songId: "20000000-0000-4000-8000-000000000004",
      catalogOrder: 1234,
      title: "서른 즈음에",
      artist: "김광석",
      sourceUrl: "https://example.test/catalog/1234",
      originalKeyScore: 78,
      adjustedScore: 90,
      selectionScore: 91,
      recommendedShift: -2,
      reasonCodes: ["KEY_SHIFT_IMPROVES_FIT", "HIGH_TESSITURA_OVERLAP"],
      reasons: ["-2키에서 실용 음역이 가장 편안하게 겹칩니다.", "고음 부담을 낮추면서 중심 음역을 유지합니다."],
      metrics: {
        confidence: 0.88,
        selectionScore: 91,
        original: scoreBreakdown,
        recommended: { ...scoreBreakdown, shift: -2 },
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

export const activeRecommendationRunFixture: RecommendationRunResponse = {
  ...recommendationRunFixture,
  items: recommendationRunFixture.items.map((item) => ({
    ...item,
    synthesis: {
      ...item.synthesis,
      status: "processing",
      jobId: "20000000-0000-4000-8000-000000000005",
      startedAt: "2026-08-09T00:01:00.000Z",
      updatedAt: "2026-08-09T00:01:30.000Z",
      attemptCount: 1,
    },
  })),
};

export const succeededRecommendationRunFixture: RecommendationRunResponse = {
  ...recommendationRunFixture,
  items: recommendationRunFixture.items.map((item) => ({
    ...item,
    synthesis: {
      ...item.synthesis,
      status: "succeeded",
      jobId: "20000000-0000-4000-8000-000000000005",
      startedAt: "2026-08-09T00:01:00.000Z",
      updatedAt: "2026-08-09T00:02:00.000Z",
      completedAt: "2026-08-09T00:02:00.000Z",
      expiresAt: "2026-08-10T00:02:00.000Z",
      attemptCount: 1,
      audioUrl: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=",
    },
  })),
};

export const mixingJobFixture: MixingJobResponse = {
  id: "20000000-0000-4000-8000-000000000005",
  recommendationItemId,
  status: "pending",
  ticketCost: 1,
  error: null,
  createdAt: "2026-08-09T00:01:00.000Z",
  updatedAt: "2026-08-09T00:01:00.000Z",
  completedAt: null,
};

export const malformedConversionFixture = {
  id: queuedConversionFixture.id,
  status: "finished",
  privatePayload: "must-not-leak",
};
