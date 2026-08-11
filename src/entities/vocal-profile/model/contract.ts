import { z } from "zod";

export const pitchHistogramBinSchema = z.object({
  midi: z.number(),
  count: z.number(),
  ratio: z.number(),
});

export type PitchHistogramBin = z.infer<typeof pitchHistogramBinSchema>;

export const pitchTrackPointSchema = z.object({
  timeMs: z.number(),
  midi: z.number().nullable(),
});

export type PitchTrackPoint = z.infer<typeof pitchTrackPointSchema>;

export const vocalProfileDescriptorsSchema = z
  .object({
    pitchHistogram: z.array(pitchHistogramBinSchema).optional(),
    pitchTrack: z.array(pitchTrackPointSchema).optional(),
    pitchTrackMaxPoints: z.number().optional(),
  })
  .catchall(z.unknown());

export type VocalProfileDescriptors = z.infer<typeof vocalProfileDescriptorsSchema>;

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

export const vocalProfileResponseSchema = z.object({
  id: z.uuid(),
  sourceType: z.literal("USER"),
  profileNumber: z.number().int().positive(),
  displayName: z.string().trim().min(1).max(40),
  minMidi: z.number(),
  maxMidi: z.number(),
  p10Midi: z.number(),
  medianMidi: z.number(),
  p90Midi: z.number(),
  tessituraLowMidi: z.number(),
  tessituraHighMidi: z.number(),
  voicedRatio: z.number(),
  pitchStability: z.number(),
  clippingRatio: z.number(),
  rmsDb: z.number(),
  analyzer: z.string(),
  analyzerVersion: z.string(),
  descriptors: vocalProfileDescriptorsSchema.nullable(),
  createdAt: z.string(),
  recording: z.object({
    id: z.uuid(),
    mimeType: z.string(),
    sizeBytes: z.number().nullable(),
    durationMs: z.number().nullable(),
    sampleRate: z.number().nullable(),
    expiresAt: z.string().nullable(),
    createdAt: z.string(),
  }),
});

export type VocalProfileResponse = z.infer<typeof vocalProfileResponseSchema>;

export type VocalProfileHistoryRow = {
  id: string;
  profileNumber: number;
  displayName: string;
  minMidi: number;
  maxMidi: number;
  medianMidi: number;
  tessituraLowMidi: number;
  tessituraHighMidi: number;
  voicedRatio: number;
  pitchStability: number;
  clippingRatio: number;
  rmsDb: number;
  analyzer: string;
  analyzerVersion: string;
  durationMs: number | null;
  mimeType: string;
  recommendationCount: number;
  mixingCount: number;
  latestRecommendationId: string | null;
  createdAt: string;
};

export type VocalProfileHistoryPayload = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  profiles: VocalProfileHistoryRow[];
};

export const vocalProfileErrorSchema = z.object({
  reasonCode: z.string(),
  detail: z.string(),
  retryable: z.boolean(),
});

export type VocalProfileError = z.infer<typeof vocalProfileErrorSchema>;

export const vocalProfileAnalysisJobStatusSchema = z.enum(["pending", "processing", "succeeded", "failed"]);

export const vocalProfileAnalysisJobResponseSchema = z.object({
  id: z.uuid(),
  status: vocalProfileAnalysisJobStatusSchema,
  vocalProfileId: z.uuid().nullable(),
  attempts: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  error: vocalProfileErrorSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  profile: vocalProfileResponseSchema.nullable().optional(),
});

export type VocalProfileAnalysisJobResponse = z.infer<typeof vocalProfileAnalysisJobResponseSchema>;

export const vocalProfileAnalysisJobListSchema = z.object({
  jobs: z.array(vocalProfileAnalysisJobResponseSchema),
});

export type VocalProfileAnalysisJobList = z.infer<typeof vocalProfileAnalysisJobListSchema>;

export const vocalProfileHealthSchema = z.object({
  status: z.enum(["ok", "unavailable"]),
  analyzer: z.enum(["ok", "unavailable"]),
  analyzerBackend: z.string().nullable(),
  database: z.enum(["ok", "unavailable"]),
});

export type VocalProfileHealth = z.infer<typeof vocalProfileHealthSchema>;

export const vocalProfileDeleteResponseSchema = z.object({
  status: z.literal("deleted"),
  id: z.uuid(),
  mediaCleanupPending: z.boolean(),
});

export type VocalProfileDeleteResponse = z.infer<typeof vocalProfileDeleteResponseSchema>;

export const vocalProfileRenameRequestSchema = z.object({
  displayName: z.string().trim().min(1, "프로필 이름을 입력해주세요.").max(40, "프로필 이름은 40자 이하여야 합니다."),
});

export const vocalProfileRenameResponseSchema = z.object({
  id: z.uuid(),
  displayName: z.string().trim().min(1).max(40),
});

export type VocalProfileRenameRequest = z.infer<typeof vocalProfileRenameRequestSchema>;
export type VocalProfileRenameResponse = z.infer<typeof vocalProfileRenameResponseSchema>;

export const SMART_REFERENCE_VERSION = "smart-reference-v1" as const;
export const SMART_REFERENCE_MID_VERSION = "smart-reference-mid-v1" as const;
export type SynthesisReferenceContractVersion = typeof SMART_REFERENCE_VERSION | typeof SMART_REFERENCE_MID_VERSION;

function supportedReferenceVersion(value: unknown): value is SynthesisReferenceContractVersion {
  return value === SMART_REFERENCE_VERSION || value === SMART_REFERENCE_MID_VERSION;
}

function midOnlyRanges(value: unknown) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((range) => {
      if (!range || typeof range !== "object" || Array.isArray(range)) return false;
      return (range as Record<string, unknown>).band === "mid";
    })
  );
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
