import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type {} from "msw-storybook-addon/types";
import { expect, within } from "storybook/test";
import { notificationListFixture } from "../../../../tests/msw/fixtures";
import { notificationListHandler } from "../../../../tests/msw/handlers";
import { NotificationsList } from "./notifications-list";

const meta = {
  title: "Pages/Notifications",
  component: NotificationsList,
  args: { initial: notificationListFixture },
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-7">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-data-accent-foreground uppercase">
          Notifications
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">알림</h1>
        <p className="mt-2.5 text-xs leading-5 text-muted-foreground">
          티켓 지급과 보컬 분석, AI 믹싱 작업의 중요한 결과를 확인하세요.
        </p>
        <div className="mt-8">
          <Story />
        </div>
      </main>
    ),
  ],
  beforeEach({ msw }) {
    msw.use(notificationListHandler());
  },
} satisfies Meta<typeof NotificationsList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithHistory: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("region", { name: "알림 이력" })).toBeVisible();
    await expect(canvas.getByText("전체 3개 · 읽지 않음 2개")).toBeVisible();
    await expect(canvas.getByRole("button", { name: /AI 믹스가 완성되었습니다/ })).toBeVisible();
    await expect(canvas.getAllByText("읽지 않음")).toHaveLength(2);
    await expect(canvas.getByRole("button", { name: "모두 읽음" })).toBeEnabled();
  },
};

const empty = { ...notificationListFixture, total: 0, unreadCount: 0, notifications: [] };

export const Empty: Story = {
  args: { initial: empty },
  beforeEach({ msw }) {
    msw.use(notificationListHandler(empty));
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("heading", { name: "아직 알림이 없습니다." })).toBeVisible();
  },
};
