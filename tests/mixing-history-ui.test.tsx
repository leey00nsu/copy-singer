import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { MixingHistoryList } from "../components/mixing/mixing-history-list";

test("mixing history renders active state and persisted result controls", () => {
  const markup = renderToStaticMarkup(
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
            resultReady: false,
            audioUrl: null,
            createdAt: "2026-08-06T00:00:00Z",
            updatedAt: "2026-08-06T00:01:00Z",
            completedAt: null,
          },
          {
            id: "done",
            status: "succeeded",
            ticketCost: 1,
            error: null,
            song: { title: "완료 곡", artist: "가수", catalogOrder: 2 },
            resultReady: true,
            audioUrl: "/api/mixing-jobs/done/audio",
            createdAt: "2026-08-06T00:00:00Z",
            updatedAt: "2026-08-06T00:02:00Z",
            completedAt: "2026-08-06T00:02:00Z",
          },
        ],
      }}
    />,
  );
  assert.match(markup, /믹싱 중/);
  assert.match(markup, /완료 곡/);
  assert.match(markup, /\/api\/mixing-jobs\/done\/audio/);
  assert.match(markup, /결과 저장/);
});
