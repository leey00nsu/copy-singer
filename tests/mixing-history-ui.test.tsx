import assert from "node:assert/strict";
import test from "node:test";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";

import { createQueryClient } from "@/_app/providers";
import { MixingHistoryList } from "../src/_pages/mixing-history";
import { LibraryTabs, MixingLibrary, mixingHistoryHref } from "../src/widgets/library";

test("mixing history renders one stretched detail link per result", () => {
  const client = createQueryClient(true);
  const markup = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MixingHistoryList
        initial={{
          page: 1,
          pageSize: 20,
          total: 3,
          pageCount: 1,
          jobs: [
            {
              id: "active",
              status: "processing",
              ticketCost: 1,
              error: null,
              song: { title: "진행 곡", artist: "가수", catalogOrder: 1 },
              vocalProfile: { id: "profile-active", displayName: "활성 보컬", createdAt: "2026-08-06T00:00:00Z" },
              resultReady: false,
              audioUrl: null,
              createdAt: "2026-08-06T00:00:00Z",
              updatedAt: "2026-08-06T00:01:00Z",
              startedAt: "2026-08-06T00:00:30Z",
              completedAt: null,
            },
            {
              id: "done",
              status: "succeeded",
              ticketCost: 1,
              error: null,
              song: { title: "완료 곡", artist: "가수", catalogOrder: 2 },
              vocalProfile: { id: "profile-done", displayName: "완료 보컬", createdAt: "2026-08-06T00:00:00Z" },
              resultReady: true,
              audioUrl: "/api/mixing-jobs/done/audio",
              createdAt: "2026-08-06T00:00:00Z",
              updatedAt: "2026-08-06T00:02:00Z",
              startedAt: "2026-08-06T00:00:30Z",
              completedAt: "2026-08-06T00:02:00Z",
            },
            {
              id: "checking",
              status: "succeeded",
              ticketCost: 1,
              error: null,
              song: { title: "확인 중인 곡", artist: "가수", catalogOrder: 3 },
              vocalProfile: {
                id: "profile-checking",
                displayName: "확인 보컬",
                createdAt: "2026-08-06T00:00:00Z",
              },
              resultReady: false,
              audioUrl: null,
              createdAt: "2026-08-06T00:00:00Z",
              updatedAt: "2026-08-06T00:02:00Z",
              startedAt: "2026-08-06T00:00:30Z",
              completedAt: "2026-08-06T00:02:00Z",
            },
          ],
        }}
      />
    </QueryClientProvider>,
  );
  client.clear();
  assert.match(markup, /믹싱 중/);
  assert.match(markup, /완료 곡/);
  assert.match(markup, /결과 확인 중/);
  assert.match(markup, /진행 곡 AI 믹스 상세 보기/);
  assert.match(markup, /완료 곡 AI 믹스 상세 보기/);
  assert.doesNotMatch(markup, /결과 듣기/);
  assert.doesNotMatch(markup, /\/api\/mixing-jobs\/done\/audio/);
  assert.doesNotMatch(markup, /결과 저장/);
  assert.match(markup, /AI 믹스 작업 목록/);
  assert.match(markup, /사용한 보컬 프로필/);
  assert.match(markup, /완료 보컬/);
  assert.equal((markup.match(/data-mixing-column="vocal-profile"/g) ?? []).length, 3);
  assert.doesNotMatch(markup, /<th[^>]*>\s*결과\s*<\/th>/);
  assert.equal((markup.match(/data-mixing-column="status"/g) ?? []).length, 3);
  assert.match(markup, /name="q"/);
  assert.match(markup, /name="status"/);
});

test("mixing library distinguishes failed and filtered empty states", () => {
  const client = createQueryClient(true);
  const failedMarkup = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MixingLibrary
        basePath="/library"
        filters={{ page: 1, q: "없는 곡", status: "failed" }}
        initial={{
          page: 1,
          pageSize: 20,
          total: 1,
          pageCount: 1,
          jobs: [
            {
              id: "10000000-0000-4000-8000-000000000100",
              status: "failed",
              ticketCost: 1,
              error: { code: "MIXING_FAILED", detail: "upstream fetch failed (502)" },
              song: { title: "실패 곡", artist: "가수", catalogOrder: 3 },
              vocalProfile: {
                id: "10000000-0000-4000-8000-000000000101",
                displayName: "실패 보컬",
                createdAt: "2026-08-06T00:00:00Z",
              },
              resultReady: false,
              audioUrl: null,
              createdAt: "2026-08-06T00:00:00Z",
              updatedAt: "2026-08-06T00:01:00Z",
              startedAt: "2026-08-06T00:00:30Z",
              completedAt: "2026-08-06T00:01:00Z",
            },
          ],
        }}
      />
    </QueryClientProvider>,
  );
  assert.doesNotMatch(failedMarkup, /AI 믹싱을 완료하지 못했어요/);
  assert.doesNotMatch(failedMarkup, /upstream fetch failed|502/);
  assert.match(failedMarkup, /type="hidden" name="tab" value="mixes"/);
  client.clear();

  const emptyClient = createQueryClient(true);
  const emptyMarkup = renderToStaticMarkup(
    <QueryClientProvider client={emptyClient}>
      <MixingLibrary
        basePath="/library"
        filters={{ page: 1, q: "없는 곡", status: "all" }}
        initial={{ page: 1, pageSize: 20, total: 0, pageCount: 1, jobs: [] }}
      />
    </QueryClientProvider>,
  );
  emptyClient.clear();
  assert.match(emptyMarkup, /조건에 맞는 AI 믹스가 없어요/);
  assert.match(emptyMarkup, /모든 AI 믹스 보기/);
});

test("library tabs and pagination hrefs preserve canonical URL state", () => {
  const markup = renderToStaticMarkup(<LibraryTabs tab="mixes" />);
  assert.match(markup, /href="\/library\?tab=profiles&amp;page=1"/);
  assert.match(markup, /href="\/library\?tab=mixes&amp;page=1"/);
  assert.equal(
    mixingHistoryHref("/library", { page: 3, q: "아이유", status: "succeeded" }),
    "/library?page=3&tab=mixes&q=%EC%95%84%EC%9D%B4%EC%9C%A0&status=succeeded",
  );
});
