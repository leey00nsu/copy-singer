import assert from "node:assert/strict";
import test from "node:test";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { renderToStaticMarkup } from "react-dom/server";

import { createQueryClient } from "@/_app/providers";
import { VocalProfileHistoryList } from "../src/_pages/vocal-profiles";

const testRouter = {
  back() {},
  bfcacheId: "vocal-profile-history-test",
  forward() {},
  prefetch() {},
  push() {},
  refresh() {},
  replace() {},
};

function renderHistory(ui: React.ReactNode) {
  const client = createQueryClient(true);
  try {
    return renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <AppRouterContext.Provider value={testRouter}>{ui}</AppRouterContext.Provider>
      </QueryClientProvider>,
    );
  } finally {
    client.clear();
  }
}

test("vocal profile history renders persisted analysis and detail navigation", () => {
  const markup = renderHistory(
    <VocalProfileHistoryList
      history={{
        page: 1,
        pageSize: 12,
        total: 1,
        pageCount: 1,
        profiles: [
          {
            id: "profile-id",
            profileNumber: 1,
            displayName: "보컬 프로필 1",
            minMidi: 46,
            maxMidi: 58,
            medianMidi: 52,
            tessituraLowMidi: 48,
            tessituraHighMidi: 56,
            voicedRatio: 0.82,
            pitchStability: 0.91,
            clippingRatio: 0,
            rmsDb: -20,
            analyzer: "test",
            analyzerVersion: "1",
            durationMs: 12_300,
            mimeType: "audio/wav",
            recommendationCount: 2,
            mixingCount: 1,
            latestRecommendationId: "run-id",
            createdAt: "2026-08-07T00:00:00.000Z",
          },
        ],
      }}
    />,
  );
  assert.match(markup, /보컬 프로필/);
  assert.match(markup, /안정도/);
  assert.match(markup, /보컬 프로필 1개/);
  assert.match(markup, /최신 분석순/);
  assert.match(markup, /AI 믹싱/);
  assert.match(markup, />1개</);
  assert.doesNotMatch(markup, /추천 2/);
  assert.match(markup, /\/vocal-profiles\/profile-id/);
});

test("vocal profile history shows queued analysis instead of an empty state", () => {
  const markup = renderHistory(
    <VocalProfileHistoryList
      analysisJobs={[
        {
          id: "job-id",
          status: "pending",
          vocalProfileId: null,
          attempts: 0,
          maxAttempts: 3,
          error: null,
          createdAt: "2026-08-08T01:00:00.000Z",
          updatedAt: "2026-08-08T01:00:00.000Z",
        },
      ]}
      history={{ page: 1, pageSize: 12, total: 0, pageCount: 1, profiles: [] }}
    />,
  );
  assert.match(markup, /보컬 프로필 분석 대기 중/);
  assert.match(markup, /data-analysis-job-row="pending"/);
  assert.match(markup, /data-profile-column="range"/);
  assert.match(markup, /data-profile-column="stability"/);
  assert.match(markup, /aria-busy="true"/);
  assert.doesNotMatch(markup, /href="\/vocal-profiles\//);
  assert.doesNotMatch(markup, /아직 저장된 보컬 프로필이 없어요/);
});

test("vocal profile history provides an empty-state creation link", () => {
  const markup = renderHistory(
    <VocalProfileHistoryList history={{ page: 1, pageSize: 12, total: 0, pageCount: 1, profiles: [] }} />,
  );
  assert.match(markup, /아직 저장된 보컬 프로필이 없어요/);
  assert.match(markup, /href="\/profile"/);
});
