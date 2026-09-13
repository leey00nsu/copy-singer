import assert from "node:assert/strict";
import test from "node:test";
import {
  AdmissionError,
  admissionResponse,
  requestPolicy,
  TokenBuckets,
  trustedClientIp,
  UploadSlots,
} from "../src/shared/lib/admission/limiter";

test("burst admission is bounded and normal polling can continue", () => {
  let now = 0;
  const buckets = new TokenBuckets(10, () => now);
  for (let i = 0; i < 3; i++) buckets.take("user:submit", 6, 3);
  assert.throws(() => buckets.take("user:submit", 6, 3), AdmissionError);
  now = 10_000;
  buckets.take("user:submit", 6, 3);
  for (let i = 0; i < 1000; i++) {
    buckets.take("user:read", 180, 60);
    now += 1500;
  }
  assert.equal(requestPolicy("/api/vocal-profiles/one/audio", "GET").group, "audio");
  assert.equal(requestPolicy("/api/vocal-profile-analysis-jobs", "POST").group, "submission");
  const response = admissionResponse(new AdmissionError("RATE_LIMITED", 429, 10));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "10");
});

test("upload slots release on failure and forwarded IP is ignored by default", () => {
  const previous = process.env.TRUST_PROXY_CLIENT_IP;
  process.env.TRUST_PROXY_CLIENT_IP = "false";
  try {
    assert.equal(trustedClientIp(new Headers({ "X-Forwarded-For": "1.2.3.4" })), null);
  } finally {
    if (previous === undefined) delete process.env.TRUST_PROXY_CLIENT_IP;
    else process.env.TRUST_PROXY_CLIENT_IP = previous;
  }
  const slots = new UploadSlots();
  const release = slots.acquire("one");
  assert.throws(() => slots.acquire("one"), AdmissionError);
  release();
  slots.acquire("one")();
});
