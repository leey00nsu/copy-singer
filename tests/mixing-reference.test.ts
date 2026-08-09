import assert from "node:assert/strict";
import test from "node:test";
import { selectMixingReference } from "../lib/mixing/reference";
import { SMART_REFERENCE_MID_VERSION, SMART_REFERENCE_VERSION } from "../src/entities/vocal-profile";

const source = { id: "source", userId: "owner", kind: "REFERENCE", status: "READY" };
const smart = { id: "smart", userId: "owner", kind: "SYNTHESIS_REFERENCE", status: "READY" };

test("profiles snapshot the ready smart synthesis reference", () => {
  assert.equal(
    selectMixingReference({ userId: "owner", smart, source, contractVersion: SMART_REFERENCE_MID_VERSION })?.id,
    "smart",
  );
  assert.equal(
    selectMixingReference({ userId: "owner", smart, source, contractVersion: SMART_REFERENCE_VERSION })?.id,
    "smart",
  );
});

test("mid-only profiles reject source fallback when smart reference is unavailable", () => {
  assert.equal(
    selectMixingReference({ userId: "owner", smart: null, source, contractVersion: SMART_REFERENCE_MID_VERSION }),
    null,
  );
  assert.equal(
    selectMixingReference({
      userId: "owner",
      smart: { ...smart, status: "DELETE_PENDING" },
      source,
      contractVersion: SMART_REFERENCE_MID_VERSION,
    }),
    null,
  );
  assert.equal(
    selectMixingReference({
      userId: "owner",
      smart: { ...smart, userId: "other" },
      source,
      contractVersion: SMART_REFERENCE_MID_VERSION,
    }),
    null,
  );
});

test("legacy and smart-reference-v1 profiles keep source fallback", () => {
  assert.equal(selectMixingReference({ userId: "owner", smart: null, source })?.id, "source");
  assert.equal(
    selectMixingReference({ userId: "owner", smart: null, source, contractVersion: SMART_REFERENCE_VERSION })?.id,
    "source",
  );
  assert.equal(
    selectMixingReference({ userId: "owner", smart: { ...smart, status: "DELETE_PENDING" }, source })?.id,
    "source",
  );
  assert.equal(selectMixingReference({ userId: "owner", smart: { ...smart, userId: "other" }, source })?.id, "source");
});

test("mixing rejects references not owned by the requester", () => {
  assert.equal(
    selectMixingReference({ userId: "other", smart, source, contractVersion: SMART_REFERENCE_MID_VERSION }),
    null,
  );
});
