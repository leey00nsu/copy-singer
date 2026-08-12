import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor, within } from "storybook/test";

import { AudioWaveformPlayer } from "@/shared/ui/audio-waveform-player";

const TEST_WAV_DATA_URL =
  "data:audio/wav;base64,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";
const meta = {
  title: "Shared UI/AudioWaveformPlayer",
  component: AudioWaveformPlayer,
  args: {
    label: "테스트 보컬",
    src: TEST_WAV_DATA_URL,
  },
} satisfies Meta<typeof AudioWaveformPlayer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NetworkIndependent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvasElement.querySelector("[data-audio-waveform-ready]")).toHaveAttribute(
        "data-audio-waveform-ready",
        "true",
      ),
    );
    const waveform = canvas.getByRole("img", { name: /테스트 보컬 파형/ });
    await waitFor(() => expect(waveform).toBeVisible());
    await expect(waveform).toHaveAttribute("data-audio-waveform", "brand");
    await expect(waveform).toHaveAttribute("data-waveform-progress-gradient", "violet-blue-pink");
    await expect(canvas.getByRole("button", { name: "테스트 보컬 재생" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "테스트 보컬 음소거" })).toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: { src: "" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const waveform = canvas.getByRole("img", { name: /테스트 보컬 파형/ });
    const skeleton = canvasElement.querySelector<HTMLElement>("[data-audio-waveform-skeleton]");
    await expect(waveform.closest("[data-audio-waveform-ready]")).toHaveAttribute("data-audio-waveform-ready", "false");
    await expect(canvas.getByRole("status")).toHaveTextContent("테스트 보컬 파형 불러오는 중");
    await expect(skeleton).not.toBeNull();
    await expect(skeleton as HTMLElement).toBeVisible();
    await expect(canvas.getByRole("button", { name: "테스트 보컬 재생" })).toBeDisabled();
  },
};

export const ReducedMotionLoading: Story = {
  args: { src: "" },
  render: (args) => (
    <div data-testid="reduced-motion-audio-preview">
      <style>{`
        [data-testid="reduced-motion-audio-preview"] [data-audio-waveform-skeleton]::before {
          animation: none !important;
          transform: none !important;
        }
        [data-testid="reduced-motion-audio-preview"] [data-audio-waveform],
        [data-testid="reduced-motion-audio-preview"] [data-audio-waveform-skeleton] {
          transition: none !important;
        }
      `}</style>
      <AudioWaveformPlayer {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const preview = canvas.getByTestId("reduced-motion-audio-preview");
    const skeleton = preview.querySelector<HTMLElement>("[data-audio-waveform-skeleton]");
    await expect(skeleton).not.toBeNull();
    await expect(getComputedStyle(skeleton as HTMLElement, "::before").animationName).toBe("none");
  },
};
