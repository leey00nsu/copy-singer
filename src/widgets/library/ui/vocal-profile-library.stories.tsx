import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
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
};

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
  },
};

export const FailedAnalysis: Story = {
  args: {
    analysisJobs: [
      {
        id: "40000000-0000-4000-8000-000000000003",
        status: "failed",
        vocalProfileId: null,
        attempts: 3,
        maxAttempts: 3,
        error: { reasonCode: "ANALYSIS_FAILED", detail: "음정을 충분히 찾지 못했어요.", retryable: false },
        createdAt: "2026-08-09T01:00:00.000Z",
        updatedAt: "2026-08-09T01:01:00.000Z",
      },
    ],
    history: { ...profileHistory, total: 0, profiles: [] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("보컬 프로필을 만들지 못했어요")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "다시 분석하기" })).toHaveAttribute("href", "/profile");
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
