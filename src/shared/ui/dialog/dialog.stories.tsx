import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";

import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";

const meta = {
  title: "Shared UI/Dialog",
  component: Dialog,
} satisfies Meta<typeof Dialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Confirmation: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>삭제 확인 열기</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI 믹스를 삭제할까요?</DialogTitle>
          <DialogDescription>저장된 결과 오디오도 함께 삭제되며 되돌릴 수 없습니다.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
          <Button variant="destructive">삭제</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "삭제 확인 열기" }));
    await waitFor(() => expect(screen.getByRole("dialog", { name: "AI 믹스를 삭제할까요?" })).toBeVisible());
    await expect(screen.getByRole("button", { name: "취소" })).toHaveFocus();
  },
};
