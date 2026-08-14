export const SUPPORTED_AUDIO_UPLOAD_EXTENSIONS = [".wav", ".mp3", ".m4a", ".webm"] as const;

export const SUPPORTED_AUDIO_UPLOAD_MIME_TYPES = [
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "audio/x-m4a",
  "audio/webm",
] as const;

export const SUPPORTED_AUDIO_UPLOAD_ACCEPT = [
  ...SUPPORTED_AUDIO_UPLOAD_EXTENSIONS,
  ...SUPPORTED_AUDIO_UPLOAD_MIME_TYPES,
].join(",");

export const SUPPORTED_AUDIO_UPLOAD_FORMAT_LABEL = "WAV · MP3 · M4A · WEBM";

const supportedAudioUploadMimeTypes = new Set<string>(SUPPORTED_AUDIO_UPLOAD_MIME_TYPES);

export function normalizeAudioUploadMimeType(value: string) {
  return value.split(";", 1)[0]?.trim().toLowerCase() || "";
}

export function isSupportedAudioUploadMimeType(value: string) {
  return supportedAudioUploadMimeTypes.has(normalizeAudioUploadMimeType(value));
}
