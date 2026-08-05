#!/usr/bin/env node
import { getWorkflowCwd, printBlock, readHookInput, runLeeSpecKitJson } from './_lee_spec_kit_hook_utils.mjs';

// Equivalent CLI probe: npx lee-spec-kit workflow-audit --json
const inputResult = readHookInput();
if (!inputResult.ok) {
  printBlock('Codex stop hook input was malformed. Resolve the local hook setup before stopping.');
  process.exit(0);
}
const input = inputResult.value;
if (input?.stop_hook_active === true) {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}

const cwd = getWorkflowCwd();
const detectedResult = runLeeSpecKitJson(['detect', '--json'], cwd);
if (!detectedResult.ok) {
  printBlock('lee-spec-kit detection failed inside the stop hook. Resolve the local CLI or hook setup before stopping.');
  process.exit(0);
}
const detected = detectedResult.data;
if (!(detected?.status === 'ok' && detected?.isLeeSpecKitProject === true)) {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}

const auditResult = runLeeSpecKitJson(['workflow-audit', '--json'], cwd);
if (!auditResult.ok) {
  printBlock('lee-spec-kit workflow-audit failed inside the stop hook. Resolve the docs sync guardrail failure before stopping.');
  process.exit(0);
}
const audit = auditResult.data;
if (audit?.status === 'needs_sync') {
  printBlock('Run one more pass and sync the active feature docs before stopping.');
  process.exit(0);
}
if (!(audit?.status === 'ok' || audit?.status === 'skipped')) {
  printBlock('lee-spec-kit workflow-audit returned a non-ok status inside the stop hook. Resolve the docs sync guardrail failure before stopping.');
  process.exit(0);
}

process.stdout.write(JSON.stringify({ continue: true }));
