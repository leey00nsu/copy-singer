# Implementation Plan: vocal-profile-slot-limit

> 스펙 승인 전에는 구현하지 않습니다.
> canonical docs surface 밖의 산출물이 생기더라도 최종 SSOT는 이 파일로 유지합니다.

---

## 개요

- **기능 ID**: F031
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-15
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| Persistence | Prisma/PostgreSQL | 종류별 티켓 지갑, 원장, analysis job 비용/환불 상태를 영속한다. |
| Server | Next.js API route + 기존 worker | 분석 접수/환불과 믹싱 티켓 전환을 기존 서버 경계에서 처리한다. |
| Config | `server-env.ts` `integerEnv()` | 가입 지급·기능별 비용을 환경변수로 운영한다. |
| Client state | TanStack Query | 종류별 티켓 잔액과 분석 티켓 정책을 기존 query 흐름으로 제공한다. |
| UI | React 19 + 기존 shared UI | 분석 입력, 계정 메뉴/계정 화면, 관리자 티켓 조정 UI를 확장한다. |
| Validation | Zod | ticket kind, wallet 응답, 분석 티켓 정책 계약을 런타임 검증한다. |
| Test | Node/tsx integration + Storybook + ESLint/TypeScript | 잔액 마이그레이션, 차감/환불, 제한 UX를 함께 검증한다. |

---

## 아키텍처

### 1. 단일 balance에서 종류별 wallet로 전환

현재 `User.ticketBalance`는 실제로 AI 믹싱 접수와 환불에만 사용된다. 이를 사용자 컬럼 두 개로 복제하지 않고 정규화된 지갑 모델로 전환한다.

```text
TicketKind
├── VOCAL_ANALYSIS
└── AI_MIXING

TicketWallet
├── userId
├── kind
├── balance
└── updatedAt

PK/Unique: (userId, kind)
```

`TicketLedger`에는 `kind`를 추가하고 `balanceAfter`는 해당 kind 지갑의 변경 후 잔액을 뜻한다. 원장 이벤트 enum은 기능명을 분리해 다음처럼 일반화한다.

```text
SIGNUP_GRANT
USAGE_DEBIT
USAGE_REFUND
ADMIN_ADJUSTMENT
```

기존 `MIXING_DEBIT` → `USAGE_DEBIT`, `MIXING_REFUND` → `USAGE_REFUND`로 마이그레이션하며 모두 `AI_MIXING` kind를 backfill한다. 기존 `SIGNUP_GRANT`, `ADMIN_ADJUSTMENT`도 기존 단일 잔액 의미에 따라 `AI_MIXING`으로 backfill한다.

`TicketLedger.mixingJobId`는 유지하고, 분석 티켓의 debit/refund 추적을 위해 `vocalProfileAnalysisJobId` optional relation을 추가한다.

### 2. 기존 사용자 마이그레이션

DB migration은 다음 순서로 안전하게 수행한다.

1. `TicketKind`, 새 generic ledger enum/value, `TicketWallet` 추가
2. 기존 `TicketLedger`에 nullable `kind`를 추가하고 모든 기존 row를 `AI_MIXING`으로 backfill
3. 기존 mixing debit/refund enum 값을 generic usage debit/refund로 전환
4. 모든 기존 사용자에 `AI_MIXING` wallet을 만들고 `User.ticketBalance` 값을 그대로 복사
5. ledger kind를 required로 전환
6. application이 wallet 모델로 전환된 후 legacy `User.ticketBalance` 제거

기존 사용자의 분석 티켓은 SQL migration에 환경변수 값을 하드코딩하지 않는다. 런타임 `ensureSignupTicketGrants()`가 `VOCAL_ANALYSIS` 지갑/가입 지급 원장을 처음 한 번 생성한다.

기존 AI 믹싱 가입 지급은 과거 idempotency key `signup:${userId}`와 backfilled ledger를 인식해 재지급하지 않는다. 새 분석 지급은 독립 key `signup:vocal-analysis:${userId}`를 사용한다. 새 사용자에게는 분석/믹싱 두 종류의 가입 지급을 각각 한 번 적용한다.

가입 지급 환경변수가 나중에 바뀌어도 기존 사용자의 이미 지급된 ledger amount를 다시 비교해 오류를 만들지 않고, 새로 지급되는 사용자에게만 당시 설정값을 적용하도록 ensure 로직을 분리한다.

### 3. 환경변수 SSOT

`src/shared/config/server-env.ts`에 다음 accessor를 둔다.

- `signupVocalAnalysisTicketGrant()` → `SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT`, default 5
- `signupMixingTicketGrant()` → `SIGNUP_MIXING_TICKET_GRANT`, default 1
- `vocalProfileAnalysisTicketCost()` → `VOCAL_PROFILE_ANALYSIS_TICKET_COST`, default 1
- 기존 `mixingTicketCost()` 유지

`.env.example`은 기존 `SIGNUP_TICKET_GRANT`를 새 두 가입 지급 변수로 교체한다. 하위 호환을 위한 묵시적 fallback은 두지 않아 설정 전환이 명확하도록 한다.

### 4. 공용 티켓 서비스 일반화

`applyTicketChange()` 입력에 `kind`를 필수로 추가한다. transaction 안에서 `(userId, kind)` wallet만 증가/감소하고, 음수 차감은 해당 wallet의 잔액을 원자적으로 검증한다.

`InsufficientTicketsError`는 `kind`, `required`, `balance`를 포함한다. API는 kind를 보고 `분석 티켓` 또는 `믹싱 티켓` 부족 상태를 사용자 UI에서 분기할 수 있게 한다.

조회 API는 단일 `{ balance }` 대신 종류별 wallet 목록을 제공한다. 계정 내역의 각 row도 `kind`를 포함한다.

### 5. 보컬 프로필 보유 수 제한 제거

사용자 소유 `sourceType = USER` 프로필 수는 새 분석 admission 조건으로 사용하지 않는다. 서버는 프로필 개수를 세어 신규 분석을 차단하지 않으며 `VOCAL_PROFILE_MAX_USER_PROFILES` 설정도 제거한다.

프로필 삭제·추천·믹싱 연결 제한과 사용자별 `profileNumber` 증가 규칙은 기존 계약을 유지한다.

### 6. 분석 enqueue + 티켓 debit

`enqueueVocalProfileAnalysis()`의 논리 순서는 다음과 같이 잡는다.

1. idempotency key 검증
2. 동일 요청이 있으면 기존 job 반환
3. active analysis 1개 제한 확인
4. MIME/크기 검증
5. 분석 티켓 잔액/비용 확인
6. source asset 저장
7. serializable DB transaction에서 분석 티켓 debit + analysis job 생성
8. DB 접수 실패 시 source asset discard

DB transaction에서는 현재 wallet 잔액을 다시 검증해 race를 방어한다. job에는 접수 당시 `ticketCost`, `refundState`를 저장한다. ticket ledger debit은 `vocalProfileAnalysisJobId`와 연결하고 idempotency key를 job/request에 결정적으로 연결한다.

동일 idempotency 요청 재시도는 기존 job과 기존 debit을 재사용한다.

### 7. 분석 terminal failure refund

기존 `TicketRefundState`를 `VocalProfileAnalysisJob`에도 추가한다.

- 성공: `refundState = NONE`
- retry 중: 상태 변경 없음
- terminal FAILED: `refundState = REQUIRED`
- refund 성공: `REFUNDED`

worker의 terminal failure 처리 이후 `VOCAL_ANALYSIS` wallet에 `ticketCost`를 `USAGE_REFUND`로 한 번 돌려준다. mixing과 같은 reconciliation 패턴을 사용할 수 있게 refund idempotency key를 `vocal-analysis-refund:${job.id}`처럼 고정한다.

분석 결과 성공 후 사용자가 profile을 삭제하는 것은 refund와 무관하다.

### 8. 믹싱 경로를 AI_MIXING wallet로 이전

`create-mixing/api/mixing-queue.ts`, mixing worker refund, ticket service 호출은 모두 `kind: AI_MIXING`을 사용한다. 기존 `MIXING_TICKET_COST`와 job `ticketCost` 의미는 유지한다.

기존 믹싱 ledger/환불 테스트는 새 wallet과 generic ledger event를 기준으로 갱신한다.

### 9. 분석 API 응답

analysis jobs GET 응답은 기존 jobs에 다음 policy를 추가한다.

```ts
{
  jobs: [...],
  analysisTickets: {
    balance: number,
    cost: number,
  },
}
```

티켓 grant/cost는 서버 설정에서 계산된 값만 내려보낸다. 클라이언트는 환경변수를 직접 알 필요가 없다.

POST 오류는 다음을 구분한다.

- insufficient `VOCAL_ANALYSIS` ticket → 분석 티켓 부족
- `ANALYSIS_BUSY` → 현재 분석 완료 대기

### 10. 분석 화면 UX

`VocalProfileWorkbench`/`VoiceScanInput`의 VOICE INPUT 영역에 분석 티켓 현황을 배치한다.

```text
분석 티켓    3장
```

정상 상태에서는 기존 입력을 유지하고 `분석을 시작하면 분석 티켓 1장을 사용해요.`를 보조 안내로 표시한다.

분석 티켓이 부족하면 새 분석 입력을 막고 티켓 부족 상태를 명시한다. 보유 프로필 수 때문에 별도 제한 상태를 만들거나 프로필 삭제를 유도하지 않는다.

### 11. 계정 메뉴 / 계정 / 관리자

- `user-menu`: 기존 단일 잔액 대신 `분석 N장`, `믹싱 N장`을 한눈에 확인
- `account-overview`: 두 잔액을 별도 요약 카드/행으로 표시
- `TicketLedger`: 각 entry에 `분석 티켓`/`믹싱 티켓` 종류 표시
- `ticket-adjustment-form`: 관리자가 ticket kind를 먼저 선택하고 수량 조정
- 양수 관리자 지급 notification: `분석 티켓 3장이 추가됐어요.`처럼 종류 포함

### 12. 티켓 소모 확인 모달

`entities/ticket`에 클라이언트 전용 `TicketConsumptionConfirmDialog`를 추가한다. 입력은 최소 `kind`, `cost`, `actionLabel`, `onConfirm`으로 두고 티켓 종류 라벨은 공용 ticket model helper를 사용한다.

- `cost > 0`: 트리거 클릭 → dialog open → 취소/닫기 시 아무 mutation도 실행하지 않음 → 확인 버튼에서 `onConfirm()` 한 번 실행 후 닫기
- `cost === 0`: dialog 없이 기존 action을 바로 실행
- 분석: 준비된 오디오의 `내 보컬 프로필 만들기`를 확인 모달 트리거로 교체하고 `analysisTickets.cost`를 전달
- 믹싱: `RecommendationMixingAction`에 서버가 계산한 `ticketCost`를 전달하고 최초 시작과 retry 모두 확인 모달을 통과
- 모달 문구는 `분석 티켓 1장을 사용할까요?` / `믹싱 티켓 1장을 사용할까요?`처럼 실제 kind와 cost를 포함하고 `확인하면 작업이 바로 시작돼요.`를 명시

이 확인은 사용자 실수 방지용 UX 경계다. 서버 API에는 신뢰 가능한 `confirmed` 플래그를 추가하지 않고 기존 잔액 검증, idempotency, debit/refund를 그대로 권한 경계로 유지한다.

---

## 주요 변경 파일

```text
prisma/
├── schema.prisma
└── migrations/...                           # TicketKind/Wallet/ledger/job migration

src/shared/config/
└── server-env.ts                            # 가입 지급/분석 비용 env

.env.example                                 # 새 정책 환경변수

src/entities/ticket/
├── model/contract.ts                        # kind/wallet/account 계약
├── api/ticket-service.ts                    # kind 기반 balance/ledger
├── ui/ticket-ledger.tsx                     # 종류 표시
└── ui/ticket-consumption-confirm-dialog.tsx # 공용 티켓 소모 확인

src/features/analyze-vocal-profile/
└── api/analysis-queue.ts                    # analysis ticket debit

src/_app/background-jobs/vocal-profile-analysis/
└── worker.ts                                # terminal failure refund

src/features/create-mixing/
src/_app/background-jobs/mixing/             # AI_MIXING kind로 전환

src/_app/api-routes/vocal-profiles/
└── vocal-profile-analysis-jobs-route.ts      # policy response/error

src/features/authentication/                 # 두 signup grant 보장
src/features/manage-tickets/                 # kind 선택 admin adjustment
src/features/manage-notifications/           # 종류별 credit copy

src/_pages/profile/ui/                       # 분석 티켓 UX
src/_pages/account/ui/                       # 두 지갑 표시

src/features/authentication/ui/user-menu.tsx # 두 잔액 표시

tests/                                       # migration/service/queue/UI 회귀
```

---

## 테스트 전략

### 1. ticket wallet / migration

- 기존 `ticketBalance`가 AI_MIXING wallet로 동일하게 이전됨
- 기존 ledger가 `kind=AI_MIXING`으로 backfill됨
- 기존 mixing debit/refund가 generic event + AI_MIXING으로 보존됨
- 기존 사용자의 mixing 가입 지급이 중복 지급되지 않음
- 기존 사용자에게 VOCAL_ANALYSIS 가입 지급은 한 번만 생성됨
- 종류별 wallet 차감은 서로 영향을 주지 않음

### 2. 분석 queue

- profile used < limit + analysis ticket 충분 → enqueue + 1회 debit
- profile limit 도달 → debit/asset/job 생성 없음
- analysis ticket 부족 → debit/job 없음
- 동일 idempotency retry → job/debit 1개
- terminal failure → 정확히 1회 refund
- retry 중간 상태 → refund 없음
- profile 삭제 → slot 복구, 분석 ticket은 복구되지 않음
- env limit/cost를 바꾸면 API와 서버 검증이 같은 값 사용

### 3. 믹싱 회귀

- AI_MIXING wallet만 차감
- VOCAL_ANALYSIS wallet은 믹싱에 영향 없음
- 실패 환불은 AI_MIXING wallet에만 적용
- 기존 insufficient ticket API/UI 의미 유지

### 4. UI

- 분석 화면: `분석 티켓 balance`, cost 안내
- 티켓 부족 상태와 정상 입력 전환
- 계정 메뉴: 분석/믹싱 잔액
- 계정 화면: 두 지갑 + kind가 있는 ledger
- 관리자: kind 선택 adjustment
- notification: 종류별 티켓 지급 문구
- 티켓 소모 확인: 분석/믹싱 최초 시작·retry에서 취소 시 mutation 0회, 확인 시 1회, cost=0은 modal 생략

### 5. 최종 검증

- 관련 targeted unit/integration/Storybook
- `pnpm run lint`
- `pnpm exec tsc --noEmit`
- `pnpm test`

---

## 배포/마이그레이션

DB migration이 필요하다. 기존 사용자 데이터는 삭제하지 않는다.

- 기존 `ticketBalance` → AI_MIXING wallet로 보존
- 기존 ticket ledger → AI_MIXING kind backfill
- 기존 사용자의 분석 ticket 가입 지급은 애플리케이션의 idempotent ensure 경계에서 현재 환경변수 정책으로 1회 적용
- 기존 프로필이 slot limit보다 많아도 보존하고 새 분석만 차단

배포 환경에서는 다음 환경변수를 명시적으로 검토한다.

```text
SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT=5
SIGNUP_MIXING_TICKET_GRANT=1
VOCAL_PROFILE_ANALYSIS_TICKET_COST=1
MIXING_TICKET_COST=1
```

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
- PRD: `docs/prd/copy-singer-prd.md` (`PRD-FR-063`)
