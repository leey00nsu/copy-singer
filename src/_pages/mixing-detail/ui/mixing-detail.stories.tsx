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
    const status = canvas.getAllByText("완료").find((element) => element.getAttribute("data-slot") === "badge");
    if (!status) throw new Error("ResultReady requires a completed status badge.");
    await expect(status).toHaveClass("bg-data-accent", "text-white");
    const timeline = canvas.getByRole("list", { name: "AI 믹싱 진행 단계" });
    const completedMarker = timeline.querySelector<HTMLElement>(
      '[data-state="complete"]:not([data-terminal-state]) [data-lifecycle-marker="true"]',
    );
    const successMarker = timeline.querySelector<HTMLElement>(
      '[data-terminal-state="succeeded"] [data-lifecycle-marker="true"]',
    );
    if (!completedMarker || !successMarker) throw new Error("ResultReady lifecycle markers are missing.");
    await expect(completedMarker).toHaveClass("bg-foreground", "text-background");
    await expect(successMarker).toHaveClass("bg-data-accent", "text-white");
    const songTitle = canvas.getByRole("heading", { name: "서른 즈음에" });
    await expect(status.compareDocumentPosition(songTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await expect(canvas.getByRole("heading", { name: "완성된 AI 믹스" })).toBeVisible();
    await expect(canvas.queryByText("Result")).not.toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "사용한 보컬 프로필 메인 보컬 보기" })).toHaveAttribute(
      "href",
      "/vocal-profiles/30000000-0000-4000-8000-000000000012",
    );
    await expect(canvasElement.querySelectorAll("[data-profile-artwork]")).toHaveLength(1);
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
    const activeStatus = canvas.getByText("AI 믹싱 중").closest('[data-slot="badge"]');
    if (!(activeStatus instanceof HTMLElement)) throw new Error("Active mixing status badge is missing.");
    await expect(activeStatus).toHaveClass("bg-data-accent/10", "text-data-accent-foreground");
    const timeline = canvas.getByRole("list", { name: "AI 믹싱 진행 단계" });
    const currentMarker = timeline.querySelector<HTMLElement>('[data-state="current"] [data-lifecycle-marker="true"]');
    const completedMarker = timeline.querySelector<HTMLElement>(
      '[data-state="complete"]:not([data-terminal-state]) [data-lifecycle-marker="true"]',
    );
    if (!currentMarker || !completedMarker) throw new Error("Active lifecycle markers are missing.");
    await expect(currentMarker).toHaveClass("bg-data-accent/10", "text-data-accent-foreground");
    await expect(completedMarker).toHaveClass("bg-foreground", "text-background");
    await expect(canvas.getByRole("link", { name: "사용한 보컬 · 보컬 프로필 1" })).toHaveAttribute(
      "href",
      "/vocal-profiles/30000000-0000-4000-8000-000000000011",
    );
    await expect(canvas.getAllByRole("link", { name: /AI 믹스 목록/ })).toHaveLength(1);
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
    const stateChapter = canvasElement.querySelector<HTMLElement>("[data-mixing-state-chapter='failed']");
    await expect(stateChapter).not.toBeNull();
    const failedMarker = canvasElement.querySelector<HTMLElement>(
      '[data-terminal-state="failed"] [data-lifecycle-marker="true"]',
    );
    if (!failedMarker) throw new Error("Failed terminal lifecycle marker is missing.");
    await expect(failedMarker).toHaveClass("bg-destructive/10", "text-destructive");
    await expect(getComputedStyle(stateChapter as HTMLElement).borderTopWidth).toBe("0px");
    await expect(getComputedStyle(stateChapter as HTMLElement).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    await expect(canvas.getByRole("link", { name: "보컬 프로필에서 다시 시작" })).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "Library로 돌아가기" })).not.toBeInTheDocument();
  },
};

export const DeleteConfirmation: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "삭제" }));
    await expect(document.body).toHaveTextContent("이 AI 믹스를 삭제할까요?");
    await expect(document.body).toHaveTextContent("티켓 사용 내역은 남아요");
  },
};
