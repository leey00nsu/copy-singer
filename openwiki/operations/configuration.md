---
type: reference
title: 환경 변수와 런타임 한도
description: 서버·워커·미디어·Modal·인증 동작을 바꾸는 환경 변수의 이름, 기본값, 허용 범위와 적용 지점을 정리한 참조 문서예요.
tags: [configuration, environment-variables, runtime-limits, operations]
verified:
  - by: openwiki/0.5.2
    at: 2026-09-18T16:47:52.081Z
sources:
  - id: openwiki-source-ea70eb6c045047448e446296
    resource: repo://.gitignore
  - id: openwiki-source-50a18d054b596a7ed0eeffb0
    resource: repo://next.config.ts
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-ec5bee4673a3944c181edd71
    resource: repo://prisma.config.ts
  - id: openwiki-source-2798a6200ef792b731721034
    resource: repo://prisma/schema.prisma
  - id: openwiki-source-904d8953f6839fec7c58c800
    resource: repo://scripts/mixing-worker.ts
  - id: openwiki-source-f1adf7db889a7f8493008153
    resource: repo://scripts/verify-database.ts
  - id: openwiki-source-3e61fbe0b48f056b7e7ac181
    resource: repo://scripts/verify-feature-config.ts
  - id: openwiki-source-b721cf0434c59714ccd05e3d
    resource: repo://src/_app/background-jobs/mixing/reconciliation.ts
  - id: openwiki-source-e746e2d352e86c69ac1ad6c4
    resource: repo://src/_app/background-jobs/mixing/runner.ts
  - id: openwiki-source-eaa76879de1a19c0db5c6ebb
    resource: repo://src/_app/background-jobs/mixing/worker.ts
  - id: openwiki-source-c4cc90d48cd4c0306be7e0c0
    resource: repo://src/_app/background-jobs/song-analysis/worker.ts
  - id: openwiki-source-12b687e5e9afbf72c79b13fd
    resource: repo://src/entities/ticket/api/ticket-service.ts
  - id: openwiki-source-9894762239bb4877ee0b6946
    resource: repo://src/entities/vocal-profile/api/analyzer/modal-adapter.ts
  - id: openwiki-source-33698fca33e5d94297cf4721
    resource: repo://src/features/authentication/api/auth.ts
  - id: openwiki-source-c8233de0c3af4a698eef4b76
    resource: repo://src/features/authentication/api/dev-bypass.ts
  - id: openwiki-source-b3d8f883c3182de82486484d
    resource: repo://src/features/authentication/api/session.ts
  - id: openwiki-source-2f34dfdeab3e5131467ed859
    resource: repo://src/features/authentication/model/auth-secret-policy.ts
  - id: openwiki-source-d58e4d12c4f89a68528086de
    resource: repo://src/features/authentication/model/dev-bypass-policy.ts
  - id: openwiki-source-3fbbc4d1ce032d81c6252e16
    resource: repo://src/features/manage-song-catalog/api/analyzer.ts
  - id: openwiki-source-74b9baaa604c7abdd41aa8d6
    resource: repo://src/shared/config/catalog.ts
  - id: openwiki-source-200291f8a1aaa391d1b68ec4
    resource: repo://src/shared/config/server-env.ts
  - id: openwiki-source-3981dcb693066181610bdab2
    resource: repo://src/shared/config/site-metadata.ts
  - id: openwiki-source-40f066ec25259d78385397d2
    resource: repo://src/shared/db/prisma.ts
  - id: openwiki-source-50e3d2df7aaecc9495df7e2c
    resource: repo://src/shared/lib/admission/limiter.ts
  - id: openwiki-source-a7cc3d96a7c8be410030b460
    resource: repo://src/shared/lib/admission/queue.ts
  - id: openwiki-source-040370852205e0b755f2e46d
    resource: repo://src/shared/lib/audio/compress-mixing-result.ts
  - id: openwiki-source-485e0932fb0b5484a734ca02
    resource: repo://src/shared/lib/runtime/limits.ts
  - id: openwiki-source-e1e6dda5f5d6b99d3fdb4420
    resource: repo://src/shared/media/client.ts
generated: { by: "openwiki/0.5.2", at: "2026-09-18T16:47:52.081Z" }
---

# 환경 변수와 런타임 한도

동작을 바꾸려면 `process.env`에서 읽는 값을 바꾸세요. 숫자 설정은 범위를 벗어나면 조용히 무시되지 않고 즉시 예외가 되고, 외부 서비스 자격 증명은 없으면 호출을 시도하지 않고 설정 오류를 돌려줘요. 이 페이지는 값 하나를 바꿀 때 무엇이 달라지는지 확인하는 조회용 문서예요. 서버를 띄울 때 필요한 설정 파일과 실행 순서는 [로컬 실행과 배포](local-runtime.md)가 맡아요.

## 설정을 읽는 파일과 시점

숫자 설정은 두 곳에서 읽어요. 서버·워커 동작과 티켓 값은 [src/shared/config/server-env.ts](repo://src/shared/config/server-env.ts#L3-L74)가, DB·HTTP·FFmpeg 자원 예산은 [src/shared/lib/runtime/limits.ts](repo://src/shared/lib/runtime/limits.ts#L10-L19)가 정의해요. 두 모듈 모두 값을 호출 시점에 읽으므로, 함수가 실행될 때의 `process.env`가 기준이 돼요.

워커 스크립트·검증 스크립트·테스트와 Prisma CLI는 dotenv로 `.env.local`과 `.env`를 이 순서로 로드해요([prisma.config.ts](repo://prisma.config.ts#L1-L14), [scripts/mixing-worker.ts](repo://scripts/mixing-worker.ts#L1-L5)). 로드된 값이 없으면 위 두 모듈의 기본값이 쓰여요.

## 숫자 설정이 거부되는 방식

`integerEnv`는 안전한 정수(`Number.isSafeInteger`)가 아니거나 `min`~`max` 밖이면 예외를 던져요([server-env.ts](repo://src/shared/config/server-env.ts#L3-L12)). `positiveInteger`도 같은 방식으로 1 이상 `maximum` 이하가 아니면 예외를 던져요([limits.ts](repo://src/shared/lib/runtime/limits.ts#L1-L8)). 즉 잘못된 값은 기본값으로 대체되지 않고 프로세스를 실패시켜요.

두 헬퍼는 빈 값 처리만 달라요. `integerEnv`는 값을 먼저 `trim()`하므로 공백만 든 값은 "설정하지 않은 것"으로 보고 기본값을 써요([server-env.ts](repo://src/shared/config/server-env.ts#L4-L5)). `positiveInteger`는 `trim()`하지 않아서 공백만 든 문자열이 숫자 `0`으로 변환되고 예외가 돼요([limits.ts](repo://src/shared/lib/runtime/limits.ts#L2-L5)). [tests/runtime-timeouts.test.ts](repo://tests/runtime-timeouts.test.ts#L36-L42)가 이 거부 동작을 확인해요. 이 검사를 포함해 값 변경 뒤에 돌릴 명령을 고르는 일은 [변경 검증 경로](../testing/verification.md)가 맡아요.

## 티켓 비용과 가입 지급

티켓 값은 모두 정수이고 `0`~`1,000` 범위예요. 값을 `0`으로 두면 해당 동작이 티켓을 쓰지 않아요.

| 변수 | 기본값 | 허용 범위 | 적용 지점 |
| --- | --- | --- | --- |
| `SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT` | 5 | 0–1,000 | [server-env.ts](repo://src/shared/config/server-env.ts#L14-L16) |
| `SIGNUP_MIXING_TICKET_GRANT` | 1 | 0–1,000 | [server-env.ts](repo://src/shared/config/server-env.ts#L18-L20) |
| `MIXING_TICKET_COST` | 1 | 0–1,000 | [server-env.ts](repo://src/shared/config/server-env.ts#L22-L24) |
| `VOCAL_PROFILE_ANALYSIS_TICKET_COST` | 1 | 0–1,000 | [server-env.ts](repo://src/shared/config/server-env.ts#L26-L28) |

가입 지급액은 최초 지급 시점에 `SignupGrantIntent` 행으로 고정돼요. 그래서 나중에 이 변수를 바꿔도 이미 가입한 사용자의 복구 금액은 달라지지 않아요([ticket-service.ts](repo://src/entities/ticket/api/ticket-service.ts#L145-L179)). 비용 값은 작업 행의 `ticketCost`와 청구 금액을 만드는 데 함께 쓰여요([mixing-queue.ts](repo://src/features/create-mixing/api/mixing-queue.ts#L38-L38), [analysis-queue.ts](repo://src/features/analyze-vocal-profile/api/analysis-queue.ts#L131-L159)).

## 워커 동시성·시도·lease·poll

워커 값은 작업 종류별로 따로 있어요. 동시성은 프로세스 안에서 동시에 도는 처리 레인 수예요([mixing/runner.ts](repo://src/_app/background-jobs/mixing/runner.ts#L42-L43), [song-analysis/runner.ts](repo://src/_app/background-jobs/song-analysis/runner.ts#L38-L39)).

| 변수 | 기본값 | 허용 범위 | 적용 지점 |
| --- | --- | --- | --- |
| `MIXING_WORKER_CONCURRENCY` | 1 | 1–32 | [server-env.ts](repo://src/shared/config/server-env.ts#L30-L32) |
| `MIXING_MAX_ATTEMPTS` | 3 | 1–20 | [server-env.ts](repo://src/shared/config/server-env.ts#L34-L36) |
| `MIXING_LEASE_SECONDS` | 120 | 30–3,600 | [server-env.ts](repo://src/shared/config/server-env.ts#L38-L40) |
| `MIXING_POLL_INTERVAL_MS` | 5,000 | 100–60,000 | [server-env.ts](repo://src/shared/config/server-env.ts#L42-L44) |
| `VOCAL_PROFILE_ANALYSIS_WORKER_CONCURRENCY` | 1 | 1–16 | [server-env.ts](repo://src/shared/config/server-env.ts#L46-L48) |
| `VOCAL_PROFILE_ANALYSIS_MAX_ATTEMPTS` | 3 | 1–10 | [server-env.ts](repo://src/shared/config/server-env.ts#L50-L52) |
| `VOCAL_PROFILE_ANALYSIS_LEASE_SECONDS` | 300 | 180–3,600 | [server-env.ts](repo://src/shared/config/server-env.ts#L54-L56) |
| `SONG_ANALYSIS_WORKER_CONCURRENCY` | 1 | 1–8 | [server-env.ts](repo://src/shared/config/server-env.ts#L58-L60) |
| `SONG_ANALYSIS_LEASE_SECONDS` | 300 | 180–3,600 | [server-env.ts](repo://src/shared/config/server-env.ts#L62-L64) |
| `SONG_ANALYSIS_POLL_INTERVAL_MS` | 2,500 | 250–30,000 | [server-env.ts](repo://src/shared/config/server-env.ts#L66-L68) |

곡 분석에는 최대 시도 변수가 없어요. `SongAnalysisJob.maxAttempts`는 Prisma 스키마 기본값 `3`을 그대로 써요([schema.prisma](repo://prisma/schema.prisma#L285-L294)). 믹싱과 보컬 분석은 작업을 만들 때 위 변수 값을 행에 복사해요([mixing-queue.ts](repo://src/features/create-mixing/api/mixing-queue.ts#L117-L133), [analysis-queue.ts](repo://src/features/analyze-vocal-profile/api/analysis-queue.ts#L149-L159)).

lease 초는 작업을 점유할 때의 `leaseExpiresAt`과 처리 중 lease 갱신에 함께 쓰여요([mixing/worker.ts](repo://src/_app/background-jobs/mixing/worker.ts#L97-L99), [vocal-profile-analysis/worker.ts](repo://src/_app/background-jobs/vocal-profile-analysis/worker.ts#L247-L253)). poll 간격은 Modal에 상태를 다시 물어보기 전 대기 시간이에요([song-analysis/worker.ts](repo://src/_app/background-jobs/song-analysis/worker.ts#L208-L216), [mixing/worker.ts](repo://src/_app/background-jobs/mixing/worker.ts#L293-L299)). lease 갱신 주기와 재시도 백오프 같은 알고리즘 자체는 [Job 큐와 lease 복구 계약](job-processing.md)이 설명해요.

## 큐 용량과 업로드 동시성

큐 한도는 변수 이름이 작업 종류로 조합돼요. `VOCAL`, `MIXING`, `SONG` 각각에 `*_QUEUE_CAPACITY`(전역)와 `*_USER_QUEUE_CAPACITY`(사용자별)가 있어요.

| 변수 | 기본값 | 허용 범위 | 판정 위치 |
| --- | --- | --- | --- |
| `VOCAL_QUEUE_CAPACITY`, `MIXING_QUEUE_CAPACITY` | 20 | 1–10,000 | [queue.ts](repo://src/shared/lib/admission/queue.ts#L11-L22) |
| `SONG_QUEUE_CAPACITY` | 50 | 1–10,000 | [queue.ts](repo://src/shared/lib/admission/queue.ts#L11-L22) |
| `VOCAL_USER_QUEUE_CAPACITY` | 1 | 1–100 | [queue.ts](repo://src/shared/lib/admission/queue.ts#L13-L21) |
| `MIXING_USER_QUEUE_CAPACITY`, `SONG_USER_QUEUE_CAPACITY` | 3 | 1–100 | [queue.ts](repo://src/shared/lib/admission/queue.ts#L13-L21) |
| `UPLOAD_CONCURRENCY` | 2 | 1–20 | [limiter.ts](repo://src/shared/lib/admission/limiter.ts#L36-L47) |

큐 한도 판정은 접수 트랜잭션 안에서 advisory lock을 잡은 뒤 실행돼요([queue.ts](repo://src/shared/lib/admission/queue.ts#L7-L23)). 상태 집합과 오류 코드는 작업 접수 흐름의 규칙이므로 [HTTP API 표면](../architecture/http-api-surface.md)을 보세요.

`SONG_USER_QUEUE_CAPACITY`는 읽히지만 상한에 도달할 수 없어요. 곡 분석은 소유자 수를 항상 `0`으로 세고, `positiveInteger`의 최소값이 `1`이라 `0 >= 한도`가 성립하지 않기 때문이에요([queue.ts](repo://src/shared/lib/admission/queue.ts#L16-L21)).

`UPLOAD_CONCURRENCY`는 동시에 처리하는 업로드 슬롯 수예요. 같은 사용자의 두 번째 업로드는 슬롯 수와 무관하게 `UPLOAD_ALREADY_ACTIVE`로 막혀요([limiter.ts](repo://src/shared/lib/admission/limiter.ts#L36-L47)).

## DB·HTTP·FFmpeg 타임아웃

자원 예산은 모두 `1`~`3,600,000` 범위의 정수이고, `DB_POOL_MAX`만 상한이 `100`이에요([limits.ts](repo://src/shared/lib/runtime/limits.ts#L10-L19)).

| 변수 | 기본값 | 허용 범위 | 적용 지점 |
| --- | --- | --- | --- |
| `DB_POOL_MAX` | 5 | 1–100 | PrismaPg `max`([prisma.ts](repo://src/shared/db/prisma.ts#L18-L27)) |
| `DB_CONNECT_TIMEOUT_MS` | 5,000 | 1–3,600,000 | PrismaPg `connectionTimeoutMillis`([prisma.ts](repo://src/shared/db/prisma.ts#L18-L27)) |
| `DB_QUERY_TIMEOUT_MS` | 30,000 | 1–3,600,000 | `statement_timeout`, `query_timeout`, `idle_in_transaction_session_timeout`([prisma.ts](repo://src/shared/db/prisma.ts#L18-L27)) |
| `HTTP_METADATA_TIMEOUT_MS` | 15,000 | 1–3,600,000 | Leemage 메타데이터 호출([client.ts](repo://src/shared/media/client.ts#L72-L87)), JSON 본문 읽기([multipart.server.ts](repo://src/shared/api/multipart.server.ts#L76-L79)) |
| `HTTP_FILE_TIMEOUT_MS` | 120,000 | 1–3,600,000 | Leemage presigned `PUT`([client.ts](repo://src/shared/media/client.ts#L151-L156)) |
| `MEDIA_UPLOAD_TIMEOUT_MS` | 180,000 | 1–3,600,000 | multipart 본문 읽기([multipart.server.ts](repo://src/shared/api/multipart.server.ts#L17-L25)), Leemage 업로드 전체([client.ts](repo://src/shared/media/client.ts#L108-L116)) |
| `FFMPEG_TIMEOUT_MS` | 120,000 | 1–3,600,000 | FFmpeg 프로세스 종료([compress-mixing-result.ts](repo://src/shared/lib/audio/compress-mixing-result.ts#L22-L31)) |

`MEDIA_UPLOAD_TIMEOUT_MS`를 아주 작게 잡으면 슬롯을 잡은 요청의 본문 읽기가 먼저 취소돼요. [tests/admission.integration.ts](repo://tests/admission.integration.ts#L41-L80)가 이 값을 `20`으로 두고, 취소 뒤 같은 사용자가 업로드 슬롯을 다시 얻는지 확인해요.

## 외부 서비스 자격 증명과 fallback

세 종류의 Modal 서비스와 Leemage는 각각 별도 변수를 써요. 값 자체는 이 문서에 적지 않아요.

| 대상 | URL 변수 | 키 변수와 fallback | 미설정 시 동작 |
| --- | --- | --- | --- |
| 믹싱 워커, 관리자 커스텀 믹싱, 외부 작업 정리 | `MODAL_API_URL` | `MODAL_API_KEY` | `MODAL_NOT_CONFIGURED`, 관리자 경로는 503([worker.ts](repo://src/_app/background-jobs/mixing/worker.ts#L79-L86), [modal.ts](repo://src/features/admin-custom-mixing/api/modal.ts#L9-L13)) |
| 보컬 프로필 분석 | `VOCAL_PROFILE_MODAL_URL` | `VOCAL_PROFILE_MODAL_API_KEY` → 없으면 `MODAL_API_KEY` | `ANALYZER_NOT_CONFIGURED` 503([modal-adapter.ts](repo://src/entities/vocal-profile/api/analyzer/modal-adapter.ts#L34-L46)) |
| 곡 카탈로그 분석 | `SONG_ANALYSIS_MODAL_URL` | `SONG_ANALYSIS_MODAL_API_KEY` → 없으면 `MODAL_API_KEY` | `ANALYZER_NOT_CONFIGURED`([server-env.ts](repo://src/shared/config/server-env.ts#L70-L74), [song-analysis/worker.ts](repo://src/_app/background-jobs/song-analysis/worker.ts#L147-L151)) |
| Leemage 미디어 저장 | `LEEMAGE_BASE_URL`(기본값 `https://leemage.leey00nsu.com/api/v1`) | `LEEMAGE_API_KEY`, `LEEMAGE_PROJECT_ID` | `LeemageError`를 던지고 업로드를 시작하지 않아요([client.ts](repo://src/shared/media/client.ts#L34-L46)) |

Modal URL 변수와 `LEEMAGE_BASE_URL`은 모두 값 끝의 `/`를 잘라내요. 그래서 `https://example.com/api/`와 `https://example.com/api`가 같은 주소가 돼요([worker.ts](repo://src/_app/background-jobs/mixing/worker.ts#L79-L86), [server-env.ts](repo://src/shared/config/server-env.ts#L70-L74), [modal-adapter.ts](repo://src/entities/vocal-profile/api/analyzer/modal-adapter.ts#L34-L46), [client.ts](repo://src/shared/media/client.ts#L40-L46)).

필수 변수를 한 번에 확인하려면 `pnpm run verify:feature-config`를 실행하세요. 이 명령이 검사하는 이름은 아래 일곱 개예요([scripts/verify-feature-config.ts](repo://scripts/verify-feature-config.ts#L5-L21)).

| 검사하는 변수 | 비어 있을 때 달라지는 동작 |
| --- | --- |
| `BETTER_AUTH_SECRET` | 인증 secret 해석 |
| `BETTER_AUTH_URL` | Better Auth `baseURL` |
| `GOOGLE_CLIENT_ID` | Google 로그인 구성 |
| `GOOGLE_CLIENT_SECRET` | Google 로그인 구성 |
| `ADMIN_EMAILS` | 관리자 판정 |
| `LEEMAGE_API_KEY` | Leemage 미디어 저장 |
| `LEEMAGE_PROJECT_ID` | Leemage 미디어 저장 |

이 명령은 값을 출력하지 않고, 비어 있는 이름만 `Missing feature environment variables: ...`로 나열한 뒤 종료 코드 1을 남겨요([scripts/verify-feature-config.ts](repo://scripts/verify-feature-config.ts#L14-L21)).

`--leemage`를 붙이면 검사에서 끝나지 않고 Leemage 저장소 왕복 스모크 테스트까지 실행해요. 무작위 이름의 텍스트 파일을 올렸다가 같은 파일을 지우므로 끝나면 남는 파일이 없어요. `LEEMAGE_` 변수가 비어 있으면 `Configure Leemage variables before running the storage smoke test.`로 멈춰요([scripts/verify-feature-config.ts](repo://scripts/verify-feature-config.ts#L23-L39)). `package.json`의 `verify:feature-config` script는 이 인자를 넘기지 않으므로, 스모크 테스트 명령은 [로컬 실행과 배포](local-runtime.md)에서 확인하세요([package.json](repo://package.json#L22)).

이 명령과 달리 `pnpm run db:verify`는 dotenv를 부르지 않고 셸의 `DATABASE_URL`을 그대로 읽어요. 값이 없으면 `DATABASE_URL is required to verify the database.`로 멈춰요([scripts/verify-database.ts](repo://scripts/verify-database.ts#L4-L7)).

## 인증·세션 설정

| 변수 | 기본값 | 동작 | 적용 지점 |
| --- | --- | --- | --- |
| `BETTER_AUTH_URL` | `http://localhost:3000` | Better Auth `baseURL` | [auth.ts](repo://src/features/authentication/api/auth.ts#L9-L21) |
| `BETTER_AUTH_SECRET` | development·test에서만 개발용 상수 | 그 밖의 환경에서 없으면 예외 | [auth-secret-policy.ts](repo://src/features/authentication/model/auth-secret-policy.ts#L6-L13) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | 빈 문자열 | 값이 없으면 Google 로그인이 구성되지 않은 상태 | [auth.ts](repo://src/features/authentication/api/auth.ts#L25-L31) |
| `ADMIN_EMAILS` | 없음(빈 집합) | 쉼표로 나눈 목록을 소문자로 비교해 관리자 판정 | [admin-policy.ts](repo://src/features/authentication/model/admin-policy.ts#L3-L14) |

`BETTER_AUTH_SECRET` 해석은 fail-closed예요. 값이 있으면 `trim()`한 값을 쓰고, 없으면 `NODE_ENV`가 `development`나 `test`일 때만 개발용 상수를 반환하며, 그 밖에서는 오류를 던져요([auth-secret-policy.ts](repo://src/features/authentication/model/auth-secret-policy.ts#L6-L13)).

`googleAuthConfigured()`는 `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 네 값이 모두 있어야 `true`예요([auth.ts](repo://src/features/authentication/api/auth.ts#L43-L49)). 인증 흐름과 관리자 판정의 의미는 [인증과 소유권](../integrations/auth-and-ownership.md)이 설명해요.

## 개발 인증 bypass

로컬에서 Google 로그인 없이 특정 사용자로 요청하려면 세 값이 모두 맞아야 해요. `NODE_ENV`가 `development` 또는 `test`이고, `DEV_AUTH_BYPASS_ENABLED`가 `true`(대소문자 무시, 앞뒤 공백 제거)이고, `DEV_AUTH_BYPASS_USER_ID`가 비어 있지 않아야 해요([dev-bypass-policy.ts](repo://src/features/authentication/model/dev-bypass-policy.ts#L7-L12)).

조건이 하나라도 어긋나면 `getDevelopmentAuthBypassSession()`은 `null`을 반환하고, 호출자는 평소처럼 Better Auth 세션을 써요([session.ts](repo://src/features/authentication/api/session.ts#L20-L25)). 반대로 조건이 맞는데 `DEV_AUTH_BYPASS_USER_ID`가 가리키는 사용자가 DB에 없으면, 일반 세션으로 넘어가지 않고 `DEV_AUTH_BYPASS_USER_ID must identify an existing local database user.` 오류를 던져요([dev-bypass.ts](repo://src/features/authentication/api/dev-bypass.ts#L9-L31)).

## 그 밖의 플래그와 실행 파일 경로

| 변수 | 기본값 | 동작 | 적용 지점 |
| --- | --- | --- | --- |
| `DATABASE_URL` | 없음(필수) | 없으면 Prisma 클라이언트 생성이 실패해요 | [prisma.ts](repo://src/shared/db/prisma.ts#L11-L17), [prisma.config.ts](repo://prisma.config.ts#L12-L14) |
| `TRUST_PROXY_CLIENT_IP` | `false` 취급 | 정확히 `"true"`일 때만 인그레스의 클라이언트 IP를 신뢰해요 | [limiter.ts](repo://src/shared/lib/admission/limiter.ts#L49-L55) |
| `TRUSTED_CLIENT_IP_HEADER` | 없음 | IP 신뢰를 켠 상태에서 이름이 비어 있으면 예외, 값이 IP 형식이 아니면 `null` | [limiter.ts](repo://src/shared/lib/admission/limiter.ts#L49-L55) |
| `FFMPEG_BIN` | `ffmpeg` | 믹싱 결과 변환에 실행할 명령 | [compress-mixing-result.ts](repo://src/shared/lib/audio/compress-mixing-result.ts#L60-L63) |
| `NODE_ENV` | 실행 환경이 결정 | 인증 secret fallback, 개발 bypass, Prisma 전역 캐시에 영향 | [auth-secret-policy.ts](repo://src/features/authentication/model/auth-secret-policy.ts#L8-L12), [prisma.ts](repo://src/shared/db/prisma.ts#L31-L35) |

IP 신뢰를 끈 기본 구성에서는 IP 단위 버킷이 항상 건너뛰어져요. 이 동작과 요청 그룹 판정은 [HTTP API 표면](../architecture/http-api-surface.md)에 정리되어 있어요.

## 환경 변수로 바뀌지 않는 런타임 계약

카탈로그 상수는 환경 변수가 아니라 코드 상수예요. 그래도 값이 DB 조회 키로 쓰이므로 런타임 계약이에요. `TJ_2607_CATALOG_SLUG`는 공개 카탈로그와 스냅샷이 참조하는 카탈로그 식별자이고, `SONG_ANALYSIS_PIPELINE_CONTRACT`는 `SongAnalysis`의 고유 키 조합에 들어가 분석 파이프라인 버전을 구분해요([catalog.ts](repo://src/shared/config/catalog.ts#L1-L2), [song-analysis/worker.ts](repo://src/_app/background-jobs/song-analysis/worker.ts#L94-L101)).

반대로 [site-metadata.ts](repo://src/shared/config/site-metadata.ts#L3-L6)의 사이트 이름·제목·설명 상수와 origin 해석은 표시와 SEO용이에요. 접근 제어에는 쓰이지 않아요. origin은 `BETTER_AUTH_URL` → `VERCEL_PROJECT_PRODUCTION_URL` → `VERCEL_URL` 순으로 정규화해 찾고, 모두 실패하면 `http://localhost:3000`을 써요([site-metadata.ts](repo://src/shared/config/site-metadata.ts#L34-L57)).

외부 호출 타임아웃 일부와 작업 deadline 창은 코드에 고정되어 있어요. 보컬 분석 요청은 120초([modal-adapter.ts](repo://src/entities/vocal-profile/api/analyzer/modal-adapter.ts#L13-L14))와 `/health` 10초([modal-adapter.ts](repo://src/entities/vocal-profile/api/analyzer/modal-adapter.ts#L198-L206)), 곡 분석 제출 120초([analyzer.ts](repo://src/features/manage-song-catalog/api/analyzer.ts#L96-L102))와 poll 30초([analyzer.ts](repo://src/features/manage-song-catalog/api/analyzer.ts#L120-L128)), 외부 작업 정리 `DELETE` 15초예요([reconciliation.ts](repo://src/_app/background-jobs/mixing/reconciliation.ts#L41-L50)). Next.js Server Action 본문 상한도 정적 설정이에요. [next.config.ts](repo://next.config.ts#L3-L10)가 `experimental.serverActions.bodySizeLimit`을 `"300mb"`로 두고 있어요.

## .env 파일과 ignore 경계

`.gitignore`는 `.env*`를 제외하고([.gitignore](repo://.gitignore#L37-L38)), OpenWiki 생성 입력을 정하는 `.openwikiignore`도 `.env`와 `.env.*`를 제외해요. 그래서 실제 환경 파일의 내용은 이 문서의 근거가 될 수 없고, 어떤 변수가 어느 파일에서 읽히는지만 적을 수 있어요.

`README.md`와 [tests/process-scripts.test.ts](repo://tests/process-scripts.test.ts#L13-L19)는 `.env.example`을 참조하지만, 이 파일은 `.env.*` 제외 규칙 때문에 생성 입력에서 보이지 않았어요. 그래서 여기서는 내용을 옮기지 않고, 추적되는 코드와 설정 파일에서 읽히는 변수 이름만 정리했어요.

## 다음에 볼 문서

- 값의 의미가 아니라 절차가 필요하면 [로컬 실행과 배포](local-runtime.md)를 보세요.
- 값을 바꾼 뒤 어떤 검사를 돌릴지 고르려면 [변경 검증 경로](../testing/verification.md)를 보세요.
- lease·재시도·terminal 확정 규칙은 [Job 큐와 lease 복구 계약](job-processing.md)에 있어요.
- 업로드 자산과 정리 intent는 [미디어 저장과 정리 의도](media-storage.md)가 설명해요.
- Modal 서비스의 배포 단위와 endpoint는 [Modal 분석·믹싱 서비스](../integrations/modal-services.md)에 있어요.
