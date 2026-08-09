import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RecommendationHandoffBanner } from "../components/recommendation-handoff";
import { RecommendationResults } from "../components/recommendation-results";
import artifactJson from "../data/catalogs/tj-2607-song-profiles.json";
import { scoreCatalogKeyFits } from "../lib/key-fit/catalog";
import type { RecommendationRunResponse } from "../lib/recommendation/contract";
import { formatRecommendationReasons, rankRecommendations } from "../lib/recommendation/ranking";
import type { SongProfileArtifact } from "../lib/song-catalog/artifact";

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

test("renders the full ranked recommendation list without starting synthesis", () => {
  const html = renderToStaticMarkup(<RecommendationResults initialRun={run} />);
  assert.match(html, /내 목소리와 어울리는/);
  assert.equal((html.match(/원키 적합도/g) ?? []).length, 100);
  assert.match(html, /추천 노래방 키/);
  assert.match(html, /이번 한 소절에서 관찰된 음역/);
  assert.match(html, /가창력이나 건강 상태를 평가하지 않습니다/);
  assert.equal((html.match(/AI 믹싱<\/button>/g) ?? []).length, 100);
  assert.doesNotMatch(html, /믹싱 중이에요/);
  assert.match(html, /목록을 보는 것만으로 GPU 작업이 시작되지 않습니다/);
  assert.match(html, /자동 피치 이동이 적용됩니다/);
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
  const html = renderToStaticMarkup(<RecommendationResults initialRun={succeeded} />);
  assert.match(html, /AI 믹싱 완료/);
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
  const html = renderToStaticMarkup(<RecommendationResults initialRun={{ ...run, lowConfidence: true }} />);
  assert.match(html, /조금 더 긴 소절로 다시 측정해보세요/);
  assert.equal((html.match(/원키 적합도/g) ?? []).length, 100);
});
