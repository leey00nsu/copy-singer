export function positiveInteger(name: string, fallback: number, maximum = 3_600_000) {
  const raw = process.env[name];
  const value = raw === undefined || raw === "" ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}.`);
  }
  return value;
}

export function runtimeLimits() {
  return {
    dbPool: positiveInteger("DB_POOL_MAX", 5, 100),
    dbConnectMs: positiveInteger("DB_CONNECT_TIMEOUT_MS", 5_000),
    dbQueryMs: positiveInteger("DB_QUERY_TIMEOUT_MS", 30_000),
    metadataMs: positiveInteger("HTTP_METADATA_TIMEOUT_MS", 15_000),
    fileMs: positiveInteger("HTTP_FILE_TIMEOUT_MS", 120_000),
    uploadMs: positiveInteger("MEDIA_UPLOAD_TIMEOUT_MS", 180_000),
    ffmpegMs: positiveInteger("FFMPEG_TIMEOUT_MS", 120_000),
  };
}
