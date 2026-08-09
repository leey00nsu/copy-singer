import { z } from "zod";

export const MAX_PROFILE_ANALYSIS_AUDIO_BYTES = 25 * 1024 * 1024;

export const ANALYSIS_AUDIO_MIME_TYPES = [
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "audio/webm",
] as const;

export const analysisIdempotencyKeySchema = z.string().trim().min(1).max(200);

export const analysisAudioFileSchema = z
  .file()
  .min(1)
  .max(MAX_PROFILE_ANALYSIS_AUDIO_BYTES)
  .mime([...ANALYSIS_AUDIO_MIME_TYPES]);
