import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import {
  activeRecommendationRunFixture,
  recommendationRunFixture,
  succeededRecommendationRunFixture,
} from "../../../../tests/msw/fixtures";
import { SongDetail } from "./song-detail";

const itemId = recommendationRunFixture.items[0]?.id ?? "";

const meta = {
  title: "Pages/Song Detail/States",
  component: SongDetail,
  args: {
    initialRun: recommendationRunFixture,
    itemId,
    ticketCost: 1,
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SongDetail>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Available: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1, name: "서른 즈음에" })).toBeVisible();
    await expect(canvas.getByText("A3–A♯4")).toBeVisible();
    await expect(canvas.getByText("F3–A♯4")).toBeVisible();
    await expect(canvas.getByRole("link", { name: /외부 출처 열기/ })).toHaveAttribute("target", "_blank");
    await expect(canvas.getByRole("button", { name: "AI 믹싱" })).toBeEnabled();
  },
};

export const RangeUnavailable: Story = {
  args: {
    initialRun: {
      ...recommendationRunFixture,
      items: recommendationRunFixture.items.map((item) => ({
        ...item,
        originalKey: null,
        songProfile: null,
        sourceUrl: "",
      })),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("곡 음역을 표시할 수 없어요.")).toBeVisible();
    await expect(canvas.queryByRole("link", { name: /외부 출처 열기/ })).not.toBeInTheDocument();
  },
};

export const MixingActive: Story = {
  args: { initialRun: activeRecommendationRunFixture },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("AI 믹싱 중")).toBeVisible();
  },
};

export const MixingSucceeded: Story = {
  args: { initialRun: succeededRecommendationRunFixture },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "결과 듣기" })).toBeVisible();
    await expect(canvas.queryByRole("img", { name: /AI 믹싱 결과 파형/ })).not.toBeInTheDocument();
  },
};

export const MixingFailed: Story = {
  args: {
    initialRun: {
      ...recommendationRunFixture,
      items: recommendationRunFixture.items.map((item) => ({
        ...item,
        synthesis: {
          ...item.synthesis,
          status: "failed" as const,
          error: { code: "MIXING_TARGET_UNAVAILABLE", detail: "믹싱용 원곡이 준비되지 않았습니다.", retryable: false },
        },
      })),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("믹싱 실패")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "다시 녹음" })).toBeVisible();
  },
};
