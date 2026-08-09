import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Separator } from "@/shared/ui/separator";

const meta = {
  title: "Shared UI/Separator",
  component: Separator,
  args: {
    orientation: "horizontal",
  },
  argTypes: {
    orientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
    },
  },
} satisfies Meta<typeof Separator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: (args) => (
    <div className="w-72 space-y-3">
      <p>분석 결과</p>
      <Separator {...args} />
      <p className="text-sm text-muted-foreground">권장 키와 음역을 확인하세요.</p>
    </div>
  ),
};

export const Vertical: Story = {
  args: {
    orientation: "vertical",
  },
  render: (args) => (
    <div className="flex h-6 items-center gap-3">
      <span>원본</span>
      <Separator {...args} />
      <span>변환</span>
    </div>
  ),
};
