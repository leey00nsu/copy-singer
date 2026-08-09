import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { createQueryClient } from "@/_app/providers";
import { MixingDetail } from "@/_pages/mixing-detail";
import { mixingHistoryFixture } from "./msw/fixtures";

test("mixing detail renders an actual active timeline without terminal actions", () => {
  const client = createQueryClient(true);
  const active = mixingHistoryFixture.jobs[0];
  assert.ok(active);
  try {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <MixingDetail initial={active} />
      </QueryClientProvider>,
    );
    assert.match(html, /AI 믹싱 진행 단계/);
    assert.match(html, /GPU 작업 접수/);
    assert.match(html, /AI 믹싱 중/);
    assert.match(html, /임의의 진행률은 계산하지 않습니다/);
    assert.doesNotMatch(html, /AI 믹스 삭제/);
    assert.doesNotMatch(html, /\d+%/);
  } finally {
    client.clear();
  }
});

test("mixing detail route stays a thin owner-scoped adapter with loading and not-found boundaries", () => {
  const root = new URL("../", import.meta.url);
  const route = "app/(product)/library/mixes/[id]";
  for (const file of ["page.tsx", "loading.tsx", "not-found.tsx"]) {
    assert.equal(existsSync(new URL(`${route}/${file}`, root)), true);
  }
  const adapter = readFileSync(new URL(`${route}/page.tsx`, root), "utf8");
  const page = readFileSync(new URL("src/_pages/mixing-detail/ui/mixing-detail-page.tsx", root), "utf8");
  assert.match(adapter, /@\/_pages\/mixing-detail\/index\.server/);
  assert.match(page, /requirePageSession\(`\/library\/mixes\/\$\{id\}`\)/);
  assert.match(page, /getMixingJobForUser\(session\.user\.id, parsedId\.data\)/);
  assert.match(page, /notFound\(\)/);
});
