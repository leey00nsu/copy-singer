import assert from "node:assert/strict";
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
