import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { TicketLedger } from "../components/account/ticket-ledger";

test("ticket ledger renders grant, debit, balance, reason, and empty state", () => {
  const markup = renderToStaticMarkup(
    <TicketLedger
      entries={[
        {
          id: "grant",
          type: "SIGNUP_GRANT",
          amount: 1,
          balanceAfter: 1,
          reason: "회원가입 무료 티켓",
          createdAt: new Date("2026-08-06T00:00:00Z"),
        },
        {
          id: "debit",
          type: "MIXING_DEBIT",
          amount: -1,
          balanceAfter: 0,
          reason: "AI 믹싱",
          createdAt: new Date("2026-08-06T01:00:00Z"),
        },
      ]}
    />,
  );
  assert.match(markup, /가입 지급/);
  assert.match(markup, /AI 믹싱/);
  assert.match(markup, /\+1/);
  assert.match(markup, /-1/);

  assert.match(renderToStaticMarkup(<TicketLedger entries={[]} />), /티켓 내역이 없습니다/);
});
