import "server-only";

import type { AnalyzerProfileData, VocalProfileError } from "@/lib/vocal-profile/contract";

export type AnalyzerArtifact = {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
};

export type AnalyzedRecording = {
  profile: AnalyzerProfileData;
  source: AnalyzerArtifact;
  synthesisReference: AnalyzerArtifact | null;
};

export type AnalyzeVocalProfileInput = {
  recordingId: string;
  contentType: string;
  body: ReadableStream<Uint8Array>;
  fetchImpl?: typeof fetch;
};

export class AnalyzerClientError extends Error {
  constructor(
    readonly reasonCode: string,
    readonly detail: string,
    readonly retryable: boolean,
    readonly status: number,
  ) {
    super(detail);
    this.name = "AnalyzerClientError";
  }
}

export async function analyzerErrorFromResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as Partial<VocalProfileError> | null;
  const reasonCode = typeof payload?.reasonCode === "string" ? payload.reasonCode : "ANALYZER_UNAVAILABLE";
  const detail =
    typeof payload?.detail === "string" ? payload.detail : `Vocal analyzer request failed (${response.status}).`;
  const retryable =
    typeof payload?.retryable === "boolean" ? payload.retryable : response.status === 429 || response.status >= 500;
  return new AnalyzerClientError(reasonCode, detail, retryable, response.status);
}

export function audioExtension(mimeType: string) {
  if (mimeType === "audio/mp4" || mimeType === "audio/aac" || mimeType === "audio/x-m4a") return "m4a";
  if (mimeType === "audio/webm") return "webm";
  if (mimeType === "audio/mpeg") return "mp3";
  return "wav";
}
