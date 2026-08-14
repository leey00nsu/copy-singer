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
    await expect(canvas.getByRole("heading", { name: "계속하려면 로그인해 주세요." })).toBeVisible();
    await expect(canvas.getByText("저장된 보컬 프로필과 AI 믹싱 결과는 로그인 후 확인할 수 있어요.")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "구글로 시작하기" })).toBeEnabled();
    await expect(canvas.getByText("Google 계정으로 로그인하면")).toBeVisible();
    await expect(canvas.getAllByRole("link", { name: "이용 약관" })[0]).toHaveAttribute("href", "/terms");
    await expect(canvas.getAllByRole("link", { name: "개인정보 처리방침" })[0]).toHaveAttribute("href", "/privacy");
    await expect(canvasElement.querySelector('[data-google-icon=""]')).toBeVisible();
    const mainBrand = within(canvas.getByRole("main")).getByRole("link", { name: "Copysinger" });
    await expect(mainBrand.querySelector('img[src*="copy-singer-mark.svg"]')).toBeVisible();
    await expect(within(mainBrand).getByText("Copysinger")).toHaveClass("font-brand", "font-bold");
    await expect(canvasElement.querySelectorAll('img[src*="copy-singer-mark.svg"]')).toHaveLength(3);
    await expect(canvasElement.querySelector('[data-testid="voice-orb"]')).toBeInTheDocument();
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
    await expect(canvas.getByText("현재 Google 로그인을 사용할 수 없어요.")).toBeVisible();
  },
};
