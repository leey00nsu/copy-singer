import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
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
    await waitFor(() => expect(firstDialog).toBeVisible());
    await expect(within(firstDialog).getByText("믹싱 티켓 1장")).toBeVisible();
    await expect(args.onStart).not.toHaveBeenCalled();
    await userEvent.click(within(firstDialog).getByRole("button", { name: "취소" }));
    await expect(args.onStart).not.toHaveBeenCalled();

    await userEvent.click(canvas.getByRole("button", { name: "AI 믹싱" }));
    const confirmDialog = within(document.body).getByRole("dialog", { name: "믹싱 티켓 1장을 사용할까요?" });
    await waitFor(() => expect(confirmDialog).toBeVisible());
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
    await waitFor(() => expect(dialog).toBeVisible());
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

export const CompletedLinksToLibrary: Story = {
  args: {
    item: {
      ...item,
      synthesis: {
        ...item.synthesis,
        status: "succeeded",
        jobId: "20000000-0000-4000-8000-000000000005",
        audioUrl: "/result.wav",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "믹싱 결과 보기" })).toHaveAttribute(
      "href",
      "/library/mixes/20000000-0000-4000-8000-000000000005",
    );
    await expect(canvas.queryByRole("button", { name: "결과 듣기" })).not.toBeInTheDocument();
    await expect(canvas.queryByRole("img", { name: /AI 믹싱 결과 파형/ })).not.toBeInTheDocument();
  },
};

export const CompletedWithoutJobId: Story = {
  args: {
    item: {
      ...item,
      synthesis: {
        ...item.synthesis,
        status: "succeeded",
        audioUrl: "/result.wav",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("완료")).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "믹싱 결과 보기" })).not.toBeInTheDocument();
  },
};
