import assert from "node:assert/strict";
import test from "node:test";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { createQueryClient } from "@/_app/providers";
import artifactJson from "../data/catalogs/tj-2607-song-profiles.json";
import { RecommendationHandoffBanner } from "../src/_pages/dev-svc";
import { RecommendationResults } from "../src/_pages/recommendation-detail";
import type { RecommendationRunResponse, SongProfileArtifact } from "../src/entities/recommendation";
import {
  formatRecommendationReasons,
  rankRecommendations,
  scoreCatalogKeyFits,
  YouTubeVideo,
} from "../src/entities/recommendation";

const profile = {
  minMidi: 48,
  maxMidi: 72,
  p10Midi: 52,
  medianMidi: 60,
  p90Midi: 68,
  tessituraLowMidi: 52,
  tessituraHighMidi: 68,
  voicedRatio: 0.72,
  pitchStability: 0.84,
  clippingRatio: 0.001,
  analyzer: "librosa-pyin",
  analyzerVersion: "0.11.0",
};
const ranked = rankRecommendations(scoreCatalogKeyFits(profile, artifactJson as unknown as SongProfileArtifact));
const run: RecommendationRunResponse = {
  id: "00000000-0000-4000-8000-000000000005",
  userVocalProfileId: "00000000-0000-4000-8000-000000000006",
  scoringVersion: ranked[0]!.scoringVersion,
  createdAt: "2026-08-06T00:00:00.000Z",
  profileConfidence: ranked[0]!.confidence,
  lowConfidence: false,
  profile: {
    analyzer: profile.analyzer,
    analyzerVersion: profile.analyzerVersion,
    tessituraLowMidi: profile.tessituraLowMidi,
    tessituraHighMidi: profile.tessituraHighMidi,
    minMidi: profile.minMidi,
    maxMidi: profile.maxMidi,
  },
  items: ranked.map((item, index) => ({
    id: `item-${index}`,
    rank: item.rank,
    songId: `song-${index}`,
    catalogOrder: item.catalogOrder,
    title: item.title,
    artist: item.artist,
    sourceUrl: item.sourceUrl,
    sourceVideoId: item.sourceVideoId,
    originalKey: null,
    songProfile: null,
    originalKeyScore: item.originalKeyScore,
    adjustedScore: item.adjustedScore,
    selectionScore: item.selectionScore,
    recommendedShift: item.recommendedShift,
    reasonCodes: item.reasonCodes,
    reasons: formatRecommendationReasons(item),
    metrics: {
      confidence: item.confidence,
      selectionScore: item.selectionScore,
      original: item.original,
      recommended: item.recommended,
    },
    synthesis: {
      status: "not_started",
      jobId: null,
      error: null,
      startedAt: null,
      updatedAt: null,
      completedAt: null,
      expiresAt: null,
      attemptCount: 0,
      audioUrl: null,
    },
  })),
};

test("YouTube media renders a lightweight facade before the privacy-enhanced player", () => {
  const facade = renderToStaticMarkup(<YouTubeVideo title="Drowning · WOODZ" variant="facade" videoId="NbKH4iZqq1Y" />);
  assert.match(facade, /data-youtube-facade="true"/);
  assert.match(facade, /i\.ytimg\.com\/vi\/NbKH4iZqq1Y\/hqdefault\.jpg/);
  assert.doesNotMatch(facade, /iframe|youtube-nocookie/);

  const player = renderToStaticMarkup(<YouTubeVideo title="Drowning · WOODZ" videoId="NbKH4iZqq1Y" />);
  assert.match(player, /data-youtube-player="true"/);
  assert.match(player, /youtube-nocookie\.com\/embed\/NbKH4iZqq1Y\?autoplay=0/);
  assert.match(player, /title="Drowning · WOODZ 원본 YouTube 영상"/);
});
const testRouter = {
  back() {},
  bfcacheId: "recommendation-test",
  forward() {},
  prefetch() {},
  push() {},
  refresh() {},
  replace() {},
};

function renderRecommendation(value: RecommendationRunResponse) {
  const client = createQueryClient(true);
  try {
    return renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <AppRouterContext.Provider value={testRouter}>
          <RecommendationResults initialRun={value} />
        </AppRouterContext.Provider>
      </QueryClientProvider>,
    );
  } finally {
    client.clear();
  }
}

test("renders the full ranked recommendation list without starting synthesis", () => {
  const html = renderRecommendation(run);
  assert.match(html, /내 목소리에 맞는 노래/);
  assert.match(html, /추천 노래 비교 목록/);
  assert.equal((html.match(/data-youtube-facade="true"/g) ?? []).length, 100);
  assert.doesNotMatch(html, /youtube-nocookie\.com/);
  assert.doesNotMatch(html, /scope="col">순위<\/th>/);
  assert.doesNotMatch(html, />\d+위<\/span>/);
  assert.equal((html.match(/aria-pressed="(?:true|false)"/g) ?? []).length, 100);
  assert.match(html, /추천 적합도/);
  assert.match(html, /추천 키/);
  assert.match(html, /이번 한 소절에서 관찰된 음역/);
  assert.match(html, /가창력이나 건강 상태를 평가하지 않습니다/);
  assert.equal((html.match(/이 곡으로 AI 믹싱<\/button>/g) ?? []).length, 1);
  assert.equal((html.match(/선택 전/g) ?? []).length, 100);
  assert.equal((html.match(/\/songs\/item-/g) ?? []).length, 1);
  assert.doesNotMatch(html, /AI 믹싱 결과 파형/);
  assert.match(html, /목록을 보는 것만으로 작업이 시작되지 않습니다/);
});

test("labels a completed synthesis as an AI mix", () => {
  const succeeded = {
    ...run,
    items: run.items.map((item, index) =>
      index === 0
        ? {
            ...item,
            synthesis: { ...item.synthesis, status: "succeeded" as const, audioUrl: "/result.wav" },
          }
        : item,
    ),
  };
  const html = renderRecommendation(succeeded);
  assert.match(html, /결과 확인/);
  assert.doesNotMatch(html, /AI 믹싱 결과 파형/);
});

test("blocks AI mixing before a request when the mid reference is unavailable", () => {
  const html = renderRecommendation({
    ...run,
    profile: {
      ...run.profile,
      mixing: { available: false, unavailableReason: "missing_mid_reference" },
    },
  });
  assert.equal((html.match(/믹싱 불가/g) ?? []).length, 100);
  assert.match(html, /안정적인 중앙 음역 구간을 찾지 못해 이 프로필로는 AI 믹싱을 만들 수 없어요/);
  assert.match(html, /href="\/profile"/);
  assert.doesNotMatch(html, /이 곡으로 AI 믹싱<\/button>/);
});

test("renders verified handoff context without implying automatic SVC settings", () => {
  const html = renderToStaticMarkup(
    <RecommendationHandoffBanner
      selection={{
        runId: run.id,
        id: run.items[0]!.id,
        title: run.items[0]!.title,
        artist: run.items[0]!.artist,
        recommendedShift: -2,
        originalKeyScore: 70,
        adjustedScore: 92,
      }}
    />,
  );
  assert.match(html, /추천 결과에서 선택한 곡/);
  assert.match(html, /-2키/);
  assert.match(html, /SVC pitch 설정에는 자동 적용되지 않으며/);
  assert.match(html, /target 오디오도 직접 선택/);
});

test("keeps low-confidence ranking visible with a rerecording warning", () => {
  const html = renderRecommendation({ ...run, lowConfidence: true });
  assert.match(html, /조금 더 긴 소절로 다시 측정해보세요/);
  assert.equal((html.match(/aria-pressed="(?:true|false)"/g) ?? []).length, 100);
});
