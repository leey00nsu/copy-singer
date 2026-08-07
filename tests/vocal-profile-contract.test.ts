import assert from "node:assert/strict";
import test from "node:test";
import { midiToNoteName } from "../lib/vocal-profile/pitch";
import { hasSmartReferenceContract, type AnalyzerProfile } from "../lib/vocal-profile/contract";

test("MIDI values are rounded to Korean UI note labels", () => {
  assert.equal(midiToNoteName(48), "C3");
  assert.equal(midiToNoteName(54.6), "G3");
  assert.equal(midiToNoteName(60), "C4");
  assert.equal(midiToNoteName(65.7), "F♯4");
});

const analyzerProfile = {
  recordingId: "recording", descriptors: { synthesisReference: { version: "smart-reference-v1", status: "unavailable" } },
  synthesisReference: null,
} as unknown as AnalyzerProfile;

test("rejects analyzer responses that predate the smart reference contract", () => {
  assert.equal(hasSmartReferenceContract(analyzerProfile), true);
  assert.equal(hasSmartReferenceContract({ ...analyzerProfile, descriptors: {}, synthesisReference: undefined }), false);
});
