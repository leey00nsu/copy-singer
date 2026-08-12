import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Activity, AlertTriangle, Ticket, Users } from "lucide-react";
import { expect, within } from "storybook/test";

import { AdminMetricBand } from "./admin-metric-band";

const metrics = [
  { detail: "전체 가입자", icon: Users, label: "사용자", value: 128 },
  { detail: "현재 실행 중", icon: Activity, label: "진행 작업", value: 7 },
  { detail: "최근 24시간 기준", icon: AlertTriangle, label: "24시간 실패", value: 1 },
  { detail: "전체 잔여 티켓", icon: Ticket, label: "티켓 잔액", value: 284 },
];

const meta = {
  title: "Pages/Admin/MetricBand",
  component: AdminMetricBand,
  args: { metrics },
  parameters: { layout: "padded" },
} satisfies Meta<typeof AdminMetricBand>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("region", { name: "운영 요약" })).toBeVisible();
    await expect(canvas.getAllByRole("article")).toHaveLength(4);
  },
};
