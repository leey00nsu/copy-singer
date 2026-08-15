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

test("selects only an item contained in the calculated recommendation result", () => {
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

test("renders a simplified analysis result and the shared mixing action", () => {
  const html = renderSongDetail();
  assert.match(html, /서른 즈음에/);
  assert.match(html, />Song match</);
  assert.doesNotMatch(html, /Song match · #\d+/);
  assert.match(html, /분석 결과/);
  assert.match(html, /role="img"/);
  assert.match(html, /주요 음역 비교/);
  assert.match(html, /내 주요 음역/);
  assert.match(html, /라3\(A3\)–라♯4\(A♯4\)/);
  assert.match(html, /곡 주요 음역/);
  assert.match(html, /솔3\(G3\)–도5\(C5\)/);
  assert.match(html, /관측 음역 미3\(E3\)부터 미5\(E5\), 주요 음역 라3\(A3\)부터 라♯4\(A♯4\)/);
  assert.match(html, /티켓 1개 사용/);
  assert.match(html, /youtube-nocookie\.com\/embed\/NbKH4iZqq1Y/);
  assert.doesNotMatch(html, /외부 출처 열기|target="_blank"/);
  assert.match(html, /AI 믹싱/);
  assert.doesNotMatch(html, /SONG RANGE|F3–A♯4|분석 근거|남은 고음 부담|중앙음/);
});

test("does not expose removed song-range metadata when it is unavailable", () => {
  const unavailable = {
    ...recommendationRunFixture,
    items: recommendationRunFixture.items.map((item) => ({
      ...item,
      originalKey: null,
      songProfile: null,
      sourceUrl: "javascript:alert(1)",
      sourceVideoId: null,
    })),
  };
  const html = renderSongDetail(unavailable);
  assert.doesNotMatch(html, /외부 출처 열기/);
  assert.match(html, /원본 영상을 재생할 수 없어요/);
  assert.match(html, /곡 주요 음역/);
  assert.match(html, /분석 정보 없음/);
  assert.doesNotMatch(html, /SONG RANGE|앨범|장르|가사|미리듣기/);
});

test("recommendation metadata does not hardcode the catalog size", () => {
  const root = new URL("../", import.meta.url);
  const page = readFileSync(
    new URL("src/_pages/recommendation-detail/ui/recommendation-detail-page.tsx", root),
    "utf8",
  );
  assert.match(page, /내 보컬 프로필과 잘 맞는 노래 순위와 추천 노래방 키를 확인하세요/);
  assert.doesNotMatch(page, /100곡/);
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
  assert.match(page, /getRecommendationResult\(parsedRunId\.data, session\.user\.id\)/);
  assert.match(page, /selectRecommendationItem/);
  assert.match(page, /notFound\(\)/);
});
