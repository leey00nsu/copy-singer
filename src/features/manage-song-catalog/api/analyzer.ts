import "server-only";

import { z } from "zod";
import { songAnalysisMetricsSchema } from "@/entities/song-catalog/index.model";

const analyzerResponseSchema = songAnalysisMetricsSchema.extend({
  durationMs: z.number().int().nonnegative().nullable(),
  sampleRate: z.number().int().positive().nullable(),
  sourceSizeBytes: z.number().int().nonnegative().nullable(),
  descriptors: z.record(z.string(), z.unknown()).nullable().optional(),
  cleanupConfirmed: z.literal(true),
  ytDlpVersion: z.string().nullable().optional(),
  separator: z.string().nullable().optional(),
  separatorVersion: z.string().nullable().optional(),
  separatorModel: z.string().nullable().optional(),
});

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

export async function analyzeSongSource(input: {
  analyzerUrl: string;
  sourceUrl: string;
  sourceVideoId: string;
  fetchImpl?: typeof fetch;
}) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(`${input.analyzerUrl.replace(/\/$/, "")}/v1/analyze-song-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceUrl: input.sourceUrl, expectedVideoId: input.sourceVideoId }),
    signal: AbortSignal.timeout(45 * 60 * 1_000),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { reasonCode?: string; detail?: string } | null;
    const reasonCode = payload?.reasonCode ?? "SONG_ANALYZER_FAILED";
    throw new SongAnalyzerError(
      reasonCode,
      payload?.detail ?? `Song analysis failed (${response.status}).`,
      response.status === 408 || response.status === 429 || response.status >= 500,
    );
  }
  const parsed = analyzerResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new SongAnalyzerError("INVALID_ANALYZER_RESPONSE", "Analyzer response did not match the contract.", false);
  }
  return parsed.data;
}
