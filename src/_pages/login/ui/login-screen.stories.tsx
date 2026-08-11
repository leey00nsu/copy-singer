import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { LoginScreen } from "./login-screen";

const meta = {
  title: "Pages/LoginScreen",
  component: LoginScreen,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    callbackURL: "/profile",
    configured: true,
  },
} satisfies Meta<typeof LoginScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Copy Singer" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "구글로 시작하기" })).toBeEnabled();
    await expect(canvasElement.querySelector('[data-google-icon=""]')).toBeVisible();
    await expect(canvasElement.querySelectorAll('img[src*="copy-singer-mark"]')).toHaveLength(2);
    await expect(canvas.queryByText("홈으로")).not.toBeInTheDocument();
    await expect(canvas.queryByText("Account")).not.toBeInTheDocument();
    await expect(canvas.queryByText("계정으로 시작하세요")).not.toBeInTheDocument();
    await expect(canvas.queryByText("현재는 Google 계정으로만 로그인할 수 있습니다.")).not.toBeInTheDocument();
  },
};

export const OAuthNotConfigured: Story = {
  args: {
    configured: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "구글로 시작하기" })).toBeDisabled();
    await expect(canvas.getByText("Google OAuth 환경변수를 먼저 설정해 주세요.")).toBeVisible();
  },
};
