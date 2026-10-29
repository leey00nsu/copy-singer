import assert from "node:assert/strict";
import test from "node:test";
import { GuestAnalysisQuota } from "../src/shared/lib/admission/guest-quota";
import { AdmissionError } from "../src/shared/lib/admission/limiter";

test("only ten simultaneous reservations fit; release and commit settle once", async () => {
  const quota = new GuestAnalysisQuota();
  const attempts = await Promise.allSettled(Array.from({ length: 25 }, async () => quota.reserve(10)));
  const accepted = attempts.filter((result) => result.status === "fulfilled");
  assert.equal(accepted.length, 10);
  const first = accepted[0]!;
  first.value.release();
  first.value.release();
  const next = quota.reserve(10);
  next.commit();
  next.release();
  assert.throws(
    () => quota.reserve(10),
    (error) => error instanceof AdmissionError && error.code === "GUEST_ANALYSIS_DAILY_LIMIT",
  );
});

test("Korean midnight resets quota without applying old releases to the new day", () => {
  let now = Date.parse("2026-10-29T14:59:59Z");
  const quota = new GuestAnalysisQuota(() => now);
  const old = quota.reserve(1);
  assert.equal(quota.policy(1).retryAfter, 1);
  now += 1_000;
  quota.reserve(1).commit();
  old.release();
  assert.equal(quota.policy(1).available, false);
  assert.equal(quota.policy(1).retryAfter, 86_400);
});

test("zero pauses admission, a fresh process counter starts empty", () => {
  const quota = new GuestAnalysisQuota();
  assert.throws(() => quota.reserve(0), AdmissionError);
  quota.reserve(1).commit();
  assert.equal(quota.policy(1).available, false);
  assert.equal(new GuestAnalysisQuota().policy(1).available, true);
});
