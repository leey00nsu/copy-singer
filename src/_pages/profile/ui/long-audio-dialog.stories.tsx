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
    const page = within(canvasElement.ownerDocument.body);
    const dialog = page.getByRole("dialog", { name: /파일의 길이가 너무 길어요/ });
    const confirm = within(dialog).getByRole("button", { name: "예, 자동으로 자르기" });
    const cancel = within(dialog).getByRole("button", { name: "아니오" });

    await expect(confirm).toHaveFocus();
    await userEvent.tab({ shift: true });
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

export const LongFileNameStaysInsideDialog: Story = {
  args: {
    durationSeconds: 242,
    fileName:
      "Mariah Carey (머라이어 캐리) - All I Want For Christmas Is You [가사-Lyrics] [c5SUQgjObwY]-very-long-recording-file-name-without-any-safe-short-boundary.m4a",
  },
  globals: {
    viewport: { value: "mobile1", isRotated: false },
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const dialog = page.getByRole("dialog", { name: /파일의 길이가 너무 길어요/ });
    const fileName = page.getByTitle(
      "Mariah Carey (머라이어 캐리) - All I Want For Christmas Is You [가사-Lyrics] [c5SUQgjObwY]-very-long-recording-file-name-without-any-safe-short-boundary.m4a",
    );
    const footer = dialog.querySelector<HTMLElement>('[data-slot="dialog-footer"]');
    if (!footer) throw new Error("Long audio dialog footer is missing.");

    const viewportWidth = dialog.ownerDocument.documentElement.clientWidth;
    const dialogRect = dialog.getBoundingClientRect();
    const fileRect = fileName.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();

    await expect(dialogRect.left).toBeGreaterThanOrEqual(0);
    await expect(dialogRect.right).toBeLessThanOrEqual(viewportWidth);
    await expect(fileRect.right).toBeLessThanOrEqual(dialogRect.right);
    await expect(footerRect.left).toBeGreaterThanOrEqual(dialogRect.left);
    await expect(footerRect.right).toBeLessThanOrEqual(dialogRect.right + 1);
    await expect(fileName.scrollWidth).toBeGreaterThan(fileName.clientWidth);
  },
};
