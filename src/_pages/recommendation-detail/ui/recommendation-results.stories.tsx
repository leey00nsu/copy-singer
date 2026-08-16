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
    await expect((await canvas.findAllByText("서른 즈음에"))[0]).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "내 목소리에 맞는 노래" }).closest("header")).toHaveAttribute(
      "data-page-intro",
      "task",
    );
    const filterSurface = canvasElement.querySelector<HTMLElement>("[data-recommendation-filter-surface]");
    await expect(filterSurface).not.toBeNull();
    await expect(filterSurface).toHaveClass("bg-muted/55");
    await expect(getComputedStyle(filterSurface as HTMLElement).borderTopWidth).toBe("0px");
    await expect(getComputedStyle(filterSurface as HTMLElement).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    await expect(canvas.getByRole("button", { name: /이 곡으로 AI 믹싱|선택한 곡 확인/ })).toBeVisible();
    const videoButton = canvas.getByRole("button", { name: "서른 즈음에 · 김광석 원본 영상 플레이어 열기" });
    await userEvent.click(videoButton);
    await expect(canvas.getByTitle("서른 즈음에 · 김광석 원본 YouTube 영상")).toBeVisible();
    await expect(canvasElement.querySelectorAll("[data-youtube-player]")).toHaveLength(1);
    await expect(canvas.getByRole("button", { name: "서른 즈음에" })).toHaveAttribute("aria-pressed", "true");
    await expect(canvas.queryByRole("link", { name: "서른 즈음에 전체 분석 결과" })).not.toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "전체 분석 결과 보기" })).toBeVisible();
    await userEvent.type(canvas.getByRole("searchbox", { name: "곡 또는 아티스트 검색" }), "없는 노래");
    await expect(canvas.getByText("조건에 맞는 노래가 없어요.")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "모든 조건 지우기" }));
    await expect(canvas.getAllByText("서른 즈음에")[0]).toBeVisible();
  },
};

export const VideoExpansionLayout: Story = {
  args: {
    initialRun: denseRun,
    runId: undefined,
  },
};

export const MixingUnavailable: Story = {
  args: {
    initialRun: {
      ...recommendationRunFixture,
      profile: {
        ...recommendationRunFixture.profile,
        mixing: { available: false, unavailableReason: "missing_mid_reference" },
      },
    },
    runId: undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("믹싱 불가")).toHaveLength(recommendationRunFixture.items.length);
    await expect(canvas.getAllByText(/안정적인 중앙 음역 구간을 찾지 못해/)[0]).toBeVisible();
    for (const link of canvas.getAllByRole("link", { name: "새 프로필 분석하기" })) {
      await expect(link).toHaveAttribute("href", "/profile");
    }
    await expect(canvas.queryByRole("button", { name: "이 곡으로 AI 믹싱" })).not.toBeInTheDocument();
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
    await expect(canvas.getAllByRole("button", { name: /\d+$/ })).toHaveLength(100);
    await expect(canvas.getByRole("button", { name: "이 곡으로 AI 믹싱" })).toBeVisible();
    await expect(canvas.getByText("추천 1위")).toBeVisible();

    const thirdRow = canvas.getByRole("table").querySelectorAll("tbody tr")[2];
    if (!(thirdRow instanceof HTMLElement)) throw new Error("Third recommendation row is missing");
    const score = within(thirdRow).getByText("91점");
    const scoreRect = score.getBoundingClientRect();
    const hitTarget = document.elementFromPoint(
      scoreRect.left + scoreRect.width / 2,
      scoreRect.top + scoreRect.height / 2,
    );
    const rowButton = hitTarget?.closest("[data-resource-row-button]");
    await expect(rowButton).toHaveAccessibleName("밤편지 3");
    await userEvent.click(rowButton as HTMLElement);
    await expect(rowButton).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByTitle("밤편지 3 · 아이유 원본 YouTube 영상")).toBeVisible();
    await expect(canvasElement.querySelectorAll("[data-youtube-player]")).toHaveLength(1);

    const selection = canvas.getByRole("complementary", { name: "선택한 추천곡" });
    await expect(selection).toHaveClass("lg:sticky", "lg:top-24", "lg:self-start");
    await expect(within(selection).getByRole("heading", { name: "밤편지 3" })).toBeVisible();
    await expect(within(selection).getByText("추천 3위")).toBeVisible();

    await userEvent.click(rowButton as HTMLElement);
    await expect(rowButton).toHaveAttribute("aria-expanded", "false");
    await expect(canvasElement.querySelectorAll("[data-youtube-player]")).toHaveLength(0);

    (rowButton as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect(rowButton).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByTitle("밤편지 3 · 아이유 원본 YouTube 영상")).toBeVisible();
    await expect(canvasElement.querySelectorAll("[data-youtube-player]")).toHaveLength(1);

    await userEvent.click(canvas.getByRole("button", { name: "서른 즈음에 1 · 김광석 원본 영상 플레이어 열기" }));
    const expandedRow = canvasElement.querySelector("[data-youtube-expanded-row]");
    await expect(expandedRow).toBeVisible();
    await expect(expandedRow?.querySelector("td")).toHaveAttribute("colspan", "4");
    await expect(canvasElement.querySelectorAll("[data-youtube-player]")).toHaveLength(1);

    await userEvent.click(canvas.getByRole("button", { name: "바람의 노래 2 · 조용필 원본 영상 플레이어 열기" }));
    await expect(canvas.getByTitle("바람의 노래 2 · 조용필 원본 YouTube 영상")).toBeVisible();
    await expect(canvasElement.querySelectorAll("[data-youtube-player]")).toHaveLength(1);
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
    await expect(canvas.getByRole("button", { name: "서른 즈음에 1" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "필터" }));
    await waitFor(() => expect(within(document.body).getByRole("dialog", { name: "추천곡 필터" })).toBeVisible());
  },
};

export const MobileSelection: Story = {
  args: {
    initialRun: denseRun,
    runId: undefined,
  },
  globals: {
    viewport: { value: "mobile1", isRotated: false },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "밤편지 3" }));
    await expect(canvas.getByText("밤편지 3 · 아이유")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "선택한 곡 확인" }));
    const sheet = within(document.body).getByRole("dialog", { name: "선택한 추천곡" });
    await waitFor(() => expect(sheet).toBeVisible());
    await expect(within(sheet).getByRole("button", { name: "이 곡으로 AI 믹싱" })).toBeVisible();
    await expect(within(sheet).getByRole("link", { name: "전체 분석 결과 보기" })).toBeVisible();
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
    await expect(canvas.getAllByText("AI 믹싱 중").some((status) => status.getClientRects().length > 0)).toBe(true);
    await waitFor(() => expect(canvas.getByText("완료")).toBeVisible(), { timeout: 7_000 });
    await expect(canvas.getByRole("link", { name: "믹싱 결과 보기" })).toHaveAttribute(
      "href",
      "/library/mixes/20000000-0000-4000-8000-000000000005",
    );
    await expect(canvas.queryAllByText("AI 믹싱 중")).toHaveLength(0);
  },
};

export const CompletedMixingLinksToLibrary: Story = {
  args: {
    initialRun: succeededRecommendationRunFixture,
    runId: undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("img", { name: /AI 믹싱 결과 파형/ })).not.toBeInTheDocument();
    await expect(canvas.getByText("완료")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "믹싱 결과 보기" })).toHaveAttribute(
      "href",
      "/library/mixes/20000000-0000-4000-8000-000000000005",
    );
    await expect(canvas.queryByRole("button", { name: "결과 듣기" })).not.toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: "결과 닫기" })).not.toBeInTheDocument();
  },
};
