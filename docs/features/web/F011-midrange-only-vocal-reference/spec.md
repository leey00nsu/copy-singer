# Feature Spec: midrange-only-vocal-reference

> 기술 스택과 세부 알고리즘 구현은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F011
- **기능명**: midrange-only-vocal-reference
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-08
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

F009에서 AI 믹싱용 `smart-reference-v1`은 최대 60초 분석 source에서 내부 무음·저품질 구간을 제외하고 저음·중음·고음 phrase를 각각 약 10초 목표로 선택해 최대 30초 reference를 만들었다. 실제 사용자 테스트에서는 저음·고음까지 고르게 섞은 reference보다 **중음 영역의 안정적인 유성 phrase만 사용한 reference가 더 깔끔한 합성 결과**를 보였다.

F011은 보컬 프로필 통계에 사용하는 최대 60초 분석 source와 자연 음정 분포는 그대로 유지하면서, AI 믹싱에 사용하는 별도 synthesis reference 정책만 변경한다. 새 reference는 내부 무음·클리핑·저품질 구간을 제거하고 **중음으로 판정된 phrase만** 원본 시간 순서로 이어 붙인다. 30초는 최대 길이일 뿐 목표 길이가 아니며, 확보된 좋은 중음 구간이 더 짧으면 반복·padding·저음/고음 재분배 없이 짧은 reference를 그대로 사용한다.

새 프로필은 새 versioned reference 계약을 사용하고, 기존 `smart-reference-v1` 프로필과 저장 asset은 재생·히스토리·믹싱 호환을 위해 그대로 유지한다.

---

## 사용자 스토리

### US-1: 중음 중심의 깨끗한 AI 믹싱 reference

**As a** 내 목소리로 AI 믹싱을 만드는 사용자
**I want** 제출 음성의 안정적인 중음 구간만 합성 reference로 사용하고 싶다
**So that** 저음·고음의 불안정한 발성이나 긴 무음이 voice prompt에 섞이지 않아 더 일관된 결과를 얻을 수 있다

**Acceptance Criteria:**

- [ ] 보컬 프로필 분석 source는 기존과 동일하게 최초 유효 음성부터 최대 60초를 사용하고 profile 통계의 자연 분포를 유지한다.
- [ ] synthesis reference는 분석 source 안의 중음 영역 phrase만 선택하며 내부 무음·클리핑·저품질 후보를 제외한다.
- [ ] 선택한 중음 phrase는 원본 시간 순서를 보존하고 짧은 crossfade로 연결한다.
- [ ] reference는 최대 30초지만 30초를 채우기 위해 저음·고음 phrase, 반복 또는 무음 padding을 추가하지 않는다.
- [ ] 30초 미만의 정상 reference도 READY synthesis reference로 저장하고 AI 믹싱에 사용한다.

### US-2: 기존 보컬 분석 표현 유지

**As a** 보컬 프로필 결과를 확인하는 사용자
**I want** reference 정책이 바뀌어도 기존 저음·중음·고음 분석 구간과 프로필 시각화를 그대로 보고 싶다
**So that** 사람이 이해하는 보컬 분석 경험은 유지하면서 AI 믹싱 품질만 중음 reference로 개선할 수 있다

**Acceptance Criteria:**

- [ ] 새 mid-v1 프로필도 기존처럼 제출 source 위의 저음·중음·고음 대표 분석 구간을 각각 재생할 수 있다.
- [ ] 저음·중음·고음 표시용 구간은 synthesis reference의 mid-only `sourceRanges`와 별도 descriptor로 유지한다.
- [ ] 음역·histogram·pitch track·품질 지표와 저음·중음·고음 플레이어의 사용자 경험은 F009 기준을 유지한다.
- [ ] 실제 AI 믹싱에는 표시용 저·중·고 구간을 합친 파일이 아니라 별도 저장된 mid-only `SYNTHESIS_REFERENCE`만 사용한다.

### US-3: 기존 프로필 호환

**As a** 이전에 만든 보컬 프로필을 가진 사용자
**I want** 새 reference 정책이 도입되어도 기존 프로필과 믹싱 기록을 계속 사용할 수 있다
**So that** 과거 데이터를 다시 분석하거나 삭제할 필요가 없다

**Acceptance Criteria:**

- [ ] 기존 `smart-reference-v1` profile/descriptor/asset은 migration 없이 계속 읽을 수 있다.
- [ ] 기존 `smart-reference-v1` 프로필은 현재 저음·중음·고음 source-range player와 legacy mixing fallback 동작을 유지한다.
- [ ] 새 mid-only 계약의 프로필은 READY 중음 synthesis reference가 없으면 전체 60초 source로 조용히 fallback하지 않고 명시적인 재녹음/재분석 가능 오류를 반환한다.

---

## 기능 요구사항

### FR-1: 60초 분석 source 계약 유지

- 녹음·업로드 입력은 F009/F010과 동일하게 브라우저에서 최초 유효 음성부터 최대 60초의 표준 mono 저비트레이트 오디오로 준비한다.
- profile 통계, histogram, pitch track, p10/p50/p90, tessitura와 quality metric은 편집되지 않은 이 분석 source를 기준으로 계산한다.
- reference를 위해 제거한 내부 무음이나 선택하지 않은 저·고음 phrase가 profile 통계 입력에서 제거되어서는 안 된다.
- F010 durable analysis queue와 local/Modal analyzer backend 선택, transport, 인증·retry·lease 계약은 변경하지 않는다.

### FR-2: mid-only synthesis reference 생성

- 기존 analyzer의 pitch frame/VAD/quality 정보를 재사용해 유성 phrase 후보를 만든다.
- `mid` 판정은 현재 `smart-reference-v1`에서 사용하는 p10/median/p90 기반 band boundary 의미를 유지하며, 이 Feature에서는 `mid` 후보만 reference selection 대상으로 사용한다.
- voiced density, clipping, RMS와 최소 phrase 길이를 만족하지 않는 후보는 제외한다.
- 내부 무음으로 분리된 phrase는 서로 다른 candidate로 취급하고 reference에는 유성 구간만 포함한다.
- 선택 candidate는 품질 점수로 채택하되 최종 출력은 원본 시간 순서로 정렬한다.
- 여러 phrase를 연결할 때 기존의 짧은 crossfade를 유지한다.
- 총 출력은 30초를 넘지 않는다.
- 30초를 채우기 위해 `low`/`high` candidate를 사용하거나 candidate를 반복하거나 silence padding을 추가하지 않는다.
- 유효 중음 phrase 합계가 30초보다 짧으면 그 실제 합계 길이로 reference를 생성한다.
- 유효 중음 phrase가 하나도 없으면 synthesis reference를 생성하지 않고 descriptor에 명시적인 unavailable reason을 기록한다.

### FR-3: 새 versioned descriptor와 artifact

- 새 reference algorithm/version은 기존 `smart-reference-v1`과 구분되는 **`smart-reference-mid-v1`**로 저장한다.
- descriptor는 최소한 algorithm, version, duration, source ranges, voiced density, pitch coverage, crossfade와 unavailable/fallback reason을 제공한다.
- 새 계약의 `sourceRanges`는 모두 `band: "mid"`이어야 한다.
- 기존 consumer 호환을 위해 `bandSeconds`를 유지하는 경우 `low=0`, `high=0`, `mid=실제 선택 길이`가 되어야 하며, 구현 계획에서 shape를 확정한다.
- source와 synthesis reference는 기존처럼 별도 `REFERENCE` / `SYNTHESIS_REFERENCE` MediaAsset으로 저장한다.
- reference duration이 30초보다 짧다는 이유로 저장 실패 또는 unavailable로 처리하지 않는다.

### FR-4: 믹싱 reference 선택 정책

- 새 `smart-reference-mid-v1` 프로필의 새 AI 믹싱 job은 반드시 READY `SYNTHESIS_REFERENCE`를 snapshot하여 사용한다.
- 새 계약 profile에 synthesis reference가 없거나 READY가 아니면 전체 source `REFERENCE`를 자동 대체하지 않고 stable error code로 믹싱 시작을 거부한다.
- 기존 `smart-reference-v1` 및 synthesis reference가 없는 legacy profile은 현재 호환 fallback 정책을 유지한다.
- 믹싱 job이 생성된 뒤에는 기존 snapshot semantics를 유지하여 profile asset이 나중에 바뀌어도 이미 생성된 job의 reference가 바뀌지 않는다.

### FR-5: 사람용 저·중·고 분석 구간과 모델용 reference 분리

- 새 계약 profile 결과 UI도 기존과 동일하게 source 위의 low/mid/high 대표 구간 player 3개를 유지한다.
- 표시용 구간은 `analysisReferenceBands`처럼 synthesis reference와 구분되는 versioned descriptor에 저장하고, 기존 F009 band selection 의미를 유지한다.
- `smart-reference-mid-v1.synthesisReference.sourceRanges`는 실제 모델 prompt에 포함되는 mid-only 구간만 표현하며 UI의 3-band 표시 계약으로 재사용하지 않는다.
- UI 문구는 저·중·고 플레이어가 사람에게 보여주는 분석 구간임을 명확히 하고, AI 믹싱에는 별도 중음 reference가 사용된다는 점을 오해 없이 설명한다.
- 기존 `smart-reference-v1` profile은 현재 synthesisReference sourceRanges를 그대로 읽어 동일한 3-band UI를 유지한다.

### FR-6: local/Modal parity와 queue 호환

- local FastAPI와 Modal CPU analyzer는 같은 `smart-reference-mid-v1` 생성 코드를 사용한다.
- 기존 F010 `modal-analysis-envelope-v1` transport는 새 descriptor/version과 reference bytes를 손실 없이 전달해야 한다.
- 동일 fixture에 대해 local과 Modal의 profile descriptor와 synthesis reference bytes가 동일해야 한다.
- F010 durable queue worker는 source asset을 그대로 재사용하고 새 synthesis reference만 추가 저장하는 현재 persistence 경계를 유지한다.
- retry, terminal failure cleanup과 source ownership semantics를 변경하지 않는다.
- `VOCAL_PROFILE_ANALYZER_BACKEND=modal`인 production mixing worker는 곡 target 준비도 같은 authenticated Modal analyzer의 `/v1/song-target`을 사용하며 로컬 `VOCAL_PROFILE_API_URL`에 의존하지 않는다.
- `/v1/song-target`은 기존 catalog allowlist와 yt-dlp/FFmpeg WAV 생성·임시 cleanup 계약을 유지한다.
- reference 다운로드, song-target 준비, SoulX Modal submit 단계의 네트워크 실패는 서로 구분되는 stable error code로 기록하고, Modal 접수 전 retryable failure는 bounded retry를 사용한다.

---

## 비기능 요구사항

- **품질**: mid-only reference가 30초 미만이어도 품질 좋은 유성 phrase만 포함하는 것을 길이 충족보다 우선한다.
- **결정성**: 같은 source/analyzer version에는 같은 sourceRanges와 같은 reference bytes가 생성되어야 한다.
- **성능**: 기존 최대 60초 분석 및 Modal CPU resource/timeout budget을 유의미하게 악화시키지 않는다.
- **보안·개인정보**: reference asset은 기존 owner-scoped same-origin audio proxy를 통해서만 재생하고 Modal에는 영구 사용자 오디오를 저장하지 않는다.
- **호환성**: 기존 `smart-reference-v1` profile, recommendation, mixing history와 저장 asset을 재생성하거나 migration하지 않는다.
- **관찰 가능성**: 새 descriptor/version만으로 mid-only reference인지 식별할 수 있고 unavailable reason을 진단할 수 있어야 한다.
- **품질 게이트**: TypeScript, ESLint, production build, Prisma validation, Python analyzer tests, local/Modal parity와 관련 mixing/UI integration test를 통과한다.

---

## 범위 제외

- 사용자에게 low/mid/high reference 모드를 선택하게 하는 설정 UI
- SoulX-Singer 모델이나 preset 자체 변경
- 30초 prompt 최대 길이 확대
- 기존 `smart-reference-v1` asset의 일괄 재생성 또는 데이터 migration
- 보컬 프로필 통계 알고리즘(p10/p50/p90, tessitura, scoring) 변경
- 사용자가 phrase cut point를 직접 편집하는 오디오 editor

---

## 관련 문서

- PRD: `../../prd/copy-singer-prd.md`
- PRD Refs: `PRD-US-018`, `PRD-FR-042`, `PRD-NFR-005`
- 선행 Feature: `F009-audio-waveform-and-smart-reference`, `F010-modal-vocal-profile-analysis`
