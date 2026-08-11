import assert from "node:assert/strict";
import test from "node:test";
import { type MixingHistoryRow, presentMixingJob } from "@/entities/mixing-job";

const base: MixingHistoryRow = {
  id: "30000000-0000-4000-8000-000000000001",
  status: "pending",
  ticketCost: 1,
  error: null,
  song: { title: "밤편지", artist: "아이유", catalogOrder: 101 },
  vocalProfile: {
    id: "30000000-0000-4000-8000-000000000011",
    displayName: "보컬 프로필 1",
    createdAt: "2026-08-09T00:00:00.000Z",
  },
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
  assert.equal(failed.description, "제출한 보컬을 불러오지 못했어요. 보컬 프로필을 확인한 뒤 다시 시도해주세요.");
  assert.doesNotMatch(failed.description, /보컬 파일을 읽지 못했습니다/);

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

test("failed mixing presentation never exposes unknown upstream detail", () => {
  const failed = presentMixingJob({
    ...base,
    status: "failed",
    error: { code: "UNKNOWN_UPSTREAM_FAILURE", detail: "fetch failed from gpu.internal (502)" },
    completedAt: base.updatedAt,
  });

  assert.equal(failed.description, "믹싱 작업을 완료하지 못했어요. 상세 화면에서 다시 시도할 수 있습니다.");
  assert.doesNotMatch(failed.description, /gpu|502|fetch failed/);
});
