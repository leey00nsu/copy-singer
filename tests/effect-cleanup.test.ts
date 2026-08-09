import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("client fetch effects ignore late results without aborting during cleanup", async () => {
  const paths = ["components/recommendation-results.tsx", "components/singer-workbench.tsx"];
  for (const path of paths) {
    const source = await readFile(path, "utf8");
    assert.doesNotMatch(source, /new AbortController\(|controller\.abort\(\)/, path);
    assert.match(source, /active = true/, path);
    assert.match(source, /active = false/, path);
  }
});
