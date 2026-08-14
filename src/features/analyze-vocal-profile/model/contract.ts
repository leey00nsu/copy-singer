import { z } from "zod";
import { SUPPORTED_AUDIO_UPLOAD_MIME_TYPES } from "@/shared/lib/audio";

export const MAX_PROFILE_ANALYSIS_AUDIO_BYTES = 25 * 1024 * 1024;

export const ANALYSIS_AUDIO_MIME_TYPES = SUPPORTED_AUDIO_UPLOAD_MIME_TYPES;

export const analysisIdempotencyKeySchema = z.string().trim().min(1).max(200);

export const analysisAudioFileSchema = z
  .file()
  .min(1)
  .max(MAX_PROFILE_ANALYSIS_AUDIO_BYTES)
  .mime([...ANALYSIS_AUDIO_MIME_TYPES]);
