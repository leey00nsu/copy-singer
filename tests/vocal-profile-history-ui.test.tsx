import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { VocalProfileHistoryList } from "../components/vocal-profile/vocal-profile-history-list";

test("vocal profile history renders persisted analysis and detail navigation", () => {
  const markup = renderToStaticMarkup(
    <VocalProfileHistoryList
      history={{
        page: 1,
        pageSize: 12,
        total: 1,
        pageCount: 1,
        profiles: [
          {
            id: "profile-id",
            minMidi: 46,
            maxMidi: 58,
            medianMidi: 52,
            tessituraLowMidi: 48,
            tessituraHighMidi: 56,
            voicedRatio: 0.82,
            pitchStability: 0.91,
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
  assert.match(markup, /추천/);
  assert.match(markup, /믹싱/);
  assert.match(markup, /\/vocal-profiles\/profile-id/);
});

test("vocal profile history shows queued analysis instead of an empty state", () => {
  const markup = renderToStaticMarkup(
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
  assert.match(markup, /이 페이지를 닫아도 분석은 계속됩니다/);
  assert.doesNotMatch(markup, /아직 저장된 보컬 프로필이 없어요/);
});

test("vocal profile history provides an empty-state creation link", () => {
  const markup = renderToStaticMarkup(
    <VocalProfileHistoryList history={{ page: 1, pageSize: 12, total: 0, pageCount: 1, profiles: [] }} />,
  );
  assert.match(markup, /아직 저장된 보컬 프로필이 없어요/);
  assert.match(markup, /href="\/profile"/);
});
