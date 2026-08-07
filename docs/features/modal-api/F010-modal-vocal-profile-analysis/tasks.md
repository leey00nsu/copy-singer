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

- [TODO][PRD-FR-002][PRD-FR-022][PRD-FR-042][PRD-NFR-003][PRD-NFR-006] T-F010-modal-vocal-profile-analysis-02 별도 Modal CPU analyzer와 ephemeral artifact handoff 구현
  - Date: 2026-08-08
  - Acceptance:
    - GPU를 요청하지 않는 별도 Modal app이 최대 60초 입력을 shared analyzer로 처리하고 `AnalyzerProfile` + source + optional smart reference를 한 분석 operation 안에서 반환한다.
    - 사용자 audio와 중간 파일은 persistent Modal storage에 남지 않고 성공/실패 경로에서 request temporary directory가 정리된다.
    - endpoint는 server-to-server credential 없이는 호출할 수 없다.
  - Checklist:
    - [ ] FFmpeg와 analyzer dependency를 고정한 `services/vocal-profile-modal/modal_app.py` image/ASGI app을 추가한다.
    - [ ] CPU 2 physical cores·4096 MiB·scale-to-zero baseline과 제한된 container 정책을 명시한다.
    - [ ] profile/source/reference를 같은 응답으로 전달하는 transport codec을 구현하고 크기/serialization 검사를 추가한다.
    - [ ] health/capability 응답에 analyzer/version과 `smart-reference-v1` 지원 정보를 노출한다.
    - [ ] success, rejection, exception, reference unavailable 경로의 temporary cleanup 테스트를 추가한다.

- [TODO][PRD-FR-004][PRD-FR-027][PRD-FR-042] T-F010-modal-vocal-profile-analysis-03 Next.js local/Modal analyzer adapter와 bytes 기반 Leemage 저장 경계 구현
  - Date: 2026-08-08
  - Acceptance:
    - `/api/vocal-profiles`는 backend-specific 파일 lifecycle을 직접 알지 않고 공통 analyzer adapter 결과만 처리한다.
    - local과 Modal backend를 환경 설정으로 명시적으로 선택하며 Modal 실패 시 local로 조용히 fallback하지 않는다.
    - source/reference 영구 저장과 PostgreSQL 관계 생성·보상 cleanup은 기존 사용자 소유권 semantics를 유지한다.
  - Checklist:
    - [ ] server-only analyzer interface와 `local-adapter`/`modal-adapter`를 추가한다.
    - [ ] `VOCAL_PROFILE_ANALYZER_BACKEND=local|modal` 및 Modal URL/key/secret 설정을 `.env.example`에 문서화한다.
    - [ ] Leemage media service에 URL fetch와 분리된 bytes 입력 저장 primitive를 추가한다.
    - [ ] profile route를 공통 adapter + bytes persistence 흐름으로 정리한다.
    - [ ] recording ID/capability mismatch와 transport error를 stable reason code로 매핑한다.

- [TODO][PRD-FR-003][PRD-FR-004][PRD-FR-042][PRD-NFR-004][PRD-NFR-005] T-F010-modal-vocal-profile-analysis-04 local/Modal parity·retry·partial failure 계약 검증
  - Date: 2026-08-08
  - Acceptance:
    - 동일 fixture의 local/shared와 Modal entry logic 결과가 analyzer version, profile schema, smart reference descriptor와 핵심 수치에서 허용 오차 내 일치한다.
    - expected 4xx 분석 rejection은 retry되지 않고 transient transport failure만 제한적으로 재시도 가능하며 중복 external asset/profile을 만들지 않는다.
    - Modal 성공 후 Leemage/DB failure의 보상 동작이 기존 정책과 동일하다.
  - Checklist:
    - [ ] 10초·30초·60초 및 품질 rejection fixture parity test를 추가한다.
    - [ ] Modal auth/429/5xx/timeout/network 오류 mapping과 retry policy를 테스트한다.
    - [ ] source 저장 실패, smart reference 저장 실패, DB 저장 실패의 cleanup/legacy fallback 통합 테스트를 보강한다.
    - [ ] incompatible analyzer/capability response가 persistence 전에 차단되는지 검증한다.

- [TODO][PRD-NFR-003][PRD-NFR-004][PRD-NFR-005] T-F010-modal-vocal-profile-analysis-05 실제 Modal CPU deploy·10/30/60초 cold/warm benchmark
  - Date: 2026-08-08
  - Acceptance:
    - 사용자 승인 후 실제 Modal 환경에서 authenticated health/analyze와 10초·30초·60초 fixture cold/warm 실행 결과를 기록한다.
    - CPU/memory, wall latency, analyzer latency, payload size와 benchmark 시점 공식 CPU/memory 단가 기반 요청당 비용을 기록한다.
    - 실제 remote 결과가 local contract/hash/parity 조건을 만족하거나 차이를 명시적으로 문서화한다.
  - Checklist:
    - [ ] 원격 배포/비용 발생 전 사용자에게 실행 artifact와 비용 범위를 공유하고 승인을 받는다.
    - [ ] wrong credential rejection과 authenticated health/capability를 검증한다.
    - [ ] 10/30/60초 cold/warm 표본을 실행하고 latency/resource/payload 결과를 기록한다.
    - [ ] local/Modal 핵심 metric과 smart reference descriptor/bytes를 비교한다.
    - [ ] 당시 Modal 공식 CPU/memory 가격과 월 credit 기준으로 예상 요청 비용을 계산한다.

- [TODO][PRD-FR-004][PRD-NFR-003][PRD-NFR-004] T-F010-modal-vocal-profile-analysis-06 benchmark 기반 sync/async transport·resource·warm 정책 확정
  - Date: 2026-08-08
  - Acceptance:
    - 60초 cold path가 90초 이하이고 120초 client budget과 Modal 150초 HTTP 경계에 충분한 여유가 있으면 sync transport를 확정한다.
    - sync 기준을 만족하지 못하면 server-owned operation 상태를 사용하는 submit/polling transport를 구현하고 raw Modal call ID를 사용자에게 노출하지 않는다.
    - 최종 CPU/memory, `scaledown_window`, warm container 정책은 benchmark evidence와 비용을 근거로 decisions.md에 확정한다.
  - Checklist:
    - [ ] T05 결과를 plan의 sync 승인 기준과 비교한다.
    - [ ] sync 유지 시 timeout/retry/config와 production backend switch 준비를 확정한다.
    - [ ] 기준 미달 시 async job/polling adapter와 상태/error 계약을 구현하고 회귀 테스트를 추가한다.
    - [ ] CPU/memory/autoscaling 최종값과 production fallback 금지 결정을 evidence와 함께 기록한다.

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
| `pnpm run lint` | `-` | `-` |
| `pnpm exec tsc --noEmit` | `-` | `-` |
| `pnpm run build` | `-` | `-` |
| `services/vocal-profile-api/.venv/bin/pytest -q services/vocal-profile-api/tests` | `2026-08-08` | `PASS (28/28, deprecation warning 3건)` |
| `npx lee-spec-kit workflow-audit --json` | `-` | `-` |

<!-- lee-spec-kit:workflow-sync 2026-08-07T23:38:31.000Z -->
