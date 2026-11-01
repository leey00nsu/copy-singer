---
type: concept
title: 티켓 원장과 멱등성
description: 티켓 차감·환불·가입 지급·관리자 조정이 TicketWallet과 TicketLedger에 함께 기록되는 방식과, idempotencyKey 규칙이 중복 반영을 막는 원리, 가입 지급 복구가 금액 충돌을 거부하는 조건, 체험 계정이 원장 밖에서 처리되는 경계를 설명해요.
tags: [tickets, ledger, idempotency, invariants, prisma]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-30T10:43:12.272Z
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-2798a6200ef792b731721034
    resource: repo://prisma/schema.prisma
  - id: openwiki-source-5141a6008af8b86496520333
    resource: repo://scripts/reconcile-external-job.ts
  - id: openwiki-source-6d119c4213bbb6a218fde503
    resource: repo://scripts/recover-signup-grant.ts
  - id: openwiki-source-53e53c476f7a3683548b96d2
    resource: repo://src/_app/api-routes/account/tickets-route.ts
  - id: openwiki-source-d18632eb47e711120ea541db
    resource: repo://src/_app/api-routes/admin/ticket-adjustments-route.ts
  - id: openwiki-source-eaa76879de1a19c0db5c6ebb
    resource: repo://src/_app/background-jobs/mixing/worker.ts
  - id: openwiki-source-da8b10d1e5d758ab0e1c7582
    resource: repo://src/_app/background-jobs/vocal-profile-analysis/worker.ts
  - id: openwiki-source-12b687e5e9afbf72c79b13fd
    resource: repo://src/entities/ticket/api/ticket-service.ts
  - id: openwiki-source-a824ef65c70c908bd00443fa
    resource: repo://src/entities/ticket/model/contract.ts
  - id: openwiki-source-75ca813b5b73760aa12fda93
    resource: repo://src/features/analyze-vocal-profile/api/analysis-queue.ts
  - id: openwiki-source-e666cd046fb06fe25b657e92
    resource: repo://src/features/create-mixing/api/mixing-queue.ts
  - id: openwiki-source-27431e6737394d4d64414718
    resource: repo://src/features/manage-tickets/api/adjust-user-tickets.ts
  - id: openwiki-source-44e7e2d6b4bac7fa4187bbf9
    resource: repo://src/features/manage-tickets/model/contract.ts
  - id: openwiki-source-49d0a0faa921fcf2e45ba42a
    resource: repo://tests/admin-operations.integration.ts
  - id: openwiki-source-6edd08b73d3742b7c03556bd
    resource: repo://tests/e2e/journeys.spec.mjs
  - id: openwiki-source-10c6a88a3297ea68ebdbf439
    resource: repo://tests/mixing-queue.integration.ts
  - id: openwiki-source-30f5c0a878cc81b6aac4a043
    resource: repo://tests/signup-recovery.integration.ts
  - id: openwiki-source-c2d4400c2e28b58229bc069e
    resource: repo://tests/ticket-ledger.integration.ts
  - id: openwiki-source-28adc6ef840aa586dc1aceef
    resource: repo://tests/vocal-profile-analysis-queue.integration.ts
generated: { by: "openwiki/0.7.2", at: "2026-10-30T13:29:10.337Z" }
---

티켓 원장은 "지갑 잔액"과 "변경 내역"을 같은 트랜잭션에서 함께 움직여요. 정식 회원의 티켓을 건드리는 코드는 모두 `applyTicketChangeInTransaction`을 통과하고, 그 함수가 잔액 갱신과 `TicketLedger` 행 생성을 한 번에 처리해요.

같은 요청이 두 번 도착해도 결과가 한 번만 반영되는 성질(멱등성, idempotency)은 `TicketLedger.idempotencyKey` unique 제약과 키 재사용 검사로 얻어요. 차감·환불·가입 지급·관리자 조정이 모두 이 함수를 지나므로, 새 경로를 추가할 때도 여기 규칙만 지키면 중복 반영을 피할 수 있어요. 핵심 구현은 [src/entities/ticket/api/ticket-service.ts](repo://src/entities/ticket/api/ticket-service.ts#L42-L105)예요.

## 원장이 지키는 불변식

원장을 읽거나 확장할 때 기준이 되는 규칙은 세 가지예요.

1. 잔액과 원장 행은 같은 트랜잭션에서 함께 바뀌어요. 호출자는 자기 트랜잭션(`tx`)을 넘기고, 원장 함수가 `TicketWallet` 잔액을 읽어 `balanceAfter`로 기록해요. 둘 중 하나만 반영된 상태가 커밋될 수 없어요.
2. 하나의 `idempotencyKey`는 하나의 변화만 나타내요. 키는 전역 unique이고, 같은 키로 다시 호출하면 새 행을 만들지 않고 기존 행을 그대로 돌려줘요.
3. 지갑은 `(userId, kind)` 단위로 분리돼요. `VOCAL_ANALYSIS` 차감은 `AI_MIXING` 잔액에 영향을 주지 않아요. 금액의 부호가 방향을 정하고, 양수는 지급, 음수는 차감이에요.

`validateTicketChange`가 원장 함수의 첫 단계예요. `amount`가 안전한 정수인지, `idempotencyKey`와 `reason`이 비어 있지 않은지 확인하고, 통과하지 못하면 예외를 던져요.

## 차감과 지급은 다른 SQL을 써요

차감(`amount < 0`)은 잔액을 읽어 비교한 뒤 쓰는 대신 조건부 `updateMany` 한 번으로 처리해요. `balance: { gte: Math.abs(input.amount) }` 조건이 붙어서, 동시에 들어온 두 요청 중 조건을 만족하는 쪽만 갱신에 성공해요. 갱신 건수가 1이 아니면 잔액을 다시 읽어 `InsufficientTicketsError`를 던지고, 그 오류는 `kind`, `required`, `balance`를 담아 호출자가 사용자 메시지로 쓸 수 있게 해요.

지급(`amount >= 0`)은 잔액이 줄어들 위험이 없어서 `increment`만 실행해요. 두 경로 모두 지갑 행이 없을 수 있으니 `upsert`로 `balance: 0` 행을 먼저 보장해요.

같은 키로 다시 호출했을 때 `userId`, `kind`, `type`, `amount` 중 하나라도 다르면 `"Ticket idempotency key was reused with different input."` 오류가 나요. 네 값이 모두 같으면 기존 행을 반환하고 잔액은 건드리지 않아요. 이 함수는 기존 원장 행을 수정하는 경로를 두지 않아요. 한 번 확정된 원장 행은 그대로 남고, 정정이 필요하면 반대 부호의 새 행을 만들어요.

```mermaid
flowchart TD
  A["원장 변경 요청"] --> B["validateTicketChange"]
  B --> C{"같은 idempotencyKey 행이 있는가"}
  C -->|"있음"| D{"입력이 모두 같은가"}
  D -->|"다름"| E["예외 발생"]
  D -->|"같음"| F["기존 원장 행 반환"]
  C -->|"없음"| G["TicketWallet upsert"]
  G --> H{"amount가 음수인가"}
  H -->|"예"| I["balance 조건부 updateMany"]
  I --> J{"갱신 건수가 정확히 1인가"}
  J -->|"아니오"| K["InsufficientTicketsError"]
  J -->|"예"| L["잔액 재조회 후 원장 create"]
  H -->|"아니오"| M["잔액 increment"]
  M --> L
```

`applyTicketChangeInTransaction`의 분기 순서예요. 키 중복 검사가 차감보다 앞에 있어서, 이미 처리한 요청은 지갑을 다시 읽지 않아요.

## 재시도와 unique 충돌 처리

이미 트랜잭션 안에 있다면 `applyTicketChangeInTransaction(tx, input)`을 부르세요. 이 함수는 재시도하지 않으므로, 쓰기 충돌 처리는 바깥 트랜잭션을 연 쪽의 몫이에요. 분석 접수는 자기 트랜잭션을 최대 3회 다시 시도하는 루프 안에서 차감을 불러요([analysis-queue.ts](repo://src/features/analyze-vocal-profile/api/analysis-queue.ts#L170-L220)).

트랜잭션이 없다면 `applyTicketChange`를 쓰세요. 이 함수가 `Serializable` 격리 수준으로 트랜잭션을 열고 최대 3회 시도해요. Prisma 오류 코드 `P2034`나 `TransactionWriteConflict`, `deadlock` 메시지가 나오면 다음 시도로 넘어가고, 3회를 다 쓰면 `"Ticket transaction exhausted its retry limit."`로 끝나요.

동시에 같은 키가 들어와 unique 제약이 걸리면(코드 `P2002`) 오류를 그대로 올리지 않아요. `userId`, `kind`, `type`, `amount`가 일치하는 기존 행이 있으면 그 행을 결과로 돌려줘요. 이 처리가 없으면 경쟁에서 진 쪽이 실패로 보여요. 근거는 [applyTicketChange](repo://src/entities/ticket/api/ticket-service.ts#L107-L134)예요.

## idempotencyKey 명명 규칙

키 이름이 곧 "무엇을 한 번만 허용하는가"를 정해요. 새 경로를 추가할 때는 아래 형식을 따르고, 절대 임의의 문자열을 만들지 마세요.

| idempotencyKey | 만드는 곳 | 한 번만 허용하는 변화 |
| --- | --- | --- |
| `signup:vocal-analysis:{userId}` | [signupKey](repo://src/entities/ticket/api/ticket-service.ts#L136-L138) | 사용자 1명의 가입 분석 티켓 지급 |
| `signup:ai-mixing:{userId}` | [signupKey](repo://src/entities/ticket/api/ticket-service.ts#L136-L138) | 사용자 1명의 가입 믹싱 티켓 지급 |
| `vocal-analysis:debit:{userId}:{요청키}` | [analysis-queue.ts](repo://src/features/analyze-vocal-profile/api/analysis-queue.ts#L201-L210) | 요청 키 하나에 대한 분석 티켓 차감 |
| `vocal-analysis-refund:{jobId}` | [worker.ts](repo://src/_app/background-jobs/vocal-profile-analysis/worker.ts#L142-L160) | 분석 작업 1건의 실패 환불 |
| `mixing:debit:{jobId}` | [mixing-queue.ts](repo://src/features/create-mixing/api/mixing-queue.ts#L134-L144) | 믹싱 작업 1건의 티켓 차감 |
| `mixing:refund:{jobId}` | [worker.ts](repo://src/_app/background-jobs/mixing/worker.ts#L156-L172) | 믹싱 작업 1건의 환불 |
| `admin:{actorUserId}:{요청키}` | [adjust-user-tickets.ts](repo://src/features/manage-tickets/api/adjust-user-tickets.ts#L24-L32) | 관리자 한 명이 보낸 요청 키 하나의 조정 |

분석 차감 키는 `userId`와 사용자가 보낸 요청 키를 함께 넣어요. 그래야 다른 사용자나 다른 업로드가 같은 키 문자열을 써도 서로 다른 변화로 남아요. 반면 믹싱과 분석의 환불 키는 `jobId`만 써요. 작업 행 자체가 이미 유일하기 때문이에요.

두 접수 모두 작업 행을 먼저 만든 뒤 같은 트랜잭션에서 차감을 호출해요. 분석은 `VocalProfileAnalysisJob`을 create 한 직후 차감하고 원장 행에 `vocalProfileAnalysisJobId`를 남겨요([analysis-queue.ts](repo://src/features/analyze-vocal-profile/api/analysis-queue.ts#L185-L213)). 믹싱은 `MixingJob` create 뒤에 차감하며 키에 그 `job.id`를 넣어요([mixing-queue.ts](repo://src/features/create-mixing/api/mixing-queue.ts#L117-L148)). 작업 생성과 차감을 한 트랜잭션에 두면 차감에 실패했을 때 작업 행도 함께 롤백돼요.

`mixing:refund:{jobId}`는 워커 자동 환불과 운영자 복구 스크립트가 같은 문자열을 만들어요. 두 경로가 겹쳐 실행돼도 원장 행은 하나만 생겨요([reconcile-external-job.ts](repo://scripts/reconcile-external-job.ts#L55-L72)).

## 체험 계정은 지갑도 원장도 만들지 않아요

비회원 체험 분석 접수는 `applyTicketChangeInTransaction`을 호출하지 않아요. 접수 트랜잭션은 `policy.guest`가 참이면 `GuestAnalysisTrial`의 `jobId`와 `expiresAt`만 갱신하고, 티켓 차감은 그 밖의 경우에만 실행해요([analysis-queue.ts](repo://src/features/analyze-vocal-profile/api/analysis-queue.ts#L196-L210)). 잔액 확인 단계도 체험 계정에는 `analysisTickets`의 `balance`와 `cost`를 모두 0으로 돌려주며 지갑을 읽지 않아요([analysis-queue.ts](repo://src/features/analyze-vocal-profile/api/analysis-queue.ts#L100-L117)). 그래서 체험 계정에는 `TicketWallet` 행도 `TicketLedger` 행도 생기지 않고, 분석 1회가 티켓 차감 없이 끝나요.

체험 식별, 일일 한도, 결과 저장과 만료 수명 주기는 [비회원 체험 분석 흐름](../workflows/guest-analysis-trial.md)이 소유해요. 이 페이지는 체험 계정이 원장 밖에 있다는 경계만 기억하세요.

## 가입 지급과 복구 가능성

가입 지급은 인증 계층에서 시작해요. better-auth의 `user` 생성 `after` 훅이 `ensureSignupTicketGrants(user.id)`를 호출해서, 회원이 만들어지면 두 종류의 지급이 이어져요([auth.ts](repo://src/features/authentication/api/auth.ts#L32-L40)).

지급 자체는 금액을 먼저 확정해 두는 2단계 구조예요. `ensureSignupTicketGrants`는 지급 전에 `SignupGrantIntent`에 두 종류의 금액을 모두 기록해요. 지급은 그 intent의 `amount`를 읽어서 실행해요. 나중에 `SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT` 같은 환경 변수를 바꿔도 이미 기록된 금액이 우선이라, 복구 결과가 설정 변경에 흔들리지 않아요([src/entities/ticket/api/ticket-service.ts](repo://src/entities/ticket/api/ticket-service.ts#L136-L179)). intent는 `(userId, kind)`를 복합 기본 키로 쓰는 별도 모델이라 종류마다 한 행만 남아요([prisma/schema.prisma](repo://prisma/schema.prisma#L674-L683)).

같은 함수가 두 번 동시에 불려도 안전해요. `SELECT ... FOR UPDATE`로 `User` 행을 잠그고, 해당 `kind`의 `SIGNUP_GRANT` 원장 행이 이미 있으면 지급을 건너뛰어요. 지급 금액의 기본값과 허용 범위는 [operations/configuration.md](../operations/configuration.md)가 다뤄요.

운영자 복구인 `recoverSignupGrant`는 DB를 건드리기 전에 입력을 먼저 검증하고, 기록된 금액과 요청 금액이 어긋나면 지급을 거부해요([src/entities/ticket/api/ticket-service.ts](repo://src/entities/ticket/api/ticket-service.ts#L181-L253)).

| 검사 | 통과 조건 | 실패했을 때 |
| --- | --- | --- |
| `kind` | `VOCAL_ANALYSIS` 또는 `AI_MIXING`이에요 | `An explicit valid ticket kind and amount (0..1000000) are required.` |
| `amount` | 안전한 정수이고 `0` 이상 `1,000,000` 이하예요. `0`도 통과해요 | 같은 메시지예요 |
| `userId`, `operator`, `reason` | 각각 trim 후 비어 있지 않아요 | `user, operator and reason are required.` |
| 대상 사용자 | `User` 행이 `FOR UPDATE` 잠금으로 정확히 1건 잡혀요 | `Signup user does not exist.` |
| 기록된 금액 | 같은 `kind`의 `SignupGrantIntent` 금액과 기존 `SIGNUP_GRANT` 원장 금액이 요청 금액과 같아요 | `Signup amount conflicts with the recorded intent or ledger.` |

검증을 통과하면 기존 `SIGNUP_GRANT` 행이 있을 때는 `NOOP`(기존 행 id와 현재 잔액을 담아요), 없고 `apply`를 주지 않았을 때는 `WOULD_GRANT`, 없고 `apply`를 줬을 때는 `GRANTED`를 반환해요. 실제 지급까지 간 경우에만 `SignupGrantIntent`가 없으면 `operator`·`reason`과 함께 만들고, 원장 사유는 `가입 지급 복구 ({operator}): {reason}`이 돼요. 금액 `0`도 검증을 통과하므로 `amount`가 0인 지급 행이 생길 수 있어요. 실행 인자와 결과 표, `--amount 0`의 함정은 [복구 스크립트 운영 절차](../operations/recovery-runbook.md)가 다뤄요.

```mermaid
flowchart TD
  A["recoverSignupGrant 호출"] --> B{"종류·금액·필수 문자열이 유효한가"}
  B -->|"아니오"| C["검증 오류"]
  B -->|"예"| D["User 행 FOR UPDATE 잠금"]
  D --> E{"기록된 금액과 요청 금액이 다른가"}
  E -->|"예"| F["금액 충돌 오류"]
  E -->|"아니오"| G{"SIGNUP_GRANT 행이 있는가"}
  G -->|"예"| H["NOOP"]
  G -->|"아니오"| I{"apply가 참인가"}
  I -->|"아니오"| J["WOULD_GRANT"]
  I -->|"예"| K["intent upsert 후 원장 create"]
  K --> L["GRANTED"]
```

복구 한 번의 분기 순서예요. 검증과 금액 충돌 거부가 모두 지급보다 앞에 있어서, 잘못된 인자나 다른 금액은 잔액을 건드리지 않아요.

## 모델 관계와 열거형

`kind`는 티켓 종류, `type`은 변화의 성격이에요. 두 축이 분리돼 있어서 "관리자가 조정한 분석 티켓" 같은 조합을 원장에서 그대로 조회할 수 있어요.

| 대상 | 값 또는 제약 |
| --- | --- |
| `TicketKind` | `VOCAL_ANALYSIS`, `AI_MIXING` |
| `TicketLedgerType` | `SIGNUP_GRANT`, `USAGE_DEBIT`, `USAGE_REFUND`, `ADMIN_ADJUSTMENT` |
| `TicketRefundState` | `NONE`, `REQUIRED`, `REFUNDED`(작업 행의 컬럼이에요) |
| `TicketWallet` | 기본 키 `@@id([userId, kind])`, `balance` 기본값 0 |
| `TicketLedger` | `idempotencyKey` unique, `balanceAfter` 필수, `amount`은 부호 있는 정수 |
| `TicketLedger` 관계 | 소유자는 `User`(`Cascade`), `actorUserId`는 `SetNull`, 작업 참조 두 개도 `SetNull` |

`balanceAfter`는 그 행이 반영된 직후의 잔액이에요. 그래서 원장만으로 잔액 변화를 재구성할 수 있고, 화면도 각 항목 옆에 당시 잔액을 보여줄 수 있어요. 전체 관계는 [architecture/data-model.md](../architecture/data-model.md)가 소유해요. 스키마 정의는 [prisma/schema.prisma](repo://prisma/schema.prisma#L507-L541)를 확인하세요.

## 환불은 원장 관점에서 무엇을 남기나

환불은 `refundState`가 `REQUIRED`인 작업만 실행해요. 그래서 작업 상태 확정과 환불 기록이 분리돼 있고, 워커가 중간에 죽어도 남은 `REQUIRED` 작업을 다시 처리할 수 있어요.

| 실패 지점 | 확정 시 `refundState` | 남는 원장 결과 |
| --- | --- | --- |
| 분석 작업 실패, `ticketCost > 0` | `REQUIRED` → 환불 후 `REFUNDED` | `vocal-analysis-refund:{jobId}`, `USAGE_REFUND` 1건 |
| 분석 작업 실패, `ticketCost = 0` | `NONE` | 없음 |
| 믹싱, 외부 변환 서비스 접수 전 실패 | `REQUIRED` → 환불 후 `REFUNDED` | `mixing:refund:{jobId}`, `USAGE_REFUND` 1건 |
| 믹싱, 접수 후 실패(`modalJobId` 있음) | `NONE` | 없음 |
| 믹싱, 접수 여부 불확실 | `NONE` + `errorCode = MODAL_SUBMISSION_UNCONFIRMED` | 보류, `ExternalJobReconciliation`에 `SUBMISSION_UNKNOWN_REFUND_HELD` 기록 |

분석 실패는 `releaseFailure`가 `FAILED` 확정 트랜잭션에서 `refundState`를 정하고, 그 트랜잭션이 끝난 뒤 환불을 시도해요([worker.ts](repo://src/_app/background-jobs/vocal-profile-analysis/worker.ts#L203-L241)). 믹싱은 접수 여부를 `submitted`로 판정해 접수 전 실패에만 `REQUIRED`를 주고, 접수 여부가 불확실하면 운영자 확인 전까지 잔액을 되돌리지 않아요([worker.ts](repo://src/_app/background-jobs/mixing/worker.ts#L251-L291)). 그래서 변환 요청이 네트워크 오류로 끊긴 경우에는 `MODAL_SUBMISSION_UNCONFIRMED`, `refundState = NONE`, 차감된 잔액 그대로, `SUBMISSION_UNKNOWN_REFUND_HELD` 기록 하나가 남아요([mixing-queue.integration.ts](repo://tests/mixing-queue.integration.ts#L286-L296)). 그 판단 규칙은 [workflows/ai-mixing.md](../workflows/ai-mixing.md)가 소유해요.

환불도 예외 없이 `applyTicketChangeInTransaction`을 쓰지만, 작업을 `FAILED`로 확정하는 트랜잭션과는 별개예요. 확정 트랜잭션은 `refundState`만 `REQUIRED`로 남기고 끝나요. 그 뒤 환불 함수가 자기 트랜잭션에서 작업 행을 `FOR UPDATE`로 잠그고 `REQUIRED`를 다시 확인한 다음, 원장 행과 `REFUNDED` 상태를 함께 기록해요([refundRequiredVocalProfileAnalysisTicket](repo://src/_app/background-jobs/vocal-profile-analysis/worker.ts#L142-L160)). `ensureMixingRefund`도 같은 형태예요([worker.ts](repo://src/_app/background-jobs/mixing/worker.ts#L156-L172)). 그래서 확정과 환불 사이에 프로세스가 죽어도 `REQUIRED`가 남고, 남은 행을 다시 훑는 반복 주기는 [Job 큐와 lease 복구 계약](../operations/job-processing.md)이 다뤄요.

## 조정과 조회 표면

관리자 조정은 `ADMIN_ADJUSTMENT` 원장 행 하나를 남겨요. 요청 스키마가 `amount`를 0이 아닌 정수로 `±10000` 이내로 제한하고, `reason`은 trim 후 3~500자, `idempotencyKey`는 1~200자로 제한해요([contract.ts](repo://src/features/manage-tickets/model/contract.ts#L4-L14)).

조정 대상은 정식 회원이어야 해요. `adjustUserTickets`는 `User`를 조회해 행이 없거나 `isGuest`면 `정식 회원에게만 티켓을 조정할 수 있어요.` 오류로 원장을 건드리기 전에 멈춰요([adjust-user-tickets.ts](repo://src/features/manage-tickets/api/adjust-user-tickets.ts#L22-L23)). 체험 계정의 지갑·원장이 0건으로 남는지는 통합 테스트가 확인해요([admin-operations.integration.ts](repo://tests/admin-operations.integration.ts#L168-L180)). 관리자 인증과 조정 폼 표면은 [관리자 콘솔과 커스텀 믹싱](../operations/admin-console.md)이 정리해요.

지급 조정일 때만 대상 사용자에게 알림을 보내요. `dedupeKey`가 `ticket-ledger:{ledger.id}`라서 같은 원장 행에 대한 알림은 한 번만 생겨요([adjust-user-tickets.ts](repo://src/features/manage-tickets/api/adjust-user-tickets.ts#L33-L43)).

HTTP 계약은 [ticket-adjustments-route.ts](repo://src/_app/api-routes/admin/ticket-adjustments-route.ts#L7-L48)에 있어요. 성공하면 `201`과 `balanceAfter`를 포함한 행을 돌려주고, 실패는 원인별로 `INVALID_REQUEST` 400, `INSUFFICIENT_TICKETS` 409, `TICKET_ADJUSTMENT_FAILED` 400으로 갈려요. 같은 요청 키를 다시 보내면 `adjustUserTickets`가 같은 원장 행을 반환하므로 잔액도 알림도 한 번만 남아요([admin-operations.integration.ts](repo://tests/admin-operations.integration.ts#L40-L64)). 응답 코드 표와 관리자 화면 표면은 [관리자 콘솔과 커스텀 믹싱](../operations/admin-console.md)이 정리해요.

사용자 조회는 `GET /api/account/tickets`가 페이지 단위 원장을, `GET /api/account/ticket-balance`가 `kind`별 잔액을 돌려줘요([tickets-route.ts](repo://src/_app/api-routes/account/tickets-route.ts#L5-L17), [ticket-balance-route.ts](repo://src/_app/api-routes/account/ticket-balance-route.ts#L5-L9)). 두 응답 모두 지갑 행이 아직 없는 `kind`도 잔액 0으로 채워서 `VOCAL_ANALYSIS`, `AI_MIXING` 두 종류를 항상 같은 순서로 돌려줘요([contract.ts](repo://src/entities/ticket/model/contract.ts#L1-L25)).

## 원장 동작을 증명하는 테스트

원장 변경을 확인하는 테스트는 명령마다 대상 파일이 달라요. 아래 표는 DB 동작을 고정하는 통합 테스트만 모았어요.

| 명령 | 대표 테스트 | 확인하는 것 |
| --- | --- | --- |
| `pnpm run test:tickets` | [tests/ticket-ledger.integration.ts](repo://tests/ticket-ledger.integration.ts#L7-L77) | 가입 지급을 동시에 두 번 불러도 종류별 `SIGNUP_GRANT` 행이 하나씩만 생기는지, 같은 키의 `applyTicketChange` 두 번이 같은 원장 id를 돌려주는지, 다른 키로 한 번 더 차감하면 `InsufficientTicketsError`가 나는지 확인해요 |
| `pnpm run test:readiness` | [tests/signup-recovery.integration.ts](repo://tests/signup-recovery.integration.ts#L7-L99) | 가입 지급 복구의 금액 고정, 동시 실행 수렴, 금액 충돌 거부를 확인해요 |
| `pnpm run test:mixing:db` | [tests/mixing-queue.integration.ts](repo://tests/mixing-queue.integration.ts#L250-L260) | 접수 전 실패가 `refundState = REFUNDED`와 `USAGE_REFUND` 행 하나를 남기고, [접수 후 실패](repo://tests/mixing-queue.integration.ts#L340-L351)는 `refundState = NONE`과 환불 행 0건으로 남는지 확인해요 |
| `pnpm run test:vocal-profile-analysis-queue` | [tests/vocal-profile-analysis-queue.integration.ts](repo://tests/vocal-profile-analysis-queue.integration.ts#L569-L584) | 분석 실패 환불이 잔액을 되돌리고 `USAGE_REFUND` 행을 하나만 남기는지 확인해요 |

`pnpm run test:tickets`는 위 통합 테스트와 함께 `tests/ticket-ledger-ui.test.tsx`와 `tests/account-ui.test.tsx`도 실행해요.

실제 HTTP 경로의 멱등성은 `pnpm run test:e2e`가 확인해요. 같은 접수 본문을 동시에 두 번 보내면 한 번만 차감되고 두 응답이 같은 작업 id를 돌려줘요. 접수 제한에 걸린 요청은 `Retry-After`만큼 기다린 뒤 다시 보내고, 그 재전송도 같은 작업을 돌려줘야 해요([tests/e2e/journeys.spec.mjs](repo://tests/e2e/journeys.spec.mjs#L188-L208)). 잔액이 0인 사용자의 접수는 `402`와 `INSUFFICIENT_TICKETS`로 거절되는지도 같은 여정에서 봐요([tests/e2e/journeys.spec.mjs](repo://tests/e2e/journeys.spec.mjs#L326-L336)). 명령 선택 기준은 [변경 검증 경로](../testing/verification.md)를 보세요.

[tests/signup-recovery.integration.ts](repo://tests/signup-recovery.integration.ts#L7-L99)가 고정하는 복구 계약은 이래요. `SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT`를 `5`에서 `3`으로 바꾸고 `ensureSignupTicketGrants`를 다시 불러도 지갑 잔액은 `5`로 남아요. 대상 `kind`의 `SIGNUP_GRANT` 행이 없는 사용자에게 `amount: 7`로 `apply` 없이 호출하면 `WOULD_GRANT`와 `balanceBefore: 0`, `balanceAfter: 7`이 나오고, 이때 그 사용자의 `SignupGrantIntent` 행 수는 0이에요. 같은 인자로 `apply: true`를 동시에 두 번 호출하면 `GRANTED` 한 건과 `NOOP` 한 건으로 갈리고, 잔액은 `7`, 그 사용자의 원장 행은 `2`건이 돼요. 이미 지급된 뒤에는 `NOOP`이 잔액 `7`을 그대로 돌려주고, 앞서 만든 원장 행을 id로 다시 읽은 값은 복구 전과 같아요. 기록된 금액과 다른 `amount`는 거부돼요([tests/signup-recovery.integration.ts](repo://tests/signup-recovery.integration.ts#L17-L96)).

## 티켓을 건드리는 코드를 쓸 때 확인할 것

새 차감·지급·환불 경로를 추가한다면 아래 네 가지를 순서대로 확인하세요.

1. 잔액을 직접 `update`하지 말고, 열어 둔 트랜잭션을 `applyTicketChangeInTransaction`에 넘기세요. 작업 행 상태 변경과 같은 트랜잭션에 두어야 둘이 따로 커밋되지 않아요.
2. 키를 먼저 정하세요. 사용자 요청에서 시작한 변화는 요청 키를 포함하고, 작업 1건에 대응하는 변화는 `jobId`를 쓰세요. 같은 변화를 다시 실행해도 같은 문자열이 나와야 해요.
3. 지급은 양수, 차감은 음수 금액으로 표현하세요. `type`은 변화의 성격(`USAGE_DEBIT`, `USAGE_REFUND`, `SIGNUP_GRANT`, `ADMIN_ADJUSTMENT`)을 나타내는 값이지 부호를 대신하지 않아요.
4. 실패를 되돌려야 한다면 지금 상태를 바로 환불하는 대신 `refundState = REQUIRED`로 남기고, 별도 트랜잭션에서 환불하세요. 그래야 중간에 죽어도 복구할 수 있어요.

## 다음에 읽을 페이지

- 잔액 확인 흐름과 계정 화면: [architecture/http-api-surface.md](../architecture/http-api-surface.md)
- 작업 실패와 환불 판단: [workflows/ai-mixing.md](../workflows/ai-mixing.md), [workflows/vocal-profile-analysis.md](../workflows/vocal-profile-analysis.md)
- 관리자 조정 화면과 응답 코드: [operations/admin-console.md](../operations/admin-console.md)
- 체험 계정의 분석 수명 주기: [workflows/guest-analysis-trial.md](../workflows/guest-analysis-trial.md)
- 운영자 복구 명령: [operations/recovery-runbook.md](../operations/recovery-runbook.md)
