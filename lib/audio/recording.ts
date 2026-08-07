export const MAX_VOCAL_PROFILE_RECORDING_MS = 60_000;

export function recorderExtension(mimeType: string) {
  return mimeType.includes("mp4") || mimeType.includes("aac") ? "m4a" : "webm";
}

export function shouldStopRecording(elapsedMs: number, maxDurationMs = MAX_VOCAL_PROFILE_RECORDING_MS) {
  return Number.isFinite(elapsedMs) && elapsedMs >= maxDurationMs;
}
