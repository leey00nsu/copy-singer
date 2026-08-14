import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type {} from "msw-storybook-addon/types";
import { expect, userEvent, waitFor, within } from "storybook/test";
import type { NotificationList } from "@/entities/notification";
import { notificationListFixture } from "../../../../tests/msw/fixtures";
import { notificationListHandler } from "../../../../tests/msw/handlers";
import { NotificationBell } from "./notification-bell";

const [mixingSucceeded, vocalSucceeded, ticketCredit] = notificationListFixture.notifications;
if (!mixingSucceeded || !vocalSucceeded || !ticketCredit) {
  throw new Error("Notification Storybook fixture requires three base notifications.");
}

const allNotificationTypes: NotificationList = {
  ...notificationListFixture,
  total: 5,
  unreadCount: 5,
  notifications: [
    { ...ticketCredit, readAt: null },
    { ...vocalSucceeded, readAt: null },
    {
      ...vocalSucceeded,
      id: "40000000-0000-4000-8000-000000000004",
      type: "vocal_profile_failed",
      title: "보컬 프로필 분석을 완료하지 못했습니다",
      message: "새 오디오로 다시 분석해 보세요.",
      readAt: null,
    },
    { ...mixingSucceeded, readAt: null },
    {
      ...mixingSucceeded,
      id: "40000000-0000-4000-8000-000000000005",
      type: "mixing_failed",
      title: "AI 믹스를 완료하지 못했습니다",
      message: "잠시 뒤 다시 시도해 보세요.",
      readAt: null,
    },
  ],
};

const meta = {
  title: "Features/Manage Notifications/NotificationBell",
  component: NotificationBell,
  parameters: {
    layout: "centered",
  },
  beforeEach({ msw }) {
    msw.use(notificationListHandler(allNotificationTypes));
  },
} satisfies Meta<typeof NotificationBell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpenWithAllTypes: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "알림, 읽지 않은 알림 5개" }));

    const body = within(document.body);
    await waitFor(() => expect(body.getByText("티켓이 추가되었습니다")).toBeVisible());
    await expect(body.getByText("보컬 프로필 분석이 완료되었습니다")).toBeVisible();
    await expect(body.getByText("보컬 프로필 분석을 완료하지 못했습니다")).toBeVisible();
    await expect(body.getByText("AI 믹스가 완성되었습니다")).toBeVisible();
    await expect(body.getByText("AI 믹스를 완료하지 못했습니다")).toBeVisible();

    const notificationItems = [
      ["티켓이 추가되었습니다", "ticket_credit"],
      ["보컬 프로필 분석이 완료되었습니다", "vocal_profile_succeeded"],
      ["보컬 프로필 분석을 완료하지 못했습니다", "vocal_profile_failed"],
      ["AI 믹스가 완성되었습니다", "mixing_succeeded"],
      ["AI 믹스를 완료하지 못했습니다", "mixing_failed"],
    ] as const;
    for (const [title, type] of notificationItems) {
      const item = body.getByRole("menuitem", { name: new RegExp(title) });
      const badge = item.querySelector<HTMLElement>(`[data-notification-icon-badge="${type}"]`);
      if (!badge) throw new Error(`Missing notification icon badge for ${type}.`);
      const colorBeforeHover = getComputedStyle(badge).color;
      await userEvent.hover(item);
      await waitFor(() => expect(getComputedStyle(badge).color).toBe(colorBeforeHover));
    }

    await expect(body.getByRole("menuitem", { name: "전체 알림 보기" })).toHaveAttribute("href", "/notifications");
  },
};
