import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { type TicketEntryView, TicketLedger } from "@/entities/ticket";

const LEDGER_ENTRIES: TicketEntryView[] = [
  {
    id: "signup-grant",
    type: "SIGNUP_GRANT",
    amount: 1,
    balanceAfter: 1,
    reason: "회원가입 무료 티켓",
    createdAt: new Date("2026-08-06T00:00:00.000Z"),
  },
  {
    id: "mixing-debit",
    type: "MIXING_DEBIT",
    amount: -1,
    balanceAfter: 0,
    reason: "김광석 · 서른 즈음에 AI 믹싱",
    createdAt: new Date("2026-08-06T01:00:00.000Z"),
  },
  {
    id: "mixing-refund",
    type: "MIXING_REFUND",
    amount: 1,
    balanceAfter: 1,
    reason: "믹싱 처리 실패 자동 환불",
    createdAt: new Date("2026-08-06T01:10:00.000Z"),
  },
];

const meta = {
  title: "Entities/Ticket/TicketLedger",
  component: TicketLedger,
  args: {
    entries: LEDGER_ENTRIES,
  },
  argTypes: {
    entries: {
      control: false,
    },
  },
} satisfies Meta<typeof TicketLedger>;

export default meta;

type Story = StoryObj<typeof meta>;

export const GrantAndDebitHistory: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("가입 지급")).toBeVisible();
    await expect(canvas.getByText("AI 믹싱")).toBeVisible();
    await expect(canvas.getByText("자동 환불")).toBeVisible();
    await expect(canvas.getByText("-1")).toBeVisible();
    const creditRows = canvasElement.querySelectorAll('[data-ticket-direction="credit"]');
    const debitRow = canvasElement.querySelector('[data-ticket-direction="debit"]');
    const ledgerSurface = canvasElement.querySelector<HTMLElement>("[data-ticket-ledger-surface]");
    await expect(creditRows).toHaveLength(2);
    await expect(debitRow).not.toBeNull();
    await expect(ledgerSurface).not.toBeNull();
    await expect(ledgerSurface).toHaveClass("bg-muted/55");
    await expect(getComputedStyle(ledgerSurface as HTMLElement).borderTopWidth).toBe("0px");
    await expect(getComputedStyle(ledgerSurface as HTMLElement).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    await expect(within(debitRow as HTMLElement).getByText("-1")).toHaveClass("text-foreground");
    await expect(within(debitRow as HTMLElement).getByText("-1")).not.toHaveClass("text-warning-foreground");
  },
};

export const Empty: Story = {
  args: {
    entries: [],
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("티켓 내역이 없습니다.")).toBeVisible();
  },
};
