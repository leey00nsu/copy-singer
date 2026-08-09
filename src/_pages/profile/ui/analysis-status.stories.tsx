import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { AnalysisStatus } from "./analysis-status";

const meta = {
  title: "Pages/Profile/AnalysisStatus",
  component: AnalysisStatus,
  args: {
    onCheckAgain: fn(),
    onReset: fn(),
    onRetry: fn(),
    stage: "pending",
  },
  decorators: [
    (Story) => (
      <div className="w-[min(100vw-2rem,56rem)]">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof AnalysisStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("보컬 분석 대기 중")).toBeVisible();
  },
};

export const Processing: Story = {
  args: { stage: "processing" },
};

export const RetryWaiting: Story = {
  args: { attempts: 1, maxAttempts: 3, stage: "retrying" },
};

export const Reconnecting: Story = {
  args: { stage: "reconnecting" },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "지금 다시 확인" }));
    await expect(args.onCheckAgain).toHaveBeenCalledOnce();
  },
};

export const Failed: Story = {
  args: {
    canRetry: true,
    error: { reasonCode: "ANALYZER_UNAVAILABLE", detail: "Unavailable", retryable: true },
    stage: "failed",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("보컬 분석기에 연결할 수 없어요")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "분석 다시 시도" }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};
