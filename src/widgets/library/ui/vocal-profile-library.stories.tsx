import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HttpResponse, http } from "msw";
import type {} from "msw-storybook-addon/types";
import { expect, within } from "storybook/test";
import type { VocalProfileAnalysisJobResponse, VocalProfileHistoryPayload } from "@/entities/vocal-profile";
import { LibraryTabs } from "./library-tabs";
import { VocalProfileLibrary } from "./vocal-profile-library";

const profileHistory = {
  page: 1,
  pageSize: 12,
  total: 1,
  pageCount: 1,
  profiles: [
    {
      id: "40000000-0000-4000-8000-000000000001",
      profileNumber: 1,
      displayName: "보컬 프로필 1",
      minMidi: 46,
      maxMidi: 70,
      medianMidi: 58,
      tessituraLowMidi: 50,
      tessituraHighMidi: 66,
      voicedRatio: 0.86,
      pitchStability: 0.91,
      clippingRatio: 0,
      rmsDb: -20,
      analyzer: "storybook",
      analyzerVersion: "1",
      durationMs: 10_400,
      mimeType: "audio/wav",
      recommendationCount: 2,
      mixingCount: 1,
      latestRecommendationId: "40000000-0000-4000-8000-000000000002",
      createdAt: "2026-08-09T00:00:00.000Z",
    },
  ],
} satisfies VocalProfileHistoryPayload;

const failedAnalysisJob = {
  id: "40000000-0000-4000-8000-000000000003",
  status: "failed",
  vocalProfileId: null,
  attempts: 3,
  maxAttempts: 3,
  error: { reasonCode: "ANALYSIS_FAILED", detail: "음정을 충분히 찾지 못했어요.", retryable: false },
  createdAt: "2026-08-09T01:00:00.000Z",
  updatedAt: "2026-08-09T01:01:00.000Z",
} satisfies VocalProfileAnalysisJobResponse;

const processingAnalysisJob = {
  id: "40000000-0000-4000-8000-000000000004",
  status: "processing",
  vocalProfileId: null,
  attempts: 1,
  maxAttempts: 3,
  error: null,
  createdAt: "2026-08-11T11:36:37.000Z",
  updatedAt: "2026-08-11T11:36:40.000Z",
} satisfies VocalProfileAnalysisJobResponse;

const retryingAnalysisJob = {
  id: "40000000-0000-4000-8000-000000000005",
  status: "pending",
  vocalProfileId: null,
  attempts: 1,
  maxAttempts: 3,
  error: { reasonCode: "ANALYZER_UNAVAILABLE", detail: "분석기 연결을 다시 시도합니다.", retryable: true },
  createdAt: "2026-08-11T11:36:37.000Z",
  updatedAt: "2026-08-11T11:36:45.000Z",
} satisfies VocalProfileAnalysisJobResponse;

function analysisJobsHandler(jobs: VocalProfileAnalysisJobResponse[]) {
  return http.get("*/api/vocal-profile-analysis-jobs", () => HttpResponse.json({ jobs }));
}

const meta = {
  title: "Widgets/Library/Vocal Profiles",
  component: VocalProfileLibrary,
  args: {
    basePath: "/library",
    history: profileHistory,
  },
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-data-accent-foreground">LIBRARY</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">내 라이브러리</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          저장한 보컬 프로필과 AI 믹싱 작업을 구분해 확인하세요.
        </p>
        <div className="mt-8">
          <LibraryTabs tab="profiles" />
        </div>
        <div className="mt-6">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof VocalProfileLibrary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SavedProfile: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("region", { name: "보컬 프로필 목록" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: /분석과 제출 보컬 보기/ })).toHaveAttribute(
      "href",
      "/vocal-profiles/40000000-0000-4000-8000-000000000001",
    );
    await expect(canvasElement.querySelectorAll("[data-profile-artwork]")).toHaveLength(1);
    await expect(canvas.queryByText(/추천 2/)).not.toBeInTheDocument();
  },
};

const denseProfileHistory: VocalProfileHistoryPayload = {
  ...profileHistory,
  total: 10,
  profiles: Array.from({ length: 10 }, (_, index) => {
    const source = profileHistory.profiles[0];
    const suffix = String(index + 101).padStart(12, "0");
    return {
      ...source,
      id: `40000000-0000-4000-8000-${suffix}`,
      profileNumber: index + 1,
      displayName: `보컬 프로필 ${index + 1}`,
      recommendationCount: index + 1,
      mixingCount: index % 4,
      createdAt: `2026-08-${String(9 - (index % 7)).padStart(2, "0")}T00:00:00.000Z`,
    };
  }),
};

export const DenseLibrary: Story = {
  args: { history: denseProfileHistory },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("보컬 프로필 10개")).toBeVisible();
    await expect(canvas.getByText("최신 분석순")).toBeVisible();
    await expect(canvas.getAllByRole("link", { name: /분석과 제출 보컬 보기/ })).toHaveLength(10);
  },
};

export const FailedAnalysis: Story = {
  args: {
    analysisJobs: [failedAnalysisJob],
    history: { ...profileHistory, total: 0, profiles: [] },
  },
  beforeEach({ msw }) {
    msw.use(analysisJobsHandler([failedAnalysisJob]));
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("보컬 프로필을 만들지 못했어요")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "다시 분석하기" })).toHaveAttribute("href", "/profile");
    const row = canvasElement.querySelector('[data-analysis-job-row="failed"]');
    if (!(row instanceof HTMLElement)) throw new Error("Failed analysis row is missing.");
    await expect(row).toBeVisible();
    await expect(row).toHaveAttribute("aria-busy", "false");
    await expect(row.querySelectorAll("[data-profile-column]")).toHaveLength(5);
  },
};

export const ProcessingAnalysis: Story = {
  args: {
    analysisJobs: [processingAnalysisJob],
    history: { ...profileHistory, total: 0, profiles: [] },
  },
  beforeEach({ msw }) {
    msw.use(analysisJobsHandler([processingAnalysisJob]));
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("보컬 프로필 분석 중")).toBeVisible();
    await expect(canvas.getByText("분석 중")).toBeVisible();
    const row = canvasElement.querySelector('[data-analysis-job-row="processing"]');
    if (!(row instanceof HTMLElement)) throw new Error("Processing analysis row is missing.");
    await expect(row).toBeVisible();
    await expect(row).toHaveAttribute("aria-busy", "true");
    await expect(row.querySelectorAll("[data-profile-column]")).toHaveLength(5);
    await expect(row.querySelectorAll("a, button")).toHaveLength(0);
  },
};

export const RetryingAnalysis: Story = {
  args: {
    analysisJobs: [retryingAnalysisJob],
    history: { ...profileHistory, total: 0, profiles: [] },
  },
  beforeEach({ msw }) {
    msw.use(analysisJobsHandler([retryingAnalysisJob]));
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("분석을 다시 시도하고 있어요")).toBeVisible();
    await expect(canvas.getByText("재시도 1/3")).toBeVisible();
    const row = canvasElement.querySelector('[data-analysis-job-row="pending"]');
    if (!(row instanceof HTMLElement)) throw new Error("Retrying analysis row is missing.");
    await expect(row.querySelectorAll("[data-profile-column]")).toHaveLength(5);
  },
};

export const Empty: Story = {
  args: {
    history: { ...profileHistory, total: 0, profiles: [] },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("heading", { name: "아직 저장된 보컬 프로필이 없어요." }),
    ).toBeVisible();
  },
};
