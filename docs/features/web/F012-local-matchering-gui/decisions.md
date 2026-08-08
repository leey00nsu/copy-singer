# Decisions Log: mixing-clarity-finalization

---

## D001: 로컬 A/B에서 선택한 Clarity / Normal을 production finalizer로 고정 (2026-08-08)

- **Context**: 사용자는 SoulX 믹싱 결과를 더 완성된 음원처럼 제공하기 위해 BandLab과 유사한 마지막 mastering/finalization 단계를 검토했다. 무료 self-hosted 후보를 로컬 GUI로 비교한 결과 reference 기반 Matchering보다 원본 없이 적용하는 Clarity preset이 현재 결과에 더 잘 어울린다고 선택했다.
- **Constraints**: 외부 유료 mastering API를 추가하지 않는다. 기존 mixing worker에는 이미 FFmpeg 기반 AAC/M4A 압축 단계가 있고, 최종 결과는 Leemage `audio/mp4` asset으로 저장된다. 추가 lossy 재인코딩과 production DB/schema 변경은 피한다.
- **Options**:
  - Matchering + 원곡 reference
  - 외부 mastering SaaS
  - FFmpeg preset finalizer
  - 기존 SoulX 결과를 보정 없이 그대로 저장
- **Decision**: `clarity-normal-v1` 고정 FFmpeg DSP를 SoulX result fetch 직후, 최종 AAC encode와 같은 invocation에 적용한다. preset 선택 UI는 제공하지 않는다.
- **Rationale**: 사용자가 직접 A/B로 Clarity를 선택했고, 기존 FFmpeg 인프라를 재사용해 추가 비용/서비스 의존 없이 적용할 수 있다. single-pass DSP + AAC 구조는 중간 M4A/WAV 재인코딩을 피하면서 현재 storage contract를 유지한다.
- **Clarity / Normal contract**:
  - high-pass 25 Hz
  - low shelf 95 Hz / Q 0.7 / -0.4 dB
  - 280 Hz / Q 0.9 / -1.4 dB
  - 3.5 kHz / Q 0.9 / +1.3 dB
  - treble 8.5 kHz / Q 0.6 / +1.7 dB
  - compressor threshold 0.20 / ratio 1.5 / attack 20 ms / release 220 ms / knee 2.8 / RMS / maximum link
  - stereo width 1.05
  - softclip 없음
  - loudnorm I -14 / LRA 11 / TP -1.0
  - AAC 160 kbps, 44.1 kHz stereo M4A
- **Trace**:
  - **DOING 시작 시점**: `tmp/matchering-gui`에서 Balanced/Punch/Clarity/Warm/Wide/Loud를 실제 FFmpeg로 비교했고 사용자가 Clarity가 가장 잘 어울린다고 선택했다. production에서는 기존 `compressMixingResult()`가 최종 Leemage 저장 직전 경계임을 확인했다.
  - **DONE 전 확정 시점**: `compressMixingResult()`에 `clarity-normal-v1` filter contract를 상수로 고정하고 Clarity DSP와 AAC 160 kbps encode를 같은 FFmpeg invocation에 넣었다. 실제 fixture 출력은 AAC / 44.1 kHz / stereo로 확인했고 전체 회귀도 통과했다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: T-F012-01 task checkpoint에서 기록
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `pnpm exec tsx --test tests/compress-mixing-result.test.ts` PASS (2/2), `pnpm test` PASS, lint/tsc/build PASS
- **Consequences**: F012 이후 새 AI 믹싱 결과는 raw SoulX 결과가 아니라 `clarity-normal-v1` 보정 결과가 된다. 기존 완료 asset은 변경하지 않는다.

## D002: finalization 실패는 raw 결과 fallback 없이 submitted retry 경계 사용 (2026-08-08)

- **Context**: Clarity 후처리는 SoulX job 성공 이후에 실행되므로, 실패 시 티켓 환불이나 SoulX job 재제출을 잘못 수행하면 비용/중복 작업 문제가 생길 수 있다.
- **Constraints**: 기존 worker는 `modalJobId`가 있는 submitted job에서 retry 시 같은 Modal job을 다시 poll/fetch할 수 있다. 이미 제출된 작업은 preflight 환불 대상이 아니다.
- **Options**: raw 결과 fallback, 즉시 terminal failure, submitted bounded retry.
- **Decision**: 후처리 오류를 `MIXING_FINALIZATION_FAILED` retryable stage failure로 감싸 같은 Modal job 결과를 다시 가져와 bounded retry한다. exhaustion 후에는 FAILED로 종료하고 raw SoulX bytes를 성공 결과로 저장하지 않는다.
- **Rationale**: 사용자에게 전달되는 최종 음질 contract를 보장하면서 SoulX 재제출 없이 로컬 후처리만 다시 시도할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 기존 `releaseMixingFailure()`의 submitted retry semantics와 refund 경계를 확인했다.
  - **DONE 전 확정 시점**: worker가 finalizer 예외를 retryable `MIXING_FINALIZATION_FAILED`로 변환한다. integration test에서 첫 실패는 동일 `modalJobId`를 유지한 `SUBMITTED` retry로 전환되고, maxAttempts 소진 후 `FAILED`/환불 없음/resultAsset 없음으로 종료되어 raw SoulX fallback이 없음을 확인했다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: T-F012-01 task checkpoint에서 기록
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `node --conditions react-server --import tsx --test tests/mixing-queue.integration.ts` PASS (1/1), 전체 `pnpm test`에서도 동일 integration PASS

## D003: SoulX 자동 반주 믹싱은 생성 보컬을 -4 dB 낮춘다 (2026-08-08)

- **Context**: 실제 AI 믹싱 청취에서 반주가 작고 생성 보컬이 과도하게 앞으로 들렸다. 기존 SoulX 엔진은 생성 보컬과 분리 반주를 gain 보정 없이 1:1로 합산하고 peak 초과 시 전체만 normalize한다.
- **Constraints**: 반주 separation artifact를 불필요하게 증폭하지 않고, 기존 accompaniment pitch shift와 peak protection을 유지해야 한다. 사용자별 mix knob나 DB 설정은 이번 범위에 포함하지 않는다.
- **Options**: 반주 +3 dB, 보컬 -2 dB, 보컬 -4 dB, 보컬 -6 dB.
- **Decision**: `vocal-balance-v1`로 생성 보컬 -4.0 dB, 반주 0.0 dB를 고정한다. `auto_mix_accompaniment=true` 경로에서만 적용하며 합산 후 기존 peak protection을 유지한다.
- **Rationale**: 반주 자체를 증폭하지 않아 separation artifact 상승을 피하면서, 체감상 과도한 보컬 전경화를 직접 줄일 수 있다. 이후 Clarity finalization은 조정된 stereo mix 전체에 그대로 적용한다.
- **Trace**:
  - **DOING 시작 시점**: `engine.py`의 `mixed = vocal + acc` 1:1 합산을 확인했고 사용자가 -4 dB 조정을 요청했다.
  - **DONE 전 확정 시점**: `api/mix_balance.py`에 `vocal-balance-v1`, vocal -4.0 dB, accompaniment 0.0 dB를 고정하고 `engine.py`의 auto accompaniment mix에서 선형 gain을 적용했다. 기존 pitch shift는 그대로 유지하고 합산 peak가 1.0을 넘을 때만 `1/peak` 보호 gain을 적용한다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: T-F012-02 task checkpoint에서 기록
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `python3 -m unittest services/soulx-singer-svc/tests/test_mix_balance.py` PASS (2/2), `python3 -m py_compile ...` PASS, 전체 `pnpm test`/lint/TypeScript/build/Prisma 회귀 PASS
