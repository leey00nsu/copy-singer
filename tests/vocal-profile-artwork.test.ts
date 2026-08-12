import assert from "node:assert/strict";
import test from "node:test";

import { vocalProfileArtworkTokens } from "../src/entities/vocal-profile/lib/artwork";

function hues(value: string) {
  return [...value.matchAll(/hsl\((\d+)/g)].map((match) => Number(match[1]));
}

test("vocal profile artwork stays deterministic within the brand hue families", () => {
  const ids = Array.from({ length: 32 }, (_, index) => `profile-${index}`);
  const first = ids.map(vocalProfileArtworkTokens);
  const second = ids.map(vocalProfileArtworkTokens);

  assert.deepEqual(first, second);
  assert.ok(new Set(first.map((token) => token.backgroundImage)).size > 20);

  for (const token of first) {
    const tokenHues = hues(`${token.backgroundColor},${token.backgroundImage}`);
    assert.equal(tokenHues.length, 6);
    assert.ok(tokenHues.every((hue) => (hue >= 202 && hue <= 338) || hue >= 350));
  }
});
