import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type {} from "msw-storybook-addon/types";
import { expect, within } from "storybook/test";
import { ProductShell } from "@/widgets/product-shell";
import { notificationListFixture } from "../../../../tests/msw/fixtures";
import { notificationListHandler, ticketBalanceHandler } from "../../../../tests/msw/handlers";
import { NotificationsList } from "./notifications-list";
import { NotificationsPageContent } from "./notifications-page-content";

const meta = {
  title: "Pages/Notifications",
  component: NotificationsList,
  args: { initial: notificationListFixture },
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/notifications" } },
  },
  decorators: [
    (Story) => (
      <ProductShell user={{ email: "jieun@copysinger.test", name: "지은" }}>
        <NotificationsPageContent>
          <Story />
        </NotificationsPageContent>
      </ProductShell>
    ),
  ],
  beforeEach({ msw }) {
    msw.use(notificationListHandler(), ticketBalanceHandler());
  },
} satisfies Meta<typeof NotificationsList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithHistory: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "알림" })).toBeVisible();
    await expect(canvas.getByText("보컬 분석·AI 믹싱 결과와 티켓 지급 알림을 확인할 수 있어요.")).toBeVisible();
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
    msw.use(notificationListHandler(empty), ticketBalanceHandler());
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("heading", { name: "아직 알림이 없어요." })).toBeVisible();
  },
};
