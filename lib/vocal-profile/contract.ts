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

export type AnalyzerProfile = {
  recordingId: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: string;
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
