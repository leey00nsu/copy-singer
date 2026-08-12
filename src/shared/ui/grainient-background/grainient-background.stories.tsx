import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { GrainientBackground } from "./grainient-background";

const meta = {
  title: "Shared/Motion/Grainient Background",
  component: GrainientBackground,
  decorators: [
    (Story) => (
      <div className="relative min-h-[26rem] overflow-hidden rounded-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GrainientBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("grainient-background")).toBeVisible();
  },
};

export const WebGLFallback: Story = {
  args: { forceFallback: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("grainient-background")).toHaveAttribute(
      "data-grainient-fallback",
      "true",
    );
  },
};
