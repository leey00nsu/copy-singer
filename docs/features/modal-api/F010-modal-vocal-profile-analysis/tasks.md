# Tasks: modal-vocal-profile-analysis

## 태스크 규칙

- **상태**: `[TODO]` → `[DOING]` → `[DONE]`
- **태스크 공유 / 확인**:
  - `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 `tasks.md`에서 상태를 함께 갱신합니다
  - `[DOING] → [DONE]`: 완료 전 결과/검증을 공유하고 같은 수정에서 `Acceptance`와 `Checklist`를 함께 갱신합니다
  - 태스크 상태 변경 전에 승인이 필요한 경우는 문서화된 review checkpoint 또는 원격/파괴적 작업 직전뿐입니다.
  - 워크플로우가 요구하지 않는 standalone `OK` 승인 단계는 만들지 않습니다.
  - 해당 태스크의 `Checklist`에 unchecked 항목이 남아 있으면 `[DONE]`으로 전환하지 않습니다.
- **PRD 매핑(권장)**: 각 태스크 라인에 기존 PRD 요구사항 ID 태그를 추가하고, PRD와 무관한 내부 작업만 `[NON-PRD]`로 표시합니다.

---

## 로컬 추적 정보

- **문서 상태**: Approved
- **레포**: copy-singer-modal-api
- **브랜치**: `feat/modal-vocal-profile-analysis`
- **대기 중 변경 요청**: -
  - 구현 중 새로 수용한 사용자 요청을 잠시 표시하는 sync marker입니다.
  - 요청을 `tasks.md`와 관련 문서에 반영한 뒤 값을 비웁니다.
- **PR 전 리뷰**: -
  - pre-PR 리뷰 handoff를 시작하면 `Running`, 리뷰 결과 기록까지 끝나면 `Done`으로 변경합니다.
- **PR 전 리뷰 Evidence**: -
  - 형식: `결정: approve|changes_requested|blocked ...` 또는 `decision: ...`
- **PR 리뷰**: -
- **PR 리뷰 Evidence**: -

---

## 태스크 목록

- [DONE][PRD-FR-003][PRD-FR-004][PRD-FR-042][PRD-NFR-004] T-F010-modal-vocal-profile-analysis-01 transport-neutral 보컬 분석 코어 추출
  - Date: 2026-08-08
  - Acceptance:
    - 현재 local FastAPI의 사용자 보컬 분석 결과와 `smart-reference-v1` 의미가 유지되면서 HTTP/storage lifecycle과 순수 분석 실행이 분리된다.
    - 기존 local analyzer API와 F009 회귀 테스트가 변경 전과 동일하게 통과한다.
  - Checklist:
    - [x] `main.py`의 MIME/segment 검증, 표준화, pitch 분석, smart reference 생성 흐름을 request-scoped shared service로 추출한다.
    - [x] shared service가 외부 DB/Leemage/Modal Volume side effect 없이 caller가 제공한 working directory만 사용하도록 한다.
    - [x] local FastAPI adapter를 shared service로 연결하고 기존 POST/artifact GET/DELETE 계약을 유지한다.
    - [x] analysis/reference contract와 quality rejection 회귀 테스트를 보강한다.

- [DONE][PRD-FR-002][PRD-FR-022][PRD-FR-042][PRD-NFR-003][PRD-NFR-006] T-F010-modal-vocal-profile-analysis-02 별도 Modal CPU analyzer와 ephemeral artifact handoff 구현
  - Date: 2026-08-08
  - Acceptance:
    - GPU를 요청하지 않는 별도 Modal app이 최대 60초 입력을 shared analyzer로 처리하고 `AnalyzerProfile` + source + optional smart reference를 한 분석 operation 안에서 반환한다.
    - 사용자 audio와 중간 파일은 persistent Modal storage에 남지 않고 성공/실패 경로에서 request temporary directory가 정리된다.
    - endpoint는 server-to-server credential 없이는 호출할 수 없다.
  - Checklist:
    - [x] FFmpeg와 analyzer dependency를 고정한 `services/vocal-profile-modal/modal_app.py` image/ASGI app을 추가한다.
    - [x] CPU 2 physical cores·4096 MiB·scale-to-zero baseline과 제한된 container 정책을 명시한다.
    - [x] profile/source/reference를 같은 응답으로 전달하는 transport codec을 구현하고 크기/serialization 검사를 추가한다.
    - [x] health/capability 응답에 analyzer/version과 `smart-reference-v1` 지원 정보를 노출한다.
    - [x] success, rejection, exception, reference unavailable 경로의 temporary cleanup 테스트를 추가한다.

- [DONE][PRD-FR-004][PRD-FR-027][PRD-FR-042] T-F010-modal-vocal-profile-analysis-03 Next.js local/Modal analyzer adapter와 bytes 기반 Leemage 저장 경계 구현
  - Date: 2026-08-08
  - Acceptance:
    - `/api/vocal-profiles`는 backend-specific 파일 lifecycle을 직접 알지 않고 공통 analyzer adapter 결과만 처리한다.
    - local과 Modal backend를 환경 설정으로 명시적으로 선택하며 Modal 실패 시 local로 조용히 fallback하지 않는다.
    - source/reference 영구 저장과 PostgreSQL 관계 생성·보상 cleanup은 기존 사용자 소유권 semantics를 유지한다.
  - Checklist:
    - [x] server-only analyzer interface와 `local-adapter`/`modal-adapter`를 추가한다.
    - [x] `VOCAL_PROFILE_ANALYZER_BACKEND=local|modal` 및 Modal URL/key/secret 설정을 `.env.example`에 문서화한다.
    - [x] Leemage media service에 URL fetch와 분리된 bytes 입력 저장 primitive를 추가한다.
    - [x] profile route를 공통 adapter + bytes persistence 흐름으로 정리한다.
    - [x] recording ID/capability mismatch와 transport error를 stable reason code로 매핑한다.

- [DONE][PRD-FR-003][PRD-FR-004][PRD-FR-042][PRD-NFR-004][PRD-NFR-005] T-F010-modal-vocal-profile-analysis-04 local/Modal parity·retry·partial failure 계약 검증
  - Date: 2026-08-08
  - Acceptance:
    - 동일 fixture의 local/shared와 Modal entry logic 결과가 analyzer version, profile schema, smart reference descriptor와 핵심 수치에서 허용 오차 내 일치한다.
    - expected 4xx 분석 rejection은 retry되지 않고 transient transport failure만 제한적으로 재시도 가능하며 중복 external asset/profile을 만들지 않는다.
    - Modal 성공 후 Leemage/DB failure의 보상 동작이 기존 정책과 동일하다.
  - Checklist:
    - [x] 10초·30초·60초 및 품질 rejection fixture parity test를 추가한다.
    - [x] Modal auth/429/5xx/timeout/network 오류 mapping과 retry policy를 테스트한다.
    - [x] source 저장 실패, smart reference 저장 실패, DB 저장 실패의 cleanup/legacy fallback 통합 테스트를 보강한다.
    - [x] incompatible analyzer/capability response가 persistence 전에 차단되는지 검증한다.

- [DONE][PRD-NFR-003][PRD-NFR-004][PRD-NFR-005] T-F010-modal-vocal-profile-analysis-05 실제 Modal CPU deploy·10/30/60초 cold/warm benchmark
  - Date: 2026-08-08
  - Acceptance:
    - 사용자 승인 후 실제 Modal 환경에서 authenticated health/analyze와 10초·30초·60초 fixture cold/warm 실행 결과를 기록한다.
    - CPU/memory, wall latency, analyzer latency, payload size와 benchmark 시점 공식 CPU/memory 단가 기반 요청당 비용을 기록한다.
    - 실제 remote 결과가 local contract/hash/parity 조건을 만족하거나 차이를 명시적으로 문서화한다.
  - Checklist:
    - [x] 원격 배포/비용 발생 전 사용자에게 실행 artifact와 비용 범위를 공유하고 승인을 받았다.
    - [x] 잘못된 `X-API-Key`가 401로 거부되고 authenticated health가 `librosa-pyin 0.11.0`, `smart-reference-v1`, CPU 2 cores/4096 MiB/GPU false를 반환함을 확인했다.
    - [x] 10/30/60초 각각 두 표본을 실행했다. wall time은 34.074/5.414초, 10.797/39.248초, 17.531/20.821초였고 최대 39.248초였다. 60초 response payload는 약 4.33 MB였다.
    - [x] 실제 배포 endpoint와 local shared analyzer를 10/30/60초 동일 fixture로 다시 비교해 profile JSON과 source/reference bytes exact parity 3/3을 확인했다.
    - [x] Modal 공식 단가 CPU `$0.0000131/core/sec`, memory `$0.00000222/GiB/sec`를 사용했다. 6회 benchmark handler 기준 합계 약 `$0.003617`, wall upper-bound 합계 약 `$0.004486`이며 Starter는 월 `$30` compute credit을 제공한다.

- [DONE][PRD-FR-004][PRD-NFR-003][PRD-NFR-004] T-F010-modal-vocal-profile-analysis-06 benchmark 기반 sync/async transport·resource·warm 정책 확정
  - Date: 2026-08-08
  - Acceptance:
    - 60초 cold path가 90초 이하이고 120초 client budget과 Modal 150초 HTTP 경계에 충분한 여유가 있으면 sync transport를 확정한다.
    - sync 기준을 만족하지 못하면 server-owned operation 상태를 사용하는 submit/polling transport를 구현하고 raw Modal call ID를 사용자에게 노출하지 않는다.
    - 최종 CPU/memory, `scaledown_window`, warm container 정책은 benchmark evidence와 비용을 근거로 decisions.md에 확정한다.
  - Checklist:
    - [x] T05 최대 wall 39.248초, 60초 17.531/20.821초를 sync 승인 기준과 비교해 충분한 margin을 확인했다.
    - [x] sync HTTP, Function/client timeout 120초, infra failure `retryable` 계약, explicit `VOCAL_PROFILE_ANALYZER_BACKEND=modal` 전환 준비를 확정했다.
    - [x] 기준을 충족했으므로 async job/polling은 구현하지 않고, 향후 p95/p99 또는 hosting timeout이 기준을 위협할 때 별도 Feature에서 도입하도록 문서화했다.
    - [x] CPU 2 cores, memory 4096 MiB, `min_containers=0`, `max_containers=10`, `scaledown_window=60`, container concurrency 1과 production automatic local fallback 금지를 D006에 확정했다.

- [TODO][PRD-NFR-005][PRD-NFR-006] T-F010-modal-vocal-profile-analysis-07 전체 회귀·운영 문서·workflow 검증
  - Date: 2026-08-08
  - Acceptance:
    - local 개발 경로와 Modal production 후보 경로가 모두 문서화되고 기존 프로필·추천·믹싱 회귀가 없다.
    - TypeScript, lint, build, Python analyzer tests와 관련 통합 테스트가 통과하고 docs/code sync가 audit된다.
    - 실제 production backend 전환은 자동 수행하지 않고 검증된 설정과 rollback 절차만 준비한다.
  - Checklist:
    - [ ] `services/vocal-profile-api`와 신규 Modal analyzer README/운영 명령을 갱신한다.
    - [ ] system architecture와 필요한 PRD/환경변수 문서를 실제 최종 구조와 동기화한다.
    - [ ] `pnpm test`, lint, TypeScript, build와 Python test suite를 통과한다.
    - [ ] 관련 Prisma/DB 검증이 필요한 변경이면 validate/status를 통과한다.
    - [ ] `npx lee-spec-kit workflow-audit --json`를 통과하고 최종 evidence를 기록한다.

## 완료 조건

- [ ] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료
- [ ] 테스트 실행 및 통과 (아래에 명령어/결과 기록)
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm test` | `-` | `-` |
| `pnpm run lint` | `2026-08-08` | `PASS` |
| `pnpm exec tsc --noEmit` | `2026-08-08` | `PASS` |
| `pnpm run build` | `2026-08-08` | `PASS (Next.js 16.3.0, 21 pages)` |
| `services/vocal-profile-api/.venv/bin/pytest -q services/vocal-profile-api/tests` | `2026-08-08` | `PASS (32 passed, remote-only 3 skipped, deprecation warning 3건)` |
| `cd services/vocal-profile-modal && ../vocal-profile-api/.venv/bin/pytest -q test_transport.py test_runtime.py test_modal_app_source.py` | `2026-08-08` | `PASS (9/9)` |
| `pnpm run test:vocal-profile-analyzer` | `2026-08-08` | `PASS (8/8)` |
| `pnpm run test:vocal-profile-persistence` | `2026-08-08` | `PASS (3/3, source/synthesis/DB failure compensation)` |
| `pnpm run test:media` | `2026-08-08` | `PASS (5/5)` |
| `pnpm exec tsx --test tests/vocal-profile-contract.test.ts tests/mixing-reference.test.ts tests/vocal-profile-results-ui.test.tsx` | `2026-08-08` | `PASS (8/8)` |
| `pnpm run modal:vocal-profile:deploy` | `2026-08-08` | `PASS (copy-singer-vocal-profile-analyzer deployed with modal==1.5.3)` |
| `VOCAL_PROFILE_MODAL_URL=... pnpm run modal:vocal-profile:benchmark` | `2026-08-08` | `PASS (wrong key 401, 10/30/60초 6 samples, max wall 39.248s)` |
| `VOCAL_PROFILE_MODAL_URL=... pnpm run modal:vocal-profile:benchmark -- 10` | `2026-08-08` | `PASS (final autoscaling health 확인, 28.462s / 4.963s, same container reuse)` |
| `VOCAL_PROFILE_MODAL_URL=... pytest -q .../test_modal_parity.py -k deployed` | `2026-08-08` | `PASS (3/3 exact profile + source/reference bytes)` |
| `npx lee-spec-kit workflow-audit --json` | `-` | `-` |

<!-- lee-spec-kit:workflow-sync 2026-08-08T00:35:05.000Z -->
