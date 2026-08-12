# Implementation Plan: in-app-notifications

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F021
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-11
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| 영속화 | Prisma `Notification` model + PostgreSQL | 재접속·worker 재시작 후에도 알림과 읽음 상태 보존 |
| 중복 방지 | event별 결정적 `dedupeKey` unique | worker retry·동시 실행·ticket idempotency에서 exactly-once 사용자 표시 |
| 서버 상태 | TanStack Query | 기존 제품 polling/cache 정책과 일치 |
| 전달 방식 | 30초 polling + window focus refetch | 현 규모에서 WebSocket/SSE 운영 복잡도 없이 백그라운드 완료 반영 |
| UI | ProductHeader Bell + Base UI menu + `/notifications` | 최신 알림은 빠르게, 전체 이력은 별도 페이지에서 탐색 |
| 검증 | Node test, DB integration, Storybook, Browser QA | 소유권·idempotency와 desktop/mobile 상호작용을 함께 검증 |

---

## 아키텍처

1. 티켓 service와 background worker가 실제 영속 상태를 terminal로 변경하는 경계에서 notification service를 호출한다.
2. notification service는 사용자용 text와 내부 href를 server에서 만들고 `dedupeKey` unique를 이용해 create-many/재시도에도 한 건만 보존한다.
3. owner-scoped API는 session user만 사용해 최신 목록·전체 page·unread count를 반환하고 개별/전체 읽음을 갱신한다.
4. `NotificationBell`은 ProductHeader 안에서 최신 5개 query를 30초 polling하고 focus 복귀 시 갱신한다. 메뉴 open만으로 읽음 처리하지 않는다.
5. 알림 item 선택 시 읽음 mutation을 먼저 요청하고 내부 href로 이동한다. mutation 실패 시에도 안전한 navigation을 막지 않고 다음 refetch에서 상태를 복구한다.
6. `/notifications` server page는 인증을 요구하고 client list에 초기 payload를 제공해 loading flash를 줄이며, 다른 인증 제품 페이지와 같은 72rem content rail을 사용한다.
7. `UserMenu`가 열리면 owner-scoped ticket balance query를 활성화하고 메뉴 최상단에 잔여 수량을 표시한다. 전용 balance 응답으로 티켓 원장 전체를 내려받지 않으며 재개방 시 stale query를 갱신한다.

### 알림 생성 규칙

| Type | 생성 경계 | dedupe key | href |
| --- | --- | --- | --- |
| `TICKET_CREDIT` | 양수 `ADMIN_ADJUSTMENT` ledger 신규 생성 | `ticket-ledger:{ledgerId}` | `/account` |
| `VOCAL_PROFILE_SUCCEEDED` | analysis job `SUCCEEDED` | `vocal-analysis:{jobId}:succeeded` | `/vocal-profiles/{profileId}` |
| `VOCAL_PROFILE_FAILED` | analysis job 최종 `FAILED` | `vocal-analysis:{jobId}:failed` | `/library?tab=profiles` |
| `MIXING_SUCCEEDED` | mixing job `SUCCEEDED` + result asset 저장 완료 | `mixing:{jobId}:succeeded` | `/library/mixes/{jobId}` |
| `MIXING_FAILED` | mixing job 최종 `FAILED` | `mixing:{jobId}:failed` | `/library/mixes/{jobId}` |

가입 지급·믹싱 환불·차감과 retry 상태에는 알림을 생성하지 않는다. title/message는 source 이름의 snapshot이므로 이후 source 삭제와 무관하게 알림 이력은 읽을 수 있다.

---

## 파일 구조

```
src/
├── entities/notification/
│   ├── api/notification-service.ts
│   ├── api/client.ts
│   ├── model/contract.ts
│   ├── ui/notification-item.tsx
│   ├── index.ts
│   └── index.server.ts
├── entities/ticket/
│   ├── api/client.ts
│   └── model/contract.ts
├── features/manage-notifications/
│   ├── api/client.ts
│   ├── model/queries.ts
│   ├── ui/notification-bell.tsx
│   └── index.ts
├── _pages/notifications/ui/
│   ├── notifications-page.tsx
│   └── notifications-list.tsx
└── widgets/product-shell/ui/product-shell.tsx

app/
├── api/account/ticket-balance/route.ts
├── api/notifications/route.ts
├── api/notifications/[id]/route.ts
├── api/notifications/read-all/route.ts
└── notifications/page.tsx

prisma/
├── schema.prisma
└── migrations/*_add_notifications/migration.sql
```

---

## 테스트 전략

- **단위 테스트**: contract parsing, presentation copy, query polling/cache, owner-scoped route adapter, ticket balance query activation.
- **통합 테스트**: migration, event dedupe, ticket type exclusion, worker success/final failure/retry, read ownership and pagination.
- **E2E 테스트**: Storybook interaction으로 unread/read/empty/error 및 로그인/비로그인 header를 검증하고 Browser QA로 desktop/mobile placement와 overflow를 확인한다.
- **회귀 테스트**: `pnpm run typecheck`, `pnpm run lint`, `pnpm run check:architecture`, `pnpm run build`, 관련 기존 ticket·analysis·mixing suites.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
