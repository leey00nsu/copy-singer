import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Button } from "@/shared/ui/button";
import { ProductPageIntro } from "@/shared/ui/product-page-intro";

const meta = {
  title: "Shared UI/ProductPageIntro",
  component: ProductPageIntro,
  args: {
    description: "저장한 결과를 빠르게 확인하고 다음 작업으로 이어가세요.",
    eyebrow: "Library",
    title: "내 라이브러리",
    variant: "index",
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProductPageIntro>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="grid gap-16">
      <ProductPageIntro
        aside={<Button>새 분석</Button>}
        description="저장한 보컬 프로필과 AI 믹싱 작업을 확인하세요."
        eyebrow="Library"
        title="내 라이브러리"
      />
      <ProductPageIntro
        aside={<span className="text-sm text-muted-foreground">선택한 곡만 믹싱</span>}
        description="이번 한 소절에서 관찰된 음역을 기준으로 추천 결과를 비교했습니다."
        eyebrow="Song match"
        title="내 목소리에 맞는 노래"
        variant="task"
      />
      <ProductPageIntro
        eyebrow="AI mix detail"
        meta={<span className="text-xs">완료</span>}
        title="서른 즈음에"
        variant="detail"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("heading", { level: 1 })).toHaveLength(3);
    await expect(canvasElement.querySelectorAll("[data-page-intro]")).toHaveLength(3);
  },
};
