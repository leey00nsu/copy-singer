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

test("account overview renders actual identity, provider, ticket data without shortcut actions", () => {
  const html = renderToStaticMarkup(
    <AccountOverview
      account={account}
      admin
      authentication={{ googleConnected: true, googleConnectedAt: new Date("2026-08-08T00:00:00.000Z") }}
      user={{ email: "jieun@copysinger.test", name: "지은" }}
    />,
  );
  assert.doesNotMatch(html, /Google 연결됨|Google 연결 정보 없음/);
  assert.match(html, /로그인 방식/);
  assert.match(html, /lucide-user-round/);
  assert.match(html, /lucide-mail/);
  assert.match(html, /lucide-log-in/);
  assert.match(html, />Google</);
  assert.match(html, /jieun@copysinger\.test/);
  assert.match(html, /사용 가능한 티켓/);
  assert.doesNotMatch(html, /href="\/library"/);
  assert.doesNotMatch(html, /href="\/profile"/);
  assert.doesNotMatch(html, /href="\/admin"/);
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
  assert.doesNotMatch(html, /Google 연결됨|Google 연결 정보 없음/);
  assert.match(html, /현재 세션/);
  assert.match(html, /아직 티켓 내역이 없어요/);
  assert.doesNotMatch(html, /티켓 내역 페이지/);
  assert.doesNotMatch(html, /href="\/admin"/);
});
