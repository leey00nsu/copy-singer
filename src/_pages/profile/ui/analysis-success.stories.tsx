import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import type { VocalProfileResponse } from "@/entities/vocal-profile";
import { CreationFunnelShell } from "@/widgets/creation-funnel";
import { AnalysisSuccess } from "./analysis-success";

const profile: VocalProfileResponse = {
  id: "0198be62-667c-7a90-87a5-57d65f245c11",
  sourceType: "USER",
  profileNumber: 1,
  displayName: "보컬 프로필 1",
  minMidi: 48,
  maxMidi: 72,
  p10Midi: 52,
  medianMidi: 60,
  p90Midi: 64,
  tessituraLowMidi: 52,
  tessituraHighMidi: 64,
  voicedRatio: 0.82,
  pitchStability: 0.91,
  clippingRatio: 0,
  rmsDb: -20,
  analyzer: "fixture",
  analyzerVersion: "1",
  descriptors: null,
  createdAt: "2026-08-09T00:00:00.000Z",
  recording: {
    id: "0198be62-667c-7a90-87a5-57d65f245c12",
    mimeType: "audio/webm",
    sizeBytes: 1024,
    durationMs: 10_000,
    sampleRate: 48_000,
    expiresAt: null,
    createdAt: "2026-08-09T00:00:00.000Z",
  },
};

const meta = {
  title: "Pages/Profile/Analysis Success",
  component: AnalysisSuccess,
  args: {
    creatingRecommendation: false,
    onContinue: fn(),
    onReset: fn(),
    profile,
    profileId: profile.id,
  },
  decorators: [
    (Story) => (
      <CreationFunnelShell currentStep="analysis">
        <Story />
      </CreationFunnelShell>
    ),
  ],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AnalysisSuccess>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadyForRecommendation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "목소리 분석을 완료했어요" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "균형 있게 관찰된 실용 음역" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "내 목소리에 맞는 노래 찾기" })).toBeEnabled();
    await expect(canvas.getByRole("link", { name: "전체 분석 보기" })).toHaveAttribute(
      "href",
      `/vocal-profiles/${profile.id}`,
    );
  },
};

export const CreatingRecommendation: Story = {
  args: { creatingRecommendation: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: "노래를 찾는 중" })).toBeDisabled();
  },
};
