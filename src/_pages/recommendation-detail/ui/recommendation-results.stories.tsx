import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type {} from "msw-storybook-addon/types";
import { expect, userEvent, waitFor, within } from "storybook/test";

import {
  activeRecommendationRunFixture,
  recommendationRunFixture,
  succeededRecommendationRunFixture,
} from "../../../../tests/msw/fixtures";
import {
  mixingForbiddenHandler,
  mixingSubmissionHandler,
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
    await expect(canvas.getByRole("button", { name: "AI 믹싱" })).toBeEnabled();
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
    await expect(canvas.getByText("믹싱 중이에요")).toBeVisible();
    await waitFor(() => expect(canvas.getByText("AI 믹싱 완료")).toBeVisible(), { timeout: 7_000 });
    await expect(canvas.queryByText("믹싱 중이에요")).not.toBeInTheDocument();
  },
};

export const MutationSuccess: Story = {
  args: {
    initialRun: recommendationRunFixture,
    runId: undefined,
  },
  beforeEach({ msw }) {
    msw.use(mixingSubmissionHandler(), recommendationHandler());
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "AI 믹싱" }));
    await waitFor(() => {
      const toast = document.querySelector('[data-sonner-toast][data-type="success"]');
      expect(toast).toHaveTextContent("믹싱을 접수했어요. 페이지를 닫아도 계속 진행됩니다.");
    });
  },
};

export const MutationPermissionError: Story = {
  args: {
    initialRun: recommendationRunFixture,
    runId: undefined,
  },
  beforeEach({ msw }) {
    msw.use(mixingForbiddenHandler());
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "AI 믹싱" }));
    await expect(await canvas.findByText("티켓이 부족합니다.")).toBeVisible();
    await waitFor(() => {
      const toast = document.querySelector('[data-sonner-toast][data-type="error"]');
      expect(toast).toHaveTextContent("AI 믹싱을 시작하지 못했습니다.");
    });
  },
};
