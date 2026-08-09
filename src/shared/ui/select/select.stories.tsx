import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const meta = {
  title: "Shared UI/Select",
  component: Select,
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Sort: Story = {
  render: () => (
    <div className="grid gap-2">
      <Label htmlFor="song-sort">정렬</Label>
      <Select defaultValue="score">
        <SelectTrigger id="song-sort">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="score">적합도 높은 순</SelectItem>
          <SelectItem value="rank">추천 순위</SelectItem>
          <SelectItem value="title">곡 제목</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select disabled value="all">
      <SelectTrigger aria-label="비활성 상태 필터">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">전체</SelectItem>
      </SelectContent>
    </Select>
  ),
};
