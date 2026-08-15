import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import type { VocalProfileResponse } from "../model/contract";
import { VocalProfileSummary } from "./vocal-profile-summary";

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
  title: "Entities/Vocal Profile/Summary",
  component: VocalProfileSummary,
  args: { profile },
  tags: ["!dev", "!test"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof VocalProfileSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "균형 있게 관찰된 주요 음역" })).toBeInTheDocument();
    await expect(canvas.getByText("E3–E4")).toBeInTheDocument();
    await expect(canvas.getByText("91%")).toBeInTheDocument();
  },
};

export const InputNeedsAttention: Story = {
  args: { profile: { ...profile, voicedRatio: 0.3, rmsDb: -40 } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("입력 음량 보완 권장")).toBeInTheDocument();
  },
};
