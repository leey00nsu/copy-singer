# Implementation Plan: midrange-only-vocal-reference

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F011
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-08
- **상태**: Approved
  - 값: Draft | Review | Approved

F011은 F009의 최대 60초 분석 source와 F010의 durable queue/Modal CPU 분석 구조를 그대로 유지하면서, 새 보컬 프로필의 합성 reference 정책만 `smart-reference-mid-v1`으로 교체한다. 새 reference는 내부 무음·저품질을 제외한 **중음(`mid`) phrase만** 최대 30초까지 사용하며, 좋은 중음 구간이 짧으면 그 길이를 그대로 READY artifact로 저장한다.

기존 `smart-reference-v1` 프로필과 asset은 migration/rebuild 없이 계속 읽고 재생하며, 기존 mixing fallback도 유지한다.

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| 분석 source | 기존 최대 60초 표준화 source 유지 | 프로필 통계·histogram·pitch track의 자연 분포를 바꾸지 않는다. |
| reference 후보 생성 | 기존 librosa/pYIN frame + VAD/quality candidate builder 재사용 | F009에서 검증한 phrase boundary, voiced density, RMS, clipping 판단을 유지한다. |
| mid 경계 | 기존 `(p10 + median) / 2`, `(median + p90) / 2` 의미 유지 | 새 Feature가 음역 통계 정의까지 변경하지 않도록 한다. |
| reference selection | `mid` candidate만 품질순으로 선택, 총 30초 cap, 최종 시간순 정렬 | 저·고음 재분배·반복·padding 없이 안정적인 중음만 prompt에 넣는다. |
| reference version | `smart-reference-mid-v1` | 기존 `smart-reference-v1`과 모델용 prompt 정책을 명확히 구분한다. |
| artifact shape | 기존 `SYNTHESIS_REFERENCE` MediaAsset + descriptor shape 최대 재사용 | Prisma migration 없이 F009/F010 persistence와 mixing snapshot을 재사용한다. |
| 사람용 분석 구간 | 기존 low/mid/high selection을 `analysis-reference-bands-v1` descriptor로 분리 | 사용자 분석 UI는 기존 3-band 경험을 유지하고 모델용 mid-only sourceRanges와 의미를 섞지 않는다. |
| mixing policy | reference contract version에 따라 strict/fallback 선택 | 새 mid-only profile은 synthesis reference를 강제하고, 과거 profile의 fallback은 유지한다. |
| Modal transport | 기존 `modal-analysis-envelope-v1` 유지 | descriptor/version과 WAV bytes만 바뀌므로 F010 transport 재설계가 필요 없다. |

---

## 아키텍처

### 1. 60초 분석 source와 synthesis reference를 분리

브라우저/F010 queue 흐름은 변경하지 않는다.

```text
Browser recording/upload
  ↓
최초 유효 음성부터 최대 60초 표준화 source
  ↓
Leemage REFERENCE + VocalProfileAnalysisJob
  ↓
analysis worker
  ↓
local/Modal shared analyzer core
  ├─ profile 통계: 60초 source 전체 자연 분포
  └─ synthesis reference: mid-only phrase selection
                         ↓
                smart-reference-mid-v1 WAV
                         ↓
              Leemage SYNTHESIS_REFERENCE
                         ↓
                  VocalProfile relation
```

내부 무음 제거는 **synthesis reference 편집 단계에만** 적용한다. profile의 p10/p50/p90, tessitura, histogram, pitch track은 기존 source에서 계산한다.

### 2. `smart-reference-mid-v1` selection

`services/vocal-profile-api/app/reference.py`의 기존 candidate builder는 유지한다.

1. pitch/VAD frame에서 연속 유성 group을 만든다.
2. 긴 group은 기존 최대 candidate 길이 단위로 나눈다.
3. voiced density, RMS, clipping 기준으로 품질 점수를 계산한다.
4. 기존 p10/median/p90 boundary로 `low | mid | high`를 판정하되, 거의 단일 음정인 입력에서 pYIN의 미세 오차가 mid를 low/high로 밀어내지 않도록 경계에 ±0.25 semitone tolerance를 둔다.
5. **`mid` candidate만** selection pool에 넣는다.
6. score 내림차순으로 좋은 candidate부터 최대 30초 budget 안에서 채택한다.
7. candidate가 일부만 필요하면 기존 최소 phrase 길이를 만족하는 범위에서 필요한 만큼만 사용한다.
8. 선택 완료 후 원본 `start_seconds` 순서로 정렬한다.
9. 기존 짧은 crossfade로 연결하고 mono PCM WAV를 만든다.
10. mid candidate 총합이 30초 미만이면 실제 길이 그대로 종료한다.

하지 않는 것:

- low/high candidate 사용
- 부족한 길이 재분배
- 같은 candidate 반복
- silence padding
- 30초 최소 길이 강제

유효 mid candidate가 없으면 WAV를 만들지 않고 `smart-reference-mid-v1` unavailable descriptor를 남긴다.

### 3. descriptor 계약

성공 descriptor는 기존 consumer와 관찰 가능성을 위해 다음 의미를 유지한다.

```text
synthesisReference
├── algorithm: "voiced-mid-phrase-selection"
├── version: "smart-reference-mid-v1"
├── durationMs
├── sourceRanges[]
│   ├── startMs
│   ├── endMs
│   ├── band: "mid"
│   ├── score
│   ├── voicedDensity
│   └── medianMidi
├── bandSeconds
│   ├── low: 0
│   ├── mid: actual selected seconds
│   └── high: 0
├── voicedDensity
├── pitchCoverageSemitones
├── crossfadeMs
└── fallbackReason: null
```

unavailable descriptor:

```text
algorithm: "voiced-mid-phrase-selection"
version: "smart-reference-mid-v1"
status: "unavailable"
fallbackReason: "no-quality-mid-phrase"
```

`AnalyzerProfile.synthesisReference` artifact metadata도 같은 version을 사용한다. 30초 미만은 unavailable reason이 아니다.

### 4. TypeScript contract 호환

F011 구현 전 `hasSmartReferenceContract()`는 `smart-reference-v1`만 전제로 했다. F011에서는 이를 지원 version 집합을 이해하는 dual-read 계약으로 확장한다.

- `smart-reference-v1`: 기존 low/mid/high 계약
- `smart-reference-mid-v1`: 새 mid-only 계약

새 helper는 descriptor와 artifact metadata의 version 일치, sourceRanges shape를 검증한다. mid-v1에서는 모든 source range의 `band`가 `mid`인지도 확인한다.

기존 export 이름을 유지할 수 있으면 유지해 F010 adapter call site 변화량을 줄이고, 필요하면 내부 helper만 분리한다.

### 5. 사람용 분석 구간과 모델용 reference 분리

새 profile도 결과 UI에서는 기존 source 기반 low/mid/high 3-band preview를 유지한다. 다만 그 구간을 더 이상 `synthesisReference.sourceRanges`에서 읽지 않는다.

```text
60초 analysis source + pitch/VAD candidates
  ├─ 사람용 분석 selection
  │    └─ analysisReferenceBands (analysis-reference-bands-v1)
  │         └─ low / mid / high sourceRanges
  │              └─ 기존 3개 WaveSurfer preview
  │
  └─ 모델용 synthesis selection
       └─ synthesisReference (smart-reference-mid-v1)
            └─ mid sourceRanges only
                 └─ Leemage SYNTHESIS_REFERENCE → mixing worker
```

`referenceBandSegments()`는 새 profile에서 `analysisReferenceBands.sourceRanges`를 우선 사용하고, 기존 `smart-reference-v1` profile에서는 `synthesisReference.sourceRanges`를 그대로 읽는다. 화면의 3-band preview는 제출 source를 계속 사용하므로 별도 synthesis-reference playback API는 사용자 UI에 필요하지 않다.

UI 문구도 이 3개 player가 모델 prompt 그 자체가 아니라 **사람에게 보여주는 대표 분석 구간**임을 명확히 하고, AI 믹싱에는 별도 중음 reference가 사용됨을 설명한다.

### 6. mixing reference 정책

현재 `selectMixingReference()`는 READY smart asset이 없으면 source asset으로 fallback한다. 이를 contract-aware policy로 확장한다.

- `smart-reference-mid-v1`
  - READY `SYNTHESIS_REFERENCE` 필수
  - 없거나 ownership/status가 잘못되면 `MIXING_REFERENCE_UNAVAILABLE` 계열 stable error로 enqueue 거부
  - 티켓 차감 전에 실패
- `smart-reference-v1`
  - READY synthesis reference 우선
  - 기존 source fallback 유지
- version 없는 legacy profile
  - 기존 source fallback 유지

mixing job 생성 시 선택된 asset ID를 `referenceAssetId`로 snapshot하는 현재 semantics는 그대로 유지한다.

### 7. persistence / queue / Modal 경계

Prisma schema 변경은 필요 없다.

- F010 analysis job queue 변경 없음
- source `REFERENCE` asset 재사용 변경 없음
- synthesis reference는 기존 `storeAnalyzerSynthesisReferenceBytes()`로 저장
- `VocalProfile.synthesisReferenceAssetId` relation 재사용
- Modal의 `modal-analysis-envelope-v1` base64/hash transport 재사용
- local/Modal은 shared `reference.py`를 사용하므로 algorithm 분기를 만들지 않는다

synthesis reference 생성이 unavailable이어도 profile 저장 자체는 허용한다. 다만 새 mid-v1 profile은 mixing enqueue 단계에서 source fallback을 금지한다.

---

## 파일 구조

```text
services/vocal-profile-api/app/
├── reference.py                         # mid-only selection/version
└── analysis_service.py                  # unavailable descriptor version/reason

services/vocal-profile-api/tests/
├── test_reference.py                    # mid-only selection / short reference / unavailable
└── test_modal_parity.py                 # local ↔ Modal exact parity

services/vocal-profile-modal/
└── test_transport.py                    # new version envelope compatibility

lib/vocal-profile/
├── contract.ts                          # v1 + mid-v1 synthesis contract validation
└── reference-segments.ts                # analysisReferenceBands 우선 + v1 fallback

components/
└── vocal-profile-results.tsx            # 모든 profile의 low/mid/high 분석 preview 유지

lib/mixing/
├── reference.ts                         # version-aware strict/fallback policy
└── queue.ts                             # profile descriptor policy 전달

tests/
├── vocal-profile-contract.test.ts
├── vocal-profile-reference-bands.test.ts
├── vocal-profile-results-ui.test.tsx
├── private-audio-proxy.test.ts
├── mixing-reference.test.ts
└── mixing-queue.integration.ts
```

실제 구현 중 파일 경계를 더 작게 유지할 수 있으면 helper 파일을 추가할 수 있으나 canonical behavior는 위 영역에 유지한다.

---

## 호환성 전략

### 기존 프로필

기존 DB row와 `smart-reference-v1` asset은 수정하지 않는다.

- migration 없음
- background rebuild 없음
- 기존 low/mid/high preview 유지
- 기존 mixing fallback 유지
- 기존 mixing job의 `referenceAssetId`는 변경하지 않음

### 새 프로필

F011 배포 이후 analyzer가 새로 분석한 profile은 `smart-reference-mid-v1` descriptor를 가진다.

- reference 생성 성공: READY `SYNTHESIS_REFERENCE`, single player, mixing 사용
- reference 생성 실패: profile은 저장되지만 single reference unavailable 안내, mixing enqueue 거부

---

## 테스트 전략

### Python 단위 테스트

`services/vocal-profile-api/tests/test_reference.py`

- low/mid/high가 섞인 fixture에서 output sourceRanges가 모두 `mid`
- mid 총합이 30초 미만이면 padding 없이 짧은 WAV 생성
- mid 총합이 30초 초과면 최대 30초 cap
- low/high만 있는 fixture에서는 unavailable
- 선택 결과 시간 순서 보존
- `bandSeconds.low/high == 0`, `mid == 실제 선택 길이`
- 같은 입력의 descriptor/reference bytes 결정성

### analyzer/local-Modal parity

- local FastAPI 응답과 Modal serializer가 `smart-reference-mid-v1`을 동일하게 전달
- 10/30/60초 parity fixture의 profile JSON/source/reference bytes exact match
- unavailable fixture의 version/reason parity

실제 Modal 재배포/remote parity가 필요한 경우 원격 compute 경계에서 실행 artifact를 공유하고 기존 승인 정책을 따른다.

### TypeScript 단위 테스트

- contract validator가 `smart-reference-v1`, `smart-reference-mid-v1` 둘 다 허용
- mid-v1의 low/high range 또는 descriptor/artifact version mismatch는 reject
- mixing reference selector는 mid-v1에서 smart asset 없으면 fallback하지 않음
- legacy/v1은 기존 fallback 유지
- UI helper가 `analysisReferenceBands`를 우선 읽고 기존 v1 sourceRanges fallback을 유지

### 통합/UI 테스트

- 새 mid-v1 profile의 `analysisReferenceBands`가 low/mid/high 3개 control을 유지
- synthesisReference sourceRanges가 mid-only여도 UI는 사람용 3-band descriptor를 사용
- smart-reference-v1 fixture는 기존 synthesisReference sourceRanges로 3개 control 유지
- mixing enqueue에서 mid-v1 reference missing 시 티켓 차감/ MixingJob 생성 없음
- READY mid-v1 reference는 `referenceAssetId`로 snapshot

### 전체 회귀

- `pnpm test`
- `pnpm run lint`
- `pnpm exec tsc --noEmit`
- `pnpm run build`
- `pnpm run db:validate`
- Python analyzer suite
- Modal transport tests
- `npx lee-spec-kit workflow-audit --json`

---

## 구현 순서

1. Python reference algorithm/version을 mid-only로 변경하고 단위 테스트 고정
2. analysis service unavailable descriptor와 local/Modal transport parity 갱신
3. TypeScript analyzer contract를 v1 + mid-v1 dual-read로 확장
4. 사람용 low/mid/high selection을 `analysisReferenceBands` descriptor로 분리
5. 결과 UI가 새 descriptor를 우선 사용하고 모든 profile에서 기존 3-band 분석 경험을 유지
6. mixing reference selection을 version-aware strict policy로 변경
7. queue/persistence/mixing/UI 통합 테스트와 전체 회귀
8. docs/ADR/workflow audit 동기화

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
- PRD: `../../prd/copy-singer-prd.md`
- 선행: `../F009-audio-waveform-and-smart-reference/`, `../../modal-api/F010-modal-vocal-profile-analysis/`
