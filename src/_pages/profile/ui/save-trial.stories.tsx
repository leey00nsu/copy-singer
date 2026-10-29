import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { HttpResponse, http } from "msw";
import type {} from "msw-storybook-addon/types";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { SaveTrial } from "./save-trial";

const profileId = "20000000-0000-4000-8000-000000000001";
const songId = "20000000-0000-4000-8000-000000000003";
const destination = `/recommendations/${profileId}/songs/${songId}`;
const meta = {
  title: "Pages/Profile/Save Trial",
  component: SaveTrial,
  args: { next: destination },
  parameters: { layout: "fullscreen" },
  beforeEach({ msw }) {
    msw.use(http.post("*/api/guest-analysis/claim", () => HttpResponse.json({ profileId })));
  },
} satisfies Meta<typeof SaveTrial>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SelectedSong: Story = {
  play: async () => {
    await waitFor(() => expect(getRouter().replace).toHaveBeenCalledWith(destination));
    await expect(getRouter().push).not.toHaveBeenCalled();
  },
};

export const RejectExternalReturn: Story = {
  args: { next: "https://attacker.example" },
  play: async () => {
    await waitFor(() => expect(getRouter().replace).toHaveBeenCalledWith(`/vocal-profiles/${profileId}`));
  },
};

export const RetryKeepsSelectedSong: Story = {
  beforeEach({ msw }) {
    let attempts = 0;
    msw.use(
      http.post("*/api/guest-analysis/claim", () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json(
              { reasonCode: "GUEST_RESULT_SAVE_FAILED", detail: "Try again", retryable: true },
              { status: 503 },
            )
          : HttpResponse.json({ profileId });
      }),
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "다시 저장하기" }));
    await waitFor(() => expect(getRouter().replace).toHaveBeenCalledWith(destination));
  },
};
