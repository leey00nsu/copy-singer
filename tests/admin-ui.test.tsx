import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { TicketAdjustmentFields } from "../components/admin/ticket-adjustment-form";

test("admin adjustment form requires user, integer amount, and reason without audio controls", () => {
  const markup = renderToStaticMarkup(
    <TicketAdjustmentFields users={[{ id: "user", name: "Singer", email: "singer@example.test", ticketBalance: 1 }]} />,
  );
  assert.match(markup, /사용자/);
  assert.match(markup, /조정량/);
  assert.match(markup, /사유/);
  assert.match(markup, /singer@example.test/);
  assert.doesNotMatch(markup, /<audio/);
  assert.doesNotMatch(markup, /externalUrl/);
});
