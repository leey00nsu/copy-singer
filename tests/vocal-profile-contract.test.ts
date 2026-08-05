import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  GUIDE_MELODY_DURATION_MS,
  GUIDE_PRESETS,
  GUIDE_RECORDING_DURATION_MS,
  guideFormFields,
  guideMidiNotes,
  midiToNoteName,
} from "../lib/vocal-profile/guide-melody";

test("guided presets keep the same relative melody in three ranges", () => {
  assert.deepEqual(Object.keys(GUIDE_PRESETS), ["low", "medium", "high"]);
  assert.equal(guideMidiNotes("low")[0], 48);
  assert.equal(guideMidiNotes("medium")[0], 55);
  assert.equal(guideMidiNotes("high").at(-1), 60);
  assert.equal(GUIDE_MELODY_DURATION_MS, 12_000);
  assert.equal(GUIDE_RECORDING_DURATION_MS, 21_000);
  assert.deepEqual(guideFormFields("medium"), {
    preset: "medium",
    melody_start_ms: "0",
    melody_end_ms: "12000",
    glissando_start_ms: "13500",
    glissando_end_ms: "21000",
  });
});

test("MIDI values are rounded to Korean UI note labels", () => {
  assert.equal(midiToNoteName(48), "C3");
  assert.equal(midiToNoteName(54.6), "G3");
  assert.equal(midiToNoteName(60), "C4");
  assert.equal(midiToNoteName(65.7), "F♯4");
});

test("OmniVoice humming assets preserve the deterministic guide contract", () => {
  const manifest = JSON.parse(readFileSync(new URL("../public/audio/guides/manifest.json", import.meta.url), "utf8"));
  assert.deepEqual(manifest.mix, { humming: 0.8, sine: 0.2 });
  assert.equal(manifest.note_duration_ms, 750);

  for (const [preset, expected] of Object.entries({ low: [48, 57], medium: [55, 64], high: [60, 69] })) {
    const metrics = manifest.presets[preset];
    assert.equal(metrics.duration_seconds, 12);
    assert.ok(metrics.stable_spread_semitones <= 1.5);
    assert.ok(Math.abs(metrics.measured_min_midi - expected[0]) <= 0.5);
    assert.ok(Math.abs(metrics.measured_max_midi - expected[1]) <= 0.5);

    const wav = readFileSync(new URL(`../public${metrics.asset}`, import.meta.url));
    assert.equal(wav.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(wav.subarray(8, 12).toString("ascii"), "WAVE");
  }
});
