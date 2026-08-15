import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = readFileSync(new URL("src/shared/ui/voice-orb/voice-orb.tsx", root), "utf8");
const styles = readFileSync(new URL("src/_app/styles/globals.css", root), "utf8");

function smoothWeightedMax(channels: readonly number[], sharpness = 12) {
  const safe = channels.map((value) => Math.min(1, Math.max(0, value)));
  const weights = safe.map((value) => Math.exp(value * sharpness));
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  return safe.reduce((sum, value, index) => sum + value * (weights[index] ?? 0), 0) / weightSum;
}

test("VoiceOrb smooths internal color normalization without changing the outer silhouette", () => {
  assert.match(source, /float smoothMax3\(vec3 colorIn\)/);
  assert.match(source, /const float sharpness = 12\.0;/);
  assert.match(source, /vec3 weights = exp\(safeColor \* sharpness\);/);
  assert.match(source, /return dot\(safeColor, weights\) \/ max\(weightSum, 1e-4\);/);
  assert.match(source, /float a = clamp\(smoothMax3\(colorIn\), 0\.0, 1\.0\);/);
  assert.doesNotMatch(source, /max\(max\(colorIn\.r, colorIn\.g\), colorIn\.b\)/);

  assert.match(source, /uv \* 0\.32, iTime \* 0\.1 \+ 7\.0/);
  assert.match(source, /\* 0\.16;/);
  assert.match(source, /cl = 0\.5 \+ \(cl - 0\.5\) \* 0\.72;/);
  assert.match(source, /light1\(1\.0, 10\.0, d0\)/);
  assert.doesNotMatch(source, /pow\(clamp\(v0, 0\.0, 1\.0\), 0\.8\)/);

  assert.match(source, /float edgeMask = 1\.0 - smoothstep\(0\.76, 0\.9, length\(uv\)\);/);
  assert.match(source, /const ORB_MOTION_SPEED_SCALE = 0\.5;/);
});

test("VoiceOrb smooth alpha does not exceed the previous hard-max density", () => {
  for (const channels of [
    [0.15, 0.35, 0.8],
    [0.72, 0.44, 0.68],
    [0.9, 0.9, 0.9],
    [0.05, 0.04, 0.03],
  ] as const) {
    const smooth = smoothWeightedMax(channels);
    const hardMax = Math.max(...channels);
    assert.ok(smooth <= hardMax + Number.EPSILON);
    assert.ok(smooth >= Math.min(...channels) - Number.EPSILON);
  }
});

test("VoiceOrb fallback uses broad translucent internal color transitions", () => {
  assert.match(styles, /rgb\(255 244 253 \/ 0\.22\) 24%/);
  assert.match(styles, /rgb\(215 193 246 \/ 0\.1\) 38%/);
  assert.match(styles, /transparent 68%/);
  assert.match(styles, /rgb\(196 168 246 \/ 0\.68\) 0deg/);
  assert.match(styles, /rgb\(225 183 238 \/ 0\.68\) 180deg/);
  assert.match(styles, /rgb\(11 10 28 \/ 0\.42\)/);
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
