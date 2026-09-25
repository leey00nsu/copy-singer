import assert from "node:assert/strict";
import test from "node:test";
import { dispatchKnowledge, koreanCycle } from "../ops/knowledge-dispatcher/dispatch.mjs";

const due = new Date("2026-09-25T04:30:00Z");
const response = (value, status = 200) => ({ ok: status < 400, status, json: async () => value });

test("uses the Korean calendar date and waits until 01:17", async () => {
  assert.deepEqual(koreanCycle(new Date("2026-09-24T16:16:00Z")), {
    date: "2026-09-25",
    due: false,
  });
  assert.deepEqual(await dispatchKnowledge({ now: new Date("2026-09-24T16:16:00Z") }), {
    outcome: "before-due",
    cycle: "2026-09-25",
  });
});

test("dispatches once with a reviewable run identifier", async () => {
  const requests = [];
  const result = await dispatchKnowledge({
    now: due,
    token: "test-token",
    request: async (url, init) => {
      requests.push({ url, init });
      return response(
        requests.length === 1
          ? { workflow_runs: [] }
          : {
              workflow_run_id: 42,
              html_url: "https://github.com/example/actions/runs/42",
            },
      );
    },
  });
  assert.equal(result.outcome, "dispatched");
  assert.equal(result.cycle, "2026-09-25");
  assert.equal(result.runId, 42);
  assert.equal(requests.length, 2);
  assert.deepEqual(JSON.parse(requests[1].init.body), {
    ref: "main",
    inputs: { cycle: "2026-09-25" },
  });
});

test("does not duplicate an existing cycle or overlap an active run", async () => {
  for (const run of [
    { display_title: "OpenWiki Knowledge 2026-09-25", status: "completed" },
    { event: "workflow_dispatch", status: "in_progress" },
  ]) {
    let calls = 0;
    const result = await dispatchKnowledge({
      now: due,
      token: "test-token",
      request: async () => {
        calls += 1;
        return response({ workflow_runs: [run] });
      },
    });
    assert.notEqual(result.outcome, "dispatched");
    assert.equal(calls, 1);
  }
});

test("treats a successful empty dispatch response as accepted", async () => {
  let calls = 0;
  const result = await dispatchKnowledge({
    now: due,
    token: "test-token",
    request: async () => {
      calls += 1;
      return calls === 1
        ? response({ workflow_runs: [] })
        : {
            ok: true,
            status: 204,
            json: async () => {
              throw new Error("no body");
            },
          };
    },
  });
  assert.deepEqual(result, { outcome: "accepted", cycle: "2026-09-25" });
  assert.equal(calls, 2);
});

test("fails visibly when GitHub does not accept the dispatch", async () => {
  let calls = 0;
  await assert.rejects(
    dispatchKnowledge({
      now: due,
      token: "test-token",
      request: async () => {
        calls += 1;
        return calls === 1 ? response({ workflow_runs: [] }) : response({}, 503);
      },
    }),
    /HTTP 503/,
  );
});
