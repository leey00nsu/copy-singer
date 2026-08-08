# Tasks: mixing-clarity-finalization

## 태스크 규칙

- **상태**: `[TODO]` → `[DOING]` → `[DONE]`
- 한 번에 하나의 태스크만 진행합니다.
- 코드 변경 시 spec/plan/decisions와 workflow-sync marker를 함께 유지합니다.

---

## 로컬 추적 정보

- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/mixing-clarity-finalization`
- **대기 중 변경 요청**: -
- **PR 리뷰**: -
- **PR 리뷰 Evidence**: -

---

## 태스크 목록

- [DONE][PRD-FR-044] T-F012-01 Clarity / Normal finalizer를 AI 믹싱 마지막 단계에 적용
  - Date: 2026-08-08
  - Acceptance:
    - SoulX 성공 결과에 `clarity-normal-v1` DSP가 자동 적용된 뒤 기존 160 kbps M4A로 저장된다.
    - EQ/compressor/stereo width/loudness 값은 spec의 Clarity / Normal contract와 일치한다.
    - finalization 실패는 `MIXING_FINALIZATION_FAILED`로 bounded retry되고 raw SoulX 결과로 성공 fallback하지 않는다.
    - 기존 Leemage 결과 lifecycle, MixingJob success 전환, catalog target, mid-only reference, 티켓/환불 semantics가 유지된다.
  - Checklist:
    - [x] 기존 `compressMixingResult` 경계를 Clarity DSP + AAC single-pass finalizer로 확장하고 `clarity-normal-v1` 상수를 둔다.
    - [x] 실제 FFmpeg fixture test에서 44.1 kHz stereo AAC/M4A 출력과 filter contract를 검증한다.
    - [x] mixing worker에 stable finalization failure code/retry 처리를 추가한다.
    - [x] mixing DB integration에서 성공 저장, retry, retry exhaustion, raw fallback 금지를 검증한다.
    - [x] `pnpm test`, `pnpm run lint`, `pnpm exec tsc --noEmit`, `pnpm run build`, Prisma validate/status를 통과한다.
    - [x] feature docs/evidence/workflow-sync를 완료한다.

- [DONE][PRD-FR-044] T-F012-02 SoulX 자동 반주 믹싱에 보컬 -4 dB 밸런스 적용
  - Date: 2026-08-08
  - Acceptance:
    - `auto_mix_accompaniment=true`일 때 생성 보컬에 -4.0 dB gain을 적용하고 반주는 0.0 dB로 유지한 뒤 합산한다.
    - 기존 pitch-shifted accompaniment 처리와 peak protection은 유지한다.
    - 보컬 gain 계약은 테스트로 고정하고, auto accompaniment mix가 꺼진 경우에는 영향을 주지 않는다.
    - F012 Clarity finalization은 조정된 SoulX mix 결과 뒤에서 기존대로 적용된다.
  - Checklist:
    - [x] SoulX engine에 versioned vocal/accompaniment gain 상수를 추가한다.
    - [x] mixing 합산 시 vocal -4 dB / accompaniment 0 dB를 적용한다.
    - [x] 단위 테스트로 gain 값과 peak protection을 검증한다.
    - [x] 관련 SoulX 서비스/TypeScript 회귀 테스트를 통과한다.
    - [x] feature docs/evidence/workflow-sync를 갱신한다.

- [DONE][PRD-FR-044] T-F012-03 SoulX 보컬 밸런스를 -2 dB로 재조정
  - Date: 2026-08-08
  - Acceptance:
    - `vocal-balance-v2`는 생성 보컬 -2.0 dB, 반주 0.0 dB를 적용한다.
    - 기존 pitch-shifted accompaniment 처리와 peak protection은 유지한다.
    - gain contract 테스트가 -2.0 dB의 선형 gain을 고정한다.
    - Clarity finalization과 기존 mixing queue semantics에는 영향이 없다.
  - Checklist:
    - [x] balance version과 vocal gain 상수를 `vocal-balance-v2` / -2.0 dB로 갱신한다.
    - [x] 단위 테스트를 -2.0 dB 선형 gain 계약으로 갱신한다.
    - [x] SoulX Python 및 F012 관련 회귀 테스트를 통과한다.
    - [x] `dbstndla1212` Modal에 재배포하고 health를 확인한다.
    - [x] feature docs/evidence/workflow-sync를 갱신한다.

---

## 완료 조건

- [x] 모든 태스크가 `[DONE]`이며 Acceptance/Checklist 완료
- [x] 테스트 실행 및 통과
- [ ] 구현 결과를 공유하고 workflow approval을 기록함

### 테스트 실행 기록

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `python3 -m unittest services/soulx-singer-svc/tests/test_mix_balance.py` | `2026-08-08` | `PASS (2/2: vocal-balance-v2, vocal -2 dB / accompaniment 0 dB + peak protection)` |
| `python3 -m py_compile services/soulx-singer-svc/api/mix_balance.py services/soulx-singer-svc/api/engine.py` | `2026-08-08` | `PASS` |
| `pnpm exec tsx --test tests/compress-mixing-result.test.ts` | `2026-08-08` | `PASS (2/2: clarity-normal-v1 contract + AAC 44.1kHz stereo output)` |
| `node --conditions react-server --import tsx --test tests/mixing-queue.integration.ts` | `2026-08-08` | `PASS (1/1: finalization retry/exhaustion/raw fallback 금지 포함)` |
| `pnpm test` | `2026-08-08` | `PASS (build + 전체 TS/UI/DB integration suite)` |
| `pnpm run lint` | `2026-08-08` | `PASS` |
| `pnpm exec tsc --noEmit` | `2026-08-08` | `PASS` |
| `pnpm run build` | `2026-08-08` | `PASS (Next.js 16.3.0, 22 pages)` |
| `pnpm run db:validate && pnpm run db:status` | `2026-08-08` | `PASS (schema valid, 10 migrations, database up to date)` |

<!-- lee-spec-kit:workflow-sync 2026-08-08T09:36:23.000Z -->
