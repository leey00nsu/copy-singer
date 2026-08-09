import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

const meta = {
  title: "Shared UI/Tooltip",
  component: Tooltip,
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Hover: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" />}>음역 도움말</TooltipTrigger>
      <TooltipContent>편안하게 낼 수 있는 최저음과 최고음입니다.</TooltipContent>
    </Tooltip>
  ),
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "음역 도움말" });
    await userEvent.hover(trigger);
    await expect(trigger).toHaveAttribute("data-popup-open");
    const content = within(document.body).getByText("편안하게 낼 수 있는 최저음과 최고음입니다.");
    await waitFor(() => expect(content).toBeVisible());
  },
};
