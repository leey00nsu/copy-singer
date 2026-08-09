import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountOverview } from "@/_pages/account";

const account = {
  balance: 2,
  page: 1,
  pageCount: 2,
  total: 1,
  entries: [
    {
      id: "ticket-entry",
      type: "MIXING_DEBIT" as const,
      amount: -1,
      balanceAfter: 2,
      reason: "AI 믹싱",
      mixingJobId: "30000000-0000-4000-8000-000000000002",
      createdAt: new Date("2026-08-09T03:00:00.000Z"),
    },
  ],
};

test("account overview renders actual identity, provider, ticket data, and safe product links", () => {
  const html = renderToStaticMarkup(
    <AccountOverview
      account={account}
      admin
      authentication={{ googleConnected: true, googleConnectedAt: new Date("2026-08-08T00:00:00.000Z") }}
      user={{ email: "jieun@copysinger.test", name: "지은" }}
    />,
  );
  assert.match(html, /Google 연결됨/);
  assert.match(html, /jieun@copysinger\.test/);
  assert.match(html, /사용 가능한 티켓/);
  assert.match(html, /href="\/library"/);
  assert.match(html, /href="\/admin"/);
  assert.match(html, /href="\/library\/mixes\/30000000-0000-4000-8000-000000000002"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /href="\/account\?page=2"/);
  assert.doesNotMatch(html, /요금제|구독|비밀번호|알림|테마/);
});

test("account empty state omits pagination and does not invent a Google connection", () => {
  const html = renderToStaticMarkup(
    <AccountOverview
      account={{ ...account, balance: 0, entries: [], pageCount: 1, total: 0 }}
      authentication={{ googleConnected: false, googleConnectedAt: null }}
      user={{ email: "dev@copysinger.test", name: "개발 사용자" }}
    />,
  );
  assert.match(html, /Google 연결 정보 없음/);
  assert.match(html, /티켓 내역이 없습니다/);
  assert.doesNotMatch(html, /티켓 내역 페이지/);
  assert.doesNotMatch(html, /href="\/admin"/);
});
