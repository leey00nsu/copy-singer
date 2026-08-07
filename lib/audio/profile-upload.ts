export const PROFILE_UPLOAD_MAX_SECONDS = 60;
export const PROFILE_UPLOAD_SAMPLE_RATE = 16_000;
export const PROFILE_UPLOAD_BITRATE = 64_000;
export const PROFILE_AUDIBLE_THRESHOLD_DB = -45;
export const PROFILE_AUDIBLE_WINDOW_SECONDS = 0.05;

export type PreparedProfileAudio = {
  file: File;
  durationSeconds: number;
  sourceDurationSeconds: number;
  trimStartSeconds: number;
  format: "m4a" | "webm";
};

export function findFirstAudibleFrame(
  channels: readonly Float32Array[],
  sampleRate: number,
  thresholdDb = PROFILE_AUDIBLE_THRESHOLD_DB,
  windowSeconds = PROFILE_AUDIBLE_WINDOW_SECONDS,
) {
  if (channels.length === 0 || sampleRate <= 0) return 0;
  const length = Math.min(...channels.map((channel) => channel.length));
  const windowSize = Math.max(1, Math.round(sampleRate * windowSeconds));
  const threshold = 10 ** (thresholdDb / 20);
  for (let start = 0; start < length; start += windowSize) {
    const end = Math.min(length, start + windowSize);
    let sumSquares = 0;
    let sampleCount = 0;
    for (const channel of channels) {
      for (let index = start; index < end; index += 1) {
        const sample = channel[index] ?? 0;
        sumSquares += sample * sample;
        sampleCount += 1;
      }
    }
    if (Math.sqrt(sumSquares / Math.max(1, sampleCount)) >= threshold) return start;
  }
  return 0;
}

function outputName(fileName: string, extension: "m4a" | "webm") {
  const stem = fileName.replace(/\.[^.]+$/, "") || "vocal-profile";
  return `${stem}-60s.${extension}`;
}

export async function prepareProfileAudio(
  source: File,
  onProgress?: (progress: number) => void,
): Promise<PreparedProfileAudio> {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) throw new Error("이 브라우저는 오디오 변환을 지원하지 않습니다.");
  const context = new AudioContextClass();
  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(await source.arrayBuffer());
  } finally {
    await context.close();
  }
  const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index));
  const firstFrame = findFirstAudibleFrame(channels, decoded.sampleRate);
  const trimStartSeconds = firstFrame / decoded.sampleRate;
  const durationSeconds = Math.min(PROFILE_UPLOAD_MAX_SECONDS, Math.max(0, decoded.duration - trimStartSeconds));
  if (durationSeconds < 0.1) throw new Error("재생 가능한 음성을 찾지 못했습니다.");

  const media = await import("mediabunny");
  const input = new media.Input({ source: new media.BlobSource(source), formats: media.ALL_FORMATS });
  const target = new media.BufferTarget();
  const aac = await media.getFirstEncodableAudioCodec(["aac"], {
    numberOfChannels: 1,
    sampleRate: PROFILE_UPLOAD_SAMPLE_RATE,
    bitrate: PROFILE_UPLOAD_BITRATE,
  });
  const format = aac ? "m4a" : "webm";
  const codec = aac ?? await media.getFirstEncodableAudioCodec(["opus"], {
    numberOfChannels: 1,
    sampleRate: PROFILE_UPLOAD_SAMPLE_RATE,
    bitrate: PROFILE_UPLOAD_BITRATE,
  });
  if (!codec) {
    input.dispose();
    throw new Error("이 브라우저에서 AAC 또는 Opus 인코더를 사용할 수 없습니다.");
  }
  const output = new media.Output({
    format: format === "m4a" ? new media.Mp4OutputFormat() : new media.WebMOutputFormat(),
    target,
  });
  const conversion = await media.Conversion.init({
    input,
    output,
    tracks: "primary",
    video: { discard: true },
    audio: {
      codec,
      bitrate: PROFILE_UPLOAD_BITRATE,
      numberOfChannels: 1,
      sampleRate: PROFILE_UPLOAD_SAMPLE_RATE,
      forceTranscode: true,
    },
    trim: { start: trimStartSeconds, end: trimStartSeconds + durationSeconds },
    tags: {},
  });
  if (!conversion.isValid) {
    input.dispose();
    throw new Error("선택한 오디오를 변환할 수 없습니다.");
  }
  conversion.onProgress = (progress) => onProgress?.(progress);
  try {
    await conversion.execute();
  } finally {
    input.dispose();
  }
  if (!target.buffer) throw new Error("오디오 변환 결과가 비어 있습니다.");
  return {
    file: new File([target.buffer], outputName(source.name, format), {
      type: format === "m4a" ? "audio/mp4" : "audio/webm",
    }),
    durationSeconds,
    sourceDurationSeconds: decoded.duration,
    trimStartSeconds,
    format,
  };
}
