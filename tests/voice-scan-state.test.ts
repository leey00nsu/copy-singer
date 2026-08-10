import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canAnalyzeVoiceScan,
  MIN_VOICE_SCAN_DURATION_MS,
  RECOMMENDED_VOICE_SCAN_DURATION_MS,
  recorderIssueFromError,
  recordingMilestone,
  resolveAnalysisStage,
} from "../src/_pages/profile/model/voice-scan";
import type { VocalProfileAnalysisJobResponse } from "../src/entities/vocal-profile";

const job: VocalProfileAnalysisJobResponse = {
  id: "10000000-0000-4000-8000-000000000001",
  status: "pending",
  vocalProfileId: null,
  attempts: 0,
  maxAttempts: 3,
  error: null,
  createdAt: "2026-08-09T00:00:00.000Z",
  updatedAt: "2026-08-09T00:00:00.000Z",
};

test("voice scan keeps 5 seconds as the minimum and 10 seconds as a recommendation", () => {
  assert.equal(MIN_VOICE_SCAN_DURATION_MS, 5_000);
  assert.equal(RECOMMENDED_VOICE_SCAN_DURATION_MS, 10_000);
  assert.equal(recordingMilestone(4_999), "minimum");
  assert.equal(recordingMilestone(5_000), "analyzable");
  assert.equal(recordingMilestone(9_999), "analyzable");
  assert.equal(recordingMilestone(10_000), "recommended");
  assert.equal(canAnalyzeVoiceScan(4.999), false);
  assert.equal(canAnalyzeVoiceScan(5), true);
  assert.equal(canAnalyzeVoiceScan(null), true);
});

test("recorder errors distinguish permission, device, browser support, and unknown failures", () => {
  assert.equal(recorderIssueFromError({ name: "NotAllowedError" }).kind, "permission_denied");
  assert.equal(recorderIssueFromError({ name: "NotFoundError" }).kind, "device_unavailable");
  assert.equal(recorderIssueFromError(new Error("MEDIA_RECORDER_UNAVAILABLE")).kind, "unsupported");
  assert.equal(recorderIssueFromError(new Error("unexpected")).kind, "unknown");
});

test("analysis presentation follows durable job states without fabricated progress", () => {
  assert.equal(resolveAnalysisStage({ error: null, job: null, requestError: null, submitting: true }), "submitting");
  assert.equal(resolveAnalysisStage({ error: null, job, requestError: null, submitting: false }), "pending");
  assert.equal(
    resolveAnalysisStage({ error: null, job: { ...job, status: "processing" }, requestError: null, submitting: false }),
    "processing",
  );
  assert.equal(
    resolveAnalysisStage({
      error: null,
      job: { ...job, attempts: 1, error: { reasonCode: "TEMPORARY", detail: "retry", retryable: true } },
      requestError: null,
      submitting: false,
    }),
    "retrying",
  );
  assert.equal(
    resolveAnalysisStage({
      error: null,
      job,
      requestError: { reasonCode: "NETWORK", detail: "offline", retryable: true },
      submitting: false,
    }),
    "reconnecting",
  );
  assert.equal(
    resolveAnalysisStage({
      error: { reasonCode: "FAILED", detail: "failed", retryable: false },
      job,
      requestError: null,
      submitting: false,
    }),
    "failed",
  );
  assert.equal(
    resolveAnalysisStage({ error: null, job: { ...job, status: "succeeded" }, requestError: null, submitting: false }),
    null,
  );
});

test("voice scan components keep media cleanup, responsibility split, and detail navigation", async () => {
  const [recorder, workbench] = await Promise.all([
    readFile("src/_pages/profile/ui/vocal-profile-recorder.tsx", "utf8"),
    readFile("src/_pages/profile/ui/vocal-profile-workbench.tsx", "utf8"),
  ]);
  assert.match(recorder, /requesting_permission/);
  assert.match(recorder, /stopping/);
  assert.match(recorder, /plugin\.stopMic\(\)/);
  assert.match(recorder, /plugin\.destroy\(\)/);
  assert.match(recorder, /canceledRef/);
  assert.match(recorder, /plugin\.startMic\(/);
  assert.match(recorder, /mediaRecorderTimeslice:\s*100/);
  assert.match(recorder, /createMediaStreamSource\(stream\)/);
  assert.match(recorder, /createAnalyser\(\)/);
  assert.match(recorder, /requestAnimationFrame\(render\)/);
  assert.match(recorder, /history\.push\(/);
  assert.match(recorder, /slotWidth \* index/);
  assert.match(recorder, /--data-accent/);
  assert.doesNotMatch(recorder, /useWavesurfer/);
  assert.match(workbench, /<VoiceScanInput/);
  assert.match(workbench, /<AnalysisStatus/);
  assert.match(workbench, /router\.replace\(`\/vocal-profiles\/\$\{completedProfileId\}`\)/);
  assert.doesNotMatch(workbench, /VocalProfileResults|createRecommendation|deleteVocalProfile/);
});
