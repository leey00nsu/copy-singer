import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";

const meta = {
  title: "Shared UI/Collapsible",
  component: Collapsible,
} satisfies Meta<typeof Collapsible>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {
  render: () => (
    <Collapsible className="w-80 rounded-lg border p-4">
      <CollapsibleTrigger className="font-medium">분석 세부 정보</CollapsibleTrigger>
      <CollapsibleContent className="pt-3 text-sm text-muted-foreground">
        안정 음역은 C3에서 A4까지입니다.
      </CollapsibleContent>
    </Collapsible>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: "분석 세부 정보" });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByText("안정 음역은 C3에서 A4까지입니다.")).toBeVisible();
  },
};

export const Open: Story = {
  args: {
    defaultOpen: true,
  },
  render: (args) => (
    <Collapsible {...args} className="w-80 rounded-lg border p-4">
      <CollapsibleTrigger className="font-medium">분석 세부 정보</CollapsibleTrigger>
      <CollapsibleContent className="pt-3 text-sm text-muted-foreground">
        안정 음역은 C3에서 A4까지입니다.
      </CollapsibleContent>
    </Collapsible>
  ),
};
