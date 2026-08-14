import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { AccountOverview } from "./account-overview";

const meta = {
  title: "Pages/Account/Overview",
  component: AccountOverview,
  parameters: { layout: "fullscreen" },
  args: {
    account: {
      balance: 2,
      page: 1,
      pageCount: 2,
      total: 3,
      entries: [
        {
          id: "ticket-debit",
          type: "MIXING_DEBIT",
          amount: -1,
          balanceAfter: 2,
          reason: "김광석 · 서른 즈음에 AI 믹싱",
          mixingJobId: "30000000-0000-4000-8000-000000000002",
          createdAt: new Date("2026-08-09T03:00:00.000Z"),
        },
        {
          id: "signup-grant",
          type: "SIGNUP_GRANT",
          amount: 3,
          balanceAfter: 3,
          reason: "회원가입 무료 티켓",
          mixingJobId: null,
          createdAt: new Date("2026-08-08T03:00:00.000Z"),
        },
      ],
    },
    admin: false,
    authentication: {
      googleConnected: true,
      googleConnectedAt: new Date("2026-08-08T00:00:00.000Z"),
    },
    user: { email: "jieun@copysinger.test", name: "지은" },
  },
} satisfies Meta<typeof AccountOverview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const GoogleConnected: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText("Google 연결됨")).not.toBeInTheDocument();
    for (const label of ["이름", "이메일", "로그인 방식"]) {
      const term = canvas.getByText(label).closest("dt");
      await expect(term?.querySelector("svg")).toBeVisible();
    }
    await expect(canvas.getByText("Google")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "AI 믹스 상세 보기" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "이전" })).toBeDisabled();
    await expect(canvas.getByRole("link", { name: "다음" })).toHaveAttribute("href", "/account?page=2");
  },
};

export const Admin: Story = {
  args: { admin: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
    await expect(canvas.queryByRole("link", { name: /새 목소리 분석|Library/ })).not.toBeInTheDocument();
  },
};

export const DevelopmentSessionEmpty: Story = {
  args: {
    account: { balance: 0, page: 1, pageCount: 1, total: 0, entries: [] },
    authentication: { googleConnected: false, googleConnectedAt: null },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText("Google 연결 정보 없음")).not.toBeInTheDocument();
    await expect(canvas.getByText("현재 세션")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "아직 티켓 내역이 없어요." })).toBeVisible();
    await expect(canvas.queryByRole("navigation", { name: "티켓 내역 페이지" })).not.toBeInTheDocument();
  },
};
