# Implementation Plan: mixing-clarity-finalization

---

## 개요

- **기능 ID**: F012
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-08
- **상태**: Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| 후처리 엔진 | 기존 FFmpeg binary | 현재 mixing result AAC 압축에 이미 사용 중이며 추가 서비스/비용이 없음 |
| DSP | FFmpeg `highpass`, `bass`, `equalizer`, `treble`, `acompressor`, `extrastereo`, `loudnorm` | 로컬 Clarity / Normal A/B 설정을 그대로 재현 가능 |
| 최종 codec | AAC 160 kbps / M4A | 현재 사용자 결과 storage contract 유지 |

---

## 아키텍처

현재:

```text
SoulX result WAV
  -> compressMixingResult()
  -> AAC/M4A
  -> Leemage
  -> MixingJob SUCCEEDED
```

F012:

```text
SoulX generated vocal + separated accompaniment
  -> vocal-balance-v1 (vocal -4 dB / accompaniment 0 dB)
  -> peak protection
  -> SoulX result audio
  -> finalizeMixingResult(clarity-normal-v1)
       - Clarity EQ
       - compressor
       - stereo width
       - loudnorm -14 LUFS / -1 dBTP
       - AAC 160 kbps encode
  -> Leemage
  -> MixingJob SUCCEEDED
```

후처리와 AAC encode를 하나의 FFmpeg invocation에서 수행한다. 결과 asset 저장이 끝난 뒤에만 MixingJob을 `SUCCEEDED`로 전환하는 기존 경계는 유지한다.

### 실패 경계

- finalizer가 실패하면 `MIXING_FINALIZATION_FAILED` stage error로 변환한다.
- 이미 `modalJobId`가 존재하는 submitted 단계이므로 기존 SoulX job을 재사용해 bounded retry한다.
- retry exhaustion 후에는 `FAILED`로 남기고 raw SoulX 결과를 성공 결과로 fallback하지 않는다.

---

## 파일 구조

```text
lib/audio/
├── compress-mixing-result.ts       # 기존 finalizer를 Clarity + AAC 경계로 확장/이름 정리
└── mixing-finalization.ts          # 필요 시 versioned filter contract 분리

lib/mixing/
└── worker.ts                       # finalization error code/retry 경계

services/soulx-singer-svc/api/
└── engine.py                       # vocal-balance-v1 (-4 dB vocal / 0 dB accompaniment)

tests/
├── compress-mixing-result.test.ts  # 실제 FFmpeg output/Clarity contract
└── mixing-queue.integration.ts     # worker 성공/후처리 실패 retry 회귀
```

실제 구현 시 기존 파일 수와 public import를 최소화하고, 이름 변경이 불필요하면 `compress-mixing-result.ts` 안에 `clarity-normal-v1` contract를 유지한다. SoulX 엔진에는 `vocal-balance-v1`의 -4 dB vocal gain과 0 dB accompaniment gain을 상수로 고정해 auto accompaniment mix에만 적용한다.

---

## 테스트 전략

- **단위/실행 테스트**:
  - SoulX gain helper에서 -4.0 dB가 선형 gain으로 정확히 변환되고 peak protection이 유지되는지 검증한다.
  - 짧은 WAV fixture를 finalizer에 넣어 M4A가 생성되는지 검증한다.
  - 출력이 44.1 kHz stereo AAC이고 입력보다 정상적으로 압축되는지 확인한다.
  - filter version과 Clarity / Normal 파라미터가 의도치 않게 바뀌지 않도록 contract test를 둔다.
- **통합 테스트**:
  - SoulX succeeded 결과가 finalizer를 거친 bytes로 Leemage에 저장되는지 확인한다.
  - finalizer 실패 시 `MIXING_FINALIZATION_FAILED`와 submitted retry semantics를 검증한다.
  - retry exhaustion에서도 미보정 결과를 성공 저장하지 않는지 확인한다.
- **회귀**:
  - `pnpm test`, lint, TypeScript, build, Prisma status를 통과한다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
- PRD: `../../prd/copy-singer-prd.md` (`PRD-FR-044`)
