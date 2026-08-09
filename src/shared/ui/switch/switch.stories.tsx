import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";

const meta = {
  title: "Shared UI/Switch",
  component: Switch,
  args: {
    defaultChecked: false,
    disabled: false,
    id: "auto-pitch",
  },
} satisfies Meta<typeof Switch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <Switch {...args} />
      <Label htmlFor={args.id}>자동 피치 보정</Label>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole("switch", { name: "자동 피치 보정" });
    await expect(control).toHaveAttribute("aria-checked", "false");
    await userEvent.click(control);
    await expect(control).toHaveAttribute("aria-checked", "true");
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  render: Default.render,
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole("switch", { name: "자동 피치 보정" });
    await expect(control).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(control);
    await expect(control).toHaveAttribute("aria-checked", "false");
  },
};
