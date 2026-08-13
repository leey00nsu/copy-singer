import { z } from "zod";

const finiteNumber = z.number().finite();
const nullableFiniteNumber = finiteNumber.nullable();

export const songLifecycleStatusSchema = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);
export const songSourceStatusSchema = z.enum(["DRAFT", "READY", "SUPERSEDED", "UNAVAILABLE"]);
export const songAnalysisStatusSchema = z.enum(["PENDING", "READY", "FAILED"]);
export const catalogEntryStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const songAnalysisMetricsSchema = z.object({
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
  analyzer: z.string().trim().min(1).nullable(),
  analyzerVersion: z.string().trim().min(1).nullable(),
});

export type SongAnalysisMetrics = z.infer<typeof songAnalysisMetricsSchema>;

export type CatalogReadinessInput = {
  lifecycleStatus: z.infer<typeof songLifecycleStatusSchema>;
  activeSourceId: string | null;
  currentAnalysisId: string | null;
  targetAssetId: string | null;
  activeSource: {
    id: string;
    status: z.infer<typeof songSourceStatusSchema>;
    sourceVideoId: string;
  } | null;
  currentAnalysis: {
    id: string;
    sourceId: string;
    status: z.infer<typeof songAnalysisStatusSchema>;
    cleanupConfirmed: boolean;
  } | null;
  targetAsset: {
    id: string;
    sourceId: string | null;
    status: "READY" | "DELETE_PENDING" | "DELETED" | "FAILED";
  } | null;
  catalogEntry: {
    status: z.infer<typeof catalogEntryStatusSchema>;
  } | null;
};

export const catalogReadinessCodeSchema = z.enum([
  "SONG_NOT_ACTIVE",
  "SOURCE_NOT_READY",
  "ANALYSIS_NOT_READY",
  "ANALYSIS_SOURCE_MISMATCH",
  "TARGET_NOT_READY",
  "TARGET_SOURCE_MISMATCH",
  "CATALOG_ENTRY_NOT_PUBLISHED",
]);

export type CatalogReadinessCode = z.infer<typeof catalogReadinessCodeSchema>;
