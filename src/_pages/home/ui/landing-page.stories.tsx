import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

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
    await expect(canvas.queryByTestId("landing-crystal")).not.toBeInTheDocument();
    await expect(canvas.getByRole("navigation", { name: "제품 푸터 메뉴" })).toBeVisible();
    await expect(canvas.getByText("© 2026 Copy Singer.")).toBeVisible();
  },
};

export const SignedIn: Story = {
  args: {
    admin: true,
    user: {
      email: "jieun@copysinger.test",
      image: null,
      name: "지은",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "목소리 분석 시작하기: 목소리 분석 시작" })).toHaveAttribute(
      "href",
      "/profile",
    );
    await expect(canvas.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    await userEvent.click(canvas.getByRole("button", { name: "지은 계정 메뉴" }));
    const body = within(document.body);
    await waitFor(() => expect(body.getByRole("menuitem", { name: "내 계정" })).toBeVisible());
    await expect(body.getByRole("menuitem", { name: "관리" })).toBeVisible();
  },
};
