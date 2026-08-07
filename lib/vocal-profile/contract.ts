export type PitchHistogramBin = {
  midi: number;
  count: number;
  ratio: number;
};

export type PitchTrackPoint = {
  timeMs: number;
  midi: number | null;
};

export type VocalProfileDescriptors = Record<string, unknown> & {
  pitchHistogram?: PitchHistogramBin[];
  pitchTrack?: PitchTrackPoint[];
  pitchTrackMaxPoints?: number;
};

export type AnalyzerSynthesisReference = {
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  algorithm: string;
  version: string;
  sourceRanges: Array<Record<string, unknown>>;
  bandSeconds: Record<string, number>;
  voicedDensity: number;
  pitchCoverageSemitones: number;
  crossfadeMs: number;
  fallbackReason: string | null;
};

export type AnalyzerProfileData = {
  recordingId: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  sampleRate: number;
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
  descriptors: VocalProfileDescriptors;
  synthesisReference?: AnalyzerSynthesisReference | null;
};

export type AnalyzerProfile = Omit<AnalyzerProfileData, "synthesisReference"> & {
  storagePath: string;
  expiresAt: string;
  synthesisReference?: (AnalyzerSynthesisReference & { storagePath: string }) | null;
};

export type VocalProfileResponse = {
  id: string;
  sourceType: "USER";
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
  descriptors: VocalProfileDescriptors | null;
  createdAt: string;
  recording: {
    id: string;
    mimeType: string;
    sizeBytes: number | null;
    durationMs: number | null;
    sampleRate: number | null;
    expiresAt: string | null;
    createdAt: string;
  };
};

export type VocalProfileError = {
  reasonCode: string;
  detail: string;
  retryable: boolean;
};

export function hasSmartReferenceContract(profile: AnalyzerProfileData) {
  if (!("synthesisReference" in profile)) return false;
  const descriptor = profile.descriptors.synthesisReference;
  if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor)) return false;
  const value = descriptor as Record<string, unknown>;
  if (value.version !== "smart-reference-v1") return false;
  if (profile.synthesisReference === null) return value.status === "unavailable";
  if (!profile.synthesisReference) return false;
  return profile.synthesisReference.version === "smart-reference-v1"
    && Array.isArray(profile.synthesisReference.sourceRanges)
    && Array.isArray(value.sourceRanges);
}
