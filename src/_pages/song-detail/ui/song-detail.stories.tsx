import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { recommendationRunFixture } from "../../../../tests/msw/fixtures";
import { SongDetail } from "./song-detail";

const item = recommendationRunFixture.items[0];
if (!item) throw new Error("Song detail story requires one recommendation item.");

const meta = {
  title: "Pages/Song Detail/Recommendation Source",
  component: SongDetail,
  args: {
    initialRun: recommendationRunFixture,
    itemId: item.id,
    ticketCost: 1,
  },
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: `/recommendations/${recommendationRunFixture.id}/songs/${item.id}` } },
  },
} satisfies Meta<typeof SongDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithOriginalVideo: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const player = canvas.getByTitle(`${item.title} · ${item.artist} 원본 YouTube 영상`);
    const heading = canvas.getByRole("heading", { level: 1, name: item.title });
    await expect(player).toBeVisible();
    await expect(player.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await expect(canvas.getByText("Song match")).toBeVisible();
    await expect(canvas.queryByText(/Song match · #\d+/)).not.toBeInTheDocument();
    await expect(canvas.queryByText("외부 출처 열기")).not.toBeInTheDocument();
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
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/안정적인 중앙 음역 구간을 찾지 못해/)).toBeVisible();
    await expect(canvas.getByRole("link", { name: "새 프로필 분석하기" })).toHaveAttribute("href", "/profile");
    await expect(canvas.queryByRole("button", { name: "AI 믹싱" })).not.toBeInTheDocument();
  },
};
