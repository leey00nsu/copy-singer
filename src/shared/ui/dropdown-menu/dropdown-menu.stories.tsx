import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

const meta = {
  title: "Shared UI/DropdownMenu",
  component: DropdownMenu,
} satisfies Meta<typeof DropdownMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Actions: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button aria-label="보컬 프로필 작업" size="icon" variant="outline" />}>
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>보컬 프로필</DropdownMenuLabel>
        <DropdownMenuItem>상세 보기</DropdownMenuItem>
        <DropdownMenuItem disabled>공유</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">삭제</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
