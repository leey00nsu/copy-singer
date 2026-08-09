import type { SongProfileArtifact, SongProfileMetrics } from "./artifact";

export type SongBatchOptions = {
  limit: number | null;
  rank: number | null;
  resume: boolean;
};

type AnalyzerResult = Omit<SongProfileMetrics, "cleanupConfirmed"> & {
  cleanupConfirmed: boolean;
};

type SongAnalysisRuntime = {
  maxAttempts?: number;
  sleep?: (milliseconds: number) => Promise<void>;
};

const RETRYABLE_REASON_CODES = new Set([
  "SONG_ANALYZER_FAILED",
  "SONG_ANALYSIS_FAILED",
  "YT_DLP_FAILED",
  "PIPELINE_TIMEOUT",
  "SONG_PIPELINE_FAILED",
]);

function positiveInteger(value: string | undefined, option: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${option} requires a positive integer.`);
  }
  return parsed;
}

export function parseSongBatchOptions(args: string[]): SongBatchOptions {
  const options: SongBatchOptions = { limit: null, rank: null, resume: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--limit") {
      options.limit = positiveInteger(args[++index], "--limit");
    } else if (argument === "--rank") {
      options.rank = positiveInteger(args[++index], "--rank");
    } else if (argument === "--resume") {
      options.resume = true;
    } else {
      throw new Error(`Unknown catalog analysis option: ${argument}`);
    }
  }
  if (options.rank !== null && options.rank > 100) throw new Error("--rank must be between 1 and 100.");
  return options;
}

async function requestSongAnalysis(
  analyzerUrl: string,
  sourceUrl: string,
  sourceVideoId: string,
): Promise<SongProfileMetrics> {
  const response = await fetch(`${analyzerUrl.replace(/\/$/, "")}/v1/analyze-song-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceUrl, expectedVideoId: sourceVideoId }),
    signal: AbortSignal.timeout(45 * 60 * 1_000),
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { reasonCode?: string; detail?: string } | null;
    throw new Error(`${error?.reasonCode ?? "SONG_ANALYZER_FAILED"}: ${error?.detail ?? "Song analysis failed."}`);
  }
  const result = (await response.json()) as AnalyzerResult;
  if (!result.cleanupConfirmed) throw new Error("CLEANUP_NOT_CONFIRMED: Analyzer did not confirm temporary cleanup.");
  return { ...result, cleanupConfirmed: true };
}

function analysisFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown song analysis error.";
  const separatorIndex = message.indexOf(":");
  return {
    message,
    reasonCode: separatorIndex > 0 ? message.slice(0, separatorIndex) : "SONG_ANALYSIS_FAILED",
    detail: separatorIndex > 0 ? message.slice(separatorIndex + 1).trim() : message,
  };
}

async function requestSongAnalysisWithRetry(
  analyzerUrl: string,
  sourceUrl: string,
  sourceVideoId: string,
  runtime: SongAnalysisRuntime,
) {
  const maxAttempts = runtime.maxAttempts ?? 3;
  const sleep = runtime.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await requestSongAnalysis(analyzerUrl, sourceUrl, sourceVideoId);
    } catch (error) {
      lastError = error;
      const failure = analysisFailure(error);
      if (attempt === maxAttempts || !RETRYABLE_REASON_CODES.has(failure.reasonCode)) throw error;
      await sleep(5_000 * attempt);
    }
  }
  throw lastError;
}

export async function analyzeSongProfileArtifact(
  artifact: SongProfileArtifact,
  analyzerUrl: string,
  options: SongBatchOptions,
  persist: (artifact: SongProfileArtifact) => Promise<void>,
  runtime: SongAnalysisRuntime = {},
) {
  const candidates = artifact.songs.filter(
    (entry) =>
      (options.rank === null || entry.catalogOrder === options.rank) && (!options.resume || entry.status !== "READY"),
  );
  const selected = options.limit === null ? candidates : candidates.slice(0, options.limit);
  const summary = { selected: selected.length, succeeded: 0, failed: 0, skipped: 0 };

  for (const entry of selected) {
    if (entry.status === "READY") {
      summary.skipped += 1;
      continue;
    }
    try {
      entry.profile = await requestSongAnalysisWithRetry(analyzerUrl, entry.sourceUrl, entry.sourceVideoId, runtime);
      entry.status = "READY";
      entry.error = null;
      summary.succeeded += 1;
    } catch (error) {
      const failure = analysisFailure(error);
      entry.status = "FAILED";
      entry.profile = null;
      entry.error = {
        reasonCode: failure.reasonCode,
        detail: failure.detail,
        updatedAt: new Date().toISOString(),
      };
      summary.failed += 1;
    }
    artifact.generatedAt = new Date().toISOString();
    await persist(artifact);
  }
  return summary;
}
