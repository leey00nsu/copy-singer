# Feature Spec: key-fit-scoring

> 기술 스택과 구체적인 수식 구현은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F004
- **기능명**: key-fit-scoring
- **대상 레포**: copy-singer-data
- **작성일**: 2026-08-06
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

F002에서 생성한 사용자 보컬 프로필과 F003의 곡 보컬 프로필을 비교해, 각 곡의 원키 적합도와 가장 적합한 정수 semitone 이동 값을 계산한다.

결과는 절대적인 가창력 평가가 아니라 사용자가 제출한 한 소절에서 관찰된 음역을 기준으로 한 상대적 추천이다. 동일한 입력과 scoring version에는 항상 같은 결과를 반환하며, 후속 F005가 상위 3곡과 자연어 추천 이유를 만들 수 있도록 계산 근거를 구조화해 제공한다.

### 포함 범위

- 사용자 편안한 음역과 곡 테시투라의 겹침 계산
- 고음·저음 및 robust 극단음 초과량 계산
- 사용자 프로필의 음정 안정도와 voiced ratio를 이용한 신뢰도 반영
- `-6`부터 `+6`까지 정수 semitone 후보 전수 평가
- 원키 점수, 조정 점수, 추천 shift와 항목별 score breakdown 반환
- 결정적 tie-break와 versioned scoring 계약
- 경계값·대칭 입력·동점·저신뢰 입력 fixture 회귀 테스트

### 제외 범위

- 100곡 순위화, 상위 3곡 선택, RecommendationRun 저장과 추천 API
- 추천 이유의 한국어 자연어 변환 및 추천 결과 UI
- 장르·인기도·감정·음색 embedding 기반 선호도
- 원곡의 음악적 key 추정이나 장·단조 분석
- 사용자의 성종, 건강 상태 또는 절대적인 가창 능력 판정
- 가수가 실제로 부르기 어려운 발음·호흡·프레이즈 길이 평가

---

## 용어와 입력 계약

- **사용자 편안한 음역**: 사용자 profile의 `tessituraLowMidi`~`tessituraHighMidi` 구간이다. 현재 analyzer에서는 voiced pitch의 p10~p90에 해당한다.
- **곡 테시투라**: 곡 profile의 `tessituraLowMidi`~`tessituraHighMidi` 구간이다.
- **robust 극단음**: analyzer가 단일 octave 오류와 순간 잡음을 줄여 계산한 `minMidi`와 `maxMidi`다.
- **shift 적용**: 곡의 모든 MIDI 통계에 같은 정수 semitone 값을 더한다. 음수는 키를 내리고 양수는 키를 올린다.
- **호환 profile**: 사용자와 곡 profile이 필수 MIDI·품질 필드를 가지며 같은 analyzer 이름과 analyzer version을 사용한다.

---

## 사용자 스토리

### US-1: 원키 적합도 확인

**As a** 내 음역에 맞는 노래를 찾는 사용자  
**I want** 각 노래가 원키에서 얼마나 편안한지 일관된 점수로 확인하고 싶다  
**So that** 익숙하지 않은 노래도 음역 부담을 비교할 수 있다

**Acceptance Criteria:**

- [x] 원키 점수는 `0`~`100` 범위이며 테시투라 겹침, 고음·저음 초과, robust 극단음 초과와 사용자 profile 신뢰도를 반영한다.
- [x] 결과는 전체 점수뿐 아니라 각 요소의 입력 metric, 정규화 값, 가중 기여도를 포함한다.
- [x] 같은 곡이라도 사용자 편안한 음역 밖의 고음 또는 저음이 증가하면 점수가 증가하지 않는다.
- [x] 저신뢰 사용자 profile은 결과에 명시적인 confidence와 reason code를 남기며 확정적인 표현을 유도하지 않는다.

### US-2: 추천 노래방 키 확인

**As a** 노래방에서 곡을 부르려는 사용자  
**I want** 원키에서 몇 반음을 올리거나 내려야 하는지 알고 싶다  
**So that** 내 편안한 음역에 가까운 설정으로 시작할 수 있다

**Acceptance Criteria:**

- [x] `-6`~`+6`의 모든 정수 shift 후보를 같은 scoring 함수로 평가한다.
- [x] 가장 높은 조정 점수의 shift를 추천하고 원키와 비교한 점수 변화 및 고음·저음 부담 변화를 반환한다.
- [x] 동점은 고음 초과량, 전체 극단음 초과량, 절대 shift 크기, 숫자상 작은 shift 순으로 비교해 항상 하나의 결과를 선택한다.
- [x] 원키가 최고 후보이면 추천 shift는 `0`이다.

### US-3: 재현 가능한 계산 근거 제공

**As a** 추천 기능 개발자  
**I want** 점수와 추천 shift의 버전 및 계산 근거를 구조화된 값으로 받고 싶다  
**So that** F005에서 결과를 저장하고 사용자에게 검증 가능한 추천 이유를 제시할 수 있다

**Acceptance Criteria:**

- [x] 출력은 `scoringVersion`, `originalKeyScore`, `adjustedScore`, `recommendedShift`, `confidence`, `reasonCodes`와 breakdown metrics를 포함한다.
- [x] 모든 후보의 내부 계산은 결정적이며 출력 점수 반올림이 후보 선택 결과를 바꾸지 않는다.
- [x] 같은 입력과 scoring version을 반복 평가하면 byte-level 직렬화 기준으로 같은 결과를 얻는다.
- [x] scoring version 또는 입력 analyzer 계약이 다르면 caller가 구분 가능한 안정적인 validation error를 반환한다.

---

## 기능 요구사항

### FR-1: 프로필 검증

- 사용자와 곡 profile의 필수 숫자는 finite 값이어야 하고 `min <= tessituraLow <= tessituraHigh <= max` 순서를 만족해야 한다.
- `pitchStability`, `voicedRatio`, `clippingRatio`는 analyzer 계약 범위를 검증한다.
- 곡 항목은 F003 artifact에서 `READY`이고 profile이 존재해야 한다.
- analyzer 이름 또는 version이 다르면 암묵적으로 보정하지 않고 `INCOMPATIBLE_ANALYZER`로 거절한다.
- 잘못된 숫자·역전된 구간·누락 필드는 `INVALID_PROFILE`로 거절한다.

### FR-2: score 구성

- 최종 점수는 `0`~`100`으로 clamp한다.
- 테시투라 겹침은 shift된 곡 테시투라 중 사용자 편안한 음역 안에 포함되는 비율로 계산한다.
- 고음·저음 부담은 shift된 곡 테시투라가 사용자 편안한 음역을 초과한 semitone 양을 각각 계산한다.
- 극단음 부담은 shift된 곡의 robust `minMidi`·`maxMidi`가 사용자 robust 범위를 초과한 semitone 양을 계산한다.
- 사용자 confidence는 `pitchStability`와 `voicedRatio`에서 계산해 점수 및 breakdown에 반영한다.
- 가중치, penalty cap, 반올림 자릿수는 scoring version에 고정된 상수이며 결과 metrics에 계산 요소를 노출한다.

### FR-3: 추천 shift 탐색

- 후보 범위는 양 끝을 포함한 정수 `-6`~`+6`이다.
- 각 후보는 원본 profile 객체를 변경하지 않고 곡 MIDI 통계에만 shift를 적용한다.
- 후보 비교에는 반올림 전 점수를 사용한다.
- 점수가 같으면 고음 초과량이 작은 후보, 전체 극단음 초과량이 작은 후보, 절대 shift가 작은 후보, 숫자상 작은 shift 순으로 선택한다.

### FR-4: 결과 계약

- 결과는 원키(`shift=0`)와 추천 후보의 점수 및 breakdown을 모두 포함한다.
- `reasonCodes`는 계산된 사실에서만 생성하며 최소한 원키 유지, 키 이동 개선, 고음 부담, 저음 부담, 높은 겹침, 낮은 confidence를 구분할 수 있어야 한다.
- 자연어 문장은 반환하지 않으며 F005가 reason code와 metrics를 사용자 문구로 변환한다.
- 출력은 JSON 직렬화 가능한 plain data이며 profile ID 또는 song ID 같은 caller metadata를 선택적으로 함께 전달할 수 있다.

### FR-5: 버전과 재현성

- scoring version은 코드에 명시된 변경 불가능한 문자열 상수로 제공한다.
- 점수 수식, 가중치, 후보 범위, tie-break 또는 reason code 의미가 바뀌면 scoring version을 올린다.
- F005의 저장 계층은 scorer가 반환한 version과 입력 profile 식별자를 RecommendationRun/Item에 기록할 수 있어야 한다.

---

## 비기능 요구사항

- **성능·비용**: 단일 사용자 profile과 100곡을 평가하는 순수 계산은 네트워크·DB·GPU 없이 로컬 CPU에서 수행하며 테스트 환경 기준 100ms 이내를 목표로 한다.
- **재현성**: 시간, 난수, locale, 객체 iteration 순서에 의존하지 않고 동일 입력·version에 동일 결과를 반환한다.
- **설명 가능성**: 점수의 각 가산·감산 요소와 semitone 초과량을 구조화된 metric으로 추적할 수 있어야 한다.
- **안전성**: 유효하지 않거나 호환되지 않는 profile을 임의 기본값으로 채워 점수를 만들지 않는다.
- **책임 있는 표현**: 결과 계약은 관찰된 한 소절 기반 추정임을 전제로 하며 의료·성종·가창력 판정 값을 만들지 않는다.
- **호환성**: F002 PostgreSQL USER VocalProfile과 F003 JSON song profile의 현재 `librosa-pyin` `0.11.0` 계약을 직접 비교할 수 있어야 한다.
- **검증**: TypeScript 검사, ESLint, production build와 scoring fixture 단위 테스트를 통과해야 한다.

---

## 관련 문서

- PRD: `../../../prd/copy-singer-prd.md`
- PRD Refs: `PRD-US-003`, `PRD-US-004`, `PRD-FR-008`, `PRD-FR-009`, `PRD-FR-010`, `PRD-NFR-004`, `PRD-NFR-007`
- Idea: `../../../ideas/I004-key-fit-scoring.md`
