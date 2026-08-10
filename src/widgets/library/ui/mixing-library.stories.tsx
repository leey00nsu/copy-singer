import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type {} from "msw-storybook-addon/types";
import { expect, within } from "storybook/test";
import type { MixingHistoryPayload } from "@/entities/mixing-job";
import { mixingHistoryFixture } from "../../../../tests/msw/fixtures";
import { mixingHistoryHandler } from "../../../../tests/msw/handlers";
import { LibraryTabs } from "./library-tabs";
import { MixingLibrary } from "./mixing-library";

const meta = {
  title: "Widgets/Library/AI Mixes",
  component: MixingLibrary,
  args: {
    basePath: "/library",
    filters: { page: 1, q: "", status: "all" },
    initial: mixingHistoryFixture,
  },
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-data-accent-foreground">LIBRARY</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">내 라이브러리</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          저장한 보컬 프로필과 AI 믹싱 작업을 구분해 확인하세요.
        </p>
        <div className="mt-8">
          <LibraryTabs tab="mixes" />
        </div>
        <div className="mt-6">
          <Story />
        </div>
      </div>
    ),
  ],
  beforeEach({ msw }) {
    msw.use(mixingHistoryHandler());
  },
} satisfies Meta<typeof MixingLibrary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MixedStates: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("table", { name: "AI 믹스 작업 목록" })).toBeVisible();
    await expect(canvas.getByText("믹싱 중")).toBeVisible();
    await expect(canvas.getByText("결과 준비 완료")).toBeVisible();
    await expect(canvas.getByText(/믹싱에 사용할 반주를 준비하지 못했어요/)).toBeVisible();
    await expect(canvas.queryByText("믹싱용 원곡을 준비하지 못했습니다.")).not.toBeInTheDocument();
    await expect(canvas.getByRole("searchbox", { name: "작업 또는 아티스트 검색" })).toBeVisible();
  },
};

const denseMixingHistory: MixingHistoryPayload = {
  page: 1,
  pageSize: 20,
  total: 12,
  pageCount: 1,
  jobs: Array.from({ length: 12 }, (_, index) => {
    const source = mixingHistoryFixture.jobs[index % 2 === 0 ? 1 : 2];
    if (!source) throw new Error("Dense mixing fixture source is missing");
    const suffix = String(index + 101).padStart(12, "0");
    return {
      ...source,
      id: `30000000-0000-4000-8000-${suffix}`,
      song: {
        ...source.song,
        title: `${source.song.title} ${index + 1}`,
        catalogOrder: 200 + index,
      },
      createdAt: `2026-08-${String(9 - (index % 7)).padStart(2, "0")}T03:00:00.000Z`,
    };
  }),
};

export const DenseLibrary: Story = {
  args: { initial: denseMixingHistory },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("table").querySelectorAll("tbody tr")).toHaveLength(12);
    await expect(canvas.getAllByRole("link", { name: "결과 듣기" })).toHaveLength(6);
    await expect(canvas.queryByRole("link", { name: "결과 저장" })).not.toBeInTheDocument();
  },
};

export const FilteredEmpty: Story = {
  args: {
    filters: { page: 1, q: "없는 곡", status: "failed" },
    initial: { page: 1, pageSize: 20, total: 0, pageCount: 1, jobs: [] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "조건에 맞는 AI 믹스가 없어요." })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "모든 AI 믹스 보기" })).toHaveAttribute(
      "href",
      "/library?page=1&tab=mixes",
    );
  },
};

export const Empty: Story = {
  args: {
    initial: { page: 1, pageSize: 20, total: 0, pageCount: 1, jobs: [] },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("heading", { name: "아직 AI 믹스가 없어요." })).toBeVisible();
  },
};
