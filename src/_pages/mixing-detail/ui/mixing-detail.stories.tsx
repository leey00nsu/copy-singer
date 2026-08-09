import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type {} from "msw-storybook-addon/types";
import { expect, userEvent, within } from "storybook/test";
import { mixingHistoryFixture } from "../../../../tests/msw/fixtures";
import { mixingDeleteHandler, mixingDetailHandler } from "../../../../tests/msw/handlers";
import { MixingDetail } from "./mixing-detail";

const activeJob = mixingHistoryFixture.jobs[0];
const succeededJob = mixingHistoryFixture.jobs[1];
const failedJob = mixingHistoryFixture.jobs[2];
if (!activeJob || !succeededJob || !failedJob) throw new Error("Mixing Detail stories require three job fixtures.");

const meta = {
  title: "Pages/Library/Mixing Detail",
  component: MixingDetail,
  args: { initial: succeededJob },
  parameters: { layout: "fullscreen" },
  beforeEach({ msw }) {
    msw.use(mixingDetailHandler(succeededJob), mixingDeleteHandler());
  },
} satisfies Meta<typeof MixingDetail>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ResultReady: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "완성된 AI 믹스" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "결과 저장" })).toBeVisible();
    await expect(canvas.getByRole("list", { name: "AI 믹싱 진행 단계" })).toBeVisible();
  },
};

export const Active: Story = {
  args: { initial: activeJob },
  beforeEach({ msw }) {
    msw.use(mixingDetailHandler(activeJob));
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("AI 믹싱 중")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
  },
};

export const Failed: Story = {
  args: { initial: failedJob },
  beforeEach({ msw }) {
    msw.use(mixingDetailHandler(failedJob));
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "믹싱을 완료하지 못했어요." })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "보컬 프로필에서 다시 시작" })).toBeVisible();
  },
};

export const DeleteConfirmation: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "삭제" }));
    await expect(document.body).toHaveTextContent("이 AI 믹스를 삭제할까요?");
    await expect(document.body).toHaveTextContent("티켓 사용 내역은 기록으로 유지");
  },
};
