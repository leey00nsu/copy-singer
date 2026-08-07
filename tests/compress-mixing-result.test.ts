import assert from "node:assert/strict";
import test from "node:test";
import { compressMixingResult } from "../lib/audio/compress-mixing-result";

function silentWav(seconds: number, sampleRate = 44_100) {
  const samples = seconds * sampleRate;
  const bytes = new Uint8Array(44 + samples * 2);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  text(0, "RIFF"); view.setUint32(4, bytes.length - 8, true); text(8, "WAVE"); text(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, "data"); view.setUint32(40, samples * 2, true);
  return bytes;
}

test("compresses a WAV mixing result to a smaller AAC/M4A asset", async () => {
  const input = silentWav(2);
  const output = await compressMixingResult(input);
  assert.equal(output.mimeType, "audio/mp4");
  assert.equal(output.extension, "m4a");
  assert.ok(output.bytes.byteLength > 0);
  assert.ok(output.bytes.byteLength < input.byteLength);
});
