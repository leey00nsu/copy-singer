import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { LandingPage } from "./landing-page";

const meta = {
  title: "Pages/Landing",
  component: LandingPage,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof LandingPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SignedOut: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "무료로 시작하기: 목소리 분석 시작" })).toHaveAttribute(
      "href",
      "/login?callbackURL=%2Fprofile",
    );
    await expect(canvas.getByLabelText("움직이는 목소리 파형과 분석 시작")).toBeVisible();
    await expect(canvas.getByTestId("landing-crystal")).toBeVisible();
    await expect(canvas.getByRole("navigation", { name: "푸터 제품 메뉴" })).toBeVisible();
    await expect(canvas.getByText("© 2026 Copy Singer.")).toBeVisible();
  },
};

export const SignedIn: Story = {
  args: {
    authenticated: true,
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("link", { name: "목소리 분석 계속하기: 목소리 분석 시작" }),
    ).toHaveAttribute("href", "/profile");
  },
};
