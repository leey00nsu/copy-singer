import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Progress, ProgressLabel, ProgressValue } from "@/shared/ui/progress";

const meta = {
  title: "Shared UI/Progress",
  component: Progress,
  args: {
    value: 62,
  },
  argTypes: {
    value: {
      control: { min: 0, max: 100, step: 1, type: "range" },
    },
  },
} satisfies Meta<typeof Progress>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Analysis: Story = {
  render: (args) => (
    <Progress {...args} className="w-80">
      <ProgressLabel>보컬 분석</ProgressLabel>
      <ProgressValue />
    </Progress>
  ),
};

export const Indeterminate: Story = {
  args: {
    value: null,
  },
  render: (args) => (
    <Progress {...args} className="w-80">
      <ProgressLabel>업로드 준비 중</ProgressLabel>
    </Progress>
  ),
};
