import "server-only";

import { hasSmartReferenceContract } from "../../model/contract";
import { analyzeWithModalAdapter, modalAnalyzerHealth } from "./modal-adapter";
import { AnalyzerClientError, type AnalyzeVocalProfileInput } from "./types";

export { analyzeWithModalAdapter } from "./modal-adapter";
export type { AnalyzedRecording, AnalyzerArtifact } from "./types";
export { AnalyzerClientError } from "./types";

export async function analyzeVocalProfile(input: AnalyzeVocalProfileInput) {
  const analyzed = await analyzeWithModalAdapter(input);
  if (analyzed.profile.recordingId !== input.recordingId) {
    throw new AnalyzerClientError("ANALYSIS_FAILED", "Analyzer returned an invalid recording ID.", true, 502);
  }
  if (!hasSmartReferenceContract(analyzed.profile)) {
    throw new AnalyzerClientError(
      "ANALYZER_UPDATE_REQUIRED",
      "The configured vocal analyzer does not support the required smart reference contract.",
      false,
      502,
    );
  }
  return analyzed;
}

export async function analyzeVocalProfileBytes(input: {
  recordingId: string;
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
  fetchImpl?: typeof fetch;
}) {
  const form = new FormData();
  form.append("audio", new Blob([Uint8Array.from(input.bytes)], { type: input.mimeType }), input.fileName);
  const request = new Request("http://copy-singer.internal/vocal-profile-analysis", {
    method: "POST",
    body: form,
  });
  const contentType = request.headers.get("content-type");
  if (!contentType || !request.body) {
    throw new AnalyzerClientError("ANALYSIS_FAILED", "Could not prepare analyzer upload.", true, 500);
  }
  return analyzeVocalProfile({
    recordingId: input.recordingId,
    contentType,
    body: request.body,
    fetchImpl: input.fetchImpl,
  });
}

export async function vocalProfileAnalyzerHealth(fetchImpl: typeof fetch = fetch) {
  return { backend: "modal" as const, health: await modalAnalyzerHealth(fetchImpl) };
}
