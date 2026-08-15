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

export const LongContentStaysInViewport: Story = {
  globals: {
    viewport: { value: "mobile1", isRotated: false },
  },
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>긴 콘텐츠 모달 열기</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>긴 콘텐츠도 화면 안에 있어요</DialogTitle>
          <DialogDescription>{`https://example.test/${"very-long-unbroken-token-".repeat(16)}`}</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-muted/40 p-3" data-testid="dialog-long-token">
          {`file-${"x".repeat(260)}.m4a`}
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          {Array.from({ length: 32 }, (_, index) => (
            <p key={index}>세로 overflow 확인용 콘텐츠 {index + 1}</p>
          ))}
        </div>
        <DialogFooter data-testid="dialog-overflow-footer">
          <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
          <Button>확인</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "긴 콘텐츠 모달 열기" }));
    const dialog = await screen.findByRole("dialog", { name: "긴 콘텐츠도 화면 안에 있어요" });
    await waitFor(() => expect(dialog).toBeVisible());

    const viewportWidth = dialog.ownerDocument.documentElement.clientWidth;
    const viewportHeight = dialog.ownerDocument.documentElement.clientHeight;
    const dialogRect = dialog.getBoundingClientRect();
    const footerRect = within(dialog).getByTestId("dialog-overflow-footer").getBoundingClientRect();
    const tokenRect = within(dialog).getByTestId("dialog-long-token").getBoundingClientRect();

    await expect(dialogRect.left).toBeGreaterThanOrEqual(0);
    await expect(dialogRect.right).toBeLessThanOrEqual(viewportWidth);
    await expect(dialogRect.height).toBeLessThanOrEqual(viewportHeight);
    await expect(footerRect.left).toBeGreaterThanOrEqual(dialogRect.left);
    await expect(footerRect.right).toBeLessThanOrEqual(dialogRect.right + 1);
    await expect(tokenRect.right).toBeLessThanOrEqual(dialogRect.right);
    await expect(dialog.scrollHeight).toBeGreaterThan(dialog.clientHeight);
  },
};
