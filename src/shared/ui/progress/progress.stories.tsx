import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { Button } from "@/shared/ui/button";
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

function CompletionSyncPreview() {
  const [value, setValue] = useState(36);
  return (
    <div className="grid gap-4">
      <Progress className="w-80" value={value}>
        <ProgressLabel>오디오 준비</ProgressLabel>
        <ProgressValue />
      </Progress>
      <Button onClick={() => setValue(100)} size="sm" variant="outline">
        완료로 이동
      </Button>
    </div>
  );
}

export const CompletionSync: Story = {
  render: () => <CompletionSyncPreview />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const progress = canvas.getByRole("progressbar", { name: "오디오 준비" });
    const track = progress.querySelector<HTMLElement>('[data-slot="progress-track"]');
    const indicator = progress.querySelector<HTMLElement>('[data-slot="progress-indicator"]');
    if (!track || !indicator) throw new Error("Progress track or indicator is missing.");

    await userEvent.click(canvas.getByRole("button", { name: "완료로 이동" }));

    await expect(progress).toHaveAttribute("aria-valuenow", "100");
    await expect(getComputedStyle(indicator).transitionDuration).toBe("0s");
    await expect(indicator.getBoundingClientRect().width).toBe(track.getBoundingClientRect().width);
  },
};
