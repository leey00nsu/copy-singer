import type { Meta, StoryObj } from "@storybook/nextjs-vite";
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
        <div key={type} className="rounded-lg border p-3">
          <p className="mb-2 text-[11px] font-mono text-muted-foreground">{type}</p>
          <NotificationItemContent item={{ ...base, type }} />
        </div>
      ))}
      <div className="mt-4 grid gap-3">
        <p className="text-xs text-muted-foreground">Dropdown 모달 호버 (배지 컬러 유지, 배경 muted와 구분)</p>
        <div
          className="group flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 hover:bg-accent focus:bg-accent"
          tabIndex={0}
        >
          <NotificationItemContent
            compact
            item={{ ...base, type: "mixing_succeeded", title: "AI 믹싱 성공", message: "호버 시 배지 보라 유지" }}
          />
        </div>
        <div
          className="group flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 hover:bg-accent focus:bg-accent"
          tabIndex={0}
        >
          <NotificationItemContent
            compact
            item={{ ...base, type: "ticket_credit", title: "티켓 지급", message: "호버 시 배지 초록 유지" }}
          />
        </div>
      </div>
    </div>
  ),
};
