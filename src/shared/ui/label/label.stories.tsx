import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Label } from "@/shared/ui/label";

const meta = {
  title: "Shared UI/Label",
  component: Label,
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithInput: Story = {
  render: () => (
    <div className="grid w-72 gap-2">
      <Label htmlFor="profile-name">프로필 이름</Label>
      <input
        className="h-9 rounded-md border bg-background px-3 text-sm"
        id="profile-name"
        placeholder="예: 맑은 중음 보컬"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", { name: "프로필 이름" });
    await userEvent.type(input, "라이브 세션");
    await expect(input).toHaveValue("라이브 세션");
  },
};
