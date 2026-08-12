import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type {} from "msw-storybook-addon/types";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { notificationListHandler, ticketBalanceHandler } from "../../../../tests/msw/handlers";
import { LandingPage } from "./landing-page";

const meta = {
  title: "Pages/Landing",
  component: LandingPage,
  parameters: {
    layout: "fullscreen",
  },
  beforeEach({ msw }) {
    msw.use(notificationListHandler(), ticketBalanceHandler());
  },
} satisfies Meta<typeof LandingPage>;

export default meta;

type Story = StoryObj<typeof meta>;

async function expectLandingStructure(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  const analysis = canvas.getByRole("heading", { name: "목소리 분석" });
  const recommendation = canvas.getByRole("heading", { name: "노래와 키 추천" });
  const mixing = canvas.getByRole("heading", { name: "선택형 AI 믹싱" });
  await expect(analysis.compareDocumentPosition(recommendation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  await expect(recommendation.compareDocumentPosition(mixing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  await expect(canvas.getByRole("list", { name: "AI 믹싱 이용 흐름" })).toBeVisible();
  await expect(canvas.getByRole("navigation", { name: "제품 푸터 메뉴" })).toBeVisible();
}

export const SignedOut: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "무료로 시작하기: 목소리 분석 시작" })).toHaveAttribute(
      "href",
      "/login?callbackURL=%2Fprofile",
    );
    await expect(canvas.getByLabelText("움직이는 목소리 파형과 분석 시작")).toBeVisible();
    await expect(canvas.queryByTestId("landing-crystal")).not.toBeInTheDocument();
    await expect(canvas.getByText("© 2026 Copy Singer.")).toBeVisible();
    await expectLandingStructure(canvasElement);
  },
};

export const Mobile: Story = {
  globals: {
    viewport: { value: "mobile1", isRotated: false },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "무료로 시작하기: 목소리 분석 시작" })).toBeVisible();
    await expect(canvas.getByLabelText("움직이는 목소리 파형과 분석 시작")).toBeVisible();
    await expectLandingStructure(canvasElement);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
  },
};

export const ReducedMotion: Story = {
  render: (args) => (
    <div data-testid="reduced-motion-preview">
      <style>{`
        [data-testid="reduced-motion-preview"] *,
        [data-testid="reduced-motion-preview"] *::before,
        [data-testid="reduced-motion-preview"] *::after {
          animation: none !important;
          scroll-behavior: auto !important;
          transition-duration: 0.01ms !important;
        }
      `}</style>
      <LandingPage {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("reduced-motion-preview")).toBeVisible();
    await expect(canvas.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "무료로 시작하기: 목소리 분석 시작" })).toBeVisible();
    await expect(canvas.getByLabelText("움직이는 목소리 파형과 분석 시작")).toBeVisible();
    await expectLandingStructure(canvasElement);
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
