import type { SongProfileArtifact, SongProfileArtifactEntry } from "@/entities/recommendation";
import type { CatalogSnapshot } from "@/entities/song-catalog/model/snapshot";

function videoId(index: number) {
  return `S${String(index + 1).padStart(10, "0")}`;
}

function songProfile(index: number): SongProfileArtifactEntry {
  const minMidi = 45 + (index % 18);
  const maxMidi = minMidi + 15 + (index % 12);
  return {
    catalogOrder: index + 1,
    title: `Synthetic Song ${index + 1}`,
    artist: `Synthetic Artist ${index + 1}`,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId(index)}`,
    sourceVideoId: videoId(index),
    sourceLabel: "합성 테스트 곡",
    status: "READY",
    profile: {
      durationMs: 180_000 + index * 1_000,
      sampleRate: 44_100,
      sourceSizeBytes: 4_000_000 + index * 1_000,
      minMidi,
      maxMidi,
      p10Midi: minMidi + 2,
      medianMidi: minMidi + 8 + (index % 5),
      p90Midi: maxMidi - 2,
      tessituraLowMidi: minMidi + 4,
      tessituraHighMidi: maxMidi - 3,
      voicedRatio: 0.6 + (index % 40) / 100,
      pitchStability: 0.7 + (index % 25) / 100,
      clippingRatio: (index % 5) / 1_000,
      rmsDb: -24 + (index % 12),
      analyzer: "librosa-pyin",
      analyzerVersion: "0.11.0",
      descriptors: { synthetic: true },
      ytDlpVersion: "2026.7.4",
      separator: "demucs",
      separatorVersion: "4.0.1",
      separatorModel: "htdemucs",
      cleanupConfirmed: true,
    },
    error: null,
  };
}

export const SYNTHETIC_SONG_CATALOG = {
  schemaVersion: 1,
  catalog: {
    name: "TJ Top 100",
    issue: "2026-07",
    source: "admin-catalog-snapshot",
  },
  pipelineContract: "yt-dlp-demucs-librosa-pyin-v1",
  generatedAt: null,
  songs: Array.from({ length: 100 }, (_, index) => songProfile(index)),
} as unknown as SongProfileArtifact;

function youTubeUrlForSnapshot(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function syntheticCatalogSnapshot(count = 5): CatalogSnapshot {
  return {
    schemaVersion: 3,
    catalog: { slug: "tj-2026-07-top-100", name: "Synthetic Catalog", issue: "2026-07", revision: 1 },
    generatedAt: new Date().toISOString(),
    songs: Array.from({ length: count }, (_, index) => {
      const id = videoId(index);
      return {
        position: index + 1,
        title: `Synthetic Song ${index + 1}`,
        artist: `Synthetic Artist ${index + 1}`,
        originalKey: null,
        source: {
          sourceUrl: youTubeUrlForSnapshot(id),
          sourceVideoId: id,
          sourceLabel: "합성 테스트 곡",
          status: "READY" as const,
        },
        analysis: {
          pipelineContract: "yt-dlp-demucs-librosa-pyin-v1",
          status: "READY" as const,
          cleanupConfirmed: true,
          durationMs: 180_000 + index * 1_000,
          sampleRate: 44_100,
          sourceSizeBytes: 4_000_000 + index * 1_000,
          minMidi: 45 + (index % 18),
          maxMidi: 60 + (index % 12),
          p10Midi: 47 + (index % 10),
          medianMidi: 53 + (index % 5),
          p90Midi: 58 + (index % 10),
          tessituraLowMidi: 49 + (index % 10),
          tessituraHighMidi: 57 + (index % 10),
          voicedRatio: 0.6 + (index % 40) / 100,
          pitchStability: 0.7 + (index % 25) / 100,
          clippingRatio: (index % 5) / 1_000,
          rmsDb: -24 + (index % 12),
          estimatedKey: null,
          keyConfidence: null,
          analyzer: "librosa-pyin",
          analyzerVersion: "0.11.0",
          descriptors: { synthetic: true },
          pipelineMetadata: {
            ytDlpVersion: "2026.7.4",
            separator: "demucs",
            separatorVersion: "4.0.1",
            separatorModel: "htdemucs",
          },
        },
        targetAsset: {
          externalProjectId: "leemage-synth",
          externalFileId: `synth-file-${index}`,
          externalUrl: "https://example.test/synth.m4a",
          fileName: "synth.m4a",
          mimeType: "audio/x-m4a",
          sizeBytes: 1_000_000 + index * 1_000,
          sha256: "0".repeat(64),
          sourceVideoId: id,
          status: "READY" as const,
        },
      };
    }),
  };
}
