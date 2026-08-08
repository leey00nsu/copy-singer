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

export type VocalProfileAnalysisJobResponse = {
  id: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  vocalProfileId: string | null;
  attempts: number;
  maxAttempts: number;
  error: VocalProfileError | null;
  createdAt: string;
  updatedAt: string;
  profile?: VocalProfileResponse | null;
};

export const SMART_REFERENCE_VERSION = "smart-reference-v1" as const;
export const SMART_REFERENCE_MID_VERSION = "smart-reference-mid-v1" as const;
export type SynthesisReferenceContractVersion = typeof SMART_REFERENCE_VERSION | typeof SMART_REFERENCE_MID_VERSION;

function supportedReferenceVersion(value: unknown): value is SynthesisReferenceContractVersion {
  return value === SMART_REFERENCE_VERSION || value === SMART_REFERENCE_MID_VERSION;
}

function midOnlyRanges(value: unknown) {
  return Array.isArray(value) && value.length > 0 && value.every((range) => {
    if (!range || typeof range !== "object" || Array.isArray(range)) return false;
    return (range as Record<string, unknown>).band === "mid";
  });
}

export function synthesisReferenceContractVersion(descriptors: VocalProfileDescriptors | null | undefined) {
  const descriptor = descriptors?.synthesisReference;
  if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor)) return null;
  const version = (descriptor as Record<string, unknown>).version;
  return supportedReferenceVersion(version) ? version : null;
}

export function hasSmartReferenceContract(profile: AnalyzerProfileData) {
  if (!("synthesisReference" in profile)) return false;
  const descriptor = profile.descriptors.synthesisReference;
  if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor)) return false;
  const value = descriptor as Record<string, unknown>;
  const version = value.version;
  if (!supportedReferenceVersion(version)) return false;
  if (profile.synthesisReference === null) return value.status === "unavailable";
  if (!profile.synthesisReference) return false;
  if (profile.synthesisReference.version !== version) return false;
  if (!Array.isArray(profile.synthesisReference.sourceRanges) || !Array.isArray(value.sourceRanges)) return false;
  if (version === SMART_REFERENCE_MID_VERSION) {
    return midOnlyRanges(profile.synthesisReference.sourceRanges) && midOnlyRanges(value.sourceRanges);
  }
  return true;
}
