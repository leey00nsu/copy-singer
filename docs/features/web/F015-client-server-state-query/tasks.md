# Tasks: client-server-state-query

## 태스크 규칙

- **상태**: `[TODO]` → `[DOING]` → `[DONE]`
- **태스크 공유 / 확인**:
  - `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 `tasks.md`에서 상태를 함께 갱신합니다
  - `[DOING] → [DONE]`: 완료 전 결과/검증을 공유하고 같은 수정에서 `Acceptance`와 `Checklist`를 함께 갱신합니다
  - 태스크 상태 변경 전에 승인이 필요한 경우는 문서화된 review checkpoint 또는 원격/파괴적 작업 직전뿐입니다.
  - 워크플로우가 요구하지 않는 standalone `OK` 승인 단계는 만들지 않습니다.
  - 해당 태스크의 `Checklist`에 unchecked 항목이 남아 있으면 `[DONE]`으로 전환하지 않습니다.
- **PRD 매핑(권장)**: 각 태스크 라인에 `[PRD-FR-001]` 또는 `[PRD-SCOPE-V1-DESKTOP-EDITOR]` 같은 기존 PRD 요구사항 ID 태그를 추가하거나, PRD와 무관한 태스크는 `[NON-PRD]`로 표시하세요.
  - 단, `tasks.md`에서 PRD ID를 임의로 만들지 마세요. `docs/prd` 또는 상위 요구사항 문서에 먼저 정의된 ID만 참조해야 합니다.
  - 레거시 문서에 아직 PRD ID가 없다면, 먼저 원문 요구사항 문서에 ID를 backfill한 뒤 `spec.md`의 `PRD Refs`와 태스크 태그를 함께 맞추세요.
  - `[NON-PRD]`는 내부 구현 작업 전용입니다. 사용자 동작, acceptance criteria, 범위가 바뀌는 태스크라면 PRD를 먼저 backfill하고 `[PRD-...]`로 태깅하세요.

---

## 로컬 추적 정보
- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/client-server-state-query`
- **대기 중 변경 요청**: -
  - 구현 중 새로 수용한 사용자 요청을 잠시 표시하는 sync marker입니다
  - 요청을 `tasks.md`와 관련 문서에 반영한 뒤 값을 비우세요
  - pre-PR 리뷰 handoff를 시작하면 `Running`, 리뷰 결과 기록까지 끝나면 `Done`으로 변경
  - 형식: `결정: approve|changes_requested|blocked ...` (또는 `decision: ...`)
  - PR 생성 전 최종 통과 기준은 `approve`
  - 기본 베이스라인으로 `agents/skills/create-pr.md`(`Pre-PR 기본 체크리스트`) 기준을 따르세요
- **PR 리뷰**: -
  - PR 리뷰 handoff를 시작하면 `Running`, 팀에서 별도 완료 상태를 추적할 때만 `Done`으로 변경
- **PR 리뷰 Evidence**: -
  - 리뷰 지적사항을 왜/어떻게 반영했는지 `결정: ...`(또는 `decision: ...`) 형식으로 기록

---

## 태스크 엔트리 포맷

```markdown
- [TODO][PRD-FR-001] T-{feature-ref}-01 {태스크 제목}
  - Date: YYYY-MM-DD
  - Acceptance:
    - (검증 조건)
  - Checklist:
    - [ ] (서브 태스크)
```

> 위 예시의 `PRD-FR-001`은 가능한 `PRD-*` key 중 하나일 뿐입니다. 아직 PRD 원문에 정의되지 않았다면 태스크에 먼저 넣지 마세요.
> 처음엔 탐색/내부 작업이었더라도 제품 요구사항 변경으로 이어졌다면, `NON-PRD`로 두지 말고 PRD를 먼저 갱신한 뒤 `[PRD-...]`로 재태깅하세요.

---

## 태스크 목록

> 태스크는 아래 순서대로 실행하고 각 `[DONE]` 전 docs/project task commit checkpoint를 통과합니다.

- [DONE][NON-PRD] T-F015-01 Query provider와 typed API client 기반 추가
  - Date: 2026-08-09
  - Acceptance:
    - TanStack Query provider가 root layout에 연결되고 server request별/browser render별 QueryClient 수명 정책이 지켜진다.
    - 공통 JSON client가 Zod success parse 및 network/HTTP/contract 오류 정규화를 지원한다.
    - TanStack Query, Zod와 test 전용 MSW dependency 및 lockfile이 재현 가능하게 추가된다.
  - Checklist:
    - [x] `@tanstack/react-query@5.101.4`, `zod@4.4.3`, `msw@2.15.0`을 올바른 dependency 구분으로 설치
    - [x] retry/stale/gc/focus/reconnect 정책을 가진 `_app` Query provider 구현 및 root layout 연결
    - [x] `AbortSignal`, JSON/FormData와 typed `ApiError`를 지원하는 `shared/api` 구현
    - [x] 공통 API client/error 단위 테스트와 package `test:query` script 추가
    - [x] `pnpm run test:query`, `pnpm run typecheck`, `pnpm run check:architecture` 통과

- [DONE][NON-PRD] T-F015-02 Zod endpoint 계약과 Route Handler 입력 검증 적용
  - Date: 2026-08-09
  - Acceptance:
    - 대상 endpoint의 browser-safe success/error schema에서 TypeScript response type이 파생된다.
    - JSON body, UUID param, pagination과 parse 가능한 multipart metadata가 Route Handler 경계에서 검증된다.
    - 기존 URL, status, error envelope와 Modal conversion streaming 전달 방식이 유지된다.
  - Checklist:
    - [x] vocal profile/recommendation/mixing job entity response schema 및 public API 추가
    - [x] analyze/create recommendation/create mixing/development conversion/manage tickets feature request·response schema 추가
    - [x] 추천 생성, mixing 생성, ticket adjustment JSON body를 Zod `safeParse`로 전환
    - [x] 대상 UUID route param, page query, vocal multipart scalar/file metadata 검증 전환
    - [x] Modal conversion route가 `request.body` stream을 계속 직접 전달하는지 회귀 확인
    - [x] schema valid/invalid fixture 및 기존 Route Handler 계약 테스트 통과

- [DONE][NON-PRD] T-F015-03 Vocal profile query·mutation과 durable polling 전환
  - Date: 2026-08-09
  - Acceptance:
    - analyzer health, analysis job list/detail과 submit/delete/recommendation mutation이 typed client 및 TanStack Query를 사용한다.
    - active job만 기존 interval로 polling하고 terminal 상태에서 멈추며 localStorage resume이 유지된다.
    - job list 초기 data와 분석 완료 후 profile 전환 동작이 유지된다.
  - Checklist:
    - [x] vocal profile/analyze feature API 함수, key/options 및 terminal predicate 구현
    - [x] workbench의 server-state `useState`/수동 polling loop를 query/mutation으로 교체
    - [x] job cards의 initialData, 3초 polling과 완료 시 reload 동작 전환
    - [x] upload idempotency key, localStorage cleanup, toast 및 오류 안내 회귀 검증
    - [x] vocal profile 관련 기존 test와 신규 query polling test 통과

- [DONE][NON-PRD] T-F015-04 Recommendation·mixing query와 cache 동기화 전환
  - Date: 2026-08-09
  - Acceptance:
    - recommendation detail과 mixing history가 typed query 및 상태 기반 polling을 사용한다.
    - mixing 생성·추천 삭제 mutation의 pending/error UI와 cache patch/invalidation이 기존 동작을 보존한다.
    - paginated history initialData가 즉시 표시되고 active job이 없으면 polling하지 않는다.
  - Checklist:
    - [x] recommendation/mixing API 함수와 key/options factory 구현
    - [x] recommendation detail fetch/polling/delete를 query/mutation으로 교체
    - [x] mixing 시작 시 item preparing cache patch, 실패 rollback/error patch와 성공 invalidation 구현
    - [x] mixing history type을 entity Zod schema로 이동하고 initialData/pagination polling 전환
    - [x] recommendation/mixing UI 및 query cache 회귀 test 통과

- [TODO][NON-PRD] T-F015-05 Development conversion·ticket mutation과 MSW fixture 완성
  - Date: 2026-08-09
  - Acceptance:
    - Modal health/handoff/conversion job과 ticket adjustment가 typed query/mutation을 사용한다.
    - conversion upload body는 buffering하지 않고 queued/processing에서만 polling한다.
    - MSW Node fixture가 success, 4xx, retryable error, malformed response와 terminal polling sequence를 재현한다.
  - Checklist:
    - [ ] development conversion client/key/options/mutations 및 terminal transition toast 구현
    - [ ] recommendation handoff query와 기존 invalid URL 상태 처리 유지
    - [ ] ticket adjustment form pending/success/error를 mutation state로 전환
    - [ ] `tests/msw` fixture/handlers/server를 test 전용으로 구성하고 handler reset 구현
    - [ ] no-retry/retry limit, malformed schema, polling stop와 mutation cache test 통과
    - [ ] long audio upload 및 ticket/admin 기존 회귀 test 통과

- [TODO][NON-PRD] T-F015-06 대상 fetch inventory 정리와 전체 회귀 검증
  - Date: 2026-08-09
  - Acceptance:
    - 대상 Client Component에는 server-state용 직접 fetch와 수동 polling timer가 남지 않는다.
    - 허용된 audio/UI timer 및 server-to-server fetch만 범위 밖으로 남는다.
    - 전체 정적 검사, production build, test suite와 production dependency audit이 통과한다.
  - Checklist:
    - [ ] client `fetch`/timer inventory를 재검사하고 범위 내 잔여 호출 제거
    - [ ] spec 사용자 스토리와 기능 요구사항 Acceptance를 실제 검증 결과에 맞춰 갱신
    - [ ] `pnpm run check` 통과
    - [ ] `pnpm run build` 통과
    - [ ] `pnpm test` 통과
    - [ ] `pnpm audit --prod` 결과 검토 및 blocker 0건 확인
    - [ ] workflow-sync marker, Decisions/Tasks test evidence 및 최종 완료 조건 갱신

---

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [ ] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료
- [ ] 테스트 실행 및 통과 (아래에 명령어/결과 기록)
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run test:query` | `2026-08-09` | PASS (13 tests) |
| `pnpm run check` | `-` | 미실행 |
| `pnpm run build` | `2026-08-09` | PASS (Next.js 16.3 production build, 22 pages) |
| `pnpm test` | `-` | 미실행 |
| `pnpm audit --prod` | `-` | 미실행 |
