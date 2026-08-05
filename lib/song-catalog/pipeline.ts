import type { Prisma, PrismaClient } from "../../generated/prisma/client";

export type SongBatchOptions = {
  limit: number | null;
  rank: number | null;
  resume: boolean;
};

export type SongAnalysisResult = {
  durationMs: number;
  sampleRate: number;
  sourceSizeBytes: number;
  minMidi: number;
  maxMidi: number;
  p10Midi: number;
  medianMidi: number;
  p90Midi: number;
  tessituraLowMidi: number;
  tessituraHighMidi: number;
  voicedRatio: number;
  pitchStability: number;
  clippingRatio: number;
  rmsDb: number;
  analyzer: string;
  analyzerVersion: string;
  descriptors: Record<string, unknown>;
  ytDlpVersion: string;
  separator: string;
  separatorVersion: string;
  separatorModel: string;
  cleanupConfirmed: boolean;
};

type CatalogMetadata = {
  sourceUrl: string;
  sourceVideoId: string;
};

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

function jsonObject(value: Prisma.JsonValue | null): Record<string, Prisma.JsonValue> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, Prisma.JsonValue>;
  }
  return {};
}

function catalogMetadata(metadata: Prisma.JsonValue | null): CatalogMetadata {
  const catalog = jsonObject(metadata).catalog;
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    throw new Error("Song is missing catalog metadata.");
  }
  const sourceUrl = catalog.sourceUrl;
  const sourceVideoId = catalog.sourceVideoId;
  if (typeof sourceUrl !== "string" || typeof sourceVideoId !== "string") {
    throw new Error("Song catalog metadata is missing its source URL or video ID.");
  }
  return { sourceUrl, sourceVideoId };
}

function withPipelineMetadata(
  metadata: Prisma.JsonValue | null,
  pipeline: Record<string, Prisma.InputJsonValue | undefined>,
): Prisma.InputJsonValue {
  return {
    ...jsonObject(metadata),
    pipeline: Object.fromEntries(Object.entries(pipeline).filter(([, value]) => value !== undefined)),
  } as Prisma.InputJsonValue;
}

async function requestSongAnalysis(
  analyzerUrl: string,
  catalog: CatalogMetadata,
): Promise<SongAnalysisResult> {
  const response = await fetch(`${analyzerUrl.replace(/\/$/, "")}/v1/analyze-song-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceUrl: catalog.sourceUrl,
      expectedVideoId: catalog.sourceVideoId,
    }),
    signal: AbortSignal.timeout(45 * 60 * 1_000),
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as
      | { reasonCode?: string; detail?: string }
      | null;
    throw new Error(`${error?.reasonCode ?? "SONG_ANALYZER_FAILED"}: ${error?.detail ?? "Song analysis failed."}`);
  }
  const result = (await response.json()) as SongAnalysisResult;
  if (!result.cleanupConfirmed) throw new Error("CLEANUP_NOT_CONFIRMED: Analyzer did not confirm temporary cleanup.");
  return result;
}

export async function analyzeSongCatalog(
  prisma: PrismaClient,
  analyzerUrl: string,
  options: SongBatchOptions,
) {
  const songs = await prisma.song.findMany({
    where: {
      ...(options.rank === null ? { catalogOrder: { gte: 1, lte: 100 } } : { catalogOrder: options.rank }),
      ...(options.resume ? { analysisStatus: { not: "READY" } } : {}),
    },
    include: { vocalProfile: { include: { recording: true } } },
    orderBy: { catalogOrder: "asc" },
    ...(options.limit === null ? {} : { take: options.limit }),
  });

  const summary = { selected: songs.length, succeeded: 0, failed: 0, skipped: 0 };
  for (const song of songs) {
    if (song.analysisStatus === "READY") {
      summary.skipped += 1;
      continue;
    }

    let catalog: CatalogMetadata;
    try {
      catalog = catalogMetadata(song.metadata);
    } catch (error) {
      summary.failed += 1;
      await prisma.song.update({
        where: { id: song.id },
        data: {
          analysisStatus: "FAILED",
          metadata: withPipelineMetadata(song.metadata, {
            stage: "FAILED",
            reasonCode: "INVALID_CATALOG_METADATA",
            detail: error instanceof Error ? error.message : "Invalid catalog metadata.",
            updatedAt: new Date().toISOString(),
          }),
        },
      });
      continue;
    }

    await prisma.song.update({
      where: { id: song.id },
      data: {
        analysisStatus: "PENDING",
        metadata: withPipelineMetadata(song.metadata, {
          stage: "PROCESSING",
          updatedAt: new Date().toISOString(),
        }),
      },
    });

    try {
      const result = await requestSongAnalysis(analyzerUrl, catalog);
      const descriptors = {
        ...result.descriptors,
        separator: result.separator,
        separatorVersion: result.separatorVersion,
        separatorModel: result.separatorModel,
        ytDlpVersion: result.ytDlpVersion,
        sourceVideoId: catalog.sourceVideoId,
      } satisfies Prisma.InputJsonValue;
      const readyMetadata = withPipelineMetadata(song.metadata, {
        stage: "READY",
        ytDlpVersion: result.ytDlpVersion,
        separator: result.separator,
        separatorVersion: result.separatorVersion,
        separatorModel: result.separatorModel,
        analyzer: result.analyzer,
        analyzerVersion: result.analyzerVersion,
        cleanupConfirmed: true,
        updatedAt: new Date().toISOString(),
      });

      await prisma.$transaction(async (tx) => {
        if (song.vocalProfile) {
          await tx.recording.update({
            where: { id: song.vocalProfile.recordingId },
            data: {
              kind: "SONG_SOURCE",
              storagePath: catalog.sourceUrl,
              mimeType: "audio/wav",
              durationMs: result.durationMs,
              sizeBytes: BigInt(result.sourceSizeBytes),
              sampleRate: result.sampleRate,
              status: "DELETED",
              expiresAt: null,
            },
          });
          await tx.vocalProfile.update({
            where: { id: song.vocalProfile.id },
            data: {
              sourceType: "SONG",
              minMidi: result.minMidi,
              maxMidi: result.maxMidi,
              p10Midi: result.p10Midi,
              medianMidi: result.medianMidi,
              p90Midi: result.p90Midi,
              tessituraLowMidi: result.tessituraLowMidi,
              tessituraHighMidi: result.tessituraHighMidi,
              voicedRatio: result.voicedRatio,
              pitchStability: result.pitchStability,
              clippingRatio: result.clippingRatio,
              rmsDb: result.rmsDb,
              descriptors,
              analyzer: result.analyzer,
              analyzerVersion: result.analyzerVersion,
            },
          });
          await tx.song.update({
            where: { id: song.id },
            data: { analysisStatus: "READY", metadata: readyMetadata },
          });
        } else {
          const profile = await tx.vocalProfile.create({
            data: {
              sourceType: "SONG",
              minMidi: result.minMidi,
              maxMidi: result.maxMidi,
              p10Midi: result.p10Midi,
              medianMidi: result.medianMidi,
              p90Midi: result.p90Midi,
              tessituraLowMidi: result.tessituraLowMidi,
              tessituraHighMidi: result.tessituraHighMidi,
              voicedRatio: result.voicedRatio,
              pitchStability: result.pitchStability,
              clippingRatio: result.clippingRatio,
              rmsDb: result.rmsDb,
              descriptors,
              analyzer: result.analyzer,
              analyzerVersion: result.analyzerVersion,
              recording: {
                create: {
                  kind: "SONG_SOURCE",
                  storagePath: catalog.sourceUrl,
                  mimeType: "audio/wav",
                  durationMs: result.durationMs,
                  sizeBytes: BigInt(result.sourceSizeBytes),
                  sampleRate: result.sampleRate,
                  status: "DELETED",
                },
              },
            },
          });
          await tx.song.update({
            where: { id: song.id },
            data: {
              vocalProfileId: profile.id,
              analysisStatus: "READY",
              metadata: readyMetadata,
            },
          });
        }
      });
      summary.succeeded += 1;
    } catch (error) {
      summary.failed += 1;
      const message = error instanceof Error ? error.message : "Unknown song analysis error.";
      const separatorIndex = message.indexOf(":");
      await prisma.song.update({
        where: { id: song.id },
        data: {
          analysisStatus: "FAILED",
          metadata: withPipelineMetadata(song.metadata, {
            stage: "FAILED",
            reasonCode: separatorIndex > 0 ? message.slice(0, separatorIndex) : "SONG_ANALYSIS_FAILED",
            detail: separatorIndex > 0 ? message.slice(separatorIndex + 1).trim() : message,
            updatedAt: new Date().toISOString(),
          }),
        },
      });
    }
  }
  return summary;
}
