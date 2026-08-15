# Implementation Plan: analysis-insight-recommendation-clarity

> 승인된 spec.md를 구현 가능한 변경 단위로 구체화합니다.
> analyzer/DB raw metric은 유지하고 사용자-facing presentation과 recommendation scoring/ranking 의미를 정리합니다.

---

## 개요

- **기능 ID**: F033
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-15
- **상태**: Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| --- | --- | --- |
| 보컬 presentation | 기존 TypeScript entity helper | analyzer 계약을 바꾸지 않고 화면 용어·음이름·해석 문장을 한 곳에서 일관되게 만든다. |
| 보컬 상세 UI | React 19 + 기존 shadcn/Recharts | 기존 분석 시각화와 접근성 계약을 유지한다. |
| 추천 scoring | 기존 TypeScript deterministic scorer | 새 외부 모델 없이 현재 수학적 계약을 명확하게 조정한다. |
| 추천 presentation | 기존 Recommendation entity helper | ranking score와 목록/상세/정렬 표현을 같은 source-of-truth로 묶는다. |
| Test | node:test/tsx + Storybook + ESLint/TypeScript | 수학적 결정성과 사용자-facing copy/구조를 함께 검증한다. |

---

## 구현 원칙

1. **분석 데이터는 삭제하지 않는다.** `pitchStability`, `clippingRatio`, `rmsDb`, `sampleRate`, raw MIDI는 analyzer/DB/snapshot/검증에서 유지한다.
2. **성공 결과 화면만 단순화한다.** 품질 gate나 실패 사유는 기존 기술 metric을 계속 사용한다.
3. **한 소절을 능력 전체로 해석하지 않는다.** `실용 음역`, 성별/성종 추정 대신 이번 녹음의 `관측 음역`, `주요 음역`, `중심 음`을 설명한다.
4. **ranking score와 표시 score를 하나로 만든다.** 서버 `selectionScore`를 사용자-facing `추천 점수`로 사용한다.
5. **scoring version을 올린다.** 수학적 점수 의미가 바뀌므로 기존 `key-fit-v2`와 섞지 않는다.

---

## 1. 보컬 분석 presentation 정리

### 1.1 사용자-facing 음이름 helper

`src/entities/vocal-profile/model/pitch.ts` 또는 인접 presentation module에 국제 음이름을 한국어 계이름과 병기하는 helper를 추가한다.

예:

- `60` → `도4(C4)`
- `62` → `레4(D4)`
- `66` → `파♯4(F♯4)`
- `59` → `시3(B3)`

기존 `midiToNoteName()`은 내부/차트 축 호환을 위해 그대로 둔다. 새 helper는 카드, 요약, tooltip처럼 설명 공간이 있는 사용자-facing surface에서 사용한다.

raw MIDI decimal(`62.0 MIDI`)은 사용자-facing 카드/tooltip에서 제거한다. 차트 내부 계산 데이터와 accessibility 계산에는 raw 숫자를 계속 사용할 수 있다.

### 1.2 `presentVocalProfile()` 의미 조정

`src/entities/vocal-profile/lib/presentation.ts`를 다음 의미로 바꾼다.

- `label`: `넓게/균형 있게/집중되어 관찰된 주요 음역`
- `summary`: 주요 음역 + 중심 음 설명만 유지하고 음역 폭 문장은 제거
- `practicalRange` 타입명은 내부 호환을 위해 당장 유지할 수 있지만 label은 `주요 음역`으로 변경
- `stability`는 내부 반환을 유지해 기존 비사용 consumer와 contract를 깨지 않거나, consumer 제거 후 타입을 최소화한다.
- user-facing traits는 `range`, `input` 중심으로 단순화하고 `stability` trait를 제거한다.
- `inputDescription`에서 RMS/clipping raw 숫자를 성공 결과 설명으로 다시 노출하지 않는다.

`rangeWidthDescription`과 사용자-facing 음역 폭 문장은 제거한다. 내부 `semitones` 값은 계산/분석 계약에 남겨도 되지만 요약·trait 설명에는 사용하지 않는다.

정확한 성별/성종/장르 분류 문장은 만들지 않는다.

### 1.3 분석 결과 핵심 surface

`src/entities/vocal-profile/ui/vocal-profile-summary.tsx`

핵심 metric을 다음 4개로 정리한다.

1. 관측 음역
2. 주요 음역
3. 중심 음
4. 유효 음성 구간

피치 안정도 카드는 제거한다. 세 번째 줄 detail에는 raw MIDI가 아니라 설명 문장을 쓴다.

`src/entities/vocal-profile/ui/vocal-profile-results.tsx`

- `VocalRangeProfile`의 `전체 관측 음역` → `관측 음역`, `실용 음역` → `주요 음역`, `중앙음` → `중심 음`
- range card detail에서 MIDI decimal 제거
- histogram tooltip의 MIDI decimal 제거
- pitch trace tooltip은 계이름을 표시하고 raw MIDI decimal 제거
- `분석 품질` 6개 카드를 `녹음 정보`로 단순화
  - `유효 음성 구간`
  - `녹음 길이`
- 클리핑, 평균 음량, 샘플레이트, 피치 안정성은 성공 결과 카드에서 숨김
- 분석 화면 하단에 짧은 `분석 용어` 각주 추가
  - C~B와 도~시 대응
  - 숫자는 옥타브 위치
  - 사용자-facing에서 더 이상 사용하지 않는 `MIDI` 용어는 각주에서도 제거

`src/entities/vocal-profile/ui/vocal-range-chart.tsx`, `src/entities/vocal-profile/model/visualization.ts`

aria-label과 legend를 새 용어로 동기화한다. 차트 축은 공간 제약 때문에 국제 음이름만 유지해도 되지만 설명 tooltip에는 병기 helper를 사용한다.

---

## 2. 보컬 프로필 Library 단순화

`src/widgets/library/ui/vocal-profile-library.tsx`

현재 6열을 5열로 변경한다.

- 프로필 이름
- 생성일
- 주요 음역
- AI 믹싱
- 상태

`안정도` header, completed row, pending/failed placeholder, 모바일 sr-only label을 모두 제거한다. grid template도 5열에 맞춘다.

목록의 음역 표시는 `presentation.practicalRange.label`의 새 계이름 병기 규칙을 사용한다.

---

## 3. 곡 상세의 비교 정보

현재 recommendation response의 `songProfile`에는 `min/max/median/tessitura`가 이미 포함되어 있으므로 새 네트워크/API fetch 없이 활용한다.

`src/_pages/song-detail/ui/song-detail.tsx`

- 내 음역과 곡 음역을 같은 presentation 규칙으로 비교한다.
- `내 주요 음역`, `곡 주요 음역`을 계이름 병기로 노출한다.
- recommendation run의 user `profile` contract에도 `medianMidi`를 포함해 `내 음역`의 중심 음을 `곡 보컬 음역`과 동일하게 표시한다.
- 원키 적합도와 추천 키 적합도는 `음역 기반 적합도`임을 설명한다.
- `키 조정 변화` 카드는 제거하고 원키/추천 키 적합도만 유지한다.
- 곡 분석의 QA metric(clipping/RMS/sample-rate/pitch-stability)은 노출하지 않는다.

관리자 catalog UI의 analyzer 상태/원키 추정 신뢰도는 운영 정보이므로 변경하지 않는다.

---

## 4. key-fit scoring v3

### 4.1 confidence 가산 제거

현재 v2 candidate score:

- overlap 55
- tessitura fit 25
- extreme fit 15
- confidence 5

`confidence`는 같은 사용자에 대해 모든 곡/shift 후보에 동일하게 더해져 상대 순위와 추천 키 선택에는 영향을 주지 않고 절대 점수만 이동시킨다. v3에서는 이를 candidate score에서 제거한다.

남은 세 항목을 100점으로 재정규화해 다음 정수 weight를 사용한다.

- **symmetric 주요 음역 overlap: 58**
- **주요 음역 초과 부담 fit: 26**
- **관측 극단음 초과 부담 fit: 16**

합계 100. 기존 55:25:15 비율을 거의 그대로 보존하면서 confidence 5점을 제거한다.

`calculateProfileConfidence()`는 삭제하지 않는다. `profileConfidence`, `lowConfidence`, `LOW_PROFILE_CONFIDENCE` 안내에는 계속 사용한다.

### 4.2 scoring version

`KEY_FIT_SCORING_VERSION`을 `key-fit-v3`로 변경한다. 기존 recommendation/mixing snapshot이 사용하는 version 식별 계약은 그대로 유지한다.

추천 키 탐색 범위 `-6..+6`, 정수 semitone, 기존 tie-break는 유지한다.

### 4.3 이유 문구

`src/entities/recommendation/lib/ranking.ts`의 사용자-facing reason은 다음 원칙으로 변경한다.

- `편안한 음역` → `이번 녹음의 주요 음역`
- `곡의 주요 음역`을 명시
- 점수는 확률이 아니라 점수이므로 `%`/`확률` 의미를 암시하지 않는다.
- 키 조정 전후 적합도는 필요하면 `점`으로 설명한다.

---

## 5. 단일 추천 점수와 ranking

### 5.1 사용자-facing 추천 점수

현재 ranking의 `selectionScore` 계산식은 유지한다.

`0.65 × originalKeyScore + 0.35 × adjustedScore - shiftPenalty`

shift penalty도 현재 단계형 정책 `[0, 1, 3, 7, 12, 20, 30]`을 유지한다. 이 score가 이미 서버 `rank`의 실제 source-of-truth이므로 사용자-facing 이름을 **추천 점수**로 통일한다.

이 Feature에서는 selection policy 자체를 다시 튜닝하지 않는다. v3 key-fit 입력 점수의 의미만 바로잡고, ranking/표시 불일치를 제거한다. 향후 실제 사용자 성공 데이터가 생기면 별도 feature에서 weight calibration을 수행한다.

### 5.2 API/presentation contract

현재 runtime response는 `selectionScore`를 항상 계산한다. UI helper를 `recommendationScore()` 같은 명시적 함수로 만들고 `selectionScore`를 0~100 범위로 clamp/round하여 표시한다.

- 목록: `87점`
- 선택 상세: `추천 점수 87점`
- 상세 분석: `추천 점수`, `원키 적합도`, `{추천 키} 적합도`; `키 조정 변화`는 표시하지 않음

`adjustedScore`는 목록 대표 점수로 사용하지 않는다.

### 5.3 정렬 canonicalization

`RecommendationSort`의 canonical 추천 정렬 값을 `recommendation-score`로 둔다.

새 UI 옵션:

1. 추천 점수 높은 순
2. 원키 적합도 높은 순
3. 곡명 가나다순

기존 URL 호환:

- `sort=rank` → `recommendation-score`
- `sort=adjusted-score` → `recommendation-score`

serializer는 canonical 값만 새 URL에 쓴다. legacy 값은 parser에서 읽기만 한다.

`projectRecommendationItems()`의 추천 점수 정렬은 `selectionScore` 내림차순 + `rank` tie-break를 사용하고, 기본 rank와 결과가 일치하는지 테스트한다.

---

## 6. PRD/카피 동기화

다음 기존 문구를 새 의미에 맞춘다.

- `실용 음역` → `주요 음역`
- `편안한 음역` → `이번 녹음의 주요 음역`
- `추천 적합도`(목록 대표값) → `추천 점수`
- `%` → `점` for selection/recommendation score

`원키 적합도`, `추천 키 적합도`는 key-fit candidate의 0~100 score로 유지하되 성공 확률로 설명하지 않는다.

---

## 예상 변경 파일

```text
docs/prd/copy-singer-prd.md
docs/features/web/F033-analysis-insight-recommendation-clarity/

src/entities/vocal-profile/
├── lib/presentation.ts
├── model/pitch.ts
├── model/visualization.ts
└── ui/
    ├── vocal-profile-summary.tsx
    ├── vocal-profile-results.tsx
    └── vocal-range-chart.tsx

src/widgets/library/ui/vocal-profile-library.tsx

src/entities/recommendation/
├── lib/key-fit-scorer.ts
├── lib/ranking.ts
├── lib/presentation.ts
└── model/key-fit-contract.ts

src/_pages/recommendation-detail/ui/
├── recommendation-filter-bar.tsx
├── recommendation-song-list.tsx
├── recommendation-selection.tsx
└── recommendation-results*.tsx

src/_pages/song-detail/ui/song-detail.tsx

관련 Storybook/fixture/test files
```

필요한 경우 landing/demo copy도 사용자-facing `실용 음역` 용어 제거 범위에서만 함께 갱신한다.

### 6.1 랜딩 이용 방법 CTA

`src/_pages/home/ui/landing-hero.tsx`의 보조 CTA 문구를 `이용 방법 보기`로 바꾸고 `#product-story`로 연결한다. 대상 anchor는 `src/_pages/home/ui/landing-page.tsx`의 `한 소절로 시작해, 내 목소리로 완성.` 섹션이 가진 기존 `id="product-story"`를 그대로 사용해 새 scroll 로직이나 client state를 추가하지 않는다.

---

## 테스트 전략

### 보컬 presentation

- `tests/vocal-profile-contract.test.ts`
  - 한국어 계이름 병기 helper
  - sharp/octave 결정성
- `tests/vocal-profile-presentation.test.ts`
  - `주요 음역` label
  - 중심 음 설명과 음역 폭 문구 부재
  - 성별/성종 문구 부재
- `tests/vocal-profile-results-ui.test.tsx`
  - 유효 음성 구간/녹음 길이 표시
  - clipping/RMS/sample-rate/pitch-stability/raw MIDI 부재
  - 분석 용어 각주 표시
- `tests/vocal-profile-history-ui.test.tsx`
  - 안정도 컬럼 부재
  - 5열 semantic 구조

### scoring/ranking

- `tests/key-fit-scoring.test.ts`
  - scoring version v3
  - 58/26/16 기여도
  - confidence 변화가 candidate score를 직접 바꾸지 않음
  - low-confidence reason은 유지
  - 기존 shift/tie-break/100곡 성능 회귀
- `tests/recommendation-ranking.test.ts`
  - selectionScore/rank 결정성
  - v3 score를 입력으로 ranking
- `tests/recommendation-presentation.test.ts`
  - canonical/legacy sort parsing
  - 추천 점수 표시 helper
  - 추천 점수 정렬과 rank 일치
- `tests/recommendation-ui.test.tsx`, `tests/recommendation-song-detail.test.tsx`
  - `%` 대표 추천 점수 제거
  - `점` 표기
  - 내/곡 주요 음역 및 중심 음 비교
  - `키 조정 변화` 부재

### Storybook

관련 보컬 프로필 detail/summary/library와 recommendation results/song detail stories를 실행해 desktop/mobile에서 구조와 copy를 검증한다. 랜딩 story에서는 `이용 방법 보기` 링크의 `href="#product-story"`와 대상 섹션 존재를 함께 확인한다.

### 전체 회귀

```bash
pnpm run test:vocal-profile-presentation
pnpm run test:key-fit
pnpm run test:recommendation
pnpm exec tsc --noEmit
pnpm run lint
pnpm test
```

전체 Storybook suite와 build가 통과해야 한다.

---

## 배포/데이터 영향

- Prisma migration 없음
- analyzer deploy 없음
- Modal deploy 없음
- 기존 프로필/곡 분석 raw metrics 재계산 없음
- scoring version이 `key-fit-v3`로 바뀌므로 같은 profile/catalog라도 추천 score/rank cache key가 새 version으로 분리됨
- 기존 믹싱 job의 snapshot/scoring version은 변경하지 않음

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
- PRD: `../../prd/copy-singer-prd.md`
