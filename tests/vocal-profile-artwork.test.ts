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

function artworkHues(value: string) {
  return [...value.matchAll(/hsl\((\d+)/g)].map((match) => Number(match[1]));
}

function circularHueDistance(first: number, second: number) {
  const distance = Math.abs(first - second);
  return Math.min(distance, 360 - distance);
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

test("each analyzed artwork stays inside one restrained Aurora hue family", () => {
  const profiles = [44, 54, 64, 76].map((medianMidi, index) =>
    vocalProfileArtworkTokens(`profile-family-${index}`, {
      ...balancedVoice,
      minMidi: medianMidi - 12,
      maxMidi: medianMidi + 14,
      medianMidi,
    }),
  );

  for (const profile of profiles) {
    const hues = [firstHue(profile.backgroundColor), ...artworkHues(profile.backgroundImage)];
    const distances = hues.flatMap((hue, index) =>
      hues.slice(index + 1).map((candidate) => circularHueDistance(hue, candidate)),
    );
    assert.ok(Math.max(...distances) <= 65);
  }

  assert.equal(new Set(profiles.map((profile) => firstHue(profile.backgroundColor))).size, 4);
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
