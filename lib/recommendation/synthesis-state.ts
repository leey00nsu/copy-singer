import type { SynthesisStatus } from "./contract";

export type StoredSynthesisStatus = Uppercase<SynthesisStatus>;

export const SYNTHESIS_PRESET = Object.freeze({
  prompt_vocal_separation: false,
  target_vocal_separation: true,
  auto_pitch_shift: true,
  auto_mix_accompaniment: true,
  pitch_shift: 0,
  steps: 32,
  cfg: 1,
  seed: 42,
});

export type SynthesisAttempt = {
  jobId: string | null;
  status: SynthesisStatus;
  errorCode: string | null;
  errorDetail: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

const FORWARD_TRANSITIONS: Record<StoredSynthesisStatus, readonly StoredSynthesisStatus[]> = {
  PREPARING: ["QUEUED", "FAILED"],
  QUEUED: ["PROCESSING", "SUCCEEDED", "FAILED"],
  PROCESSING: ["SUCCEEDED", "FAILED"],
  SUCCEEDED: ["FAILED"],
  FAILED: ["PREPARING"],
};

export function toPublicSynthesisStatus(status: StoredSynthesisStatus): SynthesisStatus {
  return status.toLowerCase() as SynthesisStatus;
}

export function canTransitionSynthesis(current: StoredSynthesisStatus | null, next: StoredSynthesisStatus): boolean {
  if (current === null) return next === "PREPARING";
  if (current === next) return true;
  return FORWARD_TRANSITIONS[current].includes(next);
}

export function parseSynthesisAttempts(value: unknown): SynthesisAttempt[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is SynthesisAttempt => {
    if (!entry || typeof entry !== "object") return false;
    const attempt = entry as Partial<SynthesisAttempt>;
    return (
      (attempt.jobId === null || typeof attempt.jobId === "string") &&
      typeof attempt.status === "string" &&
      ["preparing", "queued", "processing", "succeeded", "failed"].includes(attempt.status) &&
      (attempt.errorCode === null || typeof attempt.errorCode === "string") &&
      (attempt.errorDetail === null || typeof attempt.errorDetail === "string") &&
      (attempt.startedAt === null || typeof attempt.startedAt === "string") &&
      (attempt.completedAt === null || typeof attempt.completedAt === "string")
    );
  });
}

export function appendSynthesisAttempt(history: unknown, attempt: SynthesisAttempt): SynthesisAttempt[] {
  return [...parseSynthesisAttempts(history), attempt];
}
