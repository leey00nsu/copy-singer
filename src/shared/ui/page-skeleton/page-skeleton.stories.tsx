import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PageSkeleton } from "@/shared/ui/page-skeleton";

const meta = {
  title: "Shared UI/PageSkeleton",
  component: PageSkeleton,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof PageSkeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Compact: Story = {
  args: {
    label: "보컬 프로필을 불러오는 중",
    rows: 2,
  },
};
