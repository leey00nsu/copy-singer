import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Search } from "lucide-react";
import { expect, userEvent, within } from "storybook/test";

import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const meta = {
  title: "Shared UI/Input",
  component: Input,
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SearchField: Story = {
  render: () => (
    <div className="grid w-80 gap-2">
      <Label htmlFor="song-search">곡 또는 아티스트 검색</Label>
      <div className="relative">
        <Search aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" id="song-search" placeholder="곡 또는 아티스트" type="search" />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("searchbox", { name: "곡 또는 아티스트 검색" });
    await userEvent.click(input);
    await expect(input).toHaveFocus();
  },
};

export const States: Story = {
  render: () => (
    <div className="grid w-80 gap-4">
      <Input aria-label="기본 입력" placeholder="기본" />
      <Input aria-label="잘못된 입력" aria-invalid="true" defaultValue="지원하지 않는 값" />
      <Input aria-label="비활성 입력" disabled value="변경할 수 없음" />
    </div>
  ),
};
