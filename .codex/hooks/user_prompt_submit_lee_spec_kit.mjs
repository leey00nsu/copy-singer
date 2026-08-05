#!/usr/bin/env node
import { getWorkflowCwd, printAdditionalContext, readHookInput, runLeeSpecKitJson } from './_lee_spec_kit_hook_utils.mjs';

const inputResult = readHookInput();
if (!inputResult.ok) {
  process.exit(0);
}
const input = inputResult.value;
const cwd = getWorkflowCwd();
const detectedResult = runLeeSpecKitJson(['detect', '--json'], cwd);
const detected = detectedResult.ok ? detectedResult.data : null;

if (detected?.status === 'ok' && detected?.isLeeSpecKitProject === true) {
  const stageResult = runLeeSpecKitJson(['workflow-stage', '--json'], cwd);
  const lines = [
    'This prompt is inside a lee-spec-kit workspace.',
    'Interpret generic rule-following requests through the lee-spec-kit docs workflow automatically.',
    'Prefer docs get plus feature-local docs as the primary context source.',
    'Use workflow-stage --json to determine the next allowed stage before implementation.',
  ];
  if (stageResult.ok && stageResult.data?.status === 'ok') {
    lines.push(
      `Current workflow stage: ${stageResult.data.stage}`,
      `Next allowed action: ${stageResult.data.nextAction?.category || 'none'}`,
      `Approval required: ${stageResult.data.approvalRequired ? 'yes' : 'no'}`,
      `Implementation allowed: ${stageResult.data.implementationAllowed ? 'yes' : 'no'}`,
      'Do not jump ahead of the reported nextAction.'
    );
    if (stageResult.data.primaryActionLabel && Array.isArray(stageResult.data.actionOptions)) {
      lines.push(
        'If labeled action options are present, keep the option labels but ask the user to reply with the exact reply token shown for that option.',
        ...stageResult.data.actionOptions.map(
          (option) => `Option ${option.label} -> reply ${option.reply}: ${option.summary}`
        )
      );
    }
  } else if (stageResult.ok && stageResult.data?.status === 'error') {
    lines.push(
      `Workflow stage is unresolved: ${stageResult.data.reasonCode}`,
      'Resolve feature selection before attempting implementation.'
    );
  }
  printAdditionalContext('UserPromptSubmit', lines.join('\n'));
}
