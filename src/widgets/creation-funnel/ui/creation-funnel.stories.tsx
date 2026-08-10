import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ActualStateTimeline } from "./actual-state-timeline";
import { CreationFunnelShell } from "./creation-funnel-shell";
import { FunnelActionBar } from "./funnel-action-bar";
import { ProcessHero } from "./process-hero";

const analysisSteps = [
  { id: "upload", label: "오디오 전달", description: "분석할 오디오를 안전하게 저장했습니다.", state: "complete" },
  { id: "analysis", label: "보컬 분석", description: "음역과 안정성을 분석하고 있습니다.", state: "current" },
  { id: "save", label: "결과 저장", description: "완료된 결과를 보컬 프로필로 저장합니다.", state: "upcoming" },
] as const;

const meta = {
  title: "Widgets/Creation Funnel",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActiveAnalysis: Story = {
  render: () => (
    <CreationFunnelShell currentStep="analysis">
      <ProcessHero
        description="페이지를 닫아도 서버에서 계속 진행되며 돌아오면 같은 작업을 확인합니다."
        eyebrow="Voice analysis"
        status={<Badge variant="secondary">분석 중</Badge>}
        title="당신의 목소리 기준을 찾고 있어요"
      >
        <ActualStateTimeline label="보컬 분석 진행 단계" steps={[...analysisSteps]} />
      </ProcessHero>
    </CreationFunnelShell>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("navigation", { name: "생성 진행 단계" })).toBeVisible();
    await expect(canvas.getByRole("list", { name: "보컬 분석 진행 단계" })).toBeVisible();
    await expect(canvas.getByText("목소리 분석").closest("li")).toHaveAttribute("aria-current", "step");
  },
};

export const RecommendationSelected: Story = {
  render: () => (
    <CreationFunnelShell currentStep="recommendation">
      <div className="py-10">
        <h1 className="text-4xl font-semibold tracking-tight">내 목소리에 맞는 노래</h1>
        <div className="mt-10 lg:sticky lg:bottom-4">
          <FunnelActionBar
            action={<Button>이 곡으로 AI 믹싱</Button>}
            description="추천 키 -2 · 티켓 1개 사용"
            eyebrow="선택한 곡"
            title="밤편지 · 아이유"
          />
        </div>
      </div>
    </CreationFunnelShell>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("노래 추천").closest("li")).toHaveAttribute("aria-current", "step");
    await expect(canvas.getByRole("button", { name: "이 곡으로 AI 믹싱" })).toBeVisible();
  },
};

export const AnalysisSucceeded: Story = {
  render: () => (
    <CreationFunnelShell currentStep="analysis">
      <ProcessHero
        action={<Button>내 목소리에 맞는 노래 찾기</Button>}
        description="실용 음역과 안정성을 저장했습니다. 전체 분석은 Library에서 언제든 다시 볼 수 있어요."
        eyebrow="Voice analysis"
        title="목소리 분석을 완료했어요"
        tone="success"
      />
    </CreationFunnelShell>
  ),
};

export const MixingFailed: Story = {
  render: () => (
    <CreationFunnelShell currentStep="mixing">
      <ProcessHero
        action={<Button variant="outline">다시 시도</Button>}
        description="저장된 보컬 프로필과 추천 결과는 유지됩니다."
        eyebrow="AI mixing"
        title="믹싱을 완료하지 못했어요"
        tone="failure"
      />
    </CreationFunnelShell>
  ),
};
