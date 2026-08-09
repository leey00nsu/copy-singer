import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ProductRouteError } from "./product-route-error";
import { ProductRouteLoading } from "./product-route-loading";
import { ProductRouteNotFound } from "./product-route-not-found";

const meta = {
  title: "App/Product Route States",
  component: ProductRouteError,
  parameters: { layout: "fullscreen" },
  args: { error: new Error("Story error"), reset: fn() },
} satisfies Meta<typeof ProductRouteError>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Failure: Story = {
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "다시 시도" });
    await userEvent.click(button);
    await expect(args.reset).toHaveBeenCalledOnce();
  },
};

export const Loading: Story = {
  render: () => <ProductRouteLoading />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status", { name: "제품 페이지를 불러오는 중" })).toBeVisible();
  },
};

export const NotFound: Story = {
  render: () => <ProductRouteNotFound />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("heading", { name: "페이지를 찾을 수 없어요." })).toBeVisible();
  },
};
