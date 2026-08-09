import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AlertTriangle, Check, FolderOpen } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { StatePanel } from "@/shared/ui/state-panel";

const meta = {
  title: "Shared UI/StatePanel",
  component: StatePanel,
  parameters: {
    layout: "padded",
  },
  args: {
    description: "새 보컬 프로필을 만들면 이곳에서 분석 결과를 다시 확인할 수 있어요.",
    icon: <FolderOpen />,
    title: "아직 보컬 프로필이 없어요",
  },
} satisfies Meta<typeof StatePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    action: <Button>목소리 분석하기</Button>,
  },
};

export const StatusTones: Story = {
  render: () => (
    <div className="grid gap-6 lg:grid-cols-3">
      <StatePanel description="분석 결과를 안전하게 저장했어요." icon={<Check />} title="분석 완료" tone="success" />
      <StatePanel
        description="잠시 뒤 자동으로 다시 확인합니다."
        icon={<AlertTriangle />}
        title="처리가 지연되고 있어요"
        tone="warning"
      />
      <StatePanel
        action={<Button variant="outline">다시 시도</Button>}
        description="오디오를 확인한 뒤 다시 시도해 주세요."
        icon={<AlertTriangle />}
        role="alert"
        title="분석하지 못했어요"
        tone="destructive"
      />
    </div>
  ),
};
