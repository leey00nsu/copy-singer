import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";

import { Button } from "@/shared/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";

const meta = {
  title: "Shared UI/Sheet",
  component: Sheet,
} satisfies Meta<typeof Sheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MobileFilter: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>필터 열기</SheetTrigger>
      <SheetContent aria-label="추천곡 필터">
        <SheetHeader>
          <SheetTitle>추천곡 필터</SheetTitle>
          <SheetDescription>현재 추천 결과에 실제로 있는 값만 사용합니다.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 border-y px-4 py-6 text-sm text-muted-foreground">필터 control 영역</div>
        <SheetFooter>
          <Button>결과 보기</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "필터 열기" }));
    await waitFor(() => expect(screen.getByRole("dialog", { name: "추천곡 필터" })).toBeVisible());
  },
};
