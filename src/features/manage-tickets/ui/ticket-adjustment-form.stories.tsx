import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { TicketAdjustmentFields } from "@/features/manage-tickets";

const USERS = [
  {
    id: "user-1",
    name: "김보컬",
    email: "vocal@example.test",
    ticketWallets: [
      { kind: "VOCAL_ANALYSIS" as const, balance: 4 },
      { kind: "AI_MIXING" as const, balance: 2 },
    ],
  },
  {
    id: "user-2",
    name: "박싱어",
    email: "singer@example.test",
    ticketWallets: [
      { kind: "VOCAL_ANALYSIS" as const, balance: 0 },
      { kind: "AI_MIXING" as const, balance: 0 },
    ],
  },
];

const meta = {
  title: "Features/Manage Tickets/TicketAdjustmentFields",
  component: TicketAdjustmentFields,
  args: {
    pending: false,
    users: USERS,
  },
  decorators: [
    (Story) => (
      <form className="grid w-full max-w-5xl gap-4 rounded-2xl border bg-background p-5 lg:grid-cols-[minmax(220px,1fr)_150px_120px_minmax(240px,1.2fr)_auto] lg:items-end">
        <Story />
      </form>
    ),
  ],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof TicketAdjustmentFields>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "사용자" }), "user-1");
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "티켓 종류" }), "AI_MIXING");
    await userEvent.type(canvas.getByRole("spinbutton", { name: "조정량" }), "3");
    await userEvent.type(canvas.getByRole("textbox", { name: "사유" }), "고객 지원 지급");

    await expect(canvas.getByRole("combobox", { name: "사용자" })).toHaveValue("user-1");
    await expect(canvas.getByRole("combobox", { name: "티켓 종류" })).toHaveValue("AI_MIXING");
    await expect(canvas.getByRole("spinbutton", { name: "조정량" })).toHaveValue(3);
    await expect(canvas.getByRole("textbox", { name: "사유" })).toHaveValue("고객 지원 지급");
  },
};

export const Pending: Story = {
  args: {
    pending: true,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: "적용" })).toBeDisabled();
  },
};
