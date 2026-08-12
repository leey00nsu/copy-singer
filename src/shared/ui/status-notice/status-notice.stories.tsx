import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Button } from "@/shared/ui/button";
import { StatusNotice } from "@/shared/ui/status-notice";

const meta = {
  title: "Shared UI/StatusNotice",
  component: StatusNotice,
  args: {
    description: "마지막으로 확인한 정보를 계속 표시합니다.",
    title: "최신 상태를 확인하지 못했어요",
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof StatusNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tones: Story = {
  render: () => (
    <div className="grid max-w-2xl gap-3">
      <StatusNotice description="현재 저장된 정보를 표시합니다." title="안내" />
      <StatusNotice description="분석용 오디오를 사용할 수 있어요." title="준비 완료" tone="success" />
      <StatusNotice
        description="조금 더 긴 소절을 사용하면 정확도가 높아져요."
        title="확인이 필요해요"
        tone="warning"
      />
      <StatusNotice description="새 오디오를 녹음하거나 선택해주세요." title="5초보다 짧아요" tone="destructive" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("status")).toHaveLength(3);
    await expect(canvas.getByRole("alert")).toHaveAttribute("data-tone", "destructive");
  },
};

export const WithAction: Story = {
  args: {
    action: <Button variant="outline">다시 분석하기</Button>,
    description: "현재 추천 결과는 계속 확인할 수 있습니다.",
    title: "AI 믹싱을 만들 수 없어요",
    tone: "warning",
  },
};
