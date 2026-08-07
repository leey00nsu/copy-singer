import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function tsxFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return tsxFiles(target);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [target] : [];
  }));
  return nested.flat();
}

test("every Base UI Button that renders a Next.js Link declares non-native semantics", async () => {
  const root = path.resolve(import.meta.dirname, "..");
  const files = [...await tsxFiles(path.join(root, "app")), ...await tsxFiles(path.join(root, "components"))];
  let linkButtonCount = 0;

  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const [index, line] of source.split("\n").entries()) {
      if (!line.includes("<Button") || !line.includes("render={<Link")) continue;
      linkButtonCount += 1;
      assert.match(line, /nativeButton=\{false\}/, `${path.relative(root, file)}:${index + 1} must set nativeButton={false}`);
    }
  }

  assert.equal(linkButtonCount, 10, "expected every current Button-rendered Link to be validated");
});
