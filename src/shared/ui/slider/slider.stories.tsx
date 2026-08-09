import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Label } from "@/shared/ui/label";
import { Slider } from "@/shared/ui/slider";

const meta = {
  title: "Shared UI/Slider",
  component: Slider,
  args: {
    "aria-labelledby": "conversion-strength-label",
    defaultValue: [35],
    max: 100,
    min: 0,
    step: 5,
  },
} satisfies Meta<typeof Slider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="grid gap-3">
      <Label id="conversion-strength-label">변환 강도</Label>
      <Slider {...args} />
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole("slider", { name: "변환 강도" });
    control.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(control).toHaveAttribute("aria-valuenow", "40");
  },
};

export const Range: Story = {
  args: {
    "aria-labelledby": "recommended-range-label",
    defaultValue: [25, 75],
  },
  decorators: Default.decorators,
  render: (args) => (
    <div className="grid gap-3">
      <Label id="recommended-range-label">권장 구간</Label>
      <Slider {...args} />
    </div>
  ),
};
