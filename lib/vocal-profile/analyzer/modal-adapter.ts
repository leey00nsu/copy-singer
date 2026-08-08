import "server-only";

import { createHash } from "node:crypto";
import type { AnalyzerProfileData } from "@/lib/vocal-profile/contract";
import {
  AnalyzerClientError,
  analyzerErrorFromResponse,
  type AnalyzeVocalProfileInput,
  type AnalyzerArtifact,
  type AnalyzedRecording,
} from "./types";

const MODAL_TRANSPORT_VERSION = "modal-analysis-envelope-v1";
const MODAL_REQUEST_TIMEOUT_MS = 120_000;

type EncodedArtifact = {
  fileName?: unknown;
  mimeType?: unknown;
  sizeBytes?: unknown;
  sha256?: unknown;
  contentBase64?: unknown;
};

type ModalAnalysisEnvelope = {
  transportVersion?: unknown;
  profile?: unknown;
  artifacts?: {
    source?: EncodedArtifact;
    synthesisReference?: EncodedArtifact | null;
  };
  cleanupConfirmed?: unknown;
};

function modalAnalyzerConfig() {
  const url = process.env.VOCAL_PROFILE_MODAL_URL?.trim().replace(/\/$/, "");
  const apiKey = process.env.VOCAL_PROFILE_MODAL_API_KEY?.trim() || process.env.MODAL_API_KEY?.trim();
  if (!url || !apiKey) {
    throw new AnalyzerClientError(
      "ANALYZER_NOT_CONFIGURED",
      "Modal vocal analyzer URL and server API key are required.",
      false,
      503,
    );
  }
  return { url, apiKey };
}

function decodeArtifact(value: EncodedArtifact | undefined, label: string): AnalyzerArtifact {
  if (
    !value
    || typeof value.fileName !== "string"
    || typeof value.mimeType !== "string"
    || typeof value.sizeBytes !== "number"
    || typeof value.sha256 !== "string"
    || typeof value.contentBase64 !== "string"
  ) {
    throw new AnalyzerClientError(
      "ANALYZER_INVALID_RESPONSE",
      `Modal analyzer returned an invalid ${label} artifact.`,
      true,
      502,
    );
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(Buffer.from(value.contentBase64, "base64"));
  } catch {
    throw new AnalyzerClientError(
      "ANALYZER_INVALID_RESPONSE",
      `Modal analyzer returned invalid ${label} bytes.`,
      true,
      502,
    );
  }
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (bytes.byteLength !== value.sizeBytes || digest !== value.sha256) {
    throw new AnalyzerClientError(
      "ANALYZER_INVALID_RESPONSE",
      `Modal analyzer ${label} artifact failed integrity validation.`,
      true,
      502,
    );
  }
  return { bytes, mimeType: value.mimeType, fileName: value.fileName };
}

function parseEnvelope(payload: unknown, recordingId: string): AnalyzedRecording {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AnalyzerClientError("ANALYZER_INVALID_RESPONSE", "Modal analyzer returned an invalid response.", true, 502);
  }
  const envelope = payload as ModalAnalysisEnvelope;
  if (envelope.transportVersion !== MODAL_TRANSPORT_VERSION || envelope.cleanupConfirmed !== true) {
    throw new AnalyzerClientError(
      "ANALYZER_INVALID_RESPONSE",
      "Modal analyzer transport or cleanup contract is incompatible.",
      true,
      502,
    );
  }
  if (!envelope.profile || typeof envelope.profile !== "object" || Array.isArray(envelope.profile)) {
    throw new AnalyzerClientError("ANALYZER_INVALID_RESPONSE", "Modal analyzer profile is missing.", true, 502);
  }
  const profile = envelope.profile as AnalyzerProfileData;
  if (profile.recordingId !== recordingId) {
    throw new AnalyzerClientError("ANALYSIS_FAILED", "Analyzer returned an invalid recording ID.", true, 502);
  }

  const source = decodeArtifact(envelope.artifacts?.source, "source");
  const encodedReference = envelope.artifacts?.synthesisReference;
  const synthesisReference = encodedReference ? decodeArtifact(encodedReference, "synthesis reference") : null;
  if (source.mimeType !== profile.mimeType || source.bytes.byteLength !== profile.sizeBytes) {
    throw new AnalyzerClientError(
      "ANALYZER_INVALID_RESPONSE",
      "Modal analyzer source metadata does not match the profile.",
      true,
      502,
    );
  }
  if (profile.synthesisReference) {
    if (
      !synthesisReference
      || synthesisReference.mimeType !== profile.synthesisReference.mimeType
      || synthesisReference.bytes.byteLength !== profile.synthesisReference.sizeBytes
    ) {
      throw new AnalyzerClientError(
        "ANALYZER_INVALID_RESPONSE",
        "Modal analyzer synthesis reference metadata does not match the profile.",
        true,
        502,
      );
    }
  } else if (synthesisReference) {
    throw new AnalyzerClientError(
      "ANALYZER_INVALID_RESPONSE",
      "Modal analyzer returned an unexpected synthesis reference artifact.",
      true,
      502,
    );
  }

  return { profile, source, synthesisReference };
}

function modalInfrastructureError(error: unknown) {
  if (error instanceof AnalyzerClientError) return error;
  const isTimeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
  return new AnalyzerClientError(
    isTimeout ? "ANALYZER_TIMEOUT" : "ANALYZER_UNAVAILABLE",
    isTimeout ? "Modal vocal analysis timed out." : "Modal vocal analyzer is unavailable.",
    true,
    502,
  );
}

function mapModalHttpError(response: Response) {
  if (response.status === 401 || response.status === 403) {
    return new AnalyzerClientError(
      "ANALYZER_AUTH_FAILED",
      "Modal vocal analyzer authentication failed.",
      false,
      502,
    );
  }
  if (response.status === 429) {
    return new AnalyzerClientError("ANALYZER_BUSY", "Modal vocal analyzer is busy. Try again shortly.", true, 503);
  }
  if (response.status >= 500) {
    return new AnalyzerClientError(
      "ANALYZER_UNAVAILABLE",
      "Modal vocal analyzer is unavailable.",
      true,
      502,
    );
  }
  return null;
}

export async function analyzeWithModalAdapter(input: AnalyzeVocalProfileInput): Promise<AnalyzedRecording> {
  const config = modalAnalyzerConfig();
  const fetchImpl = input.fetchImpl ?? fetch;
  const upstreamRequest: RequestInit & { duplex: "half" } = {
    method: "POST",
    headers: {
      "Content-Type": input.contentType,
      "X-Recording-ID": input.recordingId,
      "X-API-Key": config.apiKey,
    },
    body: input.body,
    duplex: "half",
    cache: "no-store",
    signal: AbortSignal.timeout(MODAL_REQUEST_TIMEOUT_MS),
  };

  try {
    const response = await fetchImpl(`${config.url}/v1/analyze`, upstreamRequest);
    if (!response.ok) {
      const mapped = mapModalHttpError(response);
      if (mapped) throw mapped;
      throw await analyzerErrorFromResponse(response);
    }
    return parseEnvelope(await response.json(), input.recordingId);
  } catch (error) {
    throw modalInfrastructureError(error);
  }
}

export async function modalAnalyzerHealth(fetchImpl: typeof fetch = fetch) {
  const config = modalAnalyzerConfig();
  let response: Response;
  try {
    response = await fetchImpl(`${config.url}/health`, {
      headers: { "X-API-Key": config.apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw modalInfrastructureError(error);
  }
  if (!response.ok) {
    const mapped = mapModalHttpError(response);
    if (mapped) throw mapped;
    throw await analyzerErrorFromResponse(response);
  }
  return response.json();
}
