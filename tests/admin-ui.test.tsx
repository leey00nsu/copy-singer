import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { parseAdminFilters } from "../src/_pages/admin/model/filters";
import { AdminGuestsTable, AdminMembersTable, AdminMixingTable } from "../src/_pages/admin/ui/admin-tables";
import { TicketAdjustmentFields } from "../src/features/manage-tickets";
import { AdminNavigation } from "../src/widgets/admin-navigation";

test("admin adjustment form requires user, integer amount, and reason without audio controls", () => {
  const markup = renderToStaticMarkup(
    <TicketAdjustmentFields
      users={[
        {
          id: "user",
          name: "Singer",
          email: "singer@example.test",
          ticketWallets: [
            { kind: "VOCAL_ANALYSIS", balance: 3 },
            { kind: "AI_MIXING", balance: 1 },
          ],
        },
      ]}
    />,
  );
  assert.match(markup, /사용자/);
  assert.match(markup, /티켓 종류/);
  assert.match(markup, /분석 티켓/);
  assert.match(markup, /믹싱 티켓/);
  assert.match(markup, /조정량/);
  assert.match(markup, /사유/);
  assert.match(markup, /singer@example.test/);
  assert.doesNotMatch(markup, /<audio/);
  assert.doesNotMatch(markup, /externalUrl/);
});

test("admin menus preserve routes and identify exactly one current section", () => {
  const markup = renderToStaticMarkup(<AdminNavigation current="songs" />);
  for (const label of ["회원·체험", "믹싱 작업", "음원 관리", "커스텀 믹싱"]) assert.ok(markup.includes(label));
  for (const href of ["/admin", "/admin?tab=mixing", "/admin/songs", "/admin/custom-mixing"])
    assert.ok(markup.includes(href));
  assert.equal((markup.match(/aria-current="page"/g) ?? []).length, 1);
});

test("each admin list renders one table, with member actions or safe guest storage links", () => {
  const client = new QueryClient();
  const user = {
    id: "member",
    name: "Member",
    email: "member@example.test",
    createdAt: new Date(),
    ticketWallets: [{ kind: "VOCAL_ANALYSIS" as const, balance: 5 }],
    _count: { vocalProfiles: 1, mixingJobs: 0 },
  };
  const memberMarkup = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <AppRouterContext.Provider
        value={{
          back() {},
          bfcacheId: "admin-test",
          forward() {},
          prefetch() {},
          push() {},
          refresh() {},
          replace() {},
        }}
      >
        <AdminMembersTable users={[user]} />
      </AppRouterContext.Provider>
    </QueryClientProvider>,
  );
  assert.equal((memberMarkup.match(/<table/g) ?? []).length, 1);
  assert.match(memberMarkup, /Member 티켓 조정/);
  assert.doesNotMatch(memberMarkup, /<form/);
  const now = new Date();
  const trial = {
    id: "trial",
    userId: "guest-safe-id",
    createdAt: now,
    consumedAt: now,
    expiresAt: null,
    claimedAt: now,
    claimedBy: { id: "member", name: "Member", email: "member@example.test" },
    job: null,
  };
  const guestMarkup = renderToStaticMarkup(
    <AdminGuestsTable trials={[trial]} now={now} filters={parseAdminFilters({})} />,
  );
  assert.equal((guestMarkup.match(/<table/g) ?? []).length, 1);
  assert.match(guestMarkup, /Member에게 저장/);
  assert.match(guestMarkup, /memberId=member/);
  assert.doesNotMatch(guestMarkup, /티켓 조정|tokenHash|externalUrl|<audio/);
  assert.match(
    renderToStaticMarkup(<AdminGuestsTable trials={[]} now={now} filters={parseAdminFilters({})} />),
    /체험 기록이 없어요/,
  );
  const jobMarkup = renderToStaticMarkup(<AdminMixingTable jobs={[]} />);
  assert.equal((jobMarkup.match(/<table/g) ?? []).length, 1);
  assert.match(jobMarkup, /믹싱 작업이 없어요/);
  client.clear();
});
