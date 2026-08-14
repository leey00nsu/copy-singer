import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { MIXING_JOB_STATUSES, type PublicMixingJobStatus } from "../model/contract";
import { MixingStatusBadge } from "./mixing-status-badge";

const meta = {
  title: "Entities/Mixing Job/Status Badge",
  component: MixingStatusBadge,
  parameters: { layout: "centered" },
} satisfies Meta<typeof MixingStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

function badgeFor(canvasElement: HTMLElement, status: PublicMixingJobStatus) {
  const badge = canvasElement.querySelector<HTMLElement>(`[data-mixing-status="${status}"]`);
  if (!badge) throw new Error(`Missing mixing status badge for ${status}.`);
  return badge;
}

export const AllStates: Story = {
  args: { status: "processing" },
  render: () => (
    <div className="flex max-w-xl flex-wrap gap-3 p-6">
      {MIXING_JOB_STATUSES.map((status) => (
        <MixingStatusBadge key={status} status={status} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const status of ["pending", "preparing", "submitted", "processing"] as const) {
      await expect(badgeFor(canvasElement, status)).toHaveClass("bg-data-accent/10", "text-data-accent-foreground");
    }
    await expect(badgeFor(canvasElement, "succeeded")).toHaveClass("bg-data-accent", "text-white");
    await expect(badgeFor(canvasElement, "failed")).toHaveClass("bg-destructive/10", "text-destructive");
    await expect(badgeFor(canvasElement, "canceled")).toHaveClass("bg-secondary", "text-secondary-foreground");
  },
};
