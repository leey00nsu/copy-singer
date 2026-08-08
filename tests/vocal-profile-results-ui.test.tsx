import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VocalProfileResults } from "../components/vocal-profile-results";
import type { VocalProfileResponse } from "../lib/vocal-profile/contract";

const profile: VocalProfileResponse = {
  id: "profile", sourceType: "USER", minMidi: 60, maxMidi: 72, p10Midi: 64, medianMidi: 67, p90Midi: 70,
  tessituraLowMidi: 64, tessituraHighMidi: 70, voicedRatio: 0.8, pitchStability: 0.9, clippingRatio: 0,
  rmsDb: -20, analyzer: "test", analyzerVersion: "1", createdAt: "2026-08-07T00:00:00.000Z",
  descriptors: {
    pitchHistogram: [{ midi: 67, count: 1, ratio: 1 }],
    pitchTrack: [{ timeMs: 0, midi: 67 }],
    synthesisReference: { version: "smart-reference-v1", sourceRanges: [
      { startMs: 1_000, endMs: 2_000, band: "low" },
      { startMs: 3_000, endMs: 4_000, band: "mid" },
      { startMs: 5_000, endMs: 6_000, band: "high" },
    ] },
  },
  recording: { id: "recording", mimeType: "audio/webm", sizeBytes: 1, durationMs: 60_000, sampleRate: 16_000, expiresAt: null, createdAt: "2026-08-07T00:00:00.000Z" },
};

test("renders low, mid, and high smart-reference playback controls", () => {
  const html = renderToStaticMarkup(<VocalProfileResults profile={profile} sourceAudioSrc="/profile.webm" />);
  assert.match(html, /AI 합성에 선택된 음역 구간/);
  assert.match(html, /저음 영역/);
  assert.match(html, /중앙 영역/);
  assert.match(html, /고음 영역/);
  assert.equal((html.match(/채택된 구간/g) ?? []).length, 3);
  assert.match(html, /저음 영역 파형 준비 중/);
  assert.match(html, /중앙 영역 파형 준비 중/);
  assert.match(html, /고음 영역 파형 준비 중/);
});

test("renders one stored mid-only synthesis reference player for smart-reference-mid-v1", () => {
  const html = renderToStaticMarkup(<VocalProfileResults profile={{
    ...profile,
    id: "mid-profile",
    descriptors: {
      ...profile.descriptors,
      synthesisReference: {
        version: "smart-reference-mid-v1",
        sourceRanges: [{ startMs: 3_000, endMs: 8_000, band: "mid" }],
      },
    },
  }} sourceAudioSrc="/profile.webm" />);
  assert.match(html, /AI 믹싱 중음 레퍼런스/);
  assert.match(html, /AI 믹싱 중음 레퍼런스 재생/);
  assert.doesNotMatch(html, /저음 영역/);
  assert.doesNotMatch(html, /중앙 영역/);
  assert.doesNotMatch(html, /고음 영역/);
});

test("explains when no quality mid-only synthesis reference was found", () => {
  const html = renderToStaticMarkup(<VocalProfileResults profile={{
    ...profile,
    descriptors: { synthesisReference: { version: "smart-reference-mid-v1", status: "unavailable", fallbackReason: "no-quality-mid-phrase" } },
  }} sourceAudioSrc="/profile.webm" />);
  assert.match(html, /안정적으로 사용할 중음 구간을 찾지 못했어요/);
  assert.doesNotMatch(html, /synthesis-reference\/audio/);
});

test("explains why legacy profiles have no smart-reference region controls", () => {
  const html = renderToStaticMarkup(<VocalProfileResults profile={{ ...profile, descriptors: {} }} sourceAudioSrc="/profile.webm" />);
  assert.match(html, /최신 분석기로 새 보컬 프로필을 만들어주세요/);
});

test("explains when no quality smart-reference regions were found", () => {
  const html = renderToStaticMarkup(<VocalProfileResults profile={{
    ...profile,
    descriptors: { synthesisReference: { version: "smart-reference-v1", status: "unavailable" } },
  }} sourceAudioSrc="/profile.webm" />);
  assert.match(html, /안정적인 저음·중앙·고음 구간을 충분히 찾지 못했어요/);
});
