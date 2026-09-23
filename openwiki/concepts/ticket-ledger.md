---
type: concept
title: 티켓 원장과 멱등성
description: 티켓 차감·환불·가입 지급·관리자 조정이 TicketWallet과 TicketLedger에 함께 기록되는 방식과, idempotencyKey 규칙이 중복 반영을 막는 원리를 설명해요.
tags: [tickets, ledger, idempotency, invariants, prisma]
verified:
  - by: openwiki/0.5.2
    at: 2026-09-23T03:43:13.909Z
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
  - id: openwiki-source-10c6a88a3297ea68ebdbf439
    resource: repo://tests/mixing-queue.integration.ts
  - id: openwiki-source-30f5c0a878cc81b6aac4a043
    resource: repo://tests/signup-recovery.integration.ts
  - id: openwiki-source-c2d4400c2e28b58229bc069e
    resource: repo://tests/ticket-ledger.integration.ts
  - id: openwiki-source-28adc6ef840aa586dc1aceef
    resource: repo://tests/vocal-profile-analysis-queue.integration.ts
generated: { by: "openwiki/0.5.2", at: "2026-09-23T03:43:13.909Z" }
---

티켓 원장은 "지갑 잔액"과 "변경 내역"을 같은 트랜잭션에서 함께 움직여요. 티켓을 건드리는 코드는 모두 `applyTicketChangeInTransaction`을 통과하고, 그 함수가 잔액 갱신과 `TicketLedger` 행 생성을 한 번에 처리해요.

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

`applyTicketChange`는 트랜잭션을 여는 얇은 래퍼예요. 격리 수준을 `Serializable`로 열고 최대 3회 시도해요. Prisma 오류 코드 `P2034`나 `TransactionWriteConflict`, `deadlock` 메시지가 나오면 다음 시도로 넘어가고, 3회를 다 쓰면 `"Ticket transaction exhausted its retry limit."`로 끝나요.

동시에 같은 키가 들어와 unique 제약이 걸리면(코드 `P2002`) 오류를 그대로 올리지 않아요. `userId`, `kind`, `type`, `amount`가 일치하는 기존 행이 있으면 그 행을 결과로 돌려줘요. 이 처리가 없으면 경쟁에서 진 쪽이 실패로 보여요. 근거는 [applyTicketChange](repo://src/entities/ticket/api/ticket-service.ts#L107-L134)예요.

## idempotencyKey 명명 규칙

키 이름이 곧 "무엇을 한 번만 허용하는가"를 정해요. 새 경로를 추가할 때는 아래 형식을 따르고, 절대 임의의 문자열을 만들지 마세요.

| idempotencyKey | 만드는 곳 | 한 번만 허용하는 변화 |
| --- | --- | --- |
| `signup:vocal-analysis:{userId}` | [signupKey](repo://src/entities/ticket/api/ticket-service.ts#L136-L138) | 사용자 1명의 가입 분석 티켓 지급 |
| `signup:ai-mixing:{userId}` | [signupKey](repo://src/entities/ticket/api/ticket-service.ts#L136-L138) | 사용자 1명의 가입 믹싱 티켓 지급 |
| `vocal-analysis:debit:{userId}:{요청키}` | [analysis-queue.ts](repo://src/features/analyze-vocal-profile/api/analysis-queue.ts#L160-L170) | 요청 키 하나에 대한 분석 티켓 차감 |
| `vocal-analysis-refund:{jobId}` | [worker.ts](repo://src/_app/background-jobs/vocal-profile-analysis/worker.ts#L139-L157) | 분석 작업 1건의 실패 환불 |
| `mixing:debit:{jobId}` | [mixing-queue.ts](repo://src/features/create-mixing/api/mixing-queue.ts#L134-L144) | 믹싱 작업 1건의 티켓 차감 |
| `mixing:refund:{jobId}` | [worker.ts](repo://src/_app/background-jobs/mixing/worker.ts#L156-L172) | 믹싱 작업 1건의 환불 |
| `admin:{actorUserId}:{요청키}` | [adjust-user-tickets.ts](repo://src/features/manage-tickets/api/adjust-user-tickets.ts#L21-L29) | 관리자 한 명이 보낸 요청 키 하나의 조정 |

분석 차감 키는 `userId`와 사용자가 보낸 요청 키를 함께 넣어요. 그래야 다른 사용자나 다른 업로드가 같은 키 문자열을 써도 서로 다른 변화로 남아요. 반면 믹싱과 분석의 환불 키는 `jobId`만 써요. 작업 행 자체가 이미 유일하기 때문이에요.

`mixing:refund:{jobId}`는 워커 자동 환불과 운영자 복구 스크립트가 같은 문자열을 만들어요. 두 경로가 겹쳐 실행돼도 원장 행은 하나만 생겨요([reconcile-external-job.ts](repo://scripts/reconcile-external-job.ts#L55-L72)).

## 가입 지급과 복구 가능성

가입 지급은 금액을 먼저 확정해 두는 2단계 구조예요. `ensureSignupTicketGrants`가 지급 전에 `SignupGrantIntent`에 두 종류의 금액을 모두 기록하고, 실제 지급은 그 intent의 `amount`를 읽어서 실행해요. 그래서 나중에 `SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT` 같은 환경 변수를 바꿔도 이미 기록된 금액이 우선이라, 복구 결과가 설정 변경에 흔들리지 않아요([src/entities/ticket/api/ticket-service.ts](repo://src/entities/ticket/api/ticket-service.ts#L145-L179)).

같은 함수가 두 번 동시에 불려도 안전해요. `SELECT ... FOR UPDATE`로 `User` 행을 잠그고, 해당 `kind`의 `SIGNUP_GRANT` 원장 행이 이미 있으면 지급을 건너뛰어요. 지급 금액의 기본값과 허용 범위는 [operations/configuration.md](../operations/configuration.md)가 다뤄요.

운영자가 지급 누락을 메우는 함수는 `recoverSignupGrant`예요. 이 함수도 같은 방식으로 `User` 행을 잠그고 정상 가입 지급과 같은 `signupKey`를 쓰기 때문에, 복구와 정상 지급이 겹쳐 실행돼도 원장 행은 하나만 생겨요. 대신 지급 전에 입력과 기록된 금액을 아래 기준으로 검사해요([recoverSignupGrant](repo://src/entities/ticket/api/ticket-service.ts#L189-L205)).

| 검사 대상 | 통과 조건과 실패 |
| --- | --- |
| `kind`, `amount` | `kind`가 `VOCAL_ANALYSIS`·`AI_MIXING` 중 하나이고 `amount`가 안전한 정수이면서 `0` 이상 `1,000,000` 이하여야 해요. 아니면 `"An explicit valid ticket kind and amount (0..1000000) are required."`로 실패해요 |
| `userId`, `operator`, `reason` | trim 결과가 비어 있으면 안 돼요. 하나라도 비면 `"user, operator and reason are required."`로 실패해요 |
| 대상 `User` | 행을 `SELECT ... FOR UPDATE`로 잠근 뒤 확인해요. 없으면 `"Signup user does not exist."`로 실패해요 |
| 금액 일치 | 기록된 `SignupGrantIntent.amount`나 기존 `SIGNUP_GRANT` 원장의 `amount`와 요청 `amount`가 다르면 `"Signup amount conflicts with the recorded intent or ledger."`로 실패해요 |

검사를 통과한 요청은 기존 원장 행의 존재 여부와 `apply` 값에 따라 세 가지 결과 중 하나를 돌려줘요. 복구 스크립트는 `--apply`를 받았을 때만 그 값을 `apply: true`로 넘겨요([scripts/recover-signup-grant.ts](repo://scripts/recover-signup-grant.ts#L26-L33)). 그래서 `--apply` 없는 실행은 계획까지만 알려줘요.

| `action` | 반환 조건 | 이때 바뀌는 것 |
| --- | --- | --- |
| `NOOP` | 같은 `kind`의 `SIGNUP_GRANT` 원장 행이 이미 있어요 | 없어요. `apply` 유무와 상관없이 `ledgerId`가 기존 행의 id이고 `balanceBefore`와 `balanceAfter`가 같아요 |
| `WOULD_GRANT` | 원장 행이 없고 `apply`가 없어요 | 없어요. `balanceAfter`는 `balanceBefore + amount`예요 |
| `GRANTED` | 원장 행이 없고 `apply`가 `true`예요 | 기존 intent가 없으면 `operator`·`reason`을 담아 `SignupGrantIntent`를 만들고, `가입 지급 복구 ({operator}): {reason}` 사유로 `SIGNUP_GRANT` 원장 행을 추가해요 |

세 결과 모두 `balanceBefore`를 함께 돌려주므로, 값을 바꾸기 전에 지급 전후 잔액을 그대로 확인할 수 있어요. 명령 인자와 실제 실행 순서는 [복구 스크립트 운영 절차](../operations/recovery-runbook.md)가 소유해요.

## 모델 관계와 열거형

`kind`는 티켓 종류, `type`은 변화의 성격이에요. 두 축이 분리돼 있어서 "관리자가 조정한 분석 티켓" 같은 조합을 원장에서 그대로 조회할 수 있어요.

| 대상 | 값 또는 제약 |
| --- | --- |
| `TicketKind` | `VOCAL_ANALYSIS`, `AI_MIXING` |
| `TicketLedgerType` | `SIGNUP_GRANT`, `USAGE_DEBIT`, `USAGE_REFUND`, `ADMIN_ADJUSTMENT` |
| `TicketWallet` | 기본 키 `@@id([userId, kind])`, `balance` 기본값 0 |
| `TicketLedger` | `idempotencyKey` unique, `balanceAfter` 필수, `amount`은 부호 있는 정수 |
| `TicketLedger` 관계 | 소유자는 `User`(`Cascade`), `actorUserId`는 `SetNull`, 작업 참조 두 개도 `SetNull` |
| `SignupGrantIntent` | 컬럼은 `userId`, `kind`, `amount`, `operator`(nullable), `reason`, `createdAt`이고 기본 키는 `@@id([userId, kind])`예요 |

`balanceAfter`는 그 행이 반영된 직후의 잔액이에요. 그래서 원장만으로 잔액 변화를 재구성할 수 있고, 화면도 각 항목 옆에 당시 잔액을 보여줄 수 있어요. 전체 관계는 [architecture/data-model.md](../architecture/data-model.md)가 소유해요. 스키마 정의는 [prisma/schema.prisma](repo://prisma/schema.prisma#L487-L521)를 확인하세요.

## 환불은 원장 관점에서 무엇을 남기나

환불은 `refundState`가 `REQUIRED`인 작업만 실행해요. 그래서 작업 상태 확정과 환불 기록이 분리돼 있고, 워커가 중간에 죽어도 남은 `REQUIRED` 작업을 다시 처리할 수 있어요.

세 경우를 구분하세요.

- 분석 작업 실패는 `ticketCost > 0`일 때 `refundState = REQUIRED`가 되고, `vocal-analysis-refund:{jobId}` 키로 환불한 뒤 `REFUNDED`로 바뀌어요([worker.ts](repo://src/_app/background-jobs/vocal-profile-analysis/worker.ts#L200-L236)).
- 믹싱은 외부 변환 서비스에 접수하기 전에 실패했을 때만 `USAGE_REFUND`가 생겨요. 접수 후 실패는 `refundState = NONE`으로 남고 환불하지 않아요([worker.ts](repo://src/_app/background-jobs/mixing/worker.ts#L251-L291)).
- 접수 여부가 불확실하면 `MODAL_SUBMISSION_UNCONFIRMED`로 두고 환불을 보류해요. 운영자가 확인할 때까지 잔액을 되돌리지 않아요. 이 판단 규칙은 [workflows/ai-mixing.md](../workflows/ai-mixing.md)가 소유해요.

환불도 예외 없이 `applyTicketChangeInTransaction`을 쓰고, 작업 행 상태 변경과 같은 트랜잭션에서 처리해요.

## 조정과 조회 표면

관리자 조정은 `ADMIN_ADJUSTMENT` 원장 행 하나를 남겨요. 요청 스키마가 `amount`를 0이 아닌 정수로 `±10000` 이내로 제한하고, `reason`은 trim 후 3~500자, `idempotencyKey`는 1~200자로 제한해요([contract.ts](repo://src/features/manage-tickets/model/contract.ts#L4-L14)).

지급 조정일 때만 대상 사용자에게 알림을 보내요. `dedupeKey`가 `ticket-ledger:{ledger.id}`라서 같은 원장 행에 대한 알림은 한 번만 생겨요([adjust-user-tickets.ts](repo://src/features/manage-tickets/api/adjust-user-tickets.ts#L30-L41)).

HTTP 계약은 [ticket-adjustments-route.ts](repo://src/_app/api-routes/admin/ticket-adjustments-route.ts#L7-L48)에 있어요. 성공하면 `201`과 `balanceAfter`를 포함한 행을 돌려주고, 실패는 원인별로 상태 코드가 갈려요.

| 상황 | 응답 |
| --- | --- |
| 조정 성공 | `201` + `id`, `kind`, `amount`, `balanceAfter`, `reason`, `createdAt` |
| 본문 검증 실패 | `400` + `INVALID_REQUEST` |
| 잔액 부족 | `409` + `INSUFFICIENT_TICKETS` |
| 그 밖의 실패 | `400` + `TICKET_ADJUSTMENT_FAILED` |

사용자 조회는 `GET /api/account/tickets`가 페이지 단위 원장을, `GET /api/account/ticket-balance`가 `kind`별 잔액을 돌려줘요. 응답 스키마는 [contract.ts](repo://src/entities/ticket/model/contract.ts#L1-L25)에 있고, 지갑 행이 아직 없는 `kind`도 잔액 0으로 채워서 두 종류를 항상 같은 순서로 돌려줘요.

## 원장 동작을 증명하는 테스트

원장 계약을 고정하는 통합 테스트는 파일마다 실행 명령이 달라요.

| 파일 | 실행하는 명령 | 고정하는 항목 |
| --- | --- | --- |
| [tests/ticket-ledger.integration.ts](repo://tests/ticket-ledger.integration.ts#L7-L77) | `pnpm run test:tickets` | 가입 지급 동시 호출의 종류별 `SIGNUP_GRANT` 행 1건, 같은 키의 `applyTicketChange` 두 번이 같은 원장 id 반환, 다른 키로 한 번 더 차감할 때의 `InsufficientTicketsError` |
| [tests/signup-recovery.integration.ts](repo://tests/signup-recovery.integration.ts#L7-L103) | `pnpm run test:readiness` | 가입 복구의 설정 변경 내성, 금액 충돌 거부, 동시 복구의 `GRANTED`·`NOOP` 결과, 조회 세션의 원장 불변 |
| [tests/mixing-queue.integration.ts](repo://tests/mixing-queue.integration.ts#L335-L355), [tests/vocal-profile-analysis-queue.integration.ts](repo://tests/vocal-profile-analysis-queue.integration.ts#L571-L584) | `pnpm run test:mixing:db`, `pnpm run test:vocal-profile-analysis-queue` | 실패 경로의 `USAGE_REFUND` 행 개수 |

`tests/signup-recovery.integration.ts`가 실제로 확인하는 항목은 네 가지예요.

- `SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT`를 `5`에서 `3`으로 바꾼 뒤 `ensureSignupTicketGrants`를 다시 불러도 분석 잔액은 `5`로 남고 원장 행은 2건이에요. 지급액이 설정 변경에 흔들리지 않는다는 뜻이에요([tests/signup-recovery.integration.ts](repo://tests/signup-recovery.integration.ts#L17-L30)).
- 기록된 지급액 `7`과 다른 `amount: 3` 복구 요청은 `/conflicts/`로 거부돼요. 기록된 금액이 `5`인 다른 사용자에게 `3`을 지급하려는 요청도 같은 충돌 오류로 거부돼요([tests/signup-recovery.integration.ts](repo://tests/signup-recovery.integration.ts#L95-L96)).
- 같은 복구 요청을 `apply: true`로 동시에 두 번 실행하면 `GRANTED` 1건과 `NOOP` 1건이 나오고, 잔액은 `7`이에요. `GRANTED`의 전후 잔액은 `0`·`7`, `NOOP`은 `7`·`7`이에요([tests/signup-recovery.integration.ts](repo://tests/signup-recovery.integration.ts#L54-L83)).
- 조회 세션을 여는 `getRequestSession`을 호출한 뒤에도 그 사용자의 `TicketLedger` 행은 호출 전과 완전히 같아요. 읽기 경로가 원장을 바꾸지 않는다는 뜻이에요([tests/signup-recovery.integration.ts](repo://tests/signup-recovery.integration.ts#L97-L103)).

## 다음에 읽을 페이지

- 잔액 확인 흐름과 계정 화면: [architecture/http-api-surface.md](../architecture/http-api-surface.md)
- 작업 실패와 환불 판단: [workflows/ai-mixing.md](../workflows/ai-mixing.md), [workflows/vocal-profile-analysis.md](../workflows/vocal-profile-analysis.md)
- 운영자 복구 명령: [operations/recovery-runbook.md](../operations/recovery-runbook.md)
