import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type {} from "msw-storybook-addon/types";
import { expect, userEvent, waitFor, within } from "storybook/test";

import {
  activeRecommendationRunFixture,
  recommendationRunFixture,
  succeededRecommendationRunFixture,
} from "../../../../tests/msw/fixtures";
import {
  recommendationForbiddenHandler,
  recommendationHandler,
  recommendationLoadingHandler,
  recommendationPollingSequenceHandler,
} from "../../../../tests/msw/handlers";
import { RecommendationResults } from "./recommendation-results";

const meta = {
  title: "Pages/Recommendation Detail/Query States",
  component: RecommendationResults,
  args: {
    runId: recommendationRunFixture.id,
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof RecommendationResults>;

export default meta;

type Story = StoryObj<typeof meta>;

const denseRun = {
  ...recommendationRunFixture,
  items: Array.from({ length: 100 }, (_, index) => {
    const source = recommendationRunFixture.items[0];
    if (!source) throw new Error("Recommendation story fixture requires one item.");
    return {
      ...source,
      id: `20000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`,
      rank: index + 1,
      catalogOrder: 1234 + index,
      title: `${
        [
          "서른 즈음에",
          "바람의 노래",
          "밤편지",
          "좋은 사람",
          "그대 내 맘에 들어오면은",
          "기억의 습작",
          "오래된 노래",
          "별 보러 가자",
        ][index % 8] ?? source.title
      } ${index + 1}`,
      artist:
        ["김광석", "조용필", "아이유", "토이", "조덕배", "전람회", "스탠딩 에그", "적재"][index % 8] ?? source.artist,
      adjustedScore: 94 - index * 2.1,
      originalKeyScore: 82 - index,
      recommendedShift: [-2, 0, -1, 1, -3, 0, 2, -1][index % 8] ?? 0,
    };
  }),
};

export const Loading: Story = {
  beforeEach({ msw }) {
    msw.use(recommendationLoadingHandler());
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("추천 결과를 불러오는 중…")).toBeVisible();
  },
};

export const Success: Story = {
  beforeEach({ msw }) {
    msw.use(recommendationHandler());
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("서른 즈음에")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "AI 믹싱" })).not.toBeInTheDocument();
    await userEvent.type(canvas.getByRole("searchbox", { name: "곡 또는 아티스트 검색" }), "없는 노래");
    await expect(canvas.getByText("조건에 맞는 노래가 없어요.")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "모든 조건 지우기" }));
    await expect(canvas.getByText("서른 즈음에")).toBeVisible();
  },
};

export const DenseComparisonList: Story = {
  args: {
    initialRun: denseRun,
    runId: undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("table", { name: "추천 노래 비교 목록" })).toBeVisible();
    await expect(canvas.getByText("전체 100곡 중 100곡")).toBeVisible();
    await expect(canvas.getAllByRole("link", { name: /\d+$/ })).toHaveLength(100);
    await expect(canvas.queryByRole("button", { name: "AI 믹싱" })).not.toBeInTheDocument();
  },
};

export const MobileFilters: Story = {
  args: {
    initialRun: denseRun,
    runId: undefined,
  },
  globals: {
    viewport: { value: "mobile1", isRotated: false },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "서른 즈음에 1" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "필터" }));
    await waitFor(() => expect(within(document.body).getByRole("dialog", { name: "추천곡 필터" })).toBeVisible());
  },
};

export const Forbidden: Story = {
  beforeEach({ msw }) {
    msw.use(recommendationForbiddenHandler());
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole("heading", { name: "추천 결과를 불러오지 못했어요." }),
    ).toBeVisible();
  },
};

export const ActiveToTerminalPolling: Story = {
  args: {
    initialRun: activeRecommendationRunFixture,
    runId: undefined,
  },
  beforeEach({ msw }) {
    msw.use(recommendationPollingSequenceHandler([succeededRecommendationRunFixture]));
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("진행 중")).toBeVisible();
    await waitFor(() => expect(canvas.getByRole("link", { name: "결과 확인" })).toBeVisible(), { timeout: 7_000 });
    await expect(canvas.queryByText("진행 중")).not.toBeInTheDocument();
  },
};

export const CompletedAudioIsLazy: Story = {
  args: {
    initialRun: succeededRecommendationRunFixture,
    runId: undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("img", { name: /AI 믹싱 결과 파형/ })).not.toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "결과 확인" })).toHaveAttribute(
      "href",
      `/recommendations/${succeededRecommendationRunFixture.id}/songs/${succeededRecommendationRunFixture.items[0]?.id}`,
    );
  },
};

export const DeleteConfirmation: Story = {
  args: {
    initialRun: recommendationRunFixture,
    runId: undefined,
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "결과 삭제" }));
    await expect(document.body).toHaveTextContent("이 추천 결과를 삭제할까요?");
    await expect(document.body).toHaveTextContent("보컬 프로필은 유지");
  },
};
