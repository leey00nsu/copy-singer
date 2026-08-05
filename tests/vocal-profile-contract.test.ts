import assert from "node:assert/strict";
import test from "node:test";
import { midiToNoteName } from "../lib/vocal-profile/pitch";

test("MIDI values are rounded to Korean UI note labels", () => {
  assert.equal(midiToNoteName(48), "C3");
  assert.equal(midiToNoteName(54.6), "G3");
  assert.equal(midiToNoteName(60), "C4");
  assert.equal(midiToNoteName(65.7), "F♯4");
});
