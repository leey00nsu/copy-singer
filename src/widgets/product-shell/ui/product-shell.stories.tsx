import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { ProductHeader, ProductShell } from "@/widgets/product-shell";

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
} satisfies Meta<typeof ProductShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  globals: {
    viewport: { value: "desktop", isRotated: false },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const brand = canvas.getAllByRole("link", { name: "Copy Singer" })[0];
    await expect(brand?.querySelector('img[src*="copy-singer-mark"]')).toBeVisible();
    const productMenu = within(canvas.getByRole("navigation", { name: "제품 메뉴" }));
    await expect(productMenu.getByRole("link", { name: "라이브러리" })).toHaveAttribute("aria-current", "page");
    await expect(productMenu.getByRole("link", { name: "내 계정" })).toBeVisible();
    await expect(canvas.queryByRole("complementary")).not.toBeInTheDocument();
    await expect(canvas.getByRole("navigation", { name: "제품 푸터 메뉴" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "이용 약관" })).toHaveAttribute("href", "/terms");
    await expect(canvas.getByRole("link", { name: "개인정보 처리방침" })).toHaveAttribute("href", "/privacy");
    await expect(canvas.getByText("© 2026 Copy Singer.")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "지은 계정 메뉴" }));
    const body = within(document.body);
    await waitFor(() => expect(body.getByText("계정")).toBeVisible());
    await expect(body.getByRole("menuitem", { name: "내 계정" })).toBeVisible();
  },
};

export const Mobile: Story = {
  globals: {
    viewport: { value: "mobile1", isRotated: false },
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "제품 메뉴 열기" }));
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
    await userEvent.click(within(canvasElement).getByRole("button", { name: "개발 사용자 계정 메뉴" }));
    const body = within(document.body);
    const bypassStatus = await body.findByRole("menuitem", { name: "개발 인증 우회 사용 중" });
    await expect(bypassStatus).toHaveAttribute("aria-disabled", "true");
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
  },
};
