import assert from "node:assert/strict";
import test from "node:test";
import { concatenateMonoRanges, encodeMonoPcm16Wav } from "../lib/audio/reference-preview";

test("concatenates only the selected source ranges into one mono preview", () => {
  const left = Float32Array.from([0, 0.2, 0.4, 0.6, 0.8, 1]);
  const right = Float32Array.from([0, 0.4, 0.6, 0.8, 1, 1]);
  const preview = concatenateMonoRanges({
    sampleRate: 2,
    numberOfChannels: 2,
    length: left.length,
    getChannelData: (channel) => channel === 0 ? left : right,
  }, [
    { startSeconds: 0.5, endSeconds: 1.5 },
    { startSeconds: 2, endSeconds: 3 },
  ]);
  assert.deepEqual(Array.from(preview, (value) => Number(value.toFixed(2))), [0.3, 0.5, 0.9, 1]);
});

test("encodes the isolated preview as mono 16-bit PCM WAV", async () => {
  const wav = encodeMonoPcm16Wav(Float32Array.from([-1, 0, 1]), 16_000);
  const bytes = new Uint8Array(await wav.arrayBuffer());
  assert.equal(wav.type, "audio/wav");
  assert.equal(wav.size, 50);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "RIFF");
  assert.equal(new DataView(bytes.buffer).getUint32(24, true), 16_000);
  assert.equal(new DataView(bytes.buffer).getUint16(22, true), 1);
});
