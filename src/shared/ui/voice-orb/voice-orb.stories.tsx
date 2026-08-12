import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { VoiceOrb } from "./voice-orb";

const meta = {
  title: "Shared/Motion/Voice Orb",
  component: VoiceOrb,
  args: {
    hoverIntensity: 0,
    hue: 294,
    rotateOnHover: false,
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
    await expect(orb).toBeVisible();
    await expect(getComputedStyle(orb).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  },
};

export const WebGLFallback: Story = {
  args: { forceFallback: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("voice-orb")).toHaveAttribute("data-orb-fallback", "true");
  },
};
