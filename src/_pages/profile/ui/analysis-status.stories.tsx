import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { CreationFunnelShell } from "@/widgets/creation-funnel";
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
      <CreationFunnelShell currentStep="analysis">
        <Story />
      </CreationFunnelShell>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AnalysisStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "목소리 분석을 준비하고 있어요" })).toBeVisible();
    const status = canvas.getByText("분석 대기").closest('[data-slot="badge"]');
    if (!(status instanceof HTMLElement)) throw new Error("Pending analysis status badge is missing.");
    await expect(status).toHaveClass("bg-data-accent/10", "text-data-accent-foreground");
    const timeline = canvas.getByRole("list", { name: "보컬 분석 진행 단계" });
    await expect(timeline).toBeVisible();
    const completedMarker = timeline.querySelector<HTMLElement>(
      '[data-state="complete"] [data-lifecycle-marker="true"]',
    );
    const currentMarker = timeline.querySelector<HTMLElement>('[data-state="current"] [data-lifecycle-marker="true"]');
    if (!completedMarker || !currentMarker) throw new Error("Analysis lifecycle markers are missing.");
    await expect(completedMarker).toHaveClass("bg-foreground", "text-background");
    await expect(currentMarker).toHaveClass("bg-data-accent/10", "text-data-accent-foreground");
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
    await expect(canvas.getByText("목소리를 분석할 수 없어요")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "분석 다시 시도" }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};
