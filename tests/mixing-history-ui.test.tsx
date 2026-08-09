import assert from "node:assert/strict";
import test from "node:test";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";

import { createQueryClient } from "@/_app/providers";
import { MixingHistoryList } from "../src/_pages/mixing-history";

test("mixing history renders active state and persisted result controls", () => {
  const client = createQueryClient(true);
  const markup = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MixingHistoryList
        initial={{
          page: 1,
          pageSize: 20,
          total: 2,
          pageCount: 1,
          jobs: [
            {
              id: "active",
              status: "processing",
              ticketCost: 1,
              error: null,
              song: { title: "진행 곡", artist: "가수", catalogOrder: 1 },
              vocalProfile: { id: "profile-active", createdAt: "2026-08-06T00:00:00Z" },
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
              vocalProfile: { id: "profile-done", createdAt: "2026-08-06T00:00:00Z" },
              resultReady: true,
              audioUrl: "/api/mixing-jobs/done/audio",
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
  assert.match(markup, /\/api\/mixing-jobs\/done\/audio/);
  assert.match(markup, /결과 저장/);
});
