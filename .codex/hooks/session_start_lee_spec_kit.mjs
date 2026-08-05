#!/usr/bin/env node
import { getWorkflowCwd, printAdditionalContext, readHookInput, runLeeSpecKitJson } from './_lee_spec_kit_hook_utils.mjs';

// Equivalent CLI probe: npx lee-spec-kit detect --json
const inputResult = readHookInput();
if (!inputResult.ok) {
  process.exit(0);
}
const input = inputResult.value;
const cwd = getWorkflowCwd();
const detectedResult = runLeeSpecKitJson(['detect', '--json'], cwd);
const detected = detectedResult.ok ? detectedResult.data : null;

if (detected?.status === 'ok' && detected?.isLeeSpecKitProject === true) {
  const docsDir = detected.docsDir || '(unknown docs dir)';
  const stageResult = runLeeSpecKitJson(['workflow-stage', '--json'], cwd);
  const lines = [
    'lee-spec-kit project detected.',
    'Use lee-spec-kit docs and workflow policy only when explicitly detected.',
    'Prefer Codex native execution with workspace-scoped AGENTS.md plus official hooks for the default runtime path.',
    'If the user gives a generic request such as continuing the next feature according to the rules, interpret it through this workflow automatically.',
    'infer the workflow automatically even for generic rule-following requests.',
    `Docs dir: ${docsDir}`,
    'Start by reading npx lee-spec-kit docs get agents --json and the active feature docs.',
    'Run npx lee-spec-kit workflow-stage --json before the next stage and only follow its nextAction.',
    'Keep docs as the SSOT and treat workflow-audit as the end-of-turn sync guard.',
  ];
  if (stageResult.ok && stageResult.data?.status === 'ok') {
    lines.push(
      `Current workflow stage: ${stageResult.data.stage}`,
      `Next allowed action: ${stageResult.data.nextAction?.category || 'none'}`,
      `Approval required: ${stageResult.data.approvalRequired ? 'yes' : 'no'}`,
      `Implementation allowed: ${stageResult.data.implementationAllowed ? 'yes' : 'no'}`
    );
    if (stageResult.data.primaryActionLabel && Array.isArray(stageResult.data.actionOptions)) {
      lines.push(
        `Primary reply label: ${stageResult.data.primaryActionLabel}`,
        ...stageResult.data.actionOptions.map(
          (option) => `Option ${option.label} -> reply ${option.reply}: ${option.summary}`
        )
      );
    }
  } else if (stageResult.ok && stageResult.data?.status === 'error') {
    lines.push(
      `Workflow stage is unresolved: ${stageResult.data.reasonCode}`,
      'Resolve feature selection or create/select the target feature before continuing.'
    );
  }
  printAdditionalContext('SessionStart', lines.join('\n'));
}
