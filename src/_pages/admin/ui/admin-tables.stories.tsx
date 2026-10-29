import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import type { ReactNode } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { ProductPageIntro } from "@/shared/ui/product-page-intro";
import { AdminNavigation } from "@/widgets/admin-navigation";
import { ADMIN_DESCRIPTION, parseAdminFilters } from "../model/filters";
import { AdminAudienceTabs } from "./admin-audience-tabs";
import { AdminGuestsTable, AdminMembersTable, AdminMixingTable } from "./admin-tables";

const now = new Date("2026-10-29T03:00:00Z");
const user = {
  id: "member",
  name: "김하늘",
  email: "member@example.test",
  createdAt: now,
  ticketWallets: [
    { kind: "VOCAL_ANALYSIS" as const, balance: 5 },
    { kind: "AI_MIXING" as const, balance: 1 },
  ],
  _count: { vocalProfiles: 2, mixingJobs: 1 },
};
const trial = {
  id: "trial",
  userId: "guest-a72f1000-0000-0000-0000-000000000001",
  createdAt: now,
  consumedAt: now,
  expiresAt: null,
  claimedAt: now,
  claimedBy: { id: "member", name: "김하늘", email: "member@example.test" },
  job: null,
};

function Workspace({ children, mixing = false }: { children: ReactNode; mixing?: boolean }) {
  return (
    <main className="mx-auto w-full max-w-6xl bg-background p-6 sm:p-8">
      <ProductPageIntro eyebrow="Admin" title="운영 관리" description={ADMIN_DESCRIPTION} />
      <AdminNavigation current={mixing ? "mixing" : "users"} />
      <section className="mt-7">{children}</section>
    </main>
  );
}
const meta = {
  title: "Pages/Admin/Workspace",
  component: AdminMembersTable,
  args: { users: [user] },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AdminMembersTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Members: Story = {
  render: (args) => (
    <Workspace>
      <AdminAudienceTabs
        audience="members"
        members={1}
        guests={3}
        membersHref="/admin"
        guestsHref="/admin?audience=guests"
      >
        <AdminMembersTable {...args} />
      </AdminAudienceTabs>
    </Workspace>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(ADMIN_DESCRIPTION)).toBeVisible();
    await expect(canvas.getAllByRole("table")).toHaveLength(1);
    await expect(canvas.getByRole("button", { name: "김하늘 티켓 조정" })).toBeVisible();
    await userEvent.click(canvas.getByRole("tab", { name: /체험 방문자/ }));
    await expect(getRouter().push).toHaveBeenCalledWith("/admin?audience=guests", { scroll: false });
  },
};
export const Guests: Story = {
  render: () => (
    <Workspace>
      <AdminAudienceTabs
        audience="guests"
        members={1}
        guests={3}
        membersHref="/admin"
        guestsHref="/admin?audience=guests"
      >
        <AdminGuestsTable
          filters={parseAdminFilters({})}
          now={now}
          trials={[
            trial,
            {
              ...trial,
              id: "expired",
              userId: "guest-b18c4200",
              claimedAt: null,
              claimedBy: null,
              expiresAt: new Date(now.getTime() - 1),
            },
            {
              ...trial,
              id: "pending",
              userId: "guest-c93e2700",
              consumedAt: null,
              claimedAt: null,
              claimedBy: null,
              job: { id: "job", status: "PROCESSING", completedAt: null },
            },
          ]}
        />
      </AdminAudienceTabs>
    </Workspace>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("table")).toHaveLength(1);
    await expect(canvas.getByRole("link", { name: "김하늘에게 저장 ↗" })).toHaveAttribute(
      "href",
      "/admin?memberId=member",
    );
    await expect(canvas.getAllByText("보관 종료").length).toBeGreaterThan(0);
    await expect(canvas.getByText("처리 중")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: /티켓 조정/ })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("tab", { name: /^회원/ }));
    await expect(getRouter().push).toHaveBeenCalledWith("/admin", { scroll: false });
  },
};
export const Mixing: Story = {
  render: () => (
    <Workspace mixing>
      <AdminMixingTable
        jobs={[
          {
            id: "mix",
            status: "FAILED",
            ticketCost: 1,
            attempts: 2,
            errorCode: "MODAL_JOB_FAILED",
            createdAt: now,
            completedAt: now,
            user: { id: "member", name: "김하늘", email: "member@example.test" },
            song: { title: "계절의 끝", artist: "예시 가수" },
          },
        ]}
      />
    </Workspace>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("table")).toHaveLength(1);
    await userEvent.click(canvas.getByRole("button", { name: "계절의 끝 작업 상세" }));
    const dialog = within(await within(document.body).findByRole("dialog"));
    await waitFor(() => expect(dialog.getByText("MODAL_JOB_FAILED")).toBeVisible());
    await expect(dialog.queryByRole("link", { name: /재생|다운로드/ })).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
  },
};
export const EmptyMembers: Story = {
  args: { users: [] },
  render: (args) => (
    <Workspace>
      <AdminMembersTable {...args} />
    </Workspace>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/표시할 회원이 없어요/)).toBeVisible();
  },
};
