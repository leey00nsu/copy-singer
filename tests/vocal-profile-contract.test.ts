import assert from "node:assert/strict";
import test from "node:test";
import {
  type AnalyzerProfile,
  hasSmartReferenceContract,
  SMART_REFERENCE_MID_VERSION,
  SMART_REFERENCE_VERSION,
  synthesisReferenceContractVersion,
} from "../lib/vocal-profile/contract";
import { midiToNoteName } from "../lib/vocal-profile/pitch";

test("MIDI values are rounded to Korean UI note labels", () => {
  assert.equal(midiToNoteName(48), "C3");
  assert.equal(midiToNoteName(54.6), "G3");
  assert.equal(midiToNoteName(60), "C4");
  assert.equal(midiToNoteName(65.7), "F♯4");
});

function unavailableProfile(version: string) {
  return {
    recordingId: "recording",
    descriptors: { synthesisReference: { version, status: "unavailable" } },
    synthesisReference: null,
  } as unknown as AnalyzerProfile;
}

function readyProfile(input: {
  descriptorVersion: string;
  artifactVersion?: string;
  descriptorRanges: Array<Record<string, unknown>>;
  artifactRanges?: Array<Record<string, unknown>>;
}) {
  return {
    recordingId: "recording",
    descriptors: {
      synthesisReference: {
        version: input.descriptorVersion,
        sourceRanges: input.descriptorRanges,
      },
    },
    synthesisReference: {
      version: input.artifactVersion ?? input.descriptorVersion,
      sourceRanges: input.artifactRanges ?? input.descriptorRanges,
    },
  } as unknown as AnalyzerProfile;
}

test("accepts legacy and mid-only synthesis reference contract versions", () => {
  const legacy = unavailableProfile(SMART_REFERENCE_VERSION);
  const mid = unavailableProfile(SMART_REFERENCE_MID_VERSION);

  assert.equal(hasSmartReferenceContract(legacy), true);
  assert.equal(hasSmartReferenceContract(mid), true);
  assert.equal(synthesisReferenceContractVersion(legacy.descriptors), SMART_REFERENCE_VERSION);
  assert.equal(synthesisReferenceContractVersion(mid.descriptors), SMART_REFERENCE_MID_VERSION);
});

test("rejects analyzer responses that predate or exceed the supported reference contracts", () => {
  const legacy = unavailableProfile(SMART_REFERENCE_VERSION);
  assert.equal(hasSmartReferenceContract({ ...legacy, descriptors: {}, synthesisReference: undefined }), false);
  assert.equal(hasSmartReferenceContract(unavailableProfile("smart-reference-future-v2")), false);
  assert.equal(
    synthesisReferenceContractVersion({ synthesisReference: { version: "smart-reference-future-v2" } }),
    null,
  );
});

test("mid-only success requires matching versions and only mid source ranges", () => {
  const valid = readyProfile({
    descriptorVersion: SMART_REFERENCE_MID_VERSION,
    descriptorRanges: [{ startMs: 100, endMs: 900, band: "mid" }],
  });
  assert.equal(hasSmartReferenceContract(valid), true);

  assert.equal(
    hasSmartReferenceContract(
      readyProfile({
        descriptorVersion: SMART_REFERENCE_MID_VERSION,
        artifactVersion: SMART_REFERENCE_VERSION,
        descriptorRanges: [{ startMs: 100, endMs: 900, band: "mid" }],
      }),
    ),
    false,
  );

  assert.equal(
    hasSmartReferenceContract(
      readyProfile({
        descriptorVersion: SMART_REFERENCE_MID_VERSION,
        descriptorRanges: [{ startMs: 100, endMs: 900, band: "low" }],
      }),
    ),
    false,
  );

  assert.equal(
    hasSmartReferenceContract(
      readyProfile({
        descriptorVersion: SMART_REFERENCE_MID_VERSION,
        descriptorRanges: [{ startMs: 100, endMs: 900, band: "mid" }],
        artifactRanges: [{ startMs: 100, endMs: 900, band: "high" }],
      }),
    ),
    false,
  );

  assert.equal(
    hasSmartReferenceContract(
      readyProfile({
        descriptorVersion: SMART_REFERENCE_MID_VERSION,
        descriptorRanges: [],
      }),
    ),
    false,
  );
});

test("legacy smart-reference-v1 keeps accepting its low/mid/high range shape", () => {
  const legacy = readyProfile({
    descriptorVersion: SMART_REFERENCE_VERSION,
    descriptorRanges: [
      { startMs: 100, endMs: 900, band: "low" },
      { startMs: 1_000, endMs: 1_800, band: "mid" },
      { startMs: 2_000, endMs: 2_800, band: "high" },
    ],
  });
  assert.equal(hasSmartReferenceContract(legacy), true);
});
