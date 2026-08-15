import type { MixingHistoryPayload, MixingJobResponse } from "@/entities/mixing-job";
import type { NotificationList } from "@/entities/notification";
import type { RecommendationRunResponse } from "@/entities/recommendation";
import type { AdminCustomMixingJob, AdminCustomMixingProfilesResponse } from "@/features/admin-custom-mixing";
import type { TicketAdjustmentResponse } from "@/features/manage-tickets";

export const MSW_API_ORIGIN = "http://copy-singer.test";

export const ticketBalanceFixture = {
  wallets: [
    { kind: "VOCAL_ANALYSIS" as const, balance: 5 },
    { kind: "AI_MIXING" as const, balance: 3 },
  ],
};

export const notificationListFixture: NotificationList = {
  page: 1,
  pageSize: 5,
  total: 3,
  pageCount: 1,
  unreadCount: 2,
  notifications: [
    {
      id: "40000000-0000-4000-8000-000000000001",
      type: "mixing_succeeded",
      title: "AI 믹스가 완성됐어요",
      message: "서른 즈음에 결과를 들을 수 있어요.",
      href: "/library/mixes/30000000-0000-4000-8000-000000000002",
      sourceId: "30000000-0000-4000-8000-000000000002",
      readAt: null,
      createdAt: "2026-08-11T12:30:00.000Z",
    },
    {
      id: "40000000-0000-4000-8000-000000000002",
      type: "vocal_profile_succeeded",
      title: "보컬 프로필 분석이 끝났어요",
      message: "메인 보컬의 분석 결과를 확인할 수 있어요.",
      href: "/vocal-profiles/30000000-0000-4000-8000-000000000012",
      sourceId: "30000000-0000-4000-8000-000000000011",
      readAt: null,
      createdAt: "2026-08-11T11:00:00.000Z",
    },
    {
      id: "40000000-0000-4000-8000-000000000003",
      type: "ticket_credit",
      title: "티켓이 추가됐어요",
      message: "티켓 2개가 추가됐어요. 고객 지원 지급",
      href: "/account",
      sourceId: "40000000-0000-4000-8000-000000000004",
      readAt: "2026-08-11T10:05:00.000Z",
      createdAt: "2026-08-11T10:00:00.000Z",
    },
  ],
};

export const queuedAdminCustomMixingJobFixture: AdminCustomMixingJob = {
  id: "modal-job-1",
  status: "queued",
  created_at: 1,
  error: null,
  result_url: null,
};

export const succeededAdminCustomMixingJobFixture: AdminCustomMixingJob = {
  ...queuedAdminCustomMixingJobFixture,
  status: "succeeded",
  result_url: "/api/conversions/modal-job-1/audio",
};

export const adminCustomMixingProfilesFixture: AdminCustomMixingProfilesResponse = {
  profiles: [
    {
      id: "20000000-0000-4000-8000-000000000002",
      profileNumber: 1,
      displayName: "메인 보컬",
      referenceKind: "SYNTHESIS_REFERENCE",
      referenceReady: true,
    },
    {
      id: "20000000-0000-4000-8000-000000000003",
      profileNumber: 2,
      displayName: "보컬 프로필 2",
      referenceKind: null,
      referenceReady: false,
    },
  ],
};

export const ticketAdjustmentFixture: TicketAdjustmentResponse = {
  id: "10000000-0000-4000-8000-000000000020",
  kind: "AI_MIXING",
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
  catalogId: "20000000-0000-4000-8000-000000000006",
  catalogRevision: 4,
  scoringVersion: "key-fit-v3",
  calculatedAt: "2026-08-09T00:00:00.000Z",
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
      songAnalysisId: recommendationItemId,
      targetAssetId: "20000000-0000-4000-8000-000000000007",
      rank: 1,
      songId: "20000000-0000-4000-8000-000000000004",
      catalogOrder: 1234,
      title: "서른 즈음에",
      artist: "김광석",
      sourceUrl: "https://example.test/catalog/1234",
      sourceVideoId: "NbKH4iZqq1Y",
      originalKey: "C",
      songProfile: {
        minMidi: 50,
        maxMidi: 75,
        medianMidi: 63,
        tessituraLowMidi: 55,
        tessituraHighMidi: 72,
      },
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
  songAnalysisId: recommendationItemId,
  status: "pending",
  ticketCost: 1,
  error: null,
  createdAt: "2026-08-09T00:01:00.000Z",
  updatedAt: "2026-08-09T00:01:00.000Z",
  completedAt: null,
};

export const mixingHistoryFixture: MixingHistoryPayload = {
  page: 1,
  pageSize: 20,
  total: 3,
  pageCount: 1,
  jobs: [
    {
      id: "30000000-0000-4000-8000-000000000001",
      status: "processing",
      ticketCost: 1,
      error: null,
      song: { title: "밤편지", artist: "아이유", catalogOrder: 101 },
      vocalProfile: {
        id: "30000000-0000-4000-8000-000000000011",
        displayName: "보컬 프로필 1",
        createdAt: "2026-08-09T00:00:00.000Z",
      },
      resultReady: false,
      audioUrl: null,
      createdAt: "2026-08-09T03:00:00.000Z",
      updatedAt: "2026-08-09T03:01:00.000Z",
      submittedAt: "2026-08-09T03:00:20.000Z",
      startedAt: "2026-08-09T03:00:30.000Z",
      completedAt: null,
    },
    {
      id: "30000000-0000-4000-8000-000000000002",
      status: "succeeded",
      ticketCost: 1,
      error: null,
      song: { title: "서른 즈음에", artist: "김광석", catalogOrder: 102 },
      vocalProfile: {
        id: "30000000-0000-4000-8000-000000000012",
        displayName: "메인 보컬",
        createdAt: "2026-08-08T00:00:00.000Z",
      },
      resultReady: true,
      audioUrl: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=",
      createdAt: "2026-08-08T03:00:00.000Z",
      updatedAt: "2026-08-08T03:02:00.000Z",
      submittedAt: "2026-08-08T03:00:20.000Z",
      startedAt: "2026-08-08T03:00:30.000Z",
      completedAt: "2026-08-08T03:02:00.000Z",
    },
    {
      id: "30000000-0000-4000-8000-000000000003",
      status: "failed",
      ticketCost: 1,
      error: { code: "MIXING_TARGET_UNAVAILABLE", detail: "믹싱용 원곡을 준비하지 못했습니다." },
      song: { title: "기억의 습작", artist: "전람회", catalogOrder: 103 },
      vocalProfile: {
        id: "30000000-0000-4000-8000-000000000013",
        displayName: "연습 보컬",
        createdAt: "2026-08-07T00:00:00.000Z",
      },
      resultReady: false,
      audioUrl: null,
      createdAt: "2026-08-07T03:00:00.000Z",
      updatedAt: "2026-08-07T03:01:00.000Z",
      submittedAt: null,
      startedAt: "2026-08-07T03:00:30.000Z",
      completedAt: "2026-08-07T03:01:00.000Z",
    },
  ],
};

export const malformedConversionFixture = {
  id: queuedAdminCustomMixingJobFixture.id,
  status: "finished",
  privatePayload: "must-not-leak",
};
