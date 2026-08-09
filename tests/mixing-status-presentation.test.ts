import assert from "node:assert/strict";
import test from "node:test";
import { type MixingHistoryRow, presentMixingJob } from "@/entities/mixing-job";

const base: MixingHistoryRow = {
  id: "30000000-0000-4000-8000-000000000001",
  status: "pending",
  ticketCost: 1,
  error: null,
  song: { title: "밤편지", artist: "아이유", catalogOrder: 101 },
  vocalProfile: { id: "30000000-0000-4000-8000-000000000011", createdAt: "2026-08-09T00:00:00.000Z" },
  resultReady: false,
  audioUrl: null,
  createdAt: "2026-08-09T03:00:00.000Z",
  updatedAt: "2026-08-09T03:00:00.000Z",
  submittedAt: null,
  startedAt: null,
  completedAt: null,
};

test("presents only the server mixing states without fabricated percentage progress", () => {
  const pending = presentMixingJob(base);
  assert.equal(pending.active, true);
  assert.equal(pending.timeline[0]?.state, "current");
  assert.equal(pending.timeline[1]?.state, "upcoming");
  assert.doesNotMatch(JSON.stringify(pending), /\d+%/);

  const submitted = presentMixingJob({ ...base, status: "submitted", submittedAt: base.updatedAt });
  assert.equal(submitted.timeline[0]?.state, "complete");
  assert.equal(submitted.timeline[1]?.state, "current");

  const processing = presentMixingJob({
    ...base,
    status: "processing",
    submittedAt: base.updatedAt,
    startedAt: base.updatedAt,
  });
  assert.equal(processing.timeline[1]?.state, "complete");
  assert.equal(processing.timeline[2]?.state, "current");
});

test("terminal presentation preserves achieved timestamps and skips unobserved stages", () => {
  const failed = presentMixingJob({
    ...base,
    status: "failed",
    error: { code: "REFERENCE_FETCH_FAILED", detail: "보컬 파일을 읽지 못했습니다." },
    completedAt: base.updatedAt,
  });
  assert.equal(failed.active, false);
  assert.equal(failed.terminal, true);
  assert.equal(failed.tone, "destructive");
  assert.equal(failed.timeline[0]?.state, "reached");
  assert.equal(failed.timeline[1]?.state, "skipped");
  assert.equal(failed.timeline[2]?.state, "skipped");
  assert.equal(failed.timeline[3]?.label, "실패");
  assert.equal(failed.description, "보컬 파일을 읽지 못했습니다.");

  const succeeded = presentMixingJob({
    ...base,
    status: "succeeded",
    resultReady: true,
    audioUrl: `/api/mixing-jobs/${base.id}/audio`,
    submittedAt: base.updatedAt,
    startedAt: base.updatedAt,
    completedAt: base.updatedAt,
  });
  assert.deepEqual(
    succeeded.timeline.map((step) => step.state),
    ["complete", "complete", "complete", "complete"],
  );
  assert.equal(succeeded.tone, "success");
});
