# Tasks: production-readiness-core

## 태스크 규칙

- **상태**: 기본은 `[TODO]` → `[DOING]` → `[DONE]`; `workflow.agentReview.task.enabled=true`이면 `[DOING]` → `[REVIEW]` → `[DONE]`
- **구현 위임**: `workflow.agentExecution.task.enabled=true`이면 설정된 worker가 반환된 `workerContract`를 따르고 `workflow-stage` 재호출이나 재위임 없이 직접 실행하며, 프로젝트 코드와 태스크 범위 검사만 담당합니다. 메인 에이전트가 이 문서, 태스크 상태, 커밋, 승인, 원격 작업을 유지합니다.
- **태스크 공유 / 확인**:
  - `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 `tasks.md`에서 상태를 함께 갱신합니다
  - `[DOING] → [REVIEW]/[DONE]`: 완료 전 결과/검증을 공유하고 같은 수정에서 `Acceptance`와 `Checklist`를 함께 갱신합니다
  - `[REVIEW] → [DONE]`: 완료 전에 반환된 리뷰 Round와 fresh 태스크 리뷰 Evidence, Decision, Reviewed Head, Reviewed Tree를 기록합니다
  - 태스크 상태 변경 전에 승인이 필요한 경우는 문서화된 review checkpoint 또는 원격/파괴적 작업 직전뿐입니다.
  - 워크플로우가 요구하지 않는 standalone `OK` 승인 단계는 만들지 않습니다.
  - 해당 태스크의 `Checklist`에 unchecked 항목이 남아 있으면 `[DONE]`으로 전환하지 않습니다.
  - `workflow.agentReview.maxRounds`는 fresh 리뷰의 최대 실행 횟수입니다. 마지막 허용 Round가 `changes_requested`이면 지적을 한 번 반영하고 남은 finding과 그 결과의 target 변경을 잔여 위험으로 보존한 뒤, 추가 리뷰나 사용자 승인 없이 리뷰 게이트를 자동 완료합니다. `maxRounds=1`이면 Round 2는 없습니다. `blocked`는 자동 완료하지 않습니다.
- **PRD 매핑(권장)**: 각 태스크 라인에 `[PRD-FR-001]` 또는 `[PRD-SCOPE-V1-DESKTOP-EDITOR]` 같은 기존 PRD 요구사항 ID 태그를 추가하거나, PRD와 무관한 태스크는 `[NON-PRD]`로 표시하세요.
  - 단, `tasks.md`에서 PRD ID를 임의로 만들지 마세요. `docs/prd` 또는 상위 요구사항 문서에 먼저 정의된 ID만 참조해야 합니다.
  - 레거시 문서에 아직 PRD ID가 없다면, 먼저 원문 요구사항 문서에 ID를 backfill한 뒤 `spec.md`의 `PRD Refs`와 태스크 태그를 함께 맞추세요.
  - `[NON-PRD]`는 내부 구현 작업 전용입니다. 사용자 동작, acceptance criteria, 범위가 바뀌는 태스크라면 PRD를 먼저 backfill하고 `[PRD-...]`로 태깅하세요.
- **디자인 시스템 동기화(조건부)**: `docs/designs/design-system.md`를 변경하는 태스크는 영향 받는 디자인 문서, token/theme, 공통 UI, Storybook/workbench와 검증을 같은 task의 `Checklist`에서 추적하세요. 영향이 없는 영역은 변경하지 말고 영향 여부만 확인합니다.

---

## 로컬 추적 정보
- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/JCXFBTGYM8R3-production-readiness-core`
- **대기 중 변경 요청**: -
  - 구현 중 새로 수용한 사용자 요청을 잠시 표시하는 sync marker입니다
  - 요청을 `tasks.md`와 관련 문서에 반영한 뒤 값을 비우세요
- **Feature 리뷰**: -
  - Feature 리뷰 handoff를 시작하면 `Running`, 리뷰 결과 기록까지 끝나면 `Done`으로 변경
- **Feature 리뷰 Evidence**: -
- **Feature 리뷰 Decision**: -
  - 형식: `결정: approve|changes_requested|blocked ...` (또는 `decision: ...`)
- **Feature 리뷰 Round**: -
  - `workflow-stage --json`이 반환한 양의 정수이며 첫 리뷰는 `1`
- **Feature 리뷰 Head**: -
  - Feature 리뷰가 확인한 project code commit SHA
- **Feature 리뷰 Tree**: -
  - Feature 리뷰가 확인한 project code tree SHA

---

## 태스크 엔트리 포맷

```markdown
- [TODO][PRD-FR-001] T-{feature-ref}-01 {태스크 제목}
  - Date: YYYY-MM-DD
  - Acceptance:
    - (검증 조건)
  - Checklist:
    - [ ] (서브 태스크)
  - Docs:
    - (`docs:<path>` 또는 `project:<path>` 대상을 사용하거나 이 섹션을 생략)
  - Review Evidence: -
  - Review Decision: -
  - Review Round: -
  - Reviewed Head: -
  - Reviewed Tree: -
```

> 위 예시의 `PRD-FR-001`은 가능한 `PRD-*` key 중 하나일 뿐입니다. 아직 PRD 원문에 정의되지 않았다면 태스크에 먼저 넣지 마세요.
> 처음엔 탐색/내부 작업이었더라도 제품 요구사항 변경으로 이어졌다면, `NON-PRD`로 두지 말고 PRD를 먼저 갱신한 뒤 `[PRD-...]`로 재태깅하세요.

---

## 태스크 목록

> 아래에 태스크를 추가하세요. **최소 1개가 필요**합니다.
> 태스크는 하나의 순차 리스트로 유지하고, 위에서 아래 순서 자체를 실행 우선순위로 취급하세요.
> 새 태스크 append에는 `npx lee-spec-kit task add <feature-ref> --title "..." --ref NON-PRD --acceptance "..." --check "..." --doc "docs:prd/system-architecture.md"` 사용을 우선하세요.
> 새 태스크는 마지막 기존 태스크 아래에 완전한 태스크 블록으로 추가하세요. `PRD-FR-001`이나 `PRD-SCOPE-V1-DESKTOP-EDITOR`처럼 이미 정의된 PRD key를 사용하거나, 내부 작업이면 `[NON-PRD]`를 사용합니다.
> placeholder 상태의 `Acceptance` / `Checklist`를 그대로 두지 마세요. 구체 항목이 아니면 구현을 시작하지 않습니다.
> 수동 편집이 필요하면 현재 태스크 근처가 아니라 `태스크 목록`의 마지막 기존 태스크 block 아래에만 append 하세요.

---

- [DONE][PRD-NFR-014] T-JCXFBTGYM8R3-production-readiness-core-01 공통 시간 예산과 영속 복구 schema
  - Date: 2026-09-13
  - Acceptance:
    - AC04/05의 DB·HTTP·subprocess 예산 및 additive migration 검증
  - Checklist:
    - [x] pool/timeout/intent schema 구현과 격리 migration·취소 테스트
  - Docs:
    - project:.env.example
  - Review Evidence: -
  - Review Decision: -
  - Reviewed Head: -
  - Reviewed Tree: -

- [DONE][PRD-NFR-017] T-JCXFBTGYM8R3-production-readiness-core-02 세션과 가입 지급 분리 및 복구 CLI
  - Date: 2026-09-13
  - Acceptance:
    - AC13–15/18 정책 변경·동시 복구 원장 불변
  - Checklist:
    - [x] 가입 snapshot·운영 dry-run/apply 및 회귀 integration
  - Docs:
    - docs:prd/copy-singer-prd.md
  - Review Evidence: -
  - Review Decision: -
  - Reviewed Head: -
  - Reviewed Tree: -

- [DONE][PRD-NFR-016] T-JCXFBTGYM8R3-production-readiness-core-03 미디어 intent·삭제 예약과 참조 경쟁 보호
  - Date: 2026-09-13
  - Acceptance:
    - AC10–12/17 파일 보존·알려진 identity cleanup·불명 추적
  - Checklist:
    - [x] 업로드 단계 기록·catalog cleanup·참조 보호 integration (프로필/믹싱 전체 경쟁 회귀는 T06 추가 확인)
  - Docs:
    - docs:prd/system-architecture.md
  - Review Evidence: -
  - Review Decision: -
  - Reviewed Head: -
  - Reviewed Tree: -

- [DONE][PRD-NFR-013] T-JCXFBTGYM8R3-production-readiness-core-04 worker lease 복구와 Modal 중복 제출 방어
  - Date: 2026-09-13
  - Acceptance:
    - AC01–03/16 stale lease·마지막 crash·불명 종료·환불 표
  - Checklist:
    - [x] 세 worker fencing/heartbeat/deadline·Modal claim·DB/Python 검증
  - Docs:
    - docs:prd/system-architecture.md
  - Review Evidence: -
  - Review Decision: -
  - Reviewed Head: -
  - Reviewed Tree: -

- [DONE][PRD-NFR-015] T-JCXFBTGYM8R3-production-readiness-core-05 API 요청 및 큐 수용량 제한
  - Date: 2026-09-13
  - Acceptance:
    - AC06–09 body 전 보호·원자 cap·정상 polling
  - Checklist:
    - [x] 사용자 limiter/upload slot/preflight·DB cap 및 경쟁 검증
  - Docs:
    - project:.env.example
  - Review Evidence: -
  - Review Decision: -
  - Reviewed Head: -
  - Reviewed Tree: -

- [DONE][PRD-NFR-010] T-JCXFBTGYM8R3-production-readiness-core-06 통합 회귀·부하 시나리오·운영 문서
  - Date: 2026-09-13
  - Acceptance:
    - 전체 AC 검증 증거 및 로컬 실행 가능한 10/50/100 RPS·500 burst 시나리오
  - Checklist:
    - [x] 전체 configured checks·배포/rollback/복구 절차 동기화 (추가 check의 baseline Biome 6개 오류는 D009 기록)
  - Docs:
    - docs:prd/system-architecture.md
  - Review Evidence: -
  - Review Decision: -
  - Reviewed Head: -
  - Reviewed Tree: -

- [DONE][PRD-NFR-010] T-JCXFBTGYM8R3-production-readiness-core-07 브라우저 E2E와 변경 전후 동일 계약 검증
  - Date: 2026-09-13
  - Acceptance:
    - AC19–21 실제 웹·worker·DB E2E 및 baseline/candidate 동일 suite 실행 결과
  - Checklist:
    - [x] 격리 harness·핵심 흐름·CI 구현 및 변경 전후 비교 (동일 suite baseline/candidate 각 2/2)
  - Docs:
    - project:tests/e2e/TESTING.md
  - Review Evidence: -
  - Review Decision: -
  - Reviewed Head: -
  - Reviewed Tree: -

## Knowledge Publication

- **Policy**: `.lee-spec-kit.json`의 `experimental.openwiki`에서 파생
- **Lifecycle**: local은 통합 검증 후 cleanup 전에 `knowledge publish`를 실행합니다. GitHub는 `knowledge ci`로 별도 준비한 기준 브랜치 push CI를 사용합니다. local completion strategy가 `none`이면 자동 발행하지 않습니다.
- **Receipt**: 반환된 게시 artifact 안에 저장합니다. 생성 Wiki와 receipt를 Feature 커밋·리뷰에 넣지 않습니다.

---

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [x] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료 <!-- lee-spec-kit:completion:all-tasks -->
- [x] 테스트 실행 및 통과 (아래에 명령어/결과 기록) <!-- lee-spec-kit:completion:tests -->
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함 <!-- lee-spec-kit:completion:final-outcome -->

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| runtime-timeouts/leemage-client/compress-mixing-result tests | 2026-09-13 | PASS 10 |
| pnpm run test:readiness (격리 DB) | 2026-09-13 | PASS DB/TS 13 + Python 4 |
| signup-recovery / ticket-ledger / dev-auth-bypass integration | 2026-09-13 | PASS 4 (격리 DB) |
| media-recovery / leemage-media / history / catalog-target integration | 2026-09-13 | PASS 6; 격리 catalog fixture 생성 후 재검증 |
| worker-recovery + vocal/song/mixing queue integration | 2026-09-13 | PASS 12 (격리 DB) |
| python3 tests/modal-submission-contract.py / py_compile 3 services | 2026-09-13 | PASS 4 / compile |
| admission/bounded-multipart tests | 2026-09-13 | PASS 7 |
| admission + worker recovery integration | 2026-09-13 | PASS 3; 관리자 재시도 identity 포함 |
| queue/admin API regression --test-concurrency=1 | 2026-09-13 | PASS 13 |
| pnpm exec tsc --noEmit | 2026-09-13 | PASS (E2E 추가 후 포함) |
| prisma migrate deploy / generate | 2026-09-13 | PASS 23개 기존 + additive 2개 migration |
| pnpm test (격리 DB/fake dependency) | 2026-09-13 | PASS E2E 추가 후 재실행: production build, 기존 회귀, Storybook 176, readiness 13 + Python 4; exit 0 |
| pnpm run lint | 2026-09-13 | PASS (E2E 추가 후 포함) |
| pnpm run check:architecture | 2026-09-13 | PASS steiger 및 boundary 4 |
| pnpm run check / biome check . | 2026-09-13 | FAIL baseline과 동일한 변경 없는 6개 파일 format/import 정렬 오류; D009. 변경 파일 biome PASS |
| profile-deletion-race / private-audio-proxy / worker-recovery | 2026-09-13 | PASS 삭제 우선/접수 우선, client abort, 기존 저장 결과 복구·cleanup 적체 |
| legacy fixture schema upgrade (docker psql, rollback) | 2026-09-13 | PASS 기존 원장·잔액·active 상태·partial unique 유지 |
| k6 config mock runtime / remote target guard | 2026-09-13 | PASS 4 scenarios; k6 미설치로 실제 부하 미실행 |
| pnpm run test:e2e:compare b333d64 | 2026-09-13 | PASS baseline 2/2, candidate 2/2; 동일 suite hash, exit 0; D012 |

완료 기록에는 테스트뿐 아니라 build·typecheck·lint 등 Plan에서 정한 검증과 수동 검증 증거를 포함합니다. 자동 검사의 기준은 실제 `workflow.featureChecks`이며, 검사 생략은 통과로 기록하지 않고 명시적인 사유를 남깁니다.
