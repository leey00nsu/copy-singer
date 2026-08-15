import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { presentVocalProfile, type VocalProfilePresentationInput } from "../src/entities/vocal-profile";

const input: VocalProfilePresentationInput = {
  minMidi: 48,
  maxMidi: 72,
  medianMidi: 60,
  tessituraLowMidi: 52,
  tessituraHighMidi: 64,
  voicedRatio: 0.8,
  pitchStability: 0.9,
  clippingRatio: 0,
  rmsDb: -20,
};

test("maps only observed vocal metrics to a neutral profile presentation", () => {
  const presentation = presentVocalProfile(input);
  assert.equal(presentation.label, "균형 있게 관찰된 주요 음역");
  assert.equal(presentation.observedRange.label, "도3(C3)–도5(C5)");
  assert.equal(presentation.practicalRange.label, "미3(E3)–미4(E4)");
  assert.equal(presentation.median.label, "도4(C4)");
  assert.equal(presentation.voiced.percent, 80);
  assert.equal(presentation.traits.length, 2);
  assert.doesNotMatch(presentation.summary, /주요 음역 폭|반음|옥타브/);
  assert.doesNotMatch(JSON.stringify(presentation), /주요 음역 폭|테너|소프라노|건강|장르|따뜻|맑은/);
});

test("keeps range and internal stability thresholds deterministic", () => {
  assert.equal(presentVocalProfile({ ...input, tessituraHighMidi: 70 }).label, "넓게 관찰된 주요 음역");
  assert.equal(presentVocalProfile({ ...input, tessituraHighMidi: 59 }).label, "집중되어 관찰된 주요 음역");
  assert.equal(presentVocalProfile({ ...input, pitchStability: 0.85 }).stability.label, "안정적으로 관찰된 음정");
  assert.equal(presentVocalProfile({ ...input, pitchStability: 0.65 }).stability.label, "변화가 있는 음정");
});

test("normalizes reversed ranges without inferring unsupported vocal traits", () => {
  const presentation = presentVocalProfile({
    ...input,
    minMidi: 72,
    maxMidi: 48,
    tessituraLowMidi: 80,
    tessituraHighMidi: 40,
    voicedRatio: Number.NaN,
    clippingRatio: Number.NaN,
    rmsDb: Number.NaN,
  });
  assert.equal(presentation.observedRange.label, "도3(C3)–도5(C5)");
  assert.equal(presentation.practicalRange.label, "도3(C3)–도5(C5)");
  assert.equal(presentation.voiced.percent, 0);
  assert.doesNotMatch(JSON.stringify(presentation), /남성|여성|테너|바리톤|소프라노|장르/);
});

test("detail page preserves private source audio, current recommendation, and destructive confirmation flows", async () => {
  const [page, content, actions] = await Promise.all([
    readFile("src/_pages/vocal-profile-detail/ui/vocal-profile-detail-page.tsx", "utf8"),
    readFile("src/_pages/vocal-profile-detail/ui/vocal-profile-detail-content.tsx", "utf8"),
    readFile("src/_pages/vocal-profile-detail/ui/vocal-profile-actions.tsx", "utf8"),
  ]);
  assert.match(page, /VocalProfileDetailContent detail=\{detail\}/);
  assert.match(content, /detail\.audioUrl/);
  assert.match(content, /VocalProfileResults/);
  assert.match(content, /분석에 사용한 오디오예요/);
  assert.doesNotMatch(content, /로그인한 본인만 들을 수 있어요/);
  assert.match(actions, /추천 결과 보기/);
  assert.doesNotMatch(actions, /최근 추천 결과 보기/);
  assert.match(actions, /deleteVocalProfileMutationOptions/);
  assert.match(actions, /DialogDescription/);
  assert.match(actions, /복구할 수 없어요/);
});
