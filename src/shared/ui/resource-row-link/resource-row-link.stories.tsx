import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { ResourceRowButton, ResourceRowLink, resourceRowInteractiveClassName } from "./resource-row-link";

function ResourceRowLinkPreview() {
  return (
    <article className={`${resourceRowInteractiveClassName} border-y px-4 py-4`}>
      <h2 className="text-sm font-semibold">
        <ResourceRowLink href="/library/mixes/example">행 전체로 열리는 AI 믹스</ResourceRowLink>
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">작은 상세 아이콘 없이 하나의 목적지로 이동합니다.</p>
    </article>
  );
}

function ResourceRowButtonPreview() {
  const [selected, setSelected] = useState(false);
  return (
    <article className={`${resourceRowInteractiveClassName} border-y px-4 py-4`}>
      <h2 className="text-sm font-semibold">
        <ResourceRowButton aria-pressed={selected} onClick={() => setSelected(true)}>
          행 전체로 선택하는 추천곡
        </ResourceRowButton>
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">상세 이동이 아니라 현재 목록의 선택 상태를 바꿉니다.</p>
    </article>
  );
}

const meta = {
  title: "Shared/ResourceRowLink",
  component: ResourceRowLinkPreview,
} satisfies Meta<typeof ResourceRowLinkPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole("link", { name: "행 전체로 열리는 AI 믹스" });
    await expect(link).toHaveAttribute("href", "/library/mixes/example");
    await expect(link).toHaveAttribute("data-resource-row-link");
    await userEvent.tab();
    await expect(link).toHaveFocus();
  },
};

export const SelectionButton: Story = {
  render: () => <ResourceRowButtonPreview />,
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "행 전체로 선택하는 추천곡" });
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);
    await expect(button).toHaveAttribute("aria-pressed", "true");
  },
};
