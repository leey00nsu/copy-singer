import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { recommendationRunFixture } from "../../../../tests/msw/fixtures";
import { RecommendationMixingAction } from "./recommendation-mixing-action";

const item = recommendationRunFixture.items[0];
if (!item) throw new Error("Recommendation mixing story requires one recommendation item.");

const meta = {
  title: "Features/Create Mixing/Recommendation Mixing Action",
  component: RecommendationMixingAction,
  args: {
    item,
    onStart: fn(),
    ticketCost: 1,
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof RecommendationMixingAction>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TicketConfirmation: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "AI 믹싱" }));
    const firstDialog = within(document.body).getByRole("dialog", { name: "믹싱 티켓 1장을 사용할까요?" });
    await expect(firstDialog).toBeVisible();
    await expect(within(firstDialog).getByText("믹싱 티켓 1장")).toBeVisible();
    await expect(args.onStart).not.toHaveBeenCalled();
    await userEvent.click(within(firstDialog).getByRole("button", { name: "취소" }));
    await expect(args.onStart).not.toHaveBeenCalled();

    await userEvent.click(canvas.getByRole("button", { name: "AI 믹싱" }));
    const confirmDialog = within(document.body).getByRole("dialog", { name: "믹싱 티켓 1장을 사용할까요?" });
    await userEvent.click(within(confirmDialog).getByRole("button", { name: "AI 믹싱 시작" }));
    await expect(args.onStart).toHaveBeenCalledOnce();
    await expect(args.onStart).toHaveBeenCalledWith(item.id);
  },
};

export const RetryConfirmation: Story = {
  args: {
    item: {
      ...item,
      synthesis: {
        ...item.synthesis,
        status: "failed",
        error: {
          code: "MODAL_JOB_FAILED",
          detail: "GPU failed",
          retryable: true,
        },
      },
    },
    onStart: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "다시 시도" }));
    const dialog = within(document.body).getByRole("dialog", { name: "믹싱 티켓 1장을 사용할까요?" });
    await expect(args.onStart).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "다시 믹싱" }));
    await expect(args.onStart).toHaveBeenCalledWith(item.id, true);
  },
};

export const ZeroCostSkipsConfirmation: Story = {
  args: {
    onStart: fn(),
    ticketCost: 0,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "AI 믹싱" }));
    await expect(within(document.body).queryByRole("dialog", { name: /믹싱 티켓/ })).not.toBeInTheDocument();
    await expect(args.onStart).toHaveBeenCalledWith(item.id);
  },
};
