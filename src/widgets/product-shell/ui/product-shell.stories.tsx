import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type {} from "msw-storybook-addon/types";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { ProductHeader, ProductShell } from "@/widgets/product-shell";
import { notificationListHandler, ticketBalanceHandler } from "../../../../tests/msw/handlers";

const meta = {
  title: "Widgets/ProductShell",
  component: ProductShell,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      navigation: {
        pathname: "/library",
      },
    },
  },
  args: {
    admin: true,
    children: (
      <div className="mx-auto max-w-4xl px-5 py-12 md:px-8">
        <p className="text-xs font-medium text-muted-foreground">LIBRARY</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">내 라이브러리</h1>
        <p className="mt-3 text-sm text-muted-foreground">제품 화면은 같은 navigation과 content 영역을 공유합니다.</p>
      </div>
    ),
    user: {
      email: "jieun@copysinger.test",
      name: "지은",
    },
  },
  beforeEach({ msw }) {
    msw.use(notificationListHandler(), ticketBalanceHandler());
  },
} satisfies Meta<typeof ProductShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  globals: {
    viewport: { value: "desktop", isRotated: false },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const brand = canvas.getAllByRole("link", { name: "Copysinger" })[0];
    await expect(brand?.querySelector('img[src*="copy-singer-mark.svg"]')).toBeVisible();
    await expect(within(brand as HTMLElement).getByText("Copysinger")).toHaveClass("font-brand", "font-bold");
    const productMenu = within(canvas.getByRole("navigation", { name: "제품 메뉴" }));
    await expect(productMenu.getByRole("link", { name: "라이브러리" })).toHaveAttribute("aria-current", "page");
    await expect(productMenu.getByRole("link", { name: "내 계정" })).toBeVisible();
    await expect(canvas.queryByRole("complementary")).not.toBeInTheDocument();
    const notificationButton = await canvas.findByRole("button", { name: "알림, 읽지 않은 알림 2개" });
    const accountButton = canvas.getByRole("button", { name: "지은 계정 메뉴" });
    await expect(
      notificationButton.compareDocumentPosition(accountButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await expect(canvas.getByRole("navigation", { name: "제품 푸터 메뉴" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "이용 약관" })).toHaveAttribute("href", "/terms");
    await expect(canvas.getByRole("link", { name: "개인정보 처리방침" })).toHaveAttribute("href", "/privacy");
    await expect(canvas.getByText("© 2026 Copysinger.")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "지은 계정 메뉴" }));
    const body = within(document.body);
    await waitFor(() => expect(body.getByText("계정")).toBeVisible());
    await expect(body.getByText("사용 가능한 티켓")).toBeVisible();
    await expect(await body.findByText("분석")).toBeVisible();
    await expect(await body.findByText("믹싱")).toBeVisible();
    await expect(await body.findByText("5장")).toBeVisible();
    await expect(await body.findByText("3장")).toBeVisible();
    await expect(body.getByRole("menuitem", { name: "내 계정" })).toBeVisible();
    await userEvent.click(accountButton);
    await userEvent.click(notificationButton);
    await waitFor(() => expect(body.getByText("AI 믹스가 완성됐어요")).toBeVisible());
    await expect(body.getByRole("menuitem", { name: /AI 믹스가 완성됐어요/ })).toBeVisible();
    await expect(body.getByRole("menuitem", { name: "전체 알림 보기" })).toHaveAttribute("href", "/notifications");
  },
};

export const ScrollChrome: Story = {
  args: {
    children: <div className="mx-auto min-h-[140vh] max-w-4xl px-5 py-12">스크롤 동작 확인</div>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const header = canvas.getByTestId("product-header");
    const separator = canvas.getByTestId("product-header-separator");
    await expect(header).toHaveAttribute("data-scrolled", "false");
    await expect(getComputedStyle(separator).backgroundColor).toBe("rgba(0, 0, 0, 0)");

    window.scrollTo({ top: 120 });
    await waitFor(() => expect(header).toHaveAttribute("data-scrolled", "true"));
    await expect(getComputedStyle(separator).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");

    const footerRail = canvas.getByTestId("product-footer-rail");
    await expect(footerRail.getBoundingClientRect().width).toBeLessThanOrEqual(1152);
    window.scrollTo({ top: 0 });
  },
};

export const Mobile: Story = {
  globals: {
    viewport: { value: "mobile1", isRotated: false },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("button", { name: "알림, 읽지 않은 알림 2개" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "제품 메뉴 열기" }));
    const body = within(document.body);
    await waitFor(() => expect(body.getByRole("dialog")).toBeVisible());
    await waitFor(() => expect(body.getByRole("link", { name: "내 계정" })).toBeVisible());
  },
};

export const AccountActive: Story = {
  parameters: {
    nextjs: { navigation: { pathname: "/account" } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const productMenu = within(canvas.getByRole("navigation", { name: "제품 메뉴" }));
    await expect(productMenu.getByRole("link", { name: "내 계정" })).toHaveAttribute("aria-current", "page");
  },
};

export const DevelopmentBypass: Story = {
  args: {
    user: {
      developmentBypass: true,
      email: "dev@copysinger.test",
      name: "개발 사용자",
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(document.body).queryByRole("dialog", { name: "처음 만나는 Copysinger" }),
    ).not.toBeInTheDocument();
    await userEvent.click(within(canvasElement).getByRole("button", { name: "개발 사용자 계정 메뉴" }));
    const body = within(document.body);
    const bypassStatus = await body.findByRole("menuitem", { name: "개발 인증 우회 사용 중" });
    await expect(bypassStatus).toHaveAttribute("aria-disabled", "true");
  },
};

export const CompletedOnboarding: Story = {
  args: { onboarding: { required: false } },
  play: async () => {
    await expect(
      within(document.body).queryByRole("dialog", { name: "처음 만나는 Copysinger" }),
    ).not.toBeInTheDocument();
  },
};

export const UnauthenticatedDesktop: Story = {
  render: () => <ProductHeader />,
  globals: {
    viewport: { value: "desktop", isRotated: false },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login?callbackURL=%2Fprofile",
    );
    await expect(canvas.queryByText("무료로 시작하기")).not.toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: /^알림/ })).not.toBeInTheDocument();
  },
};

export const UnauthenticatedMobile: Story = {
  render: () => <ProductHeader />,
  globals: {
    viewport: { value: "mobile1", isRotated: false },
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "제품 메뉴 열기" }));
    const dialog = within(document.body).getByRole("dialog");
    await waitFor(() => expect(dialog).toBeVisible());
    await expect(within(dialog).getByRole("button", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login?callbackURL=%2Fprofile",
    );
    await expect(within(dialog).queryByText("무료로 시작하기")).not.toBeInTheDocument();
    await expect(within(canvasElement).queryByRole("button", { name: /^알림/ })).not.toBeInTheDocument();
  },
};
