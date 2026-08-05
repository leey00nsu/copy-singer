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
  descriptors: Record<string, unknown>;
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
  descriptors: Record<string, unknown> | null;
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
