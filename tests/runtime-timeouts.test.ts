import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { positiveInteger } from "../src/shared/lib/runtime/limits";
import { boundedFetch, withDeadline } from "../src/shared/lib/runtime/timeout";

test("deadline cancels a pending operation and forwards parent abort", async () => {
  const wait = (signal: AbortSignal) =>
    new Promise<void>((_, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  await assert.rejects(withDeadline(10, wait), { name: "TimeoutError" });
  const parent = new AbortController();
  const pending = withDeadline(60_000, wait, parent.signal);
  parent.abort();
  await assert.rejects(pending, { name: "AbortError" });
});

test("HTTP body cannot hang after headers arrive", async () => {
  const server = createServer((_, response) => {
    response.writeHead(200);
    response.write("partial");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const response = await boundedFetch(`http://127.0.0.1:${address.port}`, {}, 50);
    await assert.rejects(response.text());
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("runtime integer settings reject invalid resource budgets", () => {
  process.env.READINESS_TEST_LIMIT = "0";
  try {
    assert.throws(() => positiveInteger("READINESS_TEST_LIMIT", 5));
  } finally {
    delete process.env.READINESS_TEST_LIMIT;
  }
});
