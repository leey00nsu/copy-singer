import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { createQueryClient } from "@/_app/providers";
import { SongDetail } from "@/_pages/song-detail";
import { safeRecommendationSourceUrl, selectRecommendationItem } from "@/entities/recommendation";
import { recommendationRunFixture } from "./msw/fixtures";

const itemId = recommendationRunFixture.items[0]?.id;
if (!itemId) throw new Error("Song detail test fixture requires one recommendation item.");
const testRouter = {
  back() {},
  bfcacheId: "song-detail-test",
  forward() {},
  prefetch() {},
  push() {},
  refresh() {},
  replace() {},
};

function renderSongDetail(initialRun = recommendationRunFixture) {
  const client = createQueryClient(true);
  try {
    return renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <AppRouterContext.Provider value={testRouter}>
          <SongDetail initialRun={initialRun} itemId={itemId} ticketCost={1} />
        </AppRouterContext.Provider>
      </QueryClientProvider>,
    );
  } finally {
    client.clear();
  }
}

test("selects only an item contained in the owned recommendation snapshot", () => {
  assert.equal(selectRecommendationItem(recommendationRunFixture, itemId)?.title, "서른 즈음에");
  assert.equal(selectRecommendationItem(recommendationRunFixture, crypto.randomUUID()), null);
});

test("allows only HTTP(S) external song source links", () => {
  assert.equal(
    safeRecommendationSourceUrl({ sourceUrl: "https://example.test/catalog/1234" }),
    "https://example.test/catalog/1234",
  );
  assert.equal(safeRecommendationSourceUrl({ sourceUrl: "javascript:alert(1)" }), null);
  assert.equal(safeRecommendationSourceUrl({ sourceUrl: "" }), null);
});

test("renders stored user/song ranges, score evidence, and the shared mixing action", () => {
  const html = renderSongDetail();
  assert.match(html, /서른 즈음에/);
  assert.match(html, /A3–A♯4/);
  assert.match(html, /F3–A♯4/);
  assert.match(html, /실용 음역 겹침/);
  assert.match(html, /티켓 1개 사용/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noreferrer noopener"/);
  assert.match(html, /AI 믹싱/);
});

test("renders an explicit unavailable state without inventing song metadata", () => {
  const unavailable = {
    ...recommendationRunFixture,
    items: recommendationRunFixture.items.map((item) => ({
      ...item,
      originalKey: null,
      songProfile: null,
      sourceUrl: "javascript:alert(1)",
    })),
  };
  const html = renderSongDetail(unavailable);
  assert.match(html, /곡 음역을 표시할 수 없어요/);
  assert.match(html, /값을 추정하지 않습니다/);
  assert.doesNotMatch(html, /외부 출처 열기/);
  assert.doesNotMatch(html, /앨범|장르|가사|미리듣기/);
});

test("keeps the App route as a thin adapter with loading and not-found boundaries", () => {
  const root = new URL("../", import.meta.url);
  const route = "app/(product)/recommendations/[id]/songs/[itemId]";
  for (const file of ["page.tsx", "loading.tsx", "not-found.tsx"]) {
    assert.equal(existsSync(new URL(`${route}/${file}`, root)), true);
  }
  const adapter = readFileSync(new URL(`${route}/page.tsx`, root), "utf8");
  const page = readFileSync(new URL("src/_pages/song-detail/ui/song-detail-page.tsx", root), "utf8");
  assert.match(adapter, /@\/_pages\/song-detail\/index\.server/);
  assert.match(page, /requirePageSession/);
  assert.match(page, /getRecommendationRun\(parsedRunId\.data, session\.user\.id\)/);
  assert.match(page, /selectRecommendationItem/);
  assert.match(page, /notFound\(\)/);
});
