import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { AudioWaveformPlayer } from "@/shared/ui/audio-waveform-player";

const SILENT_WAV_DATA_URL = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

const meta = {
  title: "Shared UI/AudioWaveformPlayer",
  component: AudioWaveformPlayer,
  args: {
    label: "테스트 보컬",
    src: SILENT_WAV_DATA_URL,
  },
} satisfies Meta<typeof AudioWaveformPlayer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NetworkIndependent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img", { name: /테스트 보컬 파형/ })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "테스트 보컬 재생" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "테스트 보컬 음소거" })).toBeInTheDocument();
  },
};
