import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";

const meta = {
  title: "Shared UI/Card",
  component: Card,
  args: {
    size: "default",
  },
  argTypes: {
    size: {
      control: "inline-radio",
      options: ["default", "sm"],
    },
  },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Composed: Story = {
  render: (args) => (
    <Card {...args} className="w-80">
      <CardHeader>
        <CardTitle>보컬 프로필</CardTitle>
        <CardDescription>최근 분석 결과를 확인하세요.</CardDescription>
        <CardAction>
          <Badge variant="secondary">준비됨</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>권장 음역 C3–A4</CardContent>
      <CardFooter className="justify-end">
        <Button size="sm" variant="outline">
          자세히 보기
        </Button>
      </CardFooter>
    </Card>
  ),
};
