# Implementation Plan: key-fit-scoring

---

## 개요

- **기능 ID**: F004
- **대상 레포**: copy-singer-data
- **작성일**: 2026-08-06
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| --- | --- | --- |
| 구현 | TypeScript 순수 함수 | F005 Next.js 서버 코드에서 직접 재사용하고 DB·네트워크 없이 결정적으로 테스트 |
| 입력 계약 | 기존 `VocalProfile`/`SongProfileMetrics`의 구조적 subset | Prisma row와 F003 JSON artifact를 별도 변환 비용 없이 같은 scorer에 전달 |
| 검증 | 명시적 runtime validation | NaN, 누락, 역전된 MIDI 구간과 analyzer 불일치를 조기 차단 |
| 테스트 | Node test runner + `tsx --test` | 현재 프로젝트의 TypeScript 테스트 패턴과 일치 |

---

## 아키텍처

```text
F002 USER VocalProfile ─┐
                       ├─ validate compatible metrics
F003 READY song profile ┘
  -> shift candidate -6 ... +6
  -> calculate overlap / tessitura excess / extreme excess / confidence
  -> weighted score (unrounded comparison)
  -> deterministic tie-break
  -> original + recommended breakdown / reason codes / scoringVersion

F003 artifact + one user profile
  -> scoreCatalogKeyFits
  -> 100 independent score results in catalogOrder order
  -> F005 ranks and persists RecommendationRun/Item
```

scorer는 profile ID, DB client, 현재 시간과 locale을 알지 못한다. caller가 식별자를 결과 metadata와 결합하고 F005에서 저장한다. F003 항목은 `READY`만 bulk 평가 대상으로 허용하며 실패나 누락을 묵인하지 않는다.

---

## 점수 모델 v1

### 정규화 metric

- `tessituraOverlapRatio`: shift된 곡 테시투라 중 사용자 편안한 음역과 겹치는 길이 / 곡 테시투라 길이
- `highTessituraExcess`, `lowTessituraExcess`: 사용자 편안한 경계를 벗어난 semitone
- `highExtremeExcess`, `lowExtremeExcess`: 사용자 robust min/max 경계를 벗어난 semitone
- `tessituraFit = 1 - clamp((highTessituraExcess + lowTessituraExcess) / 12, 0, 1)`
- `extremeFit = 1 - clamp((highExtremeExcess + lowExtremeExcess) / 12, 0, 1)`
- `voicedConfidence = clamp((voicedRatio - 0.25) / 0.5, 0, 1)`
- `confidence = clamp(0.6 * pitchStability + 0.4 * voicedConfidence, 0, 1)`

### 가중 점수

```text
score = clamp(
  55 * tessituraOverlapRatio
  + 25 * tessituraFit
  + 15 * extremeFit
  + 5 * confidence,
  0,
  100
)
```

후보 비교에는 반올림 전 double 값을 사용하고 API용 숫자만 소수 둘째 자리로 반올림한다. 사용자의 confidence는 모든 곡에 같은 방식으로 반영되며 점수의 신뢰 수준을 드러내되, 음역상 더 나쁜 shift를 유리하게 만들지 않는다.

### tie-break

점수 차이가 `1e-9` 이내이면 다음 순서로 선택한다.

1. `highTessituraExcess`가 작음
2. `highExtremeExcess + lowExtremeExcess`가 작음
3. `abs(shift)`가 작음
4. 숫자상 작은 shift (같은 절대값이면 낮춘 키 우선)

---

## 결과와 오류 계약

- 상수: `KEY_FIT_SCORING_VERSION = "key-fit-v1"`
- 결과: scoringVersion, originalKeyScore, adjustedScore, recommendedShift, confidence, original/recommended breakdown, reasonCodes
- breakdown: overlap, 네 가지 초과량, tessituraFit, extremeFit, confidence, 각 weighted contribution, rawScore
- reason code: `ORIGINAL_KEY_BEST`, `KEY_SHIFT_IMPROVES_FIT`, `HIGH_TESSITURA_OVERLAP`, `HIGH_RANGE_BURDEN`, `LOW_RANGE_BURDEN`, `HIGH_NOTES_REDUCED`, `LOW_NOTES_REDUCED`, `LOW_PROFILE_CONFIDENCE`
- 오류: `INVALID_PROFILE`, `INCOMPATIBLE_ANALYZER`, `SONG_PROFILE_NOT_READY`

reason code 순서는 고정 배열 순서로 생성해 직렬화 결과도 결정적으로 유지한다.

---

## 파일 구조

```text
lib/key-fit/contract.ts       # public input/output/error types와 version 상수
lib/key-fit/scorer.ts         # validation, candidate score, tie-break, reasons
lib/key-fit/catalog.ts        # F003 artifact 100곡 bulk adapter
tests/key-fit-scoring.test.ts # 수식·경계·동점·오류·100곡 회귀 테스트
package.json                  # test:key-fit 및 전체 test 연결
services/vocal-profile-api/app/config.py # 사용자 분석 최소 5초 gate
components/vocal-profile-workbench.tsx   # TOO_SHORT 재시도 안내
```

---

## 테스트 전략

- **단위 테스트**:
  - 완전 겹침, 무겹침, 고음 초과, 저음 초과와 score 범위
  - shift가 모든 곡 MIDI 통계에 동일하게 적용되는지 확인
  - 원키 최고, 키 내림, 키 올림, 동점 tie-break fixture
  - 낮은 stability/voiced ratio confidence와 reason code
  - NaN·누락·역전 구간·analyzer version 불일치 오류
- **통합 테스트**:
  - 실제 F003 artifact 100곡이 모두 평가되고 catalogOrder 순서를 유지
  - 같은 입력을 두 번 평가한 JSON 직렬화 결과가 동일
  - bulk 평가가 테스트 환경에서 100ms 목표를 만족
  - 5초 경계 fixture와 실제 `vocal1.wav` profile로 100곡을 평가
- **회귀 테스트**:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run test:key-fit`
  - `npm test`

---

## 운영·리스크

- 한 소절 profile은 전체 가창 음역을 대표하지 않을 수 있으므로 낮은 confidence를 숨기지 않는다.
- 곡 분리 오류나 짧은 비보컬 구간이 aggregate profile에 영향을 줄 수 있어 score breakdown을 함께 보존한다.
- 수식이나 weight를 in-place 변경하지 않고 새 scoring version으로 분기한다.
- F005에서 순위를 만들 때는 조정 점수 외 인기·취향 요소를 이 scorer에 섞지 않는다.
- score는 추천 시작점이며 실제 노래방 기기·음원 버전에 따른 key 차이는 F005 문구에서 고지한다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
