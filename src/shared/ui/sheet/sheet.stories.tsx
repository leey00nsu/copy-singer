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

export const LongBottomSheetStaysInViewport: Story = {
  globals: {
    viewport: { value: "mobile1", isRotated: false },
  },
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>긴 시트 열기</SheetTrigger>
      <SheetContent aria-label="긴 콘텐츠 시트" side="bottom">
        <SheetHeader>
          <SheetTitle>긴 콘텐츠 시트</SheetTitle>
          <SheetDescription>{`https://example.test/${"very-long-unbroken-token-".repeat(16)}`}</SheetDescription>
        </SheetHeader>
        <div className="px-4" data-testid="sheet-long-token">
          {`id-${"x".repeat(260)}`}
        </div>
        <div className="space-y-2 px-4 text-xs text-muted-foreground">
          {Array.from({ length: 36 }, (_, index) => (
            <p key={index}>세로 overflow 확인용 콘텐츠 {index + 1}</p>
          ))}
        </div>
        <SheetFooter data-testid="sheet-overflow-footer">
          <Button>확인</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "긴 시트 열기" }));
    const sheet = await screen.findByRole("dialog", { name: "긴 콘텐츠 시트" });
    await waitFor(() => expect(sheet).toBeVisible());

    const viewportWidth = sheet.ownerDocument.documentElement.clientWidth;
    const viewportHeight = sheet.ownerDocument.documentElement.clientHeight;
    const sheetRect = sheet.getBoundingClientRect();
    const footerRect = within(sheet).getByTestId("sheet-overflow-footer").getBoundingClientRect();
    const tokenRect = within(sheet).getByTestId("sheet-long-token").getBoundingClientRect();

    await expect(sheetRect.left).toBeGreaterThanOrEqual(0);
    await expect(sheetRect.right).toBeLessThanOrEqual(viewportWidth);
    await expect(sheetRect.height).toBeLessThanOrEqual(viewportHeight);
    await expect(footerRect.right).toBeLessThanOrEqual(sheetRect.right);
    await expect(tokenRect.right).toBeLessThanOrEqual(sheetRect.right);
    await expect(sheet.scrollHeight).toBeGreaterThan(sheet.clientHeight);
  },
};

export const LongSideSheetStaysInViewport: Story = {
  globals: {
    viewport: { value: "mobile1", isRotated: false },
  },
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>긴 오른쪽 시트 열기</SheetTrigger>
      <SheetContent aria-label="긴 오른쪽 시트" side="right">
        <SheetHeader>
          <SheetTitle>긴 오른쪽 시트</SheetTitle>
          <SheetDescription>{`user-${"x".repeat(260)}@example.test`}</SheetDescription>
        </SheetHeader>
        <div className="px-4" data-testid="side-sheet-long-token">
          {`https://example.test/${"y".repeat(260)}`}
        </div>
        <SheetFooter>
          <Button>확인</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "긴 오른쪽 시트 열기" }));
    const sheet = await screen.findByRole("dialog", { name: "긴 오른쪽 시트" });
    await waitFor(() => expect(sheet).toBeVisible());

    const viewportWidth = sheet.ownerDocument.documentElement.clientWidth;
    await waitFor(() => expect(sheet.getBoundingClientRect().right).toBeLessThanOrEqual(viewportWidth));
    const sheetRect = sheet.getBoundingClientRect();
    const tokenRect = within(sheet).getByTestId("side-sheet-long-token").getBoundingClientRect();

    await expect(sheetRect.left).toBeGreaterThanOrEqual(0);
    await expect(tokenRect.right).toBeLessThanOrEqual(sheetRect.right);
  },
};
