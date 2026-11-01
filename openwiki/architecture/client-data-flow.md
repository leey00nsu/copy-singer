---
type: reference
title: 브라우저 상태와 API 오류 계약
description: TanStack Query 키에 붙는 체험·회원 구분, 화면별 폴링 정지 조건, `requestJson`·`ApiError`·`shouldRetryQuery`의 재시도 판정, 그리고 체험 정책 쿼리가 화면 분기를 여는 지점을 정리한 참조 문서예요.
tags: [tanstack-query, api-error, retry, polling, query-key, guest-trial, reference]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-30T10:43:12.272Z
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-d2f7c12bb94f4e7eae6c4e75
    resource: repo://src/_app/api-routes/guest-analysis/guest-analysis-route.ts
  - id: openwiki-source-cbf25751da575c9067e72947
    resource: repo://src/_app/api-routes/vocal-profiles/vocal-profile-analysis-jobs-route.ts
  - id: openwiki-source-35cfb94022aa3d154a8651a9
    resource: repo://src/_app/providers/query-provider.tsx
  - id: openwiki-source-948ff3aea2c52888875d7e43
    resource: repo://src/_pages/library/ui/library-page.tsx
  - id: openwiki-source-993f35f320823e8d90750ff9
    resource: repo://src/_pages/mixing-detail/ui/mixing-detail-page.tsx
  - id: openwiki-source-da90541638807b8339f86c1b
    resource: repo://src/_pages/profile/model/voice-scan.ts
  - id: openwiki-source-220529cd7f8e4f5576f56755
    resource: repo://src/_pages/profile/ui/analysis-status.tsx
  - id: openwiki-source-30634a26bd9db985d3b420ca
    resource: repo://src/_pages/profile/ui/profile-page.tsx
  - id: openwiki-source-a9cd3a9385ce7946e9085078
    resource: repo://src/_pages/profile/ui/vocal-profile-workbench.tsx
  - id: openwiki-source-9a66f89464146c97a4cc748e
    resource: repo://src/_pages/profile/ui/voice-scan-input.tsx
  - id: openwiki-source-5991bb60ffd4fbc5452775c0
    resource: repo://src/_pages/recommendation-detail/ui/recommendation-detail-page.tsx
  - id: openwiki-source-767d208d57e2c281d46e36de
    resource: repo://src/_pages/recommendation-detail/ui/recommendation-results.tsx
  - id: openwiki-source-e429d6c7a3403aa41edcc073
    resource: repo://src/_pages/song-detail/ui/song-detail.tsx
  - id: openwiki-source-f7e7ae3b57968136591c7619
    resource: repo://src/entities/mixing-job/api/client.ts
  - id: openwiki-source-1050c6ce9340050c6bb46443
    resource: repo://src/entities/mixing-job/lib/presentation.ts
  - id: openwiki-source-0d2d25b3bfb0d05fc0dafbf8
    resource: repo://src/entities/mixing-job/model/contract.ts
  - id: openwiki-source-20b87d8b8e4a8edca9f5149e
    resource: repo://src/entities/recommendation/api/client.ts
  - id: openwiki-source-e75a9afadbb9cb817edbb9b2
    resource: repo://src/entities/ticket/api/client.ts
  - id: openwiki-source-65250bb561efb32b9245b30d
    resource: repo://src/entities/vocal-profile/model/contract.ts
  - id: openwiki-source-95e874fb773fde91a65086a9
    resource: repo://src/features/admin-custom-mixing/api/client.ts
  - id: openwiki-source-695aba9132f33ac56ef33e9a
    resource: repo://src/features/admin-custom-mixing/ui/admin-custom-mixing-panel.tsx
  - id: openwiki-source-57b40e14e5ce7bb2b15af658
    resource: repo://src/features/analyze-vocal-profile/api/client.ts
  - id: openwiki-source-11e31c0e609ccb25856d6e9a
    resource: repo://src/features/create-mixing/api/client.ts
  - id: openwiki-source-f6a22306dfc798b407000d3c
    resource: repo://src/features/create-mixing/api/use-recommendation-mixing.ts
  - id: openwiki-source-66e19e941300883e3b50c1ce
    resource: repo://src/features/manage-notifications/api/client.ts
  - id: openwiki-source-51cb1810cedb80af5bace9ad
    resource: repo://src/shared/api/api-error.ts
  - id: openwiki-source-c64afb1db5c9bd067b2e5d1c
    resource: repo://src/shared/api/request-json.ts
  - id: openwiki-source-50e3d2df7aaecc9495df7e2c
    resource: repo://src/shared/lib/admission/limiter.ts
  - id: openwiki-source-1f55710b7cb37046d572fe57
    resource: repo://src/widgets/library/ui/vocal-profile-library.tsx
  - id: openwiki-source-1d57e205ef348ecd90411126
    resource: repo://tests/client-server-state-query.test.ts
  - id: openwiki-source-01fe088214113495f61d5235
    resource: repo://tests/msw-query.test.ts
  - id: openwiki-source-ae94bd92f237da73ca69fd11
    resource: repo://tests/msw/handlers.ts
generated: { by: "openwiki/0.7.2", at: "2026-10-30T13:29:10.337Z" }
---

브라우저 쪽 데이터 로딩 규칙은 네 곳에서 정해져요. [src/shared/api/request-json.ts](repo://src/shared/api/request-json.ts#L66-L132)의 `requestJson`이 응답을 Zod 스키마로 검증하고 실패를 `ApiError`로 정규화해요. [src/shared/api/api-error.ts](repo://src/shared/api/api-error.ts#L27-L29)의 `shouldRetryQuery`가 그 오류를 재시도할지 정해요. [src/_app/providers/query-provider.tsx](repo://src/_app/providers/query-provider.tsx#L6-L22)의 `createQueryClient`가 캐시·재시도 기본값을 깔아요. 마지막으로 각 슬라이스의 `queryOptions` 팩터리가 캐시 키와 폴링 주기를 정해요.

이 페이지 하나로 답할 수 있는 질문은 세 가지예요. 목록·상세 화면의 갱신 주기를 바꾸려면 아래 키·폴링 표를 보세요. 새 오류 코드를 재시도 대상에 넣으려면 재시도 판단 절과 오류 코드 절을 보세요. 체험과 회원 화면이 어디서 갈라지는지 보려면 체험 분기 절을 보세요. 오류 봉투의 형태와 요청 제한 수치는 [HTTP API 표면과 요청 접수 규칙](http-api-surface.md)이 소유하니, 여기서는 클라이언트가 그 차이를 어떻게 흡수하는지만 다뤄요.

## 응답 검증과 오류 정규화

`requestJson`은 성공 응답만 화면으로 넘겨요. `fetch` 결과의 본문을 JSON으로 읽고, `response.ok`가 아니면 오류로 던지고, 맞으면 `schema.safeParse`를 통과한 값만 반환해요([request-json.ts](repo://src/shared/api/request-json.ts#L113-L132)). 그래서 화면 코드는 "서버가 계약을 지켰는가"를 다시 검사할 필요가 없어요.

검증 실패는 재시도 불가로 확정돼요. 스키마에 맞지 않는 성공 응답은 `kind: "contract"`, `code: "INVALID_API_RESPONSE"`가 되고 `retryable`은 기본값 `false`예요. 이때 메시지는 고정 문구이고 원본 payload는 `cause`에만 들어가므로 응답 본문이 화면 문구로 새지 않아요([request-json.ts](repo://src/shared/api/request-json.ts#L123-L131), [tests/client-server-state-query.test.ts](repo://tests/client-server-state-query.test.ts#L49-L65), [tests/msw-query.test.ts](repo://tests/msw-query.test.ts#L94-L121)).

| `ApiErrorKind` | 생기는 지점 | `status` | 대표 `code` | `retryable` |
| --- | --- | --- | --- | --- |
| `network` | `fetch` 자체가 실패했어요 | `null` | `NETWORK_ERROR` | `true` |
| `network` | 요청이 `AbortSignal`로 취소됐어요 | `null` | `REQUEST_ABORTED` | `false` |
| `http` | 응답이 `ok`가 아니에요 | 응답 상태 | 서버가 준 코드 또는 `null` | payload의 `retryable`이 boolean이면 그 값, 아니면 `status === 429 \|\| status >= 500` |
| `http` | 실패 응답의 본문이 JSON이 아니에요 | 응답 상태 | `null` | 같은 상태 규칙 |
| `contract` | 성공 응답이 스키마와 달라요 | 응답 상태 | `INVALID_API_RESPONSE` | `false` |
| `contract` | 성공 응답의 본문이 JSON이 아니에요 | 응답 상태 | `INVALID_JSON_RESPONSE` | `false` |
| `contract` | 호출 자체가 잘못됐어요(`body`와 `json` 동시 지정) | `null` | `AMBIGUOUS_REQUEST_BODY` | `false` |
| `contract` | query 함수가 필요한 식별자 없이 실행됐어요 | `null` | `MISSING_VOCAL_PROFILE_ID`, `MISSING_ANALYSIS_JOB_ID`, `MISSING_ADMIN_CONVERSION_ID`, `INVALID_ADMIN_CONVERSION_ID` | `false` |

```mermaid
flowchart TD
  A["fetch 호출"] --> B{"fetch가 예외를 던졌나"}
  B -->|"예"| C["network ApiError. 취소면 재시도 불가"]
  B -->|"아니오"| D{"본문을 JSON으로 읽었나"}
  D -->|"아니오"| E{"응답이 ok인가"}
  E -->|"아니오"| F["http ApiError. 상태 코드로 재시도 판단"]
  E -->|"예"| G["contract INVALID_JSON_RESPONSE. 재시도 불가"]
  D -->|"예"| H{"응답이 ok인가"}
  H -->|"아니오"| I["오류 봉투를 읽어 http ApiError로 정규화"]
  H -->|"예"| J{"Zod safeParse가 통과했나"}
  J -->|"예"| K["검증된 payload 반환"]
  J -->|"아니오"| L["contract INVALID_API_RESPONSE. 재시도 불가"]
```

그림: `requestJson`이 성공 반환과 `network`·`http`·`contract` 실패를 나누는 순서예요.

`ApiErrorKind`는 세 값(`network`, `http`, `contract`)만 가져요. `retryable`을 옵션으로 넘기지 않은 `ApiError`는 항상 재시도 불가라, 계약 위반과 4xx는 재시도 없이 한 번에 실패해요([api-error.ts](repo://src/shared/api/api-error.ts#L11-L25)).

## 두 오류 봉투를 같은 값으로 읽어요

오류 응답의 봉투 형태는 그룹마다 다르지만, 클라이언트 파서가 순서대로 확인해서 하나의 `code`·`message`·`retryable` 조합으로 만들어요([request-json.ts](repo://src/shared/api/request-json.ts#L20-L50)). 봉투 종류 자체와 각 그룹의 사용처는 [HTTP API 표면과 요청 접수 규칙](http-api-surface.md)이 정리해요.

| 확인 순서 | payload 모양 | 쓰는 `code` | 쓰는 `message` |
| --- | --- | --- | --- |
| 1 | 최상위 `detail`이 문자열 | `reasonCode`가 문자열이면 그 값, 아니면 `null` | `detail` |
| 2 | 최상위 `error`가 문자열 | `null` | `error` |
| 3 | `error`가 객체 | `error.code` | `error.message`, 없으면 `error.detail`, 둘 다 없으면 `Request failed ({status})` |
| 4 | 위 어디에도 해당하지 않음 | `null` | `Request failed ({status})` |

`retryable`은 payload에 boolean 값이 있으면 그 값을 우선하고, 없으면 상태 코드로 판단해요. 그래서 분석 접수 계열의 평면형 `reasonCode`·`detail` 응답도, 관리자 custom-mixing의 `detail`만 있는 얇은 응답도 같은 규칙으로 읽혀요([tests/client-server-state-query.test.ts](repo://tests/client-server-state-query.test.ts#L195-L212)). 실패 응답의 본문을 JSON으로 읽지 못하면 상태 코드만 남기고 `http` 종류로 내려요([request-json.ts](repo://src/shared/api/request-json.ts#L98-L111)).

## 재시도 판단: `shouldRetryQuery`

`createQueryClient`의 쿼리 기본 `retry`는 문자열이나 숫자가 아니라 `shouldRetryQuery` 함수예요. 재시도에는 세 조건이 모두 필요해요.

| 조건 | 값 |
| --- | --- |
| 오류 타입 | `error instanceof ApiError`여야 해요. 일반 `Error`나 예외 객체는 재시도하지 않아요 |
| 재시도 가능 표시 | `error.retryable`이 `true`여야 해요 |
| 시도 횟수 | `failureCount < 2`, 즉 최초 시도 뒤 두 번까지 다시 시도해요 |

재시도 간격은 `retryDelay`가 정하고 `Math.min(1_000 * 2 ** attemptIndex, 30_000)`이에요. 그래서 기본 정책에서 재시도는 1초, 2초 뒤에 일어나고 상한은 30초예요([query-provider.tsx](repo://src/_app/providers/query-provider.tsx#L9-L16)). 4xx처럼 `retryable: false`인 응답은 시도 횟수와 무관하게 한 번에 실패하고, 503처럼 재시도 가능한 응답은 최대 3번째 시도에서 성공할 수 있어요([tests/client-server-state-query.test.ts](repo://tests/client-server-state-query.test.ts#L105-L121), [tests/msw-query.test.ts](repo://tests/msw-query.test.ts#L47-L92)).

뮤테이션은 재시도하지 않아요. `mutations.retry`가 `false`라서 `POST`·`PATCH`·`DELETE`는 사용자가 다시 눌러야 실행돼요. 중복 실행을 막는 책임은 재시도 계층이 아니라 요청의 `idempotencyKey`와 서버 접수 로직에 있어요([query-provider.tsx](repo://src/_app/providers/query-provider.tsx#L17-L19), [티켓 원장과 멱등성](../concepts/ticket-ledger.md)).

`Retry-After` 헤더는 브라우저 재시도 간격에 쓰이지 않아요. 서버는 429·503 응답에 그 헤더를 붙이지만([limiter.ts](repo://src/shared/lib/admission/limiter.ts#L70-L79)), `requestJson`은 헤더를 읽지 않고 TanStack Query의 간격도 `retryDelay`가 결정해요. 그래서 서버가 긴 대기를 요구해도 클라이언트는 자기 backoff를 따라요.

## `createQueryClient` 기본 옵션

기본값을 먼저 외우면 각 화면이 무엇을 덮어쓰는지 보여요.

| 옵션 | 값 | 확인할 점 |
| --- | --- | --- |
| `queries.staleTime` | 30,000ms | 신선한 데이터는 다시 받지 않아요. 상세 화면은 `initialData`와 함께 값을 명시해요 |
| `queries.gcTime` | 브라우저 300,000ms, server `Number.POSITIVE_INFINITY` | server client는 렌더마다 새로 만들어져요 |
| `queries.refetchOnWindowFocus` | `false` | 알림 목록과 티켓 지갑만 `true`로 덮어써요 |
| `queries.refetchOnReconnect` | `true` | 연결이 돌아오면 다시 조회해요 |
| `queries.retry` | `shouldRetryQuery` | 위의 세 조건을 그대로 써요 |
| `queries.retryDelay` | `Math.min(1_000 * 2 ** attemptIndex, 30_000)` | 1초, 2초 뒤 재시도 |
| `mutations.retry` | `false` | 뮤테이션은 자동 재시도하지 않아요 |

클라이언트 인스턴스 수명도 계약의 일부예요. `getQueryClient()`는 server 렌더에서 매번 새 client를 만들고, 브라우저에서는 모듈 수준 싱글턴 하나를 재사용해요. 그래서 브라우저 캐시 공유 범위는 탭 하나예요([query-provider.tsx](repo://src/_app/providers/query-provider.tsx#L6-L34)).

## 화면별 query key와 폴링 정지 조건

폴링은 `refetchInterval`이 `false`를 반환할 때 멈춰요. 정지 조건은 "진행 중이 아님"이 아니라 화면마다 정의한 활성 상태 목록이에요. 키와 주기를 바꾸려면 표의 출처 파일을 고치세요.

| 화면·데이터 | query key | 폴링 주기 | 정지 조건 | 출처 |
| --- | --- | --- | --- | --- |
| 추천 상세 | `["recommendation", "profile", profileId, catalogRevision, scoringVersion]`, `audience`를 넘기면 그 뒤에 `guest`·`member`가 붙어요 | 5,000ms | 모든 항목의 `synthesis.status`가 `preparing`·`queued`·`processing`이 아니에요 | [client.ts](repo://src/entities/recommendation/api/client.ts#L7-L21) |
| 믹싱 이력 목록 | `["mixing-job", "history", { page, q, status }]` | 5,000ms | 어떤 작업도 `pending`·`preparing`·`submitted`·`processing`이 아니에요 | [client.ts](repo://src/entities/mixing-job/api/client.ts#L15-L39) |
| 믹싱 작업 상세 | `["mixing-job", "detail", id]` | 5,000ms | 상태가 `pending`·`preparing`·`submitted`·`processing`이 아니에요 | [client.ts](repo://src/entities/mixing-job/api/client.ts#L79-L86) |
| 보컬 분석 작업 상세 | `["vocal-analysis", "jobs", id]` | 1,500ms | 상태가 `pending`도 `processing`도 아니고, 쿼리 오류도 재시도 불가예요 | [client.ts](repo://src/features/analyze-vocal-profile/api/client.ts#L12-L34) |
| 보컬 분석 작업 목록 | `["vocal-analysis", "jobs"]`, `audience`를 넘기면 `["vocal-analysis", "jobs", audience]` | 3,000ms | 목록의 모든 작업이 종료 상태예요 | [client.ts](repo://src/features/analyze-vocal-profile/api/client.ts#L88-L94) |
| 알림 목록 | `["notifications", "list", { page, pageSize, unreadOnly }]` | 30,000ms 고정 | 없어요. 창 포커스 시에도 다시 조회해요 | [client.ts](repo://src/features/manage-notifications/api/client.ts#L39-L48) |
| 관리자 custom-mixing 상세 | `["admin-custom-mixing", "conversions", id]` | 2,500ms | 상태가 `queued`도 `processing`도 아니에요 | [client.ts](repo://src/features/admin-custom-mixing/api/client.ts#L14-L30) |

표에 없는 쿼리는 폴링하지 않아요. 관리자 프로필 목록, 보컬 분석 health, 티켓 지갑 조회가 그렇고, 이들은 필요할 때 `invalidateQueries`나 `refetch`로만 갱신돼요([client.ts](repo://src/features/admin-custom-mixing/api/client.ts#L63-L68), [client.ts](repo://src/features/analyze-vocal-profile/api/client.ts#L81-L86), [client.ts](repo://src/entities/ticket/api/client.ts#L18-L26)).

두 쿼리는 기본 정책을 더 덮어써요. 알림 목록은 `refetchOnWindowFocus: true`로 바꾸고, 티켓 지갑은 `enabled` 플래그와 `staleTime: 0`을 써서 계정 메뉴를 열 때마다 다시 받아요([tests/client-server-state-query.test.ts](repo://tests/client-server-state-query.test.ts#L123-L165)).

### 보컬 분석 상세만 오류 상태에서도 계속 폴링해요

[analysisJobPollingInterval](repo://src/features/analyze-vocal-profile/api/client.ts#L27-L31)은 작업이 활성 상태일 때 1,500ms를 반환하고, 그다음으로 쿼리 오류가 재시도 가능한 `ApiError`인지 확인해요. 그래서 아직 데이터가 없어도 네트워크가 끊긴 상황에서는 1.5초 간격으로 다시 붙어 보고, 404처럼 재시도 불가인 오류에서는 즉시 멈춰요([tests/client-server-state-query.test.ts](repo://tests/client-server-state-query.test.ts#L167-L193)). 다른 화면은 오류가 나면 기본 `retry` 정책에만 맡기고 폴링을 이어가지 않아요.

## 키는 팩터리에서 Zod로 정규화해 만들어요

캐시 키를 손으로 조립하지 마세요. 각 슬라이스의 키 팩터리가 필터를 Zod 스키마로 파싱한 뒤 배열을 만들어요. 그래서 URL 쿼리에서 온 `"2.9"`나 `["2","4"]` 같은 값이 `page: 2`로 정규화되고, 같은 화면 상태는 항상 같은 키를 만들어요([client.ts](repo://src/entities/mixing-job/api/client.ts#L17-L27), [contract.ts](repo://src/entities/mixing-job/model/contract.ts#L26-L39)).

같은 이유로 화면에 보이는 검색어·상태 필터가 키에 들어가요. 검색어나 상태가 다르면 다른 캐시 항목이 되고, 알림도 `unreadOnly`가 다르면 다른 키예요. 계정 메뉴의 벨 아이콘은 `{ page: 1, pageSize: 5, unreadOnly: true }`를, 알림 페이지는 URL 페이지네이션 값을 쓰므로 서로 다른 항목을 유지해요([client.ts](repo://src/features/manage-notifications/api/client.ts#L16-L23), [notification-bell.tsx](repo://src/features/manage-notifications/ui/notification-bell.tsx#L29-L29), [tests/client-server-state-query.test.ts](repo://tests/client-server-state-query.test.ts#L123-L141)).

추천 키에는 순위 계약 버전이 들어가요. `catalogRevision`과 `scoringVersion`이 키의 일부라, 서버가 새 개정이나 새 점수 버전으로 응답하면 다른 캐시 항목이 만들어져요. 서버가 준 초기 데이터가 없으면 두 자리 모두 `"current"`가 들어가요([client.ts](repo://src/entities/recommendation/api/client.ts#L7-L13), [client.ts](repo://src/entities/recommendation/api/client.ts#L36-L42)). 여기에 `audience`까지 붙으므로, 추천 캐시를 직접 패치할 때는 개정·점수 버전·`audience`를 모두 같은 값으로 넘겨야 같은 항목을 건드려요. 순위 계산 자체는 [추천과 키 적합도 계산](../workflows/recommendation-and-key-fit.md)이 설명해요.

`audience`를 붙이는 곳은 추천 결과와 곡 상세 두 화면이에요. 둘 다 `guest ? "guest" : "member"`를 세 번째 인자로 넘겨서, 같은 프로필이라도 체험 화면과 회원 화면이 캐시 항목을 공유하지 않아요([recommendation-results.tsx](repo://src/_pages/recommendation-detail/ui/recommendation-results.tsx#L93-L94), [song-detail.tsx](repo://src/_pages/song-detail/ui/song-detail.tsx#L35-L35)).

보컬 분석 목록도 같은 방식으로 갈라져요. 보컬 프로필 워크벤치는 `guest ? "guest" : "member"`를 넘겨 `["vocal-analysis", "jobs", audience]`를 쓰고, 라이브러리의 프로필 탭은 인자 없이 불러 `["vocal-analysis", "jobs"]`를 써요([vocal-profile-workbench.tsx](repo://src/_pages/profile/ui/vocal-profile-workbench.tsx#L68-L70), [vocal-profile-library.tsx](repo://src/widgets/library/ui/vocal-profile-library.tsx#L55-L58)). 그래서 두 화면은 목록 캐시를 공유하지 않아요.

무효화는 접두 매칭이라 이 갈래를 모두 덮어요. `vocalAnalysisKeys.jobs()`는 목록 키의 접두이면서 상세 키 `["vocal-analysis", "jobs", id]`의 접두이기도 해서, 한 번의 무효화가 목록과 상세를 함께 다시 받아요([client.ts](repo://src/features/analyze-vocal-profile/api/client.ts#L16-L21)).

## 서버가 조회한 초기 데이터가 캐시로 들어와요

page 단위 조회는 server component가 하고, 그 결과가 `initial` prop으로 클라이언트 컴포넌트에 전달돼요. 클라이언트 컴포넌트는 그 값을 `initialData`로 넘겨 같은 키의 캐시를 채워요([library-page.tsx](repo://src/_pages/library/ui/library-page.tsx#L12-L28), [mixing-detail-page.tsx](repo://src/_pages/mixing-detail/ui/mixing-detail-page.tsx#L13-L21), [recommendation-detail-page.tsx](repo://src/_pages/recommendation-detail/ui/recommendation-detail-page.tsx#L19-L42)). 이 생성 입력에서 확인한 `app/`·`src/` 코드에는 `prefetchQuery`, `dehydrate`, `HydrationBoundary` 사용이 없어서, 초기 데이터는 이 prop 경로로 들어와요.

`initialData`를 받은 상세 쿼리는 `staleTime`을 화면에 맞게 명시해요. 믹싱 작업 상세는 `staleTime: 30_000`이라 서버가 방금 조회한 값을 바로 다시 받지 않아요([client.ts](repo://src/entities/mixing-job/api/client.ts#L79-L86)).

추천 상세는 `audience`로 `staleTime`이 갈라져요. 회원은 30,000ms를 쓰고, 체험은 `staleTime: 0`이라 마운트 직후 다시 조회해요([client.ts](repo://src/entities/recommendation/api/client.ts#L31-L55)). 이 분기는 `initialData`를 넘길 때만 적용되고, 초기 데이터 없이 호출하면 두 경우 모두 기본 30,000ms를 써요. 알림 목록은 `initialData`만 넘기고 기본 `staleTime`을 그대로 써요.

키가 일치해야 효과가 있어요. `initialData`를 넘기면서 키를 다른 값으로 만들면 같은 데이터가 항목 두 개로 갈라져요. 초기 데이터를 받는 팩터리가 키를 파생값에서 다시 계산하는 이유예요.

## 체험과 회원 화면은 정책 쿼리 하나에서 갈라져요

보컬 프로필 화면은 서버 세션 유무로 `guest` prop을 정하고([profile-page.tsx](repo://src/_pages/profile/ui/profile-page.tsx#L10-L12)), 워크벤치는 그 값을 정책 쿼리의 `audience`와 화면 분기에 함께 써요. 분기의 원천은 `analysisPolicyQuery.data?.guest` 하나예요. 이 응답은 회원에게 `guest` 필드를 아예 넣지 않고, 체험 사용자에게는 `guest` 상태와 0원 티켓을 돌려줘요([vocal-profile-analysis-jobs-route.ts](repo://src/_app/api-routes/vocal-profiles/vocal-profile-analysis-jobs-route.ts#L75-L94), [contract.ts](repo://src/entities/vocal-profile/model/contract.ts#L157-L166)).

워크벤치가 `VoiceScanInput`에 넘기는 값과 그 결과는 이래요([vocal-profile-workbench.tsx](repo://src/_pages/profile/ui/vocal-profile-workbench.tsx#L321-L329)).

| 전달 값 | 계산 | 화면 결과 |
| --- | --- | --- |
| `guestPolicy` | `analysisPolicyQuery.data?.guest` | `state`가 `available`이 아니면 녹음·파일 업로드를 숨기고 상태 문구, 로그인 링크, `guestPolicy.profileId`가 있으면 "분석 결과 보기" 링크를 보여 줘요 |
| `guestLoading` | `guest && analysisPolicyQuery.isPending` | "무료 체험 상태를 확인하고 있어요" 안내만 보여 줘요 |
| `guestPolicyError` | `guest && analysisPolicyQuery.isError` | 실패 안내와 `onReloadPolicy`(=`refetch`) 버튼을 보여 줘요 |
| `analysisTickets` | 체험이면 `undefined`, 회원이면 응답의 잔액·비용(아직 없으면 `null`) | 체험은 티켓 부족 검사와 비용 안내를 건너뛰고, 회원은 `null`인 동안 분석 버튼이 비활성 상태로 남아요 |

`VoiceScanInput`은 이 값들을 순서대로 확인해요. 로딩·오류 안내가 먼저고, 그다음 `guestPolicy.state !== "available"` 분기, 티켓 부족 분기, 오디오 준비 분기, 오디오 선택 분기, 녹음·업로드 분기 순이에요([voice-scan-input.tsx](repo://src/_pages/profile/ui/voice-scan-input.tsx#L116-L229)). 체험 상태 값(`available`·`used`·`full`·`processing`)의 의미와 전이, 쿼터와 결과 저장 수명 주기는 [비회원 체험 분석 흐름](../workflows/guest-analysis-trial.md)이 소유해요. 여기서는 그 값이 화면 어디에 쓰이는지만 다뤄요.

접수 요청도 같은 플래그로 갈라져요. `submitVocalProfileAnalysis`는 `guest`일 때 `/api/guest-analysis`를 먼저 `POST`해 trial cookie를 확보하고(응답의 `ready`·`member` 값은 쓰지 않아요), 이어서 `/api/vocal-profile-analysis-jobs`에 multipart 본문과 `Idempotency-Key`를 보내요([client.ts](repo://src/features/analyze-vocal-profile/api/client.ts#L61-L79)). 워크벤치는 이 플래그를 정책 응답에서 읽어 뮤테이션 입력으로 넘겨요([vocal-profile-workbench.tsx](repo://src/_pages/profile/ui/vocal-profile-workbench.tsx#L247-L255)).

## 오류 코드가 화면 문구와 재시도 버튼을 바꿔요

`requestJson`이 던진 `ApiError`는 [normalizeProfileError](repo://src/_pages/profile/model/voice-scan.ts#L98-L109)를 지나 화면 오류 계약 `{ reasonCode, detail, retryable }`이 돼요. `code`가 있으면 `reasonCode`로 쓰고 없으면 `ANALYSIS_FAILED`, `detail`은 `ApiError` 메시지를 그대로 옮겨요. `ApiError`가 아닌 예외는 `ANALYSIS_FAILED`에 `retryable: true`로 떨어져요.

`reasonCode`는 `ANALYSIS_ERROR_GUIDANCE` 표에서 제목과 다음 행동을 찾는 데 쓰여요([voice-scan.ts](repo://src/_pages/profile/model/voice-scan.ts#L21-L54)). 표에 없는 코드는 "분석을 완료하지 못했어요"와 "잠시 뒤 다시 시도해 주세요."라는 기본 문구로 표시되고, 실패 화면에는 `reasonCode` 문자열이 함께 보여요([analysis-status.tsx](repo://src/_pages/profile/ui/analysis-status.tsx#L65-L93)).

어떤 코드가 어느 route에서 나오는지는 [HTTP API 표면과 요청 접수 규칙](http-api-surface.md)이 소유해요. 여기서는 클라이언트가 그 코드를 어떻게 해석하는지만 정리해요.

| 값 | 응답 지점(요약) | 클라이언트 처리 |
| --- | --- | --- |
| `INSUFFICIENT_ANALYSIS_TICKETS` | 분석 접수 402 ([route](repo://src/_app/api-routes/vocal-profiles/vocal-profile-analysis-jobs-route.ts#L49-L58)) | `retryable: false`라 재시도 버튼 없이 티켓 안내만 보여 줘요 |
| `ANALYSIS_BUSY` | 분석 접수 429, `Retry-After: 10` ([route](repo://src/_app/api-routes/vocal-profiles/vocal-profile-analysis-jobs-route.ts#L59-L68)) | `retryable: true`로 표시돼요. 안내 표에 항목이 없어 기본 문구를 쓰고, 오디오가 남아 있으면 "분석 다시 시도" 버튼이 열려요 |
| `GUEST_ANALYSIS_DAILY_LIMIT` | `/api/guest-analysis` 429 ([route](repo://src/_app/api-routes/guest-analysis/guest-analysis-route.ts#L28-L29)), 분석 접수 429 | 체험 마감 안내와 로그인 유도를 보여 줘요 |
| `INVALID_API_RESPONSE` | 성공 응답이 스키마와 다름, 또는 완료 작업에 프로필 ID가 없음 ([workbench](repo://src/_pages/profile/ui/vocal-profile-workbench.tsx#L84-L91)) | 재시도 불가로 표시하고 재시도 버튼을 열지 않아요 |

재시도 버튼은 `retryable`만 보고 열지 않아요. 워크벤치는 `audioFile`이 남아 있고 `displayedAnalysisError.retryable`이 `true`일 때만 `canRetry`를 참으로 넘겨요([vocal-profile-workbench.tsx](repo://src/_pages/profile/ui/vocal-profile-workbench.tsx#L272-L287)). 그래서 재시도 가능한 오류라도 오디오를 이미 버렸다면 "새 오디오 선택"만 남아요.

작업 상태 자체가 오류보다 우선하는 경우도 있어요. 완료된 작업에 프로필 ID가 없으면 `INVALID_API_RESPONSE`를 화면이 직접 만들어 표시하고, 실패한 작업은 서버가 준 오류(없으면 `ANALYSIS_FAILED`)를 보여 주며, 요청 오류는 재시도 불가일 때만 종료 오류로 취급해요([vocal-profile-workbench.tsx](repo://src/_pages/profile/ui/vocal-profile-workbench.tsx#L71-L92)). 재시도 가능한 요청 오류는 종료가 아니라 "연결 확인" 단계로 남아 폴링을 이어가요.

## 뮤테이션 뒤에는 필요한 키만 갱신해요

뮤테이션이 성공하면 팩터리가 노출한 접두 키로 범위를 좁혀 무효화해요. 알림 읽음·모두 읽음은 `notificationKeys.lists()`를 무효화해서 페이지 목록과 계정 메뉴 목록을 함께 다시 받고, 믹싱 생성은 추천 프로필 키와 믹싱 이력 키만 무효화해요([client.ts](repo://src/features/manage-notifications/api/client.ts#L50-L82), [use-recommendation-mixing.ts](repo://src/features/create-mixing/api/use-recommendation-mixing.ts#L16-L48)).

생성 계열은 무효화 대신 결과를 캐시에 직접 써요. 보컬 분석은 접수 응답의 작업을 `["vocal-analysis", "jobs", id]` 키에 넣고 목록 접두를 무효화해요([vocal-profile-workbench.tsx](repo://src/_pages/profile/ui/vocal-profile-workbench.tsx#L256-L261)). 그 접두가 상세 키까지 포함하므로 `setQueryData`로 넣은 값도 stale로 표시돼요. 관리자 custom-mixing도 같은 방식으로 생성된 작업을 자기 상세 키에 써요([admin-custom-mixing-panel.tsx](repo://src/features/admin-custom-mixing/ui/admin-custom-mixing-panel.tsx#L124-L134)).

추천 낙관적 패치는 화면 키와 다른 항목을 가리켜요. [patchRecommendationSynthesis](repo://src/features/create-mixing/api/client.ts#L37-L56)는 `recommendationKeys.detail(profileId, catalogRevision, scoringVersion)` 키, 즉 `audience` 접미사가 없는 항목을 갱신해요. 그런데 화면 쿼리는 항상 `guest`나 `member`를 붙여 키를 만들기 때문에 두 키는 서로 다른 캐시 항목이에요. 그래서 `onMutate`의 `preparing` 패치와 `onError`의 `failed` 패치는 화면에 바로 보이지 않아요.

대신 `onSuccess`의 무효화가 화면을 맞춰요. `recommendationKeys.profile(profileId)`는 접두 매칭이라 `audience`가 붙은 항목까지 다시 받고, 그 재조회가 서버 상태로 화면을 갱신해요([use-recommendation-mixing.ts](repo://src/features/create-mixing/api/use-recommendation-mixing.ts#L24-L32)). 추천 화면에서 낙관적 표시를 유지하려면 패치 키에도 같은 `audience`를 넘기도록 두 함수를 함께 고치세요. 체험 화면은 `startItem`이 믹싱 시작을 막아서 이 경로를 타지 않아요([recommendation-results.tsx](repo://src/_pages/recommendation-detail/ui/recommendation-results.tsx#L106-L109)).

캐시 갱신은 소유 범위를 넘지 않아요. 무효화 대상이 아닌 키는 그대로 남고, 뮤테이션 성공이 다른 사용자 키를 건드리지 않는지도 [tests/msw-query.test.ts](repo://tests/msw-query.test.ts#L161-L186)가 확인해요. 뮤테이션 자체는 재시도하지 않으므로, 재시도로 중복 요청을 만들 걱정은 하지 않아도 돼요.

## 재시도·폴링 규칙을 바꿀 때 확인할 테스트

아래 값 중 하나를 바꾸면 해당 테스트가 그대로 깨져요. `pnpm run test:query`가 [tests/client-server-state-query.test.ts](repo://tests/client-server-state-query.test.ts), [tests/api-contracts.test.ts](repo://tests/api-contracts.test.ts), [tests/msw-query.test.ts](repo://tests/msw-query.test.ts)를 포함해 돌아가요([package.json](repo://package.json#L26-L26)).

| 바꾸는 값 | 깨지는 테스트 |
| --- | --- |
| `shouldRetryQuery`의 재시도 횟수 조건 | [tests/client-server-state-query.test.ts](repo://tests/client-server-state-query.test.ts#L105-L121), [tests/msw-query.test.ts](repo://tests/msw-query.test.ts#L71-L92) |
| `createQueryClient`의 `staleTime`·`gcTime`·`refetchOn*`·`mutations.retry` | [tests/client-server-state-query.test.ts](repo://tests/client-server-state-query.test.ts#L105-L121) |
| 추천·믹싱의 폴링 주기나 정지 조건 | [tests/client-server-state-query.test.ts](repo://tests/client-server-state-query.test.ts#L229-L381), [tests/msw-query.test.ts](repo://tests/msw-query.test.ts#L123-L159) |
| 보컬 분석 상세·목록의 주기와 오류 시 계속 폴링 여부 | [tests/client-server-state-query.test.ts](repo://tests/client-server-state-query.test.ts#L167-L193) |
| 알림 목록의 주기·포커스 재조회·무효화 범위 | [tests/client-server-state-query.test.ts](repo://tests/client-server-state-query.test.ts#L123-L155) |
| 티켓 지갑의 `enabled`·`staleTime`·포커스 재조회 | [tests/client-server-state-query.test.ts](repo://tests/client-server-state-query.test.ts#L157-L165) |
| query key 구성과 서버 초기 데이터의 키 일치 | [tests/client-server-state-query.test.ts](repo://tests/client-server-state-query.test.ts#L229-L381) |
| 오류 봉투 파싱과 `code`·`retryable` 매핑 | [tests/client-server-state-query.test.ts](repo://tests/client-server-state-query.test.ts#L40-L103), [tests/client-server-state-query.test.ts](repo://tests/client-server-state-query.test.ts#L195-L212), [tests/msw-query.test.ts](repo://tests/msw-query.test.ts#L37-L121) |
| 응답 스키마 자체 | [tests/api-contracts.test.ts](repo://tests/api-contracts.test.ts#L119-L130), [tests/api-contracts.test.ts](repo://tests/api-contracts.test.ts#L132-L180) |
| 체험 정책 안내 분기(`available`·`used`·`full`) | [tests/guest-analysis-ui.test.tsx](repo://tests/guest-analysis-ui.test.tsx#L83-L98) (`pnpm run test:guest-analysis`) |
| 분석 단계와 재시도 표시(`resolveAnalysisStage`) | [tests/voice-scan-state.test.ts](repo://tests/voice-scan-state.test.ts#L44-L82) (`pnpm run test:voice-scan`) |

표에 없는 규칙도 있어요. `audience` 키 분기와 체험 `staleTime: 0`은 이 생성 입력에서 확인한 테스트가 직접 검사하지 않아요. 이 값을 바꾸면 `recommendationDetailQueryOptions`를 부르는 화면과 `patchRecommendationSynthesis`의 키를 함께 맞춰야 하고, 회귀를 막으려면 검사를 추가하세요.

MSW(Mock Service Worker) handler가 폴링 전환을 재현해요. [tests/msw/handlers.ts](repo://tests/msw/handlers.ts#L107-L115)의 관리자 시퀀스와 [tests/msw/handlers.ts](repo://tests/msw/handlers.ts#L151-L160)의 추천 시퀀스가 활성 상태에서 종료 상태로 넘어가는 두 응답을 순서대로 돌려줘요.

## 더 볼 문서

| 알고 싶은 것 | 문서 |
| --- | --- |
| 오류 봉투 형태, 요청 제한, 업로드 본문 한도 | [HTTP API 표면과 요청 접수 규칙](http-api-surface.md) |
| 체험 상태 값의 의미·전이·쿼터·결과 저장 | [비회원 체험 분석 흐름](../workflows/guest-analysis-trial.md) |
| 추천 응답이 어떤 값으로 계산되는지 | [추천과 키 적합도 계산](../workflows/recommendation-and-key-fit.md) |
| 추천·믹싱 작업이 서버에서 어떻게 처리되는지 | [AI 믹싱 작업 흐름](../workflows/ai-mixing.md), [보컬 프로필 분석 흐름](../workflows/vocal-profile-analysis.md) |
| 화면 상태 패널·피드백 컴포넌트의 경계 | [공유 UI와 Storybook](shared-ui-and-storybook.md) |
| 검사 명령과 테스트 지도 | [검증 절차](../testing/verification.md) |
