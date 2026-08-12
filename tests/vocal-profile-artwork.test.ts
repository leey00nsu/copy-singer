import assert from "node:assert/strict";
import test from "node:test";

import { type VocalProfileArtworkAnalysis, vocalProfileArtworkTokens } from "../src/entities/vocal-profile/lib/artwork";

const balancedVoice: VocalProfileArtworkAnalysis = {
  minMidi: 46,
  maxMidi: 70,
  medianMidi: 58,
  pitchStability: 0.86,
  voicedRatio: 0.82,
  rmsDb: -20,
};

function firstHue(value: string) {
  const match = value.match(/hsl\((\d+)/);
  assert.ok(match);
  return Number(match[1]);
}

test("vocal profile artwork is deterministic for the same profile and analysis", () => {
  const first = vocalProfileArtworkTokens("profile-stable", balancedVoice);
  const second = vocalProfileArtworkTokens("profile-stable", balancedVoice);

  assert.deepEqual(first, second);
});

test("voice median, range and quality metrics influence the artwork", () => {
  const lowNarrow = vocalProfileArtworkTokens("profile-voice", {
    ...balancedVoice,
    minMidi: 38,
    maxMidi: 52,
    medianMidi: 45,
    pitchStability: 0.55,
    voicedRatio: 0.48,
    rmsDb: -36,
  });
  const highWide = vocalProfileArtworkTokens("profile-voice", {
    ...balancedVoice,
    minMidi: 52,
    maxMidi: 82,
    medianMidi: 70,
    pitchStability: 0.95,
    voicedRatio: 0.94,
    rmsDb: -12,
  });

  assert.notEqual(firstHue(lowNarrow.backgroundColor), firstHue(highWide.backgroundColor));
  assert.notEqual(lowNarrow.backgroundColor, highWide.backgroundColor);
  assert.notEqual(lowNarrow.backgroundImage, highWide.backgroundImage);
});

test("profile identity adds stable variation and legacy payloads keep an id fallback", () => {
  const identities = Array.from({ length: 24 }, (_, index) =>
    vocalProfileArtworkTokens(`profile-${index}`, balancedVoice),
  );
  const fallback = vocalProfileArtworkTokens("legacy-profile");

  assert.ok(new Set(identities.map((token) => token.backgroundImage)).size > 20);
  assert.match(fallback.backgroundColor, /^hsl\(\d+ \d+% \d+%\)$/);
  assert.match(fallback.backgroundImage, /radial-gradient/);
});
