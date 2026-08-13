import type { SongCatalogEntry, TJ_2607_CATALOG_METADATA } from "./catalog";

export const SONG_PROFILE_ARTIFACT_SCHEMA_VERSION = 1;
export const SONG_PROFILE_PIPELINE_CONTRACT = "yt-dlp-demucs-librosa-pyin-v1";

export type SongProfileMetrics = {
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
  cleanupConfirmed: true;
};

export type SongProfileArtifactEntry = SongCatalogEntry & {
  status: "PENDING" | "READY" | "FAILED";
  profile: SongProfileMetrics | null;
  error: { reasonCode: string; detail: string; updatedAt: string } | null;
};

export type SongProfileArtifact = {
  schemaVersion: number;
  catalog: typeof TJ_2607_CATALOG_METADATA;
  pipelineContract: string;
  generatedAt: string | null;
  songs: SongProfileArtifactEntry[];
};
