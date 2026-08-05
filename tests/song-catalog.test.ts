import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import {
  createSongProfileArtifact,
  loadOrCreateSongProfileArtifact,
  validateSongProfileArtifact,
  writeSongProfileArtifact,
} from "../lib/song-catalog/artifact";
import { parseSongCatalogMarkdown } from "../lib/song-catalog/catalog";
import {
  analyzeSongProfileArtifact,
  parseSongBatchOptions,
} from "../lib/song-catalog/pipeline";

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

test("writes and reloads a 100-song artifact atomically", async () => {
  const entries = parseSongCatalogMarkdown(await readFile(catalogPath, "utf8"));
  const directory = await mkdtemp(path.join(tmpdir(), "copy-singer-artifact-test-"));
  const artifactPath = path.join(directory, "profiles.json");
  try {
    const artifact = createSongProfileArtifact(entries);
    await writeSongProfileArtifact(artifactPath, artifact);
    const loaded = await loadOrCreateSongProfileArtifact(artifactPath, entries);
    assert.equal(validateSongProfileArtifact(loaded, entries).songs.length, 100);
    assert.deepEqual(await readdir(directory), ["profiles.json"]);
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("stores analyzer metrics in the artifact without a database", async (t) => {
  const entries = parseSongCatalogMarkdown(await readFile(catalogPath, "utf8"));
  const artifact = createSongProfileArtifact(entries);
  t.mock.method(globalThis, "fetch", async () =>
    new Response(
      JSON.stringify({
        durationMs: 180000,
        sampleRate: 22050,
        sourceSizeBytes: 12345,
        minMidi: 48,
        maxMidi: 72,
        p10Midi: 52,
        medianMidi: 60,
        p90Midi: 69,
        tessituraLowMidi: 52,
        tessituraHighMidi: 69,
        voicedRatio: 0.5,
        pitchStability: 0.8,
        clippingRatio: 0,
        rmsDb: -18,
        analyzer: "librosa-pyin",
        analyzerVersion: "fixture",
        descriptors: { fixture: true },
        ytDlpVersion: "fixture",
        separator: "demucs",
        separatorVersion: "fixture",
        separatorModel: "htdemucs",
        cleanupConfirmed: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
  let persisted = 0;
  const summary = await analyzeSongProfileArtifact(
    artifact,
    "http://analyzer.test",
    { limit: 1, rank: null, resume: true },
    async () => {
      persisted += 1;
    },
  );
  assert.deepEqual(summary, { selected: 1, succeeded: 1, failed: 0, skipped: 0 });
  assert.equal(persisted, 1);
  assert.equal(artifact.songs[0]?.status, "READY");
  assert.equal(artifact.songs[0]?.profile?.cleanupConfirmed, true);
});

test("retries transient analyzer failures before marking a song failed", async (t) => {
  const entries = parseSongCatalogMarkdown(await readFile(catalogPath, "utf8"));
  const artifact = createSongProfileArtifact(entries);
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests += 1;
    if (requests === 1) {
      return new Response(
        JSON.stringify({ reasonCode: "YT_DLP_FAILED", detail: "temporary extractor failure" }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        durationMs: 1,
        sampleRate: 22050,
        sourceSizeBytes: 1,
        minMidi: 48,
        maxMidi: 72,
        p10Midi: 52,
        medianMidi: 60,
        p90Midi: 69,
        tessituraLowMidi: 52,
        tessituraHighMidi: 69,
        voicedRatio: 0.5,
        pitchStability: 0.8,
        clippingRatio: 0,
        rmsDb: -18,
        analyzer: "librosa-pyin",
        analyzerVersion: "fixture",
        descriptors: {},
        ytDlpVersion: "fixture",
        separator: "demucs",
        separatorVersion: "fixture",
        separatorModel: "htdemucs",
        cleanupConfirmed: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });
  const summary = await analyzeSongProfileArtifact(
    artifact,
    "http://analyzer.test",
    { limit: 1, rank: null, resume: true },
    async () => undefined,
    { sleep: async () => undefined },
  );
  assert.equal(requests, 2);
  assert.equal(summary.succeeded, 1);
  assert.equal(artifact.songs[0]?.status, "READY");
});
