import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startProvider } from "./provider.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const output = path.join(root, "artifacts/e2e");
mkdirSync(output, { recursive: true });
const temp = mkdtempSync(path.join(tmpdir(), "copy-singer-e2e-"));
const container = `copy-singer-e2e-${Date.now()}`;
const children = new Set();
const suiteHash = () =>
  createHash("sha256")
    .update(
      ["journeys.spec.mjs", "provider.mjs", "seed.ts", "playwright.config.mjs", "deny-external.mjs"]
        .map((file) => readFileSync(path.join(root, "tests/e2e", file)))
        .reduce((a, b) => Buffer.concat([a, b]), Buffer.alloc(0)),
    )
    .digest("hex");
const expectedSuiteHash = suiteHash();
const command = async (cmd, args, cwd, env, log) => {
  const fd = openSync(log, "a");
  const child = spawn(cmd, args, { cwd, env, detached: true, stdio: ["ignore", fd, fd] });
  closeSync(fd);
  children.add(child);
  const result = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code));
  });
  children.delete(child);
  if (result !== 0) throw new Error(`${cmd} failed (${result}); see ${log}`);
};
const start = (cmd, args, cwd, env, log) => {
  const fd = openSync(log, "a");
  const child = spawn(cmd, args, { cwd, env, detached: true, stdio: ["ignore", fd, fd] });
  closeSync(fd);
  children.add(child);
  return child;
};
async function stopChildren() {
  for (const child of children)
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      /* The owned process or container already exited. */
    }
  await new Promise((r) => setTimeout(r, 1000));
  for (const child of children)
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      /* The owned process or container already exited. */
    }
  children.clear();
}
async function freePort() {
  const s = createServer();
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const port = s.address().port;
  await new Promise((r) => s.close(r));
  return port;
}
let provider;
let cleaning;
async function cleanup() {
  if (cleaning) return cleaning;
  cleaning = (async () => {
    await stopChildren();
    if (provider) await provider.close();
    try {
      execFileSync("docker", ["stop", container], { stdio: "pipe" });
    } catch {
      /* The task-owned container may already be gone. */
    }
    rmSync(temp, { recursive: true, force: true });
  })();
  return cleaning;
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    void cleanup().finally(() => process.exit(130));
  });
try {
  execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "-d",
      "--name",
      container,
      "-e",
      "POSTGRES_USER=e2e",
      "-e",
      "POSTGRES_PASSWORD=e2e-only",
      "-p",
      "127.0.0.1::5432",
      "postgres:16-alpine",
    ],
    { stdio: "pipe" },
  );
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      execFileSync("docker", ["exec", container, "pg_isready", "-h", "127.0.0.1", "-U", "e2e"], { stdio: "pipe" });
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  if (!ready) throw new Error("Isolated Postgres did not start");
  const dbPort = execFileSync("docker", ["port", container, "5432"], { encoding: "utf8" }).trim().split(":").at(-1);
  const compareIndex = process.argv.indexOf("--compare");
  const targets = [];
  if (compareIndex >= 0) {
    const ref = process.argv[compareIndex + 1];
    if (!ref) throw new Error("--compare requires a Git revision");
    const sha = execFileSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    const baseline = path.join(temp, "baseline");
    mkdirSync(baseline);
    const archive = path.join(temp, "baseline.tar");
    execFileSync("git", ["archive", "--format=tar", `--output=${archive}`, sha], { cwd: root });
    execFileSync("tar", ["-xf", archive, "-C", baseline]);
    mkdirSync(path.join(baseline, "tests/e2e"), { recursive: true });
    copyFileSync(path.join(root, "tests/e2e/seed.ts"), path.join(baseline, "tests/e2e/seed.ts"));
    targets.push({ name: "baseline", dir: baseline, sha });
  }
  targets.push({
    name: "candidate",
    dir: root,
    sha: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  });
  const outcomes = [];
  for (const target of targets) {
    if (suiteHash() !== expectedSuiteHash) throw new Error("E2E suite changed during comparison; restart the run");
    const destination = path.join(output, target.name);
    mkdirSync(destination, { recursive: true });
    for (const file of ["web.log", "vocal-profile-analysis.log", "mixing.log", "playwright.log"])
      writeFileSync(path.join(destination, file), "");
    provider = await startProvider();
    const port = await freePort(),
      dbName = `e2e_${target.name}`;
    execFileSync("docker", ["exec", container, "createdb", "-h", "127.0.0.1", "-U", "e2e", dbName]);
    const env = {
      ...process.env,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      DATABASE_URL: `postgresql://e2e:e2e-only@127.0.0.1:${dbPort}/${dbName}`,
      BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
      BETTER_AUTH_SECRET: "e2e-only-session-secret-never-use-in-production-1234",
      GOOGLE_CLIENT_ID: "e2e-unused",
      GOOGLE_CLIENT_SECRET: "e2e-unused",
      DEV_AUTH_BYPASS_ENABLED: "false",
      ADMIN_EMAILS: "admin@example.test",
      TRUST_PROXY_CLIENT_IP: "false",
      LEEMAGE_BASE_URL: provider.origin,
      LEEMAGE_API_KEY: "e2e-only",
      LEEMAGE_PROJECT_ID: "e2e",
      MODAL_API_URL: provider.origin,
      MODAL_API_KEY: "e2e-only",
      VOCAL_PROFILE_MODAL_URL: provider.origin,
      VOCAL_PROFILE_MODAL_API_KEY: "e2e-only",
      SONG_ANALYSIS_MODAL_URL: provider.origin,
      SONG_ANALYSIS_MODAL_API_KEY: "e2e-only",
      SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT: "5",
      SIGNUP_MIXING_TICKET_GRANT: "5",
      VOCAL_PROFILE_ANALYSIS_TICKET_COST: "1",
      MIXING_TICKET_COST: "1",
      MIXING_POLL_INTERVAL_MS: "100",
      E2E_BASE_URL: `http://127.0.0.1:${port}`,
      E2E_PROVIDER: provider.origin,
      E2E_OUTPUT: destination,
      E2E_ACCOUNTS: path.join(destination, "accounts.json"),
    };
    const log = path.join(destination, "setup.log");
    writeFileSync(log, "");
    console.log(`E2E ${target.name} ${target.sha}: prepare isolated DB and production build`);
    if (target.name === "baseline")
      await command("pnpm", ["install", "--frozen-lockfile"], target.dir, { ...env, NODE_ENV: "development" }, log);
    env.NODE_OPTIONS = `--import=${path.join(root, "tests/e2e/deny-external.mjs")}`;
    await command("pnpm", ["exec", "prisma", "migrate", "deploy"], target.dir, env, log);
    await command("pnpm", ["exec", "prisma", "generate"], target.dir, env, log);
    await command(
      "node",
      ["--conditions", "react-server", "--import", "tsx", "tests/e2e/seed.ts"],
      target.dir,
      env,
      log,
    );
    await command("pnpm", ["run", "build"], target.dir, env, log);
    start(
      "pnpm",
      ["exec", "next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
      target.dir,
      env,
      path.join(destination, "web.log"),
    );
    let serverReady = false;
    for (let i = 0; i < 120; i++) {
      try {
        const r = await fetch(env.E2E_BASE_URL + "/login");
        await r.body?.cancel();
        if (r.ok) {
          serverReady = true;
          break;
        }
      } catch {
        /* The owned process or container already exited. */
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!serverReady) throw new Error(`Next server did not start: ${destination}/web.log`);
    for (const worker of ["vocal-profile-analysis", "mixing"])
      start(
        "node",
        ["--conditions", "react-server", "--import", "tsx", `scripts/${worker}-worker.ts`],
        target.dir,
        env,
        path.join(destination, `${worker}.log`),
      );
    let passed = true;
    try {
      await command(
        "pnpm",
        ["exec", "playwright", "test", "--config", "tests/e2e/playwright.config.mjs"],
        root,
        env,
        path.join(destination, "playwright.log"),
      );
    } catch (error) {
      passed = false;
      console.error(error.message);
    }
    if (suiteHash() !== expectedSuiteHash) throw new Error("E2E suite changed during execution; restart the run");
    outcomes.push({ ...target, suiteHash: expectedSuiteHash, passed, report: path.join(destination, "results.json") });
    await stopChildren();
    await provider.close();
    provider = null;
    if (!passed && target.name === "baseline") break;
  }
  writeFileSync(
    path.join(output, "comparison.json"),
    JSON.stringify({ scope: "Same browser assertions; not proof of all behavior equivalence", outcomes }, null, 2),
  );
  if (outcomes.some((r) => !r.passed)) process.exitCode = 1;
  console.log(
    JSON.stringify(
      outcomes.map(({ name, sha, passed, report }) => ({ name, sha, passed, report })),
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await cleanup();
}
