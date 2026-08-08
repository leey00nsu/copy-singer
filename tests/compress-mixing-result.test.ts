import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  CLARITY_NORMAL_FILTER_CHAIN,
  MIXING_FINALIZATION_VERSION,
  compressMixingResult,
} from "../lib/audio/compress-mixing-result";

function toneWav(seconds: number, sampleRate = 44_100) {
  const samples = seconds * sampleRate;
  const bytes = new Uint8Array(44 + samples * 2);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  text(0, "RIFF"); view.setUint32(4, bytes.length - 8, true); text(8, "WAVE"); text(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, "data"); view.setUint32(40, samples * 2, true);
  for (let index = 0; index < samples; index += 1) {
    const time = index / sampleRate;
    const value = Math.sin(2 * Math.PI * 440 * time) * 0.2 + Math.sin(2 * Math.PI * 3_500 * time) * 0.03;
    view.setInt16(44 + index * 2, Math.round(Math.max(-1, Math.min(1, value)) * 32767), true);
  }
  return bytes;
}

test("clarity-normal-v1 filter contract stays fixed", () => {
  assert.equal(MIXING_FINALIZATION_VERSION, "clarity-normal-v1");
  assert.equal(
    CLARITY_NORMAL_FILTER_CHAIN,
    [
      "highpass=f=25",
      "bass=f=95:t=q:w=0.7:g=-0.4",
      "equalizer=f=280:t=q:w=0.9:g=-1.4",
      "equalizer=f=3500:t=q:w=0.9:g=1.3",
      "treble=f=8500:t=q:w=0.6:g=1.7",
      "acompressor=threshold=0.2:ratio=1.5:attack=20:release=220:knee=2.8:link=maximum:detection=rms:mix=1",
      "extrastereo=m=1.05:c=false",
      "loudnorm=I=-14:LRA=11:TP=-1.0",
    ].join(","),
  );
});

test("finalizes a WAV mixing result to 44.1 kHz stereo AAC/M4A", async () => {
  const input = toneWav(2);
  const output = await compressMixingResult(input);
  assert.equal(output.mimeType, "audio/mp4");
  assert.equal(output.extension, "m4a");
  assert.ok(output.bytes.byteLength > 0);
  assert.ok(output.bytes.byteLength < input.byteLength);

  const directory = await mkdtemp(join(tmpdir(), "copy-singer-finalizer-test-"));
  const outputPath = join(directory, "output.m4a");
  try {
    await writeFile(outputPath, output.bytes);
    const probe = spawnSync(process.env.FFPROBE_BIN || "ffprobe", [
      "-v", "error",
      "-select_streams", "a:0",
      "-show_entries", "stream=codec_name,sample_rate,channels",
      "-of", "json",
      outputPath,
    ], { encoding: "utf8" });
    assert.equal(probe.status, 0, probe.stderr);
    const parsed = JSON.parse(probe.stdout) as { streams?: Array<{ codec_name?: string; sample_rate?: string; channels?: number }> };
    assert.equal(parsed.streams?.[0]?.codec_name, "aac");
    assert.equal(parsed.streams?.[0]?.sample_rate, "44100");
    assert.equal(parsed.streams?.[0]?.channels, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
