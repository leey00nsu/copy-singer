import assert from "node:assert/strict";
import test from "node:test";
import { selectMixingReference } from "../lib/mixing/reference";

const source = { id: "source", userId: "owner", kind: "REFERENCE", status: "READY" };
const smart = { id: "smart", userId: "owner", kind: "SYNTHESIS_REFERENCE", status: "READY" };

test("new profiles snapshot the ready smart synthesis reference", () => {
  assert.equal(selectMixingReference({ userId: "owner", smart, source })?.id, "smart");
});

test("legacy and unavailable smart references fall back to the analysis source", () => {
  assert.equal(selectMixingReference({ userId: "owner", smart: null, source })?.id, "source");
  assert.equal(selectMixingReference({ userId: "owner", smart: { ...smart, status: "DELETE_PENDING" }, source })?.id, "source");
  assert.equal(selectMixingReference({ userId: "owner", smart: { ...smart, userId: "other" }, source })?.id, "source");
});

test("mixing rejects references not owned by the requester", () => {
  assert.equal(selectMixingReference({ userId: "other", smart, source }), null);
});
