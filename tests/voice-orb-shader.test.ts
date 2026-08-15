import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = readFileSync(new URL("src/shared/ui/voice-orb/voice-orb.tsx", root), "utf8");
const styles = readFileSync(new URL("src/_app/styles/globals.css", root), "utf8");

test("VoiceOrb smooths internal color normalization without changing the outer silhouette", () => {
  assert.match(source, /float smoothMax3\(vec3 colorIn\)/);
  assert.match(source, /float a = clamp\(smoothMax3\(colorIn\), 0\.0, 1\.0\);/);
  assert.doesNotMatch(source, /max\(max\(colorIn\.r, colorIn\.g\), colorIn\.b\)/);

  assert.match(source, /uv \* 0\.32, iTime \* 0\.1 \+ 7\.0/);
  assert.match(source, /\* 0\.16;/);
  assert.match(source, /cl = 0\.5 \+ \(cl - 0\.5\) \* 0\.72;/);
  assert.match(source, /light1\(1\.0, 6\.5, d0\)/);
  assert.match(source, /pow\(clamp\(v0, 0\.0, 1\.0\), 0\.8\)/);

  assert.match(source, /float edgeMask = 1\.0 - smoothstep\(0\.76, 0\.9, length\(uv\)\);/);
  assert.match(source, /const ORB_MOTION_SPEED_SCALE = 0\.5;/);
});

test("VoiceOrb fallback uses broad internal color transitions", () => {
  assert.match(styles, /rgb\(255 244 253 \/ 0\.34\) 24%/);
  assert.match(styles, /rgb\(215 193 246 \/ 0\.18\) 38%/);
  assert.match(styles, /transparent 68%/);
  assert.match(styles, /#c4a8f6 0deg, #b9baf2 90deg, #e1b7ee 180deg, #c8b5f0 270deg/);
  assert.doesNotMatch(styles, /rgb\(26 18 54\), transparent 47%/);
});

test("VoiceOrb keeps its existing public controls", () => {
  for (const prop of [
    "backgroundColor?: string",
    "forceFallback?: boolean",
    "hoverIntensity?: number",
    "hue?: number",
    "rotateOnHover?: boolean",
    "speed?: number",
  ]) {
    assert.match(source, new RegExp(prop.replace(/[?]/g, "\\?")));
  }
});
