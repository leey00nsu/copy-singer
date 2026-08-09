import type { Meta, StoryObj } from "@storybook/nextjs-vite";

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
};

export const Mobile: Story = {
  globals: {
    viewport: { value: "mobile1", isRotated: false },
  },
};
