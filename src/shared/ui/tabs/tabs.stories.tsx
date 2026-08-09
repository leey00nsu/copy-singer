import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

const meta = {
  title: "Shared UI/Tabs",
  component: Tabs,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Line: Story = {
  render: () => (
    <Tabs defaultValue="recordings">
      <TabsList aria-label="라이브러리 종류" variant="line">
        <TabsTrigger value="recordings">보컬 프로필</TabsTrigger>
        <TabsTrigger value="mixes">AI 믹스</TabsTrigger>
        <TabsTrigger disabled value="favorites">
          즐겨찾기
        </TabsTrigger>
      </TabsList>
      <TabsContent value="recordings">보컬 프로필 목록</TabsContent>
      <TabsContent value="mixes">AI 믹스 목록</TabsContent>
      <TabsContent value="favorites">즐겨찾기 목록</TabsContent>
    </Tabs>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const mixesTab = canvas.getByRole("tab", { name: "AI 믹스" });
    await userEvent.click(mixesTab);
    await expect(mixesTab).toHaveAttribute("aria-selected", "true");
    await expect(canvas.getByText("AI 믹스 목록")).toBeVisible();
    await expect(canvas.getByRole("tab", { name: "즐겨찾기" })).toHaveAttribute("aria-disabled", "true");
  },
};

export const Segmented: Story = {
  render: () => (
    <Tabs defaultValue="all">
      <TabsList aria-label="상태 필터">
        <TabsTrigger value="all">전체</TabsTrigger>
        <TabsTrigger value="ready">완료</TabsTrigger>
        <TabsTrigger value="active">진행 중</TabsTrigger>
      </TabsList>
    </Tabs>
  ),
};
