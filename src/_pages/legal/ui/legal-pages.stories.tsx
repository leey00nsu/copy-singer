import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { PrivacyPage } from "./privacy-page";
import { TermsPage } from "./terms-page";

const meta = {
  title: "Pages/Legal",
  component: TermsPage,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof TermsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Terms: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1, name: "이용 약관" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "4. 음성·콘텐츠에 대한 권리와 책임" })).toBeVisible();
    const legalNavigation = within(canvas.getByRole("navigation", { name: "법률 문서" }));
    await expect(legalNavigation.getByRole("link", { name: "개인정보 처리방침" })).toHaveAttribute("href", "/privacy");
    await expect(canvas.queryByText("서비스 공개 전 검토 초안")).not.toBeInTheDocument();
    await expect(canvas.getByText(/무료·비상업적 토이 프로젝트/)).toBeVisible();
    await expect(canvas.getByText(/원본 음원 파일을 이용자에게/)).toBeVisible();
  },
};

export const Privacy: Story = {
  render: () => <PrivacyPage />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1, name: "개인정보 처리방침" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "2. 처리하는 개인정보와 목적" })).toBeVisible();
    await expect(canvas.getByText("계정정보")).toBeVisible();
    await expect(canvas.getByText("접속정보")).toBeVisible();
    await expect(canvas.getByText("음성정보")).toBeVisible();
    await expect(canvas.getByText("추천·믹싱정보")).toBeVisible();
    await expect(canvas.getByText("이용내역")).toBeVisible();
    await expect(canvas.getByText("Google OAuth")).toBeVisible();
    await expect(canvas.getByText("Copysinger 개인 개발자")).toBeVisible();
    await expect(canvas.queryByText(/정식 공개 전|입력 필요/)).not.toBeInTheDocument();
    const legalNavigation = within(canvas.getByRole("navigation", { name: "법률 문서" }));
    await expect(legalNavigation.getByRole("link", { name: "이용 약관" })).toHaveAttribute("href", "/terms");
  },
};
