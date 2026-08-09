import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Badge } from "@/shared/ui/badge";

const meta = {
  title: "Shared UI/Badge",
  component: Badge,
  args: {
    children: "완료",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline", "ghost", "link"],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      {(["default", "secondary", "destructive", "outline", "ghost", "link"] as const).map((variant) => (
        <Badge {...args} key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  ),
};
