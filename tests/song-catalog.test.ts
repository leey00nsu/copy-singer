import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { parseSongCatalogMarkdown } from "../lib/song-catalog/catalog";
import { parseSongBatchOptions } from "../lib/song-catalog/pipeline";

const catalogPath = path.join(process.cwd(), "data/catalogs/tj-2607-top100.md");

test("parses the provided TJ 2026-07 Top 100 catalog", async () => {
  const markdown = await readFile(catalogPath, "utf8");
  const entries = parseSongCatalogMarkdown(markdown);

  assert.equal(entries.length, 100);
  assert.equal(entries[0]?.title, "Drowning");
  assert.equal(entries[0]?.sourceVideoId, "NbKH4iZqq1Y");
  assert.equal(entries[99]?.title, "시작의 아이");
  assert.equal(entries[99]?.sourceVideoId, "5x_CM7x5BQA");

  const prettyGirls = entries.filter((entry) => entry.title === "Pretty Girl");
  assert.deepEqual(
    prettyGirls.map((entry) => entry.artist),
    ["RESCENE(리센느)", "카라"],
  );
});

test("rejects a catalog with a missing rank", async () => {
  const markdown = await readFile(catalogPath, "utf8");
  const missingSecond = markdown.replace(/^2\..+\n/m, "");

  assert.throws(
    () => parseSongCatalogMarkdown(missingSecond, 99),
    /Catalog order must be continuous/,
  );
});

test("rejects duplicate YouTube IDs", async () => {
  const markdown = await readFile(catalogPath, "utf8");
  const duplicated = markdown.replace("fgvphH7z1qw", "NbKH4iZqq1Y");

  assert.throws(() => parseSongCatalogMarkdown(duplicated), /Duplicate YouTube video IDs/);
});

test("parses bounded sequential batch options", () => {
  assert.deepEqual(parseSongBatchOptions(["--limit", "3", "--rank", "49", "--resume"]), {
    limit: 3,
    rank: 49,
    resume: true,
  });
  assert.throws(() => parseSongBatchOptions(["--rank", "101"]), /between 1 and 100/);
  assert.throws(() => parseSongBatchOptions(["--download-only"]), /Unknown/);
});
