import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import type { NotificationItem } from "@/entities/notification/model/contract";
import { NotificationItemContent } from "@/entities/notification/ui/notification-item-content";

const base: Omit<NotificationItem, "type"> = {
  id: "1",
  title: "알림 제목",
  message: "알림 메시지입니다. 타입별 아이콘 배지 색을 확인하세요.",
  href: "/library",
  sourceId: null,
  readAt: null,
  createdAt: new Date().toISOString(),
};

const meta = {
  title: "Entities/Notification/BadgeColors",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllTypes: Story = {
  render: () => (
    <div className="grid max-w-lg gap-3 bg-background p-6">
      <p className="mb-2 text-xs text-muted-foreground">브랜드 컬러 선택적 적용 후 — 5종 타입별 배지</p>
      {(
        [
          "ticket_credit",
          "vocal_profile_succeeded",
          "vocal_profile_failed",
          "mixing_succeeded",
          "mixing_failed",
        ] as const
      ).map((type) => (
        <div data-notification-type={type} key={type} className="rounded-lg border p-3">
          <p className="mb-2 text-[11px] font-mono text-muted-foreground">{type}</p>
          <NotificationItemContent item={{ ...base, type }} />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const badgeFor = (type: string) => canvasElement.querySelector(`[data-notification-type="${type}"] > span > span`);
    await expect(badgeFor("ticket_credit")).toHaveClass("bg-success", "text-success-foreground");
    await expect(badgeFor("vocal_profile_succeeded")).toHaveClass("bg-data-accent", "text-white");
    await expect(badgeFor("mixing_succeeded")).toHaveClass("bg-data-accent", "text-white");
    await expect(badgeFor("vocal_profile_failed")).toHaveClass("bg-destructive/10", "text-destructive");
    await expect(badgeFor("mixing_failed")).toHaveClass("bg-destructive/10", "text-destructive");
  },
};
