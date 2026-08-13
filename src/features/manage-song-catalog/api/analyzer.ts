import "server-only";

import { z } from "zod";
import { songAnalysisMetricsSchema } from "@/entities/song-catalog/index.model";

const analyzerResultSchema = songAnalysisMetricsSchema.extend({
  durationMs: z.number().int().nonnegative().nullable(),
  sampleRate: z.number().int().positive().nullable(),
  sourceSizeBytes: z.number().int().nonnegative().nullable(),
  estimatedKey: z
    .string()
    .regex(/^[A-G](?:#)?m?$/)
    .nullable(),
  keyConfidence: z.number().min(0).max(1).nullable(),
  descriptors: z.record(z.string(), z.unknown()).nullable().optional(),
  cleanupConfirmed: z.literal(true),
  ytDlpVersion: z.string().nullable().optional(),
  separator: z.string().nullable().optional(),
  separatorVersion: z.string().nullable().optional(),
  separatorModel: z.string().nullable().optional(),
  sourceVideoId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{11}$/)
    .optional(),
});

const submitResponseSchema = z.object({
  status: z.literal("PROCESSING"),
  externalJobId: z.string().min(1),
  reused: z.boolean(),
});

const pollResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("PROCESSING"), externalJobId: z.string().min(1) }),
  z.object({ status: z.literal("SUCCEEDED"), result: analyzerResultSchema }),
  z.object({
    status: z.literal("FAILED"),
    reasonCode: z.string().min(1),
    detail: z.string().min(1),
    retryable: z.boolean(),
  }),
]);

export class SongAnalyzerError extends Error {
  constructor(
    public readonly reasonCode: string,
    public readonly detail: string,
    public readonly retryable: boolean,
  ) {
    super(`${reasonCode}: ${detail}`);
    this.name = "SongAnalyzerError";
  }
}

async function responseError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    reasonCode?: string;
    detail?: string;
    retryable?: boolean;
  } | null;
  if (response.status === 401 || response.status === 403) {
    return new SongAnalyzerError("ANALYZER_AUTH_FAILED", "Song analyzer authentication failed.", false);
  }
  return new SongAnalyzerError(
    payload?.reasonCode ?? "SONG_ANALYZER_UNAVAILABLE",
    payload?.detail ?? `Song analyzer request failed (${response.status}).`,
    payload?.retryable ?? (response.status === 408 || response.status === 429 || response.status >= 500),
  );
}

function transportError(error: unknown) {
  if (error instanceof SongAnalyzerError) return error;
  const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
  return new SongAnalyzerError(
    timeout ? "SONG_ANALYZER_TIMEOUT" : "SONG_ANALYZER_UNAVAILABLE",
    timeout ? "Song analyzer request timed out." : "Song analyzer is unavailable.",
    true,
  );
}

export async function submitSongAnalysis(input: {
  analyzerUrl: string;
  apiKey: string;
  requestId: string;
  sourceVideoId: string;
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  fetchImpl?: typeof fetch;
}) {
  const form = new FormData();
  form.set("requestId", input.requestId);
  form.set("sourceVideoId", input.sourceVideoId);
  form.set("audio", new File([Uint8Array.from(input.bytes)], input.fileName, { type: input.mimeType }));
  try {
    const response = await (input.fetchImpl ?? fetch)(`${input.analyzerUrl}/v1/jobs`, {
      method: "POST",
      headers: { "X-API-Key": input.apiKey },
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw await responseError(response);
    const parsed = submitResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new SongAnalyzerError("INVALID_ANALYZER_RESPONSE", "Song analyzer submit response is invalid.", true);
    }
    return parsed.data;
  } catch (error) {
    throw transportError(error);
  }
}

export async function pollSongAnalysis(input: {
  analyzerUrl: string;
  apiKey: string;
  externalJobId: string;
  fetchImpl?: typeof fetch;
}) {
  try {
    const response = await (input.fetchImpl ?? fetch)(
      `${input.analyzerUrl}/v1/jobs/${encodeURIComponent(input.externalJobId)}`,
      {
        headers: { "X-API-Key": input.apiKey },
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!response.ok && response.status !== 202) throw await responseError(response);
    const parsed = pollResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new SongAnalyzerError("INVALID_ANALYZER_RESPONSE", "Song analyzer poll response is invalid.", true);
    }
    return parsed.data;
  } catch (error) {
    throw transportError(error);
  }
}
