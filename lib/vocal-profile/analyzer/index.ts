import "server-only";

import { hasSmartReferenceContract } from "@/lib/vocal-profile/contract";
import { analyzeWithLocalAdapter, localAnalyzerHealth } from "./local-adapter";
import { analyzeWithModalAdapter, modalAnalyzerHealth } from "./modal-adapter";
import { AnalyzerClientError, type AnalyzeVocalProfileInput } from "./types";

export { AnalyzerClientError } from "./types";
export type { AnalyzedRecording, AnalyzerArtifact } from "./types";

export type VocalProfileAnalyzerBackend = "local" | "modal";

export function vocalProfileAnalyzerBackend(): VocalProfileAnalyzerBackend {
  const value = process.env.VOCAL_PROFILE_ANALYZER_BACKEND?.trim().toLowerCase();
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new AnalyzerClientError(
        "ANALYZER_NOT_CONFIGURED",
        "VOCAL_PROFILE_ANALYZER_BACKEND must be explicitly configured in production.",
        false,
        503,
      );
    }
    return "local";
  }
  if (value === "local" || value === "modal") return value;
  throw new AnalyzerClientError(
    "ANALYZER_NOT_CONFIGURED",
    "VOCAL_PROFILE_ANALYZER_BACKEND must be local or modal.",
    false,
    503,
  );
}

export async function analyzeVocalProfile(input: AnalyzeVocalProfileInput) {
  const analyzed = vocalProfileAnalyzerBackend() === "modal"
    ? await analyzeWithModalAdapter(input)
    : await analyzeWithLocalAdapter(input);
  if (analyzed.profile.recordingId !== input.recordingId) {
    throw new AnalyzerClientError(
      "ANALYSIS_FAILED",
      "Analyzer returned an invalid recording ID.",
      true,
      502,
    );
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
  const backend = vocalProfileAnalyzerBackend();
  const health = backend === "modal"
    ? await modalAnalyzerHealth(fetchImpl)
    : await localAnalyzerHealth(fetchImpl);
  return { backend, health };
}
