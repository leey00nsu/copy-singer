import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { type VocalProfileResponse, VocalProfileResults } from "@/entities/vocal-profile";

const PROFILE: VocalProfileResponse = {
  id: "62fae3c1-45f0-4ed8-85bd-2809ac95cde9",
  sourceType: "USER",
  profileNumber: 1,
  displayName: "보컬 프로필 1",
  minMidi: 52,
  maxMidi: 76,
  p10Midi: 56,
  medianMidi: 64,
  p90Midi: 72,
  tessituraLowMidi: 57,
  tessituraHighMidi: 70,
  voicedRatio: 0.84,
  pitchStability: 0.91,
  clippingRatio: 0,
  rmsDb: -18.6,
  analyzer: "vocal-profile-modal",
  analyzerVersion: "1.2.0",
  createdAt: "2026-08-07T00:00:00.000Z",
  descriptors: {
    pitchHistogram: [
      { midi: 55, count: 8, ratio: 0.08 },
      { midi: 58, count: 14, ratio: 0.14 },
      { midi: 60, count: 21, ratio: 0.21 },
      { midi: 64, count: 28, ratio: 0.28 },
      { midi: 67, count: 17, ratio: 0.17 },
      { midi: 70, count: 9, ratio: 0.09 },
      { midi: 72, count: 3, ratio: 0.03 },
    ],
    pitchTrack: [
      { timeMs: 0, midi: null },
      { timeMs: 250, midi: 58 },
      { timeMs: 500, midi: 60 },
      { timeMs: 750, midi: 64 },
      { timeMs: 1_000, midi: 67 },
      { timeMs: 1_250, midi: 70 },
      { timeMs: 1_500, midi: 68 },
      { timeMs: 1_750, midi: 64 },
      { timeMs: 2_000, midi: null },
    ],
  },
  recording: {
    id: "3162ae0b-3de4-47fe-9292-af18c353950b",
    mimeType: "audio/webm",
    sizeBytes: 1_420_000,
    durationMs: 42_600,
    sampleRate: 48_000,
    expiresAt: null,
    createdAt: "2026-08-07T00:00:00.000Z",
  },
};

const NO_NETWORK_AUDIO = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

const meta = {
  title: "Entities/Vocal Profile/VocalProfileResults",
  component: VocalProfileResults,
  args: {
    profile: PROFILE,
  },
  argTypes: {
    profile: {
      control: false,
    },
  },
  decorators: [
    (Story) => (
      <main className="mx-auto max-w-6xl p-6">
        <Story />
      </main>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof VocalProfileResults>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RepresentativeAnalysis: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img", { name: /전체 관측 음역/ })).toBeVisible();
    await expect(canvas.getByRole("img", { name: "음정별 상대 빈도 막대그래프" })).toBeVisible();
    const pitchTrace = canvas.getByRole("button", { name: /상세 피치 추적/ });
    await expect(pitchTrace).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(pitchTrace);
    await expect(pitchTrace).toHaveAttribute("aria-expanded", "false");
  },
};

export const LowConfidenceGuidance: Story = {
  args: {
    profile: {
      ...PROFILE,
      descriptors: {
        synthesisReference: {
          version: "smart-reference-v1",
          status: "unavailable",
        },
      },
    },
    sourceAudioSrc: NO_NETWORK_AUDIO,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/안정적인 저음·중앙·고음 구간을 충분히 찾지 못했어요/)).toBeVisible();
  },
};

export const LegacyGuidance: Story = {
  args: {
    profile: {
      ...PROFILE,
      descriptors: {},
    },
    sourceAudioSrc: NO_NETWORK_AUDIO,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/최신 분석기로 새 보컬 프로필을 만들어주세요/)).toBeVisible();
  },
};
