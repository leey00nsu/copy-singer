import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor, within } from "storybook/test";

import { VoiceOrb } from "./voice-orb";

const meta = {
  title: "Shared/Motion/Voice Orb",
  component: VoiceOrb,
  args: {
    hoverIntensity: 0,
    hue: 294,
    rotateOnHover: false,
    speed: 1,
  },
  decorators: [
    (Story) => (
      <div className="grid min-h-[28rem] place-items-center bg-background p-8">
        <div className="size-80 max-w-full">
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof VoiceOrb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const orb = within(canvasElement).getByTestId("voice-orb");
    await waitFor(() => expect(orb).toHaveAttribute("data-orb-ready", "true"), { timeout: 5000 });
    await expect(orb).toHaveAttribute("data-orb-motion-scale", "0.5");
    await expect(orb).toHaveAttribute("data-orb-effective-speed", "0.5");
    await expect(orb.querySelector("canvas")).toBeInTheDocument();
    await expect(getComputedStyle(orb).animationName).toBe("voice-orb-enter");
    await expect(getComputedStyle(orb).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  },
};

export const SoftBlendReference: Story = {
  args: { speed: 0 },
  play: async ({ canvasElement }) => {
    const orb = within(canvasElement).getByTestId("voice-orb");
    await waitFor(() => expect(orb).toHaveAttribute("data-orb-ready", "true"), { timeout: 5000 });
    await expect(orb).toHaveAttribute("data-orb-effective-speed", "0");
    await expect(orb.querySelector("canvas")).toBeInTheDocument();
  },
};

export const WebGLFallback: Story = {
  args: { forceFallback: true },
  play: async ({ canvasElement }) => {
    const orb = within(canvasElement).getByTestId("voice-orb");
    await expect(orb).toHaveAttribute("data-orb-fallback", "true");
    await expect(getComputedStyle(orb).animationName).toBe("voice-orb-enter");
  },
};

export const CustomSpeedIsHalved: Story = {
  args: { speed: 0.3 },
  play: async ({ canvasElement }) => {
    const orb = within(canvasElement).getByTestId("voice-orb");
    await expect(orb).toHaveAttribute("data-orb-motion-scale", "0.5");
    await expect(orb).toHaveAttribute("data-orb-effective-speed", "0.15");
  },
};
