import "server-only";

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
  return vocalProfileAnalyzerBackend() === "modal"
    ? analyzeWithModalAdapter(input)
    : analyzeWithLocalAdapter(input);
}

export async function vocalProfileAnalyzerHealth(fetchImpl: typeof fetch = fetch) {
  const backend = vocalProfileAnalyzerBackend();
  const health = backend === "modal"
    ? await modalAnalyzerHealth(fetchImpl)
    : await localAnalyzerHealth(fetchImpl);
  return { backend, health };
}
