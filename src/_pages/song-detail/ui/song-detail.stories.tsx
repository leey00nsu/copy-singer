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
    await expect(canvas.queryByText("외부 출처 열기")).not.toBeInTheDocument();
  },
};
