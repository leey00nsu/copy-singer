import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { RecommendationResults } from "../components/recommendation-results";
import type { RecommendationRunResponse } from "../lib/recommendation/contract";
import { scoreCatalogKeyFits } from "../lib/key-fit/catalog";
import type { SongProfileArtifact } from "../lib/song-catalog/artifact";
import artifactJson from "../data/catalogs/tj-2607-song-profiles.json";
import { rankTopRecommendations, formatRecommendationReasons } from "../lib/recommendation/ranking";

const profile = { minMidi: 48, maxMidi: 72, p10Midi: 52, medianMidi: 60, p90Midi: 68, tessituraLowMidi: 52, tessituraHighMidi: 68, voicedRatio: 0.72, pitchStability: 0.84, clippingRatio: 0.001, analyzer: "librosa-pyin", analyzerVersion: "0.11.0" };
const ranked = rankTopRecommendations(scoreCatalogKeyFits(profile, artifactJson as unknown as SongProfileArtifact));
const run: RecommendationRunResponse = {
  id: "00000000-0000-4000-8000-000000000005",
  userVocalProfileId: "00000000-0000-4000-8000-000000000006",
  scoringVersion: ranked[0]!.scoringVersion,
  createdAt: "2026-08-06T00:00:00.000Z",
  profileConfidence: ranked[0]!.confidence,
  lowConfidence: false,
  profile: { analyzer: profile.analyzer, analyzerVersion: profile.analyzerVersion, tessituraLowMidi: profile.tessituraLowMidi, tessituraHighMidi: profile.tessituraHighMidi, minMidi: profile.minMidi, maxMidi: profile.maxMidi },
  items: ranked.map((item, index) => ({ id: `item-${index}`, rank: item.rank, songId: `song-${index}`, catalogOrder: item.catalogOrder, title: item.title, artist: item.artist, sourceUrl: item.sourceUrl, originalKeyScore: item.originalKeyScore, adjustedScore: item.adjustedScore, recommendedShift: item.recommendedShift, reasonCodes: item.reasonCodes, reasons: formatRecommendationReasons(item), metrics: { confidence: item.confidence, original: item.original, recommended: item.recommended } })),
};

test("renders three ranked recommendation cards with responsible-use guidance", () => {
  const html = renderToStaticMarkup(<RecommendationResults initialRun={run} />);
  assert.match(html, /지금 목소리에 잘 맞는/);
  assert.equal((html.match(/원키 적합도/g) ?? []).length, 3);
  assert.match(html, /추천 노래방 키/);
  assert.match(html, /이번 한 소절에서 관찰된 음역/);
  assert.match(html, /가창력이나 건강 상태를 평가하지 않습니다/);
});

test("keeps low-confidence ranking visible with a rerecording warning", () => {
  const html = renderToStaticMarkup(<RecommendationResults initialRun={{ ...run, lowConfidence: true }} />);
  assert.match(html, /조금 더 긴 소절로 다시 측정해보세요/);
  assert.equal((html.match(/원키 적합도/g) ?? []).length, 3);
});
