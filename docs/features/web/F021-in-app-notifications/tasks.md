# Tasks: in-app-notifications

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
- **브랜치**: `feat/in-app-notifications`
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

> 아래에 태스크를 추가하세요. **최소 1개가 필요**합니다.
> 태스크는 하나의 순차 리스트로 유지하고, 위에서 아래 순서 자체를 실행 우선순위로 취급하세요.
> 새 태스크 append에는 `npx lee-spec-kit task add <feature-ref> --title "..." --ref NON-PRD --acceptance "..." --check "..."` 사용을 우선하세요.
> 새 태스크는 마지막 기존 태스크 아래에 완전한 태스크 블록으로 추가하세요. `PRD-FR-001`이나 `PRD-SCOPE-V1-DESKTOP-EDITOR`처럼 이미 정의된 PRD key를 사용하거나, 내부 작업이면 `[NON-PRD]`를 사용합니다.
> placeholder 상태의 `Acceptance` / `Checklist`를 그대로 두지 마세요. 구체 항목이 아니면 구현을 시작하지 않습니다.
> 수동 편집이 필요하면 현재 태스크 근처가 아니라 `태스크 목록`의 마지막 기존 태스크 block 아래에만 append 하세요.

---

- [DONE][PRD-DATA-012] T-F021-in-app-notifications-01 알림 persistence와 owner-scoped service
  - Date: 2026-08-11
  - Acceptance:
    - 사용자 소유 알림이 결정적 dedupe key, 읽은 시각과 생성 시각을 포함해 영속 저장되고 다른 사용자는 조회·변경할 수 없다.
    - 목록은 최신순 page와 unread count를 반환하며 개별 읽음과 모두 읽음은 idempotent하다.
  - Checklist:
    - [x] Prisma enum·Notification model·migration 구현
    - [x] 알림 생성·목록·개별/전체 읽음 server service와 contract 구현
    - [x] migration·소유권·중복·페이지네이션 DB 테스트

- [DONE][PRD-FR-058] T-F021-in-app-notifications-02 terminal 도메인 알림 연결
  - Date: 2026-08-11
  - Acceptance:
    - 관리자 양수 티켓 조정, 보컬 분석과 믹싱의 성공·최종 실패가 각 event당 알림 한 건을 생성한다.
    - 가입 지급·믹싱 환불·차감·retry 중간 실패·worker 재실행은 중복 또는 불필요한 알림을 만들지 않는다.
  - Checklist:
    - [x] ticket transaction의 대상 유형 알림 연결
    - [x] vocal analysis terminal 상태와 알림 연결
    - [x] mixing terminal 상태와 알림 연결
    - [x] 성공·실패·retry·idempotency 통합 테스트

- [DONE][PRD-FR-058] T-F021-in-app-notifications-03 알림 API와 client server-state
  - Date: 2026-08-11
  - Acceptance:
    - 인증 사용자는 최신 알림·전체 이력·unread count를 조회하고 본인의 개별 알림 또는 전체를 읽음 처리할 수 있다.
    - header query는 30초 polling과 window focus refetch를 사용하며 mutation 후 관련 cache를 일관되게 갱신한다.
  - Checklist:
    - [x] GET 목록·PATCH 개별 읽음·POST 모두 읽음 route 구현
    - [x] Zod response validation과 TanStack Query options/mutations 구현
    - [x] 인증·잘못된 ID·contract·cache 동작 테스트

- [DONE][PRD-FR-058] T-F021-in-app-notifications-04 Header Bell과 알림 센터 UI
  - Date: 2026-08-11
  - Acceptance:
    - 인증 header에서 Bell이 desktop 계정 메뉴 왼쪽·mobile 제품 메뉴 왼쪽에 표시되고 unread 수와 최신 알림을 접근 가능하게 제공한다.
    - `/notifications`는 읽음 구분·최신순 페이지·empty/loading/error 상태를 제공하며 알림 클릭은 읽음 처리 후 안전한 내부 경로로 이동한다.
  - Checklist:
    - [x] 공통 notification item·Bell menu·badge 구현
    - [x] ProductHeader desktop/mobile 배치와 비로그인 미노출 적용
    - [x] notifications page·pagination·상태 UI 구현
    - [x] component·Storybook·browser responsive·build 회귀 검증

- [DONE][PRD-FR-051] T-F021-in-app-notifications-05 계정 메뉴 잔여 티켓 표시
  - Date: 2026-08-12
  - Acceptance:
    - 프로필 아바타로 연 계정 메뉴의 최상단에 현재 사용 가능한 티켓 수가 표시되고, 메뉴를 다시 열 때 최신 잔액을 조회한다.
  - Checklist:
    - [x] owner-scoped 티켓 잔액 API와 client query 구현
    - [x] UserMenu 최상단 잔여 티켓 UI와 loading/error fallback 구현
    - [x] Storybook interaction·contract·build 회귀 검증

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [x] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료
- [x] 테스트 실행 및 통과 (아래에 명령어/결과 기록)
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm exec prisma migrate deploy` | `2026-08-11` | 통과 — `20260811220000_add_notifications` 적용 |
| `pnpm run db:validate` | `2026-08-11` | 통과 |
| `pnpm run typecheck` | `2026-08-12` | 통과 |
| `node --conditions react-server --import tsx --test tests/notification-service.integration.ts` | `2026-08-11` | 통과 — 영속화·동시 dedupe·소유권·읽음·페이지네이션 1/1 |
| `node --conditions react-server --import tsx --test tests/admin-operations.integration.ts tests/vocal-profile-analysis-queue.integration.ts tests/mixing-queue.integration.ts` | `2026-08-11` | 통과 — 티켓 양수 지급 단일 알림, 분석·믹싱 성공/최종 실패와 retry 제외 7/7 |
| `pnpm exec tsx --test tests/api-contracts.test.ts tests/client-server-state-query.test.ts` | `2026-08-12` | 통과 — 알림 계약과 ticket balance nonnegative contract·menu-open query 활성화 포함 21/21 |
| `node --conditions react-server --import tsx --test tests/notification-routes.integration.ts` | `2026-08-12` | 통과 — 알림 owner scope와 session 사용자 ticket balance 4/타 사용자 9 분리, 비인증 401 1/1 |
| `pnpm run test:storybook --run src/_pages/notifications/ui/notifications-list.stories.tsx src/widgets/product-shell/ui/product-shell.stories.tsx` | `2026-08-11` | 통과 — desktop/mobile Bell 배치·비로그인 미노출·dropdown 실제 열기·알림 이력/empty 8/8 |
| `pnpm run lint` | `2026-08-12` | 통과 |
| `pnpm run check:architecture` | `2026-08-12` | 통과 — Steiger 및 FSD boundary 4/4 |
| `pnpm run build` | `2026-08-12` | 통과 — Next.js production build 및 `/notifications`, `/api/account/ticket-balance` route 생성 |
| `pnpm run test:storybook --run src/widgets/product-shell/ui/product-shell.stories.tsx` | `2026-08-12` | 통과 — 계정 메뉴 최상단 `잔여 티켓 3개`와 기존 desktop/mobile 동작 6/6 |
| Browser responsive QA | `2026-08-11` | 통과 — Bell dropdown과 전체 알림 화면 렌더링·읽음 상태·내부 이동 구조 확인, Base UI label context 오류 수정 후 재검증 |

<!-- lee-spec-kit:workflow-sync 2026-08-12T00:24:35.000Z -->
