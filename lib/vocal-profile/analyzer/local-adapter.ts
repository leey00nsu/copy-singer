import "server-only";

import type { AnalyzerProfile, AnalyzerProfileData } from "@/lib/vocal-profile/contract";
import {
  AnalyzerClientError,
  analyzerErrorFromResponse,
  audioExtension,
  type AnalyzeVocalProfileInput,
  type AnalyzedRecording,
} from "./types";

function localAnalyzerUrl() {
  const url = process.env.VOCAL_PROFILE_API_URL?.trim().replace(/\/$/, "");
  if (!url) return null;
  return url;
}

async function deleteRecording(baseUrl: string, recordingId: string, fetchImpl: typeof fetch) {
  try {
    await fetchImpl(`${baseUrl}/v1/recordings/${encodeURIComponent(recordingId)}`, {
      method: "DELETE",
      cache: "no-store",
    });
  } catch {
    // Local analyzer artifacts have a TTL cleanup path. The caller already owns copied bytes.
  }
}

function profileWithoutStorage(profile: AnalyzerProfile): AnalyzerProfileData {
  const data = { ...profile } as unknown as Record<string, unknown>;
  delete data.storagePath;
  delete data.expiresAt;
  if (profile.synthesisReference) {
    const reference = { ...profile.synthesisReference } as unknown as Record<string, unknown>;
    delete reference.storagePath;
    data.synthesisReference = reference;
  } else {
    data.synthesisReference = profile.synthesisReference ?? null;
  }
  return data as unknown as AnalyzerProfileData;
}

async function fetchArtifact(url: string, mimeType: string, fileName: string, fetchImpl: typeof fetch) {
  const response = await fetchImpl(url, { cache: "no-store" });
  if (!response.ok) throw await analyzerErrorFromResponse(response);
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    mimeType,
    fileName,
  };
}

export async function analyzeWithLocalAdapter(input: AnalyzeVocalProfileInput): Promise<AnalyzedRecording> {
  const baseUrl = localAnalyzerUrl();
  if (!baseUrl) {
    throw new AnalyzerClientError(
      "ANALYZER_NOT_CONFIGURED",
      "VOCAL_PROFILE_API_URL is required when VOCAL_PROFILE_ANALYZER_BACKEND=local.",
      false,
      503,
    );
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  const upstreamRequest: RequestInit & { duplex: "half" } = {
    method: "POST",
    headers: {
      "Content-Type": input.contentType,
      "X-Recording-ID": input.recordingId,
    },
    body: input.body,
    duplex: "half",
    cache: "no-store",
  };

  try {
    const response = await fetchImpl(`${baseUrl}/v1/analyze`, upstreamRequest);
    if (!response.ok) throw await analyzerErrorFromResponse(response);
    const profile = await response.json() as AnalyzerProfile;
    const encodedId = encodeURIComponent(input.recordingId);
    const source = await fetchArtifact(
      `${baseUrl}/v1/recordings/${encodedId}/source`,
      profile.mimeType,
      `${input.recordingId}.${audioExtension(profile.mimeType)}`,
      fetchImpl,
    );
    const synthesisReference = profile.synthesisReference
      ? await fetchArtifact(
          `${baseUrl}/v1/recordings/${encodedId}/synthesis-reference`,
          profile.synthesisReference.mimeType,
          `${input.recordingId}-synthesis.${audioExtension(profile.synthesisReference.mimeType)}`,
          fetchImpl,
        )
      : null;
    if (source.bytes.byteLength !== profile.sizeBytes) {
      throw new AnalyzerClientError(
        "ANALYZER_INVALID_RESPONSE",
        "Local analyzer source metadata does not match the downloaded artifact.",
        true,
        502,
      );
    }
    if (profile.synthesisReference && synthesisReference?.bytes.byteLength !== profile.synthesisReference.sizeBytes) {
      throw new AnalyzerClientError(
        "ANALYZER_INVALID_RESPONSE",
        "Local analyzer synthesis reference metadata does not match the downloaded artifact.",
        true,
        502,
      );
    }

    return {
      profile: profileWithoutStorage(profile),
      source,
      synthesisReference,
    };
  } catch (error) {
    if (error instanceof AnalyzerClientError) throw error;
    throw new AnalyzerClientError(
      "ANALYZER_UNAVAILABLE",
      "Local vocal analyzer is unavailable.",
      true,
      502,
    );
  } finally {
    await deleteRecording(baseUrl, input.recordingId, fetchImpl);
  }
}

export async function localAnalyzerHealth(fetchImpl: typeof fetch = fetch) {
  const baseUrl = localAnalyzerUrl();
  if (!baseUrl) throw new Error("VOCAL_PROFILE_API_URL is not configured.");
  const response = await fetchImpl(`${baseUrl}/health`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Local analyzer health failed (${response.status}).`);
  return response.json();
}
