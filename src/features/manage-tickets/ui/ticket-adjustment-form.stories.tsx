import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { TicketAdjustmentFields } from "@/features/manage-tickets";

const USERS = [
  { id: "user-1", name: "김보컬", email: "vocal@example.test", ticketBalance: 2 },
  { id: "user-2", name: "박싱어", email: "singer@example.test", ticketBalance: 0 },
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
      <form className="grid w-full max-w-4xl gap-4 rounded-2xl border bg-background p-5 lg:grid-cols-[minmax(220px,1fr)_140px_minmax(260px,1.4fr)_auto] lg:items-end">
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
    await userEvent.type(canvas.getByRole("spinbutton", { name: "조정량" }), "3");
    await userEvent.type(canvas.getByRole("textbox", { name: "사유" }), "고객 지원 지급");

    await expect(canvas.getByRole("combobox", { name: "사용자" })).toHaveValue("user-1");
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
