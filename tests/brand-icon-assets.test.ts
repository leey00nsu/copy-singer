import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const masterPath = fileURLToPath(new URL("../public/brand/copy-singer-mark.svg", import.meta.url));

test("brand icon keeps the provided waveform geometry and safe fixed gradient", async () => {
  const svg = await readFile(masterPath, "utf8");

  assert.match(svg, /viewBox="0 0 32 32"/);
  assert.match(svg, /gradientUnits="userSpaceOnUse"/);
  assert.match(svg, /x1="3"[^>]+x2="29"/);
  assert.match(svg, /shape-rendering="crispEdges"/);
  assert.deepEqual(svg.match(/<path\b/g)?.length, 7);
  assert.deepEqual(
    [...svg.matchAll(/stop-color="(#[0-9a-f]{6})"/g)].map((match) => match[1]),
    ["#7e41ed", "#3678e6", "#cd69c6"],
  );
  assert.doesNotMatch(svg, /<script\b|\bon[a-z]+\s*=|(?:href|src)\s*=|data:/i);
});

for (const [name, size] of [
  ["favicon.png", 64],
  ["apple-touch-icon.png", 180],
] as const) {
  test(`${name} is a transparent RGBA derivative of the SVG master`, async () => {
    const imagePath = fileURLToPath(new URL(`../public/${name}`, import.meta.url));
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    assert.equal(metadata.format, "png");
    assert.equal(metadata.width, size);
    assert.equal(metadata.height, size);
    assert.equal(metadata.hasAlpha, true);
    assert.equal(data[3], 0);

    const alpha = Array.from({ length: info.width * info.height }, (_, index) => data[index * info.channels + 3]);
    assert.ok(alpha.some((value) => value === 0));
    assert.ok(alpha.some((value) => value > 0));
  });
}

test("the 16px rendering preserves transparent columns between all seven bars", async () => {
  const { data, info } = await sharp(masterPath)
    .resize(16, 16)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const occupiedColumns = Array.from({ length: info.width }, (_, x) =>
    Array.from({ length: info.height }, (_, y) => data[(y * info.width + x) * info.channels + 3]).some(
      (alpha) => alpha >= 128,
    ),
  );
  const runs = occupiedColumns
    .map((occupied, index) => ({ occupied, index }))
    .filter(({ occupied }) => occupied)
    .reduce<number[][]>((groups, { index }) => {
      const current = groups.at(-1);
      if (current && current.at(-1) === index - 1) current.push(index);
      else groups.push([index]);
      return groups;
    }, []);

  assert.equal(runs.length, 7);
});

test("the Open Graph image is a branded 1200x630 RGB derivative", async () => {
  const source = await readFile(new URL("../public/brand/copy-singer-og.svg", import.meta.url), "utf8");
  const metadata = await sharp(fileURLToPath(new URL("../public/og.png", import.meta.url))).metadata();

  assert.match(source, />Copy Singer</);
  assert.match(source, /gradientUnits="userSpaceOnUse"/);
  assert.match(source, /#7e41ed/);
  assert.match(source, /#3678e6/);
  assert.match(source, /#cd69c6/);
  assert.doesNotMatch(source, /Vocal Loom|#f[0-9a-f]{2}[de][0-9a-f]{2}/i);
  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 630);
  assert.equal(metadata.hasAlpha, false);
});
