import type { AudioSourceRange } from "@/lib/vocal-profile/reference-segments";

type DecodedAudio = {
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  getChannelData(channel: number): Float32Array;
};

function normalizedFrames(range: AudioSourceRange, sampleRate: number, sourceLength: number) {
  const start = Math.min(sourceLength, Math.max(0, Math.round(range.startSeconds * sampleRate)));
  const end = Math.min(sourceLength, Math.max(start, Math.round(range.endSeconds * sampleRate)));
  return { start, end };
}

export function concatenateMonoRanges(audio: DecodedAudio, ranges: AudioSourceRange[]) {
  const frames = ranges.map((range) => normalizedFrames(range, audio.sampleRate, audio.length));
  const output = new Float32Array(frames.reduce((total, range) => total + range.end - range.start, 0));
  const channels = Array.from({ length: audio.numberOfChannels }, (_, index) => audio.getChannelData(index));
  let outputOffset = 0;

  for (const range of frames) {
    for (let sourceIndex = range.start; sourceIndex < range.end; sourceIndex += 1) {
      let sample = 0;
      for (const channel of channels) sample += channel[sourceIndex] ?? 0;
      output[outputOffset] = sample / Math.max(1, channels.length);
      outputOffset += 1;
    }
  }
  return output;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}

export function encodeMonoPcm16Wav(samples: Float32Array, sampleRate: number) {
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, samples.length * bytesPerSample, true);
  samples.forEach((sample, index) => {
    const clamped = Math.min(1, Math.max(-1, sample));
    view.setInt16(44 + index * bytesPerSample, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  });
  return new Blob([buffer], { type: "audio/wav" });
}

export function createReferencePreviewBlob(audio: DecodedAudio, ranges: AudioSourceRange[]) {
  const samples = concatenateMonoRanges(audio, ranges);
  if (samples.length === 0) throw new Error("The selected reference region is empty.");
  return encodeMonoPcm16Wav(samples, audio.sampleRate);
}
