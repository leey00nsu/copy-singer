import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { HttpResponse, http } from "msw";
import type {} from "msw-storybook-addon/types";
import { expect, userEvent, waitFor, within } from "storybook/test";
import type { TicketAdjustmentRequest } from "../model/contract";
import { TicketAdjustmentSheet } from "./ticket-adjustment-sheet";

let requests: TicketAdjustmentRequest[] = [];
const response = (body: TicketAdjustmentRequest) =>
  HttpResponse.json(
    {
      id: "30000000-0000-4000-8000-000000000001",
      kind: body.kind,
      amount: body.amount,
      balanceAfter: 5 + body.amount,
      reason: body.reason,
      createdAt: "2026-10-29T03:00:00Z",
    },
    { status: 201 },
  );
const meta = {
  title: "Features/Manage Tickets/Member Adjustment Sheet",
  component: TicketAdjustmentSheet,
  args: {
    user: {
      id: "fixed-member",
      name: "김하늘",
      email: "member@example.test",
      ticketWallets: [
        { kind: "VOCAL_ANALYSIS", balance: 5 },
        { kind: "AI_MIXING", balance: 2 },
      ],
    },
  },
  beforeEach({ msw }) {
    requests = [];
    msw.use(
      http.post("*/api/admin/ticket-adjustments", async ({ request }) => {
        const body = (await request.json()) as TicketAdjustmentRequest;
        requests.push(body);
        return response(body);
      }),
    );
  },
} satisfies Meta<typeof TicketAdjustmentSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

async function review(canvasElement: HTMLElement) {
  await userEvent.click(within(canvasElement).getByRole("button", { name: "김하늘 티켓 조정" }));
  const dialog = within(await within(document.body).findByRole("dialog"));
  await userEvent.clear(dialog.getByRole("spinbutton", { name: "조정량" }));
  await userEvent.type(dialog.getByRole("spinbutton", { name: "조정량" }), "2");
  await userEvent.type(dialog.getByRole("textbox", { name: "사유" }), "고객 지원 지급");
  await userEvent.click(dialog.getByRole("button", { name: "조정 내용 확인" }));
  await waitFor(() => expect(dialog.getByText("티켓 조정 확인")).toBeVisible());
  return dialog;
}

export const ConfirmBeforeApplying: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await review(canvasElement);
    await expect(dialog.getByText("member@example.test")).toBeVisible();
    await expect(dialog.queryByRole("combobox", { name: "사용자" })).not.toBeInTheDocument();
    await expect(requests).toHaveLength(0);
    await userEvent.click(dialog.getByRole("button", { name: "적용" }));
    await waitFor(() => expect(getRouter().refresh).toHaveBeenCalled());
    await expect(requests).toHaveLength(1);
    await expect(requests[0]).toMatchObject({
      userId: "fixed-member",
      kind: "VOCAL_ANALYSIS",
      amount: 2,
      reason: "고객 지원 지급",
    });
    await waitFor(() => expect(within(document.body).queryByRole("dialog")).not.toBeInTheDocument());
  },
};

export const RetryKeepsSameRequest: Story = {
  beforeEach({ msw }) {
    requests = [];
    msw.use(
      http.post("*/api/admin/ticket-adjustments", async ({ request }) => {
        const body = (await request.json()) as TicketAdjustmentRequest;
        requests.push(body);
        return requests.length === 1
          ? HttpResponse.json(
              { error: { code: "TRY_AGAIN", message: "응답을 받지 못했어요. 다시 적용해 주세요." } },
              { status: 503 },
            )
          : response(body);
      }),
    );
  },
  play: async ({ canvasElement }) => {
    const dialog = await review(canvasElement);
    await userEvent.click(dialog.getByRole("button", { name: "적용" }));
    await expect(await dialog.findByRole("alert")).toHaveTextContent("다시 적용");
    await userEvent.click(dialog.getByRole("button", { name: "적용" }));
    await waitFor(() => expect(requests).toHaveLength(2));
    await expect(requests[0]).toEqual(requests[1]);
    await waitFor(() => expect(within(document.body).queryByRole("dialog")).not.toBeInTheDocument());
  },
};

export const RejectNegativeBalance: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "김하늘 티켓 조정" }));
    const dialog = within(await within(document.body).findByRole("dialog"));
    await userEvent.clear(dialog.getByRole("spinbutton", { name: "조정량" }));
    await userEvent.type(dialog.getByRole("spinbutton", { name: "조정량" }), "-6");
    await userEvent.type(dialog.getByRole("textbox", { name: "사유" }), "잔액 초과 회수");
    await userEvent.click(dialog.getByRole("button", { name: "조정 내용 확인" }));
    await expect(dialog.getByRole("alert")).toHaveTextContent("잔액이 음수");
    await expect(requests).toHaveLength(0);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(within(document.body).queryByRole("dialog")).not.toBeInTheDocument());
  },
};

export const OpenAndCloseWithoutMutation: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "김하늘 티켓 조정" });
    await userEvent.click(trigger);
    await waitFor(() => expect(within(document.body).getByRole("dialog")).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(within(document.body).queryByRole("dialog")).not.toBeInTheDocument());
    await expect(requests).toHaveLength(0);
    await expect(trigger).toHaveFocus();
  },
};
