import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { ProductShell } from "@/widgets/product-shell";

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
    await expect(canvas.getByRole("navigation", { name: "제품 메뉴" })).toBeVisible();
    await expect(canvas.queryByRole("complementary")).not.toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "라이브러리" })).toHaveAttribute("aria-current", "page");
    await expect(canvas.getByRole("link", { name: "내 계정" })).toBeVisible();
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
    await expect(within(canvasElement).getByRole("link", { name: "내 계정" })).toHaveAttribute("aria-current", "page");
  },
};
