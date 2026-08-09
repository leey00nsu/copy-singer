import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

const storybookPackages = [
  "storybook",
  "@storybook/nextjs-vite",
  "@storybook/addon-docs",
  "@storybook/addon-a11y",
  "@storybook/addon-vitest",
  "msw-storybook-addon",
  "vitest",
  "@vitest/browser",
  "@vitest/browser-playwright",
  "@vitest/runner",
  "playwright",
  "vite",
];

test("Storybook tooling remains development-only", () => {
  for (const packageName of storybookPackages) {
    assert.equal(
      packageJson.dependencies?.[packageName],
      undefined,
      `${packageName} must not be a production dependency`,
    );
    assert.ok(packageJson.devDependencies?.[packageName], `${packageName} must be a development dependency`);
  }

  assert.doesNotMatch(packageJson.scripts?.build ?? "", /storybook/i);
  assert.doesNotMatch(packageJson.scripts?.start ?? "", /storybook/i);
  assert.doesNotMatch(packageJson.scripts?.["start:web"] ?? "", /storybook/i);
});

test("MSW worker is served only by Storybook", () => {
  const storybookMain = readFileSync(path.join(root, ".storybook/main.ts"), "utf8");

  assert.match(storybookMain, /staticDirs:\s*\["\.\/public"\]/);
  assert.equal(existsSync(path.join(root, ".storybook/public/mockServiceWorker.js")), true);
  assert.equal(existsSync(path.join(root, "public/mockServiceWorker.js")), false);
});

function findStoryFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findStoryFiles(entryPath);
    return entry.name.includes(".stories.") ? [entryPath] : [];
  });
}

test("Storybook sources do not import server-only application modules", () => {
  const forbiddenImports = [
    /from\s+["']server-only["']/,
    /from\s+["']next\/(headers|server)["']/,
    /from\s+["'][^"']*index\.server["']/,
    /from\s+["']@\/shared\/db(?:\/|["'])/,
    /from\s+["']@prisma\//,
  ];

  for (const storyFile of findStoryFiles(path.join(root, "src"))) {
    const source = readFileSync(storyFile, "utf8");
    for (const pattern of forbiddenImports) {
      assert.doesNotMatch(source, pattern, `${path.relative(root, storyFile)} must remain browser-safe`);
    }
  }
});
