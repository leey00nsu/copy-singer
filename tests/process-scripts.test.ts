import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

type PackageJson = { scripts?: Record<string, string> };

test("default dev and start commands supervise web, mixing, and vocal-profile analysis workers", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as PackageJson;
  const scripts = packageJson.scripts ?? {};

  assert.equal(scripts["dev:web"], "next dev");
  assert.equal(scripts["start:web"], "next start");
  for (const name of ["dev", "start"] as const) {
    assert.match(scripts[name] ?? "", /^concurrently --kill-others-on-fail /);
    assert.match(scripts[name] ?? "", new RegExp(`pnpm run ${name}:web`));
    assert.match(scripts[name] ?? "", /pnpm run worker:mixing/);
    assert.match(scripts[name] ?? "", /pnpm run worker:vocal-profile-analysis/);
    assert.match(scripts[name] ?? "", /pnpm run worker:song-analysis/);
  }
  assert.match(scripts["worker:vocal-profile-analysis"] ?? "", /scripts\/vocal-profile-analysis-worker\.ts/);
  assert.match(scripts["worker:song-analysis"] ?? "", /scripts\/song-analysis-worker\.ts/);
});

test("the process supervisor terminates the sibling when one child fails", async () => {
  const child = spawn(
    "pnpm",
    [
      "exec",
      "concurrently",
      "--kill-others-on-fail",
      "--names",
      "hold,fail",
      'node -e "setInterval(() => {}, 1000)"',
      'node -e "process.exit(7)"',
    ],
    { cwd: new URL("..", import.meta.url), stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
    output += chunk;
  });
  child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
    output += chunk;
  });
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("concurrently did not terminate after a child failure"));
    }, 10_000);
    child.once("error", reject);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });

  assert.notEqual(exitCode, 0);
  assert.match(output, /Sending SIGTERM to other processes/);
  assert.match(output, /hold.*SIGTERM/);
});
