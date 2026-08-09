import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { LongAudioDialog } from "./long-audio-dialog";

const meta = {
  title: "Pages/Profile/LongAudioDialog",
  component: LongAudioDialog,
  args: {
    durationSeconds: 87.4,
    fileName: "live-session-take-03.wav",
    onCancel: fn(),
    onConfirm: fn(),
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof LongAudioDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const dialog = canvas.getByRole("dialog", { name: /파일의 길이가 너무 길어요/ });
    const confirm = within(dialog).getByRole("button", { name: "예, 자동으로 자르기" });
    const cancel = within(dialog).getByRole("button", { name: "아니오" });

    await expect(confirm).toHaveFocus();
    await userEvent.tab();
    await expect(cancel).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await userEvent.click(confirm);
    await expect(args.onConfirm).toHaveBeenCalledOnce();
  },
};

export const UnknownDuration: Story = {
  args: {
    durationSeconds: null,
  },
};
