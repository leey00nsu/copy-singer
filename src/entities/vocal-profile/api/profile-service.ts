import "server-only";

import { vocalProfileAnalyzerUrl } from "@/shared/config/index.server";
import type { VocalProfileResponse } from "../model/contract";

type StoredProfile = {
  id: string;
  sourceType: "USER" | "SONG";
  profileNumber?: number | null;
  displayName?: string | null;
  minMidi: number | null;
  maxMidi: number | null;
  p10Midi: number | null;
  medianMidi: number | null;
  p90Midi: number | null;
  tessituraLowMidi: number | null;
  tessituraHighMidi: number | null;
  voicedRatio: number | null;
  pitchStability: number | null;
  clippingRatio: number | null;
  rmsDb: number | null;
  analyzer: string;
  analyzerVersion: string;
  descriptors: unknown;
  createdAt: Date;
  recording: {
    id: string;
    mimeType: string;
    sizeBytes: bigint | null;
    durationMs: number | null;
    sampleRate: number | null;
    expiresAt: Date | null;
    createdAt: Date;
  };
};

function requiredMetric(value: number | null, name: string) {
  if (value === null) throw new Error(`Stored user profile is missing ${name}.`);
  return value;
}

export function serializeProfile(profile: StoredProfile): VocalProfileResponse {
  if (profile.sourceType !== "USER") throw new Error("Expected a user vocal profile.");
  const profileNumber = profile.profileNumber ?? 1;
  return {
    id: profile.id,
    sourceType: "USER",
    profileNumber,
    displayName: profile.displayName?.trim() || `보컬 프로필 ${profileNumber}`,
    minMidi: requiredMetric(profile.minMidi, "minMidi"),
    maxMidi: requiredMetric(profile.maxMidi, "maxMidi"),
    p10Midi: requiredMetric(profile.p10Midi, "p10Midi"),
    medianMidi: requiredMetric(profile.medianMidi, "medianMidi"),
    p90Midi: requiredMetric(profile.p90Midi, "p90Midi"),
    tessituraLowMidi: requiredMetric(profile.tessituraLowMidi, "tessituraLowMidi"),
    tessituraHighMidi: requiredMetric(profile.tessituraHighMidi, "tessituraHighMidi"),
    voicedRatio: requiredMetric(profile.voicedRatio, "voicedRatio"),
    pitchStability: requiredMetric(profile.pitchStability, "pitchStability"),
    clippingRatio: requiredMetric(profile.clippingRatio, "clippingRatio"),
    rmsDb: requiredMetric(profile.rmsDb, "rmsDb"),
    analyzer: profile.analyzer,
    analyzerVersion: profile.analyzerVersion,
    descriptors: profile.descriptors as Record<string, unknown> | null,
    createdAt: profile.createdAt.toISOString(),
    recording: {
      id: profile.recording.id,
      mimeType: profile.recording.mimeType,
      sizeBytes: profile.recording.sizeBytes === null ? null : Number(profile.recording.sizeBytes),
      durationMs: profile.recording.durationMs,
      sampleRate: profile.recording.sampleRate,
      expiresAt: profile.recording.expiresAt?.toISOString() ?? null,
      createdAt: profile.recording.createdAt.toISOString(),
    },
  };
}

export async function deleteAnalyzerRecording(recordingId: string) {
  const url = vocalProfileAnalyzerUrl();
  if (!url) return false;
  const response = await fetch(`${url}/v1/recordings/${encodeURIComponent(recordingId)}`, {
    method: "DELETE",
    cache: "no-store",
  });
  return response.ok;
}
