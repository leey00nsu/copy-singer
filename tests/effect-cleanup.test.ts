import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("query-managed server state has no component-owned fetch or polling timer", async () => {
  const paths = [
    "src/_pages/dev-svc/ui/singer-workbench.tsx",
    "src/_pages/recommendation-detail/ui/recommendation-results.tsx",
    "src/_pages/mixing-history/ui/mixing-history-list.tsx",
    "src/_pages/vocal-profiles/ui/vocal-profile-analysis-job-cards.tsx",
    "src/features/manage-tickets/ui/ticket-adjustment-form.tsx",
    "src/widgets/vocal-profile-workbench/ui/vocal-profile-workbench.tsx",
  ];
  for (const path of paths) {
    const source = await readFile(path, "utf8");
    assert.doesNotMatch(source, /\bfetch\(/, path);
    assert.doesNotMatch(source, /setInterval\(|setTimeout\(/, path);
  }
});
