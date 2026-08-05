#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function readHookInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    if (!raw) return { ok: true, value: {} };
    return {
      ok: true,
      value: JSON.parse(raw),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid Codex hook payload';
    return {
      ok: false,
      error: message,
    };
  }
}

const CLI_ENTRYPOINT = "/Volumes/sn850x/mac-cache/.cache/npm/_npx/ec496ec551839950/node_modules/lee-spec-kit/dist/index.js";
const HOOK_REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);
const WORKFLOW_ROOT_RELATIVE = "";

export function getWorkflowCwd() {
  return path.resolve(HOOK_REPO_ROOT, WORKFLOW_ROOT_RELATIVE);
}

export function runLeeSpecKit(args, cwd = process.cwd()) {
  return spawnSync(process.execPath, [CLI_ENTRYPOINT, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function runLeeSpecKitJson(args, cwd = process.cwd()) {
  const result = runLeeSpecKit(args, cwd);
  const stdout = String(result.stdout || '').trim();
  const stderr = String(result.stderr || '').trim();

  if (result.error) {
    return {
      ok: false,
      error: result.error.message || String(result.error),
      status: result.status ?? 1,
    };
  }

  if (result.status !== 0) {
    return {
      ok: false,
      error: stderr || stdout || `lee-spec-kit ${args.join(' ')} failed`,
      status: result.status ?? 1,
    };
  }

  if (!stdout) {
    return {
      ok: false,
      error: `lee-spec-kit ${args.join(' ')} returned empty JSON output`,
      status: result.status ?? 0,
    };
  }

  try {
    return {
      ok: true,
      data: JSON.parse(stdout),
      status: result.status ?? 0,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid JSON output from lee-spec-kit';
    return {
      ok: false,
      error: `${message}: ${stdout.slice(0, 200)}`,
      status: result.status ?? 0,
    };
  }
}

export function printAdditionalContext(hookEventName, additionalContext) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName,
        additionalContext,
      },
    })
  );
}

export function printBlock(reason) {
  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason,
    })
  );
}
