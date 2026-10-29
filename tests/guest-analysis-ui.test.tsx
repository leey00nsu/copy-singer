import assert from "node:assert/strict";
import test from "node:test";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { createQueryClient } from "@/_app/providers";
import { guestRecommendationSaveHref } from "@/entities/guest-analysis/index.model";
import type { VocalProfileResponse } from "@/entities/vocal-profile";
import { VoiceScanInput } from "../src/_pages/profile/ui/voice-scan-input";
import { RecommendationResults } from "../src/_pages/recommendation-detail/ui/recommendation-results";
import { SongDetail } from "../src/_pages/song-detail/ui/song-detail";
import { VocalProfileDetailContent } from "../src/_pages/vocal-profile-detail/ui/vocal-profile-detail-content";
import { recommendationRunFixture } from "./msw/fixtures";

const router = { back() {}, bfcacheId: "guest-ui", forward() {}, prefetch() {}, push() {}, refresh() {}, replace() {} };
function render(ui: React.ReactNode) {
  const client = createQueryClient(true);
  try {
    return renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <AppRouterContext.Provider value={router}>{ui}</AppRouterContext.Provider>
      </QueryClientProvider>,
    );
  } finally {
    client.clear();
  }
}
const inputProps = {
  audioDuration: null,
  audioFile: null,
  audioSource: null,
  audioUrl: null,
  onAnalyze() {},
  onRecordingComplete() {},
  onRecordingError() {},
  onReset() {},
  onSelectFile() {},
  recorderOverride: <button type="button">녹음 시작</button>,
};

const profile: VocalProfileResponse = {
  id: "profile",
  sourceType: "USER",
  profileNumber: 1,
  displayName: "보컬 프로필 1",
  minMidi: 60,
  maxMidi: 72,
  p10Midi: 64,
  medianMidi: 67,
  p90Midi: 70,
  tessituraLowMidi: 64,
  tessituraHighMidi: 70,
  voicedRatio: 0.8,
  pitchStability: 0.9,
  clippingRatio: 0,
  rmsDb: -20,
  analyzer: "test",
  analyzerVersion: "1",
  createdAt: "2026-08-07T00:00:00.000Z",
  descriptors: {
    pitchHistogram: [{ midi: 67, count: 1, ratio: 1 }],
    pitchTrack: [{ timeMs: 0, midi: 67 }],
    synthesisReference: {
      version: "smart-reference-v1",
      sourceRanges: [
        { startMs: 1_000, endMs: 2_000, band: "low" },
        { startMs: 3_000, endMs: 4_000, band: "mid" },
        { startMs: 5_000, endMs: 6_000, band: "high" },
      ],
    },
  },
  recording: {
    id: "recording",
    mimeType: "audio/webm",
    sizeBytes: 1,
    durationMs: 60_000,
    sampleRate: 16_000,
    expiresAt: null,
    createdAt: "2026-08-07T00:00:00.000Z",
  },
};

test("available trial explains retention without ticket requirements", () => {
  const html = render(<VoiceScanInput {...inputProps} guestPolicy={{ state: "available", profileId: null }} />);
  assert.match(html, /무료 분석 1회/);
  assert.match(html, /24시간/);
  assert.match(html, /녹음 시작/);
  assert.doesNotMatch(html, /분석 티켓/);
});

test("used and full trials stop recording before collecting any audio", () => {
  for (const state of ["used", "full"] as const) {
    const html = render(<VoiceScanInput {...inputProps} guestPolicy={{ state, profileId: null }} />);
    assert.match(html, state === "used" ? /무료 분석을 사용했어요/ : /오늘의 무료 체험이 마감됐어요/);
    assert.doesNotMatch(html, /녹음 시작|type="file"/);
    assert.match(html, /로그인하고 계속하기/);
  }
});

test("trial result exposes analysis and audio, then offers saving to a new or existing account", () => {
  const detail = { profile, mixingCount: 0, audioUrl: "/api/vocal-profiles/profile/audio" };
  const html = render(<VocalProfileDetailContent detail={detail} guest />);
  assert.match(html, /내 목소리 분석 결과/);
  assert.match(html, /관측 음역|주요 음역/);
  assert.match(html, /제출한 보컬/);
  assert.match(html, /로그인하고 결과 저장하기/);
  assert.match(html, /callbackURL=%2Fprofile%2Fsave-trial/);
  assert.match(html, /추천 결과 보기/);
  assert.doesNotMatch(html, /이름 변경|새 프로필 분석하기/);
  const signedIn = render(<VocalProfileDetailContent detail={detail} guest signedIn />);
  assert.match(signedIn, /계정에 결과 저장하기/);
  assert.match(signedIn, /href="\/profile\/save-trial"/);
});

test("guest recommendations show the full comparison and a login link carrying the selected song", () => {
  const html = render(<RecommendationResults initialRun={recommendationRunFixture} guest />);
  assert.match(html, /내 목소리에 맞는 노래/);
  assert.match(html, /추천 키/);
  assert.match(html, /전체 분석 결과 보기/);
  assert.match(html, /로그인하고 AI 믹싱하기/);
  assert.ok(
    html.includes(guestRecommendationSaveHref(recommendationRunFixture.id, recommendationRunFixture.items[0]!.id)),
  );
  assert.doesNotMatch(html, /티켓 1개 사용/);
  const detail = render(
    <SongDetail
      initialRun={recommendationRunFixture}
      itemId={recommendationRunFixture.items[0]!.id}
      ticketCost={1}
      guest
    />,
  );
  assert.match(detail, /주요 음역 비교/);
  assert.match(detail, /로그인하고 AI 믹싱하기/);
  assert.doesNotMatch(detail, /티켓 1개 사용/);
});
