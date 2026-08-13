import { z } from "zod";

export const CATALOG_SNAPSHOT_SCHEMA_VERSION = 3;

const finiteNumber = z.number().finite();
const nullableFiniteNumber = finiteNumber.nullable();
const nullableNonNegativeInteger = z.number().int().nonnegative().nullable();

const YOUTUBE_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

function youtubeVideoIdFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.replace(/^(?:www|m|music)\./, "");
    let candidate: string | null = null;
    if (host === "youtu.be") candidate = url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (host === "youtube.com") {
      candidate =
        (url.pathname === "/watch" ? url.searchParams.get("v") : null) ??
        (/^\/(?:shorts|live)\/[^/]+/.test(url.pathname) ? (url.pathname.split("/")[2] ?? null) : null);
    }
    return candidate && YOUTUBE_VIDEO_ID_RE.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

const FORBIDDEN_ANALYSIS_KEYS_RE = /(audioBytes|audio_bytes|base64|tempPath|tmpPath|filePath|storagePath)/i;

function assertSafeAnalysisJson(value: Record<string, unknown> | null | undefined, path: string) {
  if (!value) return;
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_ANALYSIS_KEYS_RE.test(key)) {
      throw new Error(`${path} contains forbidden key: ${key}`);
    }
    const v = value[key];
    if (typeof v === "string" && v.length > 4096 && FORBIDDEN_ANALYSIS_KEYS_RE.test(key)) {
      throw new Error(`${path}.${key} is too large/forbidden`);
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      // shallow check inside one level for obvious leaks
      for (const inner of Object.keys(v as Record<string, unknown>)) {
        if (FORBIDDEN_ANALYSIS_KEYS_RE.test(inner)) throw new Error(`${path}.${key}.${inner} is forbidden`);
      }
    }
  }
}

export const catalogSnapshotSongSchema = z
  .object({
    position: z.number().int().positive(),
    title: z.string().trim().min(1),
    artist: z.string().trim().min(1),
    originalKey: z.string().nullable().optional(),
    source: z.object({
      sourceUrl: z.string().trim().min(1),
      sourceVideoId: z.string().trim().min(1),
      sourceLabel: z.string().trim().min(1),
      status: z.enum(["DRAFT", "READY", "SUPERSEDED", "UNAVAILABLE"]),
    }),
    analysis: z.object({
      pipelineContract: z.string().trim().min(1),
      status: z.enum(["PENDING", "READY", "FAILED"]),
      cleanupConfirmed: z.boolean(),
      durationMs: nullableNonNegativeInteger,
      sampleRate: nullableNonNegativeInteger,
      sourceSizeBytes: nullableNonNegativeInteger,
      minMidi: nullableFiniteNumber,
      maxMidi: nullableFiniteNumber,
      p10Midi: nullableFiniteNumber,
      medianMidi: nullableFiniteNumber,
      p90Midi: nullableFiniteNumber,
      tessituraLowMidi: nullableFiniteNumber,
      tessituraHighMidi: nullableFiniteNumber,
      voicedRatio: nullableFiniteNumber,
      pitchStability: nullableFiniteNumber,
      clippingRatio: nullableFiniteNumber,
      rmsDb: nullableFiniteNumber,
      estimatedKey: z.string().nullable().optional(),
      keyConfidence: nullableFiniteNumber.optional(),
      analyzer: z.string().trim().min(1).nullable(),
      analyzerVersion: z.string().trim().min(1).nullable(),
      descriptors: z.record(z.string(), z.unknown()).nullable().optional(),
      pipelineMetadata: z.record(z.string(), z.unknown()).nullable().optional(),
    }),
    targetAsset: z.object({
      externalProjectId: z.string().trim().min(1),
      externalFileId: z.string().trim().min(1),
      externalUrl: z.string().trim().min(1),
      fileName: z.string().trim().min(1),
      mimeType: z.string().trim().min(1),
      sizeBytes: z.number().int().nonnegative(),
      sha256: z.string().trim().min(1),
      sourceVideoId: z.string().trim().min(1),
      status: z.enum(["READY", "DELETE_PENDING", "DELETED", "FAILED"]),
    }),
  })
  .superRefine((song, ctx) => {
    if (!YOUTUBE_VIDEO_ID_RE.test(song.source.sourceVideoId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source", "sourceVideoId"],
        message: "sourceVideoId must be an 11-char YouTube ID",
      });
    }
    const derived = youtubeVideoIdFromUrl(song.source.sourceUrl);
    if (!derived) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source", "sourceUrl"],
        message: "sourceUrl must be a valid HTTPS YouTube URL",
      });
    } else if (derived !== song.source.sourceVideoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source", "sourceVideoId"],
        message: "sourceVideoId must match sourceUrl",
      });
    }
    if (song.targetAsset.sourceVideoId !== song.source.sourceVideoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetAsset", "sourceVideoId"],
        message: "target sourceVideoId must match song sourceVideoId",
      });
    }
    try {
      assertSafeAnalysisJson(
        song.analysis.descriptors as Record<string, unknown> | null | undefined,
        "analysis.descriptors",
      );
      assertSafeAnalysisJson(
        song.analysis.pipelineMetadata as Record<string, unknown> | null | undefined,
        "analysis.pipelineMetadata",
      );
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["analysis", "descriptors"],
        message: e instanceof Error ? e.message : "forbidden analysis metadata",
      });
    }
  });

export const catalogSnapshotSchema = z.object({
  schemaVersion: z.literal(CATALOG_SNAPSHOT_SCHEMA_VERSION),
  catalog: z.object({
    slug: z.string().trim().min(1),
    name: z.string().trim().min(1),
    issue: z.string().nullable().optional(),
    revision: z.number().int().positive(),
  }),
  generatedAt: z.string().datetime(),
  songs: z.array(catalogSnapshotSongSchema).min(1),
});

export type CatalogSnapshotSong = z.infer<typeof catalogSnapshotSongSchema>;
export type CatalogSnapshot = z.infer<typeof catalogSnapshotSchema>;
