import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import test from "node:test";

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return /\.tsx?$/.test(entry.name) ? [path] : [];
    }),
  );
  return files.flat();
}

test("query-managed server state has no component-owned fetch or polling timer", async () => {
  const paths = [
    "src/_pages/dev-svc/ui/singer-workbench.tsx",
    "src/_pages/recommendation-detail/ui/recommendation-results.tsx",
    "src/widgets/library/ui/mixing-library.tsx",
    "src/widgets/library/ui/vocal-profile-library.tsx",
    "src/features/manage-tickets/ui/ticket-adjustment-form.tsx",
    "src/_pages/profile/ui/vocal-profile-workbench.tsx",
  ];
  for (const path of paths) {
    const source = await readFile(path, "utf8");
    assert.doesNotMatch(source, /\bfetch\(/, path);
    assert.doesNotMatch(source, /setInterval\(|setTimeout\(/, path);
  }
});

test("direct Client Component fetch inventory contains only the binary audio preview", async () => {
  const clientFiles: Array<{ path: string; source: string }> = [];
  for (const path of await sourceFiles("src")) {
    const source = await readFile(path, "utf8");
    if (/^["']use client["'];/.test(source)) clientFiles.push({ path: relative(".", path), source });
  }

  const fetchPaths = clientFiles.filter(({ source }) => /\bfetch\(/.test(source)).map(({ path }) => path);
  const timerPaths = clientFiles
    .filter(({ source }) => /setInterval\(|setTimeout\(/.test(source))
    .map(({ path }) => path);
  assert.deepEqual(fetchPaths, ["src/entities/vocal-profile/ui/reference-band-players.tsx"]);
  assert.deepEqual(timerPaths, []);

  const audioPreview = clientFiles.find(({ path }) => path === fetchPaths[0]);
  assert.match(audioPreview?.source ?? "", /response\.arrayBuffer\(\)/);
  assert.doesNotMatch(audioPreview?.source ?? "", /response\.json\(\)/);
});
