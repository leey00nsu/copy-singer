---
type: 변경 검증 선택 가이드
title: 변경 범위별 테스트와 아키텍처 검증 선택하기
description: 기능·워커·외부 어댑터·UI·DB 스키마 변경에 맞는 저장소 테스트 명령을 고르고, DATABASE_URL 조건과 외부 호출 mock 경계를 확인하는 방법을 안내해요. 전체 검증에서 build, 정적 검사, 아키텍처 경계, Storybook 검증이 어떤 역할을 하는지도 설명해요.
tags: [testing, architecture, integration, storybook]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-05T04:28:19.819Z
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-cdaeb36cd3badac987c47a00
    resource: repo://tests/fsd-architecture-boundaries.test.ts
  - id: openwiki-source-10c6a88a3297ea68ebdbf439
    resource: repo://tests/mixing-queue.integration.ts
  - id: openwiki-source-01fe088214113495f61d5235
    resource: repo://tests/msw-query.test.ts
  - id: openwiki-source-73631acdea501a96c723d962
    resource: repo://tests/storybook-production-boundary.test.ts
  - id: openwiki-source-28adc6ef840aa586dc1aceef
    resource: repo://tests/vocal-profile-analysis-queue.integration.ts
  - id: openwiki-source-fbadcd8591b65031efaaedce
    resource: repo://vitest.config.ts
generated: { by: "openwiki/0.5.0", at: "2026-09-05T04:28:19.819Z" }
---

## 먼저 선택할 명령

변경한 경계를 가장 가까이 검증하는 명령부터 실행하세요. 마지막에는 `pnpm check`를 실행하고, 배포에 영향을 주는 변경이면 `pnpm test`까지 실행하세요. `pnpm test`는 처음에 `pnpm run build`를 실행하므로 테스트만 실행하는 명령이 아니에요.

| 바꾼 범위 | 먼저 실행할 명령 | 확인하는 경계 |
| --- | --- | --- |
| API 입력·출력, Zod 스키마, URL 정규화 | `pnpm run test:query` | 서버 계약과 React Query 요청·재시도·polling 동작 |
| 보컬 분석 워커·큐·영속화 | `pnpm run test:vocal-profile-analysis-queue` | DB에 저장되는 작업 상태, 재시도·환불, 분석 어댑터 경계 |
| 믹싱 큐·워커·lease·외부 변환 호출 | `pnpm run test:mixing:db` | DB 수명 주기와 외부 호출 실패가 큐 상태에 반영되는지 |
| 보컬 분석 외부 어댑터 자체 | `pnpm run test:vocal-profile-analyzer` | 분석 어댑터의 입력·출력 계약 |
| UI 컴포넌트·페이지 표시 | 해당 기능의 `tsx --test` 스크립트, 또는 `pnpm run test:mixing:ui` | 표현과 상태별 UI 동작 |
| Storybook 스토리·브라우저 렌더링 | `pnpm run test:storybook --run` | Chromium 기반 Storybook 검증 |
| 레이어 import, 클라이언트/서버 혼합, App 라우트 | `pnpm run check:architecture` | Steiger와 실행 가능한 FSD 경계 테스트 |
| DB 스키마·마이그레이션 | `pnpm run db:validate`, 필요하면 `pnpm run db:status` | Prisma 스키마 유효성과 마이그레이션 상태 |

기능 이름만 보고 명령을 만들지 마세요. 실제 기능별 스크립트와 전체 실행 순서는 [`package.json`](repo://package.json#L9-L67)에서 확인하세요. 예를 들어 `test:vocal-profile-analysis-queue`는 `tests/vocal-profile-analysis-queue.integration.ts`를 실행하고, `test:mixing:db`는 `tests/mixing-queue.integration.ts`를 실행해요.

## 기능·API 변경 검증하기

요청 스키마나 응답 스키마를 바꿨다면 `pnpm run test:query`를 먼저 실행하세요. 이 명령은 `tests/client-server-state-query.test.ts`, `tests/api-contracts.test.ts`, `tests/msw-query.test.ts`와 서버 요청 관련 테스트를 함께 실행해요. `tests/api-contracts.test.ts`는 UUID, idempotency key, 페이지 값, 티켓 잔액 같은 경계값과 응답 스키마를 실제 엔티티·기능 스키마로 검사해요. 따라서 핸들러만 통과하고 공개 계약이 어긋나는 변경을 잡는 데 적합해요.

브라우저의 서버 호출을 검증할 때는 MSW(Mock Service Worker) 경계를 유지하세요. `tests/msw-query.test.ts`는 `mswServer.listen({ onUnhandledRequest: "error" })`로 처리되지 않은 호출을 실패시키고, 각 테스트 뒤 handler를 초기화해요. 4xx는 재시도하지 않는지, 503은 두 번 재시도한 뒤 성공할 수 있는지, 잘못된 성공 payload는 계약 오류로 한 번만 실패하는지를 확인해요. 외부 네트워크에 의존하는 테스트를 새로 만들지 말고, 이 테스트처럼 응답 handler와 fixture를 사용하세요.

응답 계약과 클라이언트 캐시 동작을 함께 바꿨다면 `test:query`만으로 범위를 줄이지 마세요. `pnpm run test:storybook --run`도 실행해 상태별 스토리 렌더링을 확인하세요.

## 워커·큐와 외부 어댑터 검증하기

큐 수명 주기나 워커 소유권을 바꿨다면 통합 테스트를 선택하세요. `pnpm run test:mixing:db`의 통합 테스트는 enqueue, claim, lease recovery, refund 경계를 DB에 실제로 기록하고 확인해요. 테스트 안에서 `DATABASE_URL`이 없으면 `DATABASE_URL is not configured` 사유로 건너뛰어요. 그러므로 로컬에서 이 명령이 실제 DB를 검증했는지 확인하려면 실행 전에 `DATABASE_URL`을 설정하세요. 환경 변수가 없을 때 통과한 결과를 DB 검증 완료로 해석하지 마세요.

`pnpm run test:vocal-profile-analysis-queue`도 같은 조건을 사용해요. 이 테스트는 분석 작업의 `PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED` 상태와 `attempts`, `maxAttempts`, `retryable`, `refundState` 같은 저장 결과를 확인해요. DB가 없으면 여러 케이스가 `DATABASE_URL is not configured`로 건너뛰므로, 큐 상태나 환불 규칙을 바꾼 뒤에는 DB가 연결된 실행 결과를 확인하세요.

통합 테스트는 DB를 실제로 사용하지만 외부 호출은 mock 경계로 분리해요. `tests/mixing-queue.integration.ts`는 `globalThis.fetch`를 보관했다가 테스트별 구현으로 바꾸고, Modal 변환·오브젝트 저장소 응답과 네트워크 실패를 정해진 응답으로 재현한 뒤 마지막에 원래 `fetch`를 복원해요. 외부 서비스의 실제 URL이나 API 키가 있어야 테스트되는 구조가 아니에요. 이 경계를 넘어서 실제 외부 서비스에 호출하도록 바꾸면 테스트의 재현성과 실패 원인이 달라지므로, 어댑터 계약을 mock 응답으로 고정하세요.

외부 분석 어댑터의 변환 규칙만 바꿨다면 `pnpm run test:vocal-profile-analyzer`를 먼저 실행하세요. 큐와 DB 저장까지 바꾼 경우에는 이 focused test와 `pnpm run test:vocal-profile-analysis-queue`를 함께 실행하세요.

## UI와 Storybook 변경 검증하기

UI 상태 표현을 바꿀 때는 변경한 기능에 대응하는 UI 스크립트를 실행하세요. 믹싱 UI라면 `pnpm run test:mixing:ui`가 `tests/mixing-history-ui.test.tsx`, `tests/mixing-status-presentation.test.ts`, `tests/mixing-detail-ui.test.tsx`를 실행해요. 보컬 프로필 화면은 `pnpm run test:vocal-profile-presentation` 같은 실제 스크립트를 사용하세요. 공통 링크 버튼은 `pnpm run test:base-ui`로 검증할 수 있어요.

스토리를 바꿨다면 `pnpm run test:storybook --run`을 실행하세요. `vitest.config.ts`는 `storybook` 프로젝트를 등록하고 Playwright Chromium을 headless 모드로 사용해요. `tests/storybook-production-boundary.test.ts`는 Storybook 패키지가 `devDependencies`에만 있고 `build`, `start`, `start:web`에 Storybook이 섞이지 않는지 확인해요. 또한 MSW worker가 `.storybook/public`에서만 제공되고, 애플리케이션 스토리가 `server-only`, `next/headers`, `next/server`, Prisma, DB 모듈을 import하지 않는지도 검사해요. Storybook 검증은 프로덕션 빌드에 포함된다는 뜻이 아니며, 저장소는 `build-storybook`과 `test:storybook`을 별도 script로 둬요.

## DB 스키마 변경 검증하기

Prisma schema나 migration을 바꿨다면 먼저 `pnpm run db:validate`를 실행하세요. 현재 migration 적용 상태를 확인해야 하면 `pnpm run db:status`를 추가하세요. 생성된 Prisma Client가 필요한 변경은 `pnpm run db:generate`를 사용하세요. 개발 DB에 migration을 적용하는 동작은 `pnpm run db:migrate`이고, 배포 migration 적용은 `pnpm run db:migrate:deploy`예요. 이 명령들은 `package.json`에 정의된 실제 Prisma script이므로, 임의의 migration 또는 CI 명령으로 대체하지 마세요.

스키마 변경이 큐나 API 결과에 영향을 주면 DB 명령만으로 충분하지 않아요. 영향받는 `test:mixing:db`, `test:vocal-profile-analysis-queue`, `test:query`를 `DATABASE_URL` 조건과 함께 실행하세요. DB integration 테스트가 건너뛰어진 상태라면 스키마와 런타임의 연결을 확인하지 못한 예외 상태예요.

## 전체 검증과 경계 위반 찾기

변경을 마치면 아래 순서로 저장소의 전체 정적·아키텍처 검증을 실행하세요.

```bash
pnpm run check
pnpm test
```

`pnpm run check`는 Biome, ESLint, TypeScript를 실행한 뒤 `check:architecture`를 호출해요. `pnpm run check:architecture`는 `steiger ./src`로 FSD 규칙을 검사하고 `pnpm run test:architecture-boundaries`로 프로젝트 소스 그래프를 다시 검사해요. 후자의 테스트는 교차 slice 내부 segment import, 직접·전이적인 서버 모듈 도달, App route의 구현 코드와 내부 segment import를 각각 fixture로 실패시키고, 현재 `app`, `src`, `scripts` 그래프가 위반 없이 통과하는지도 확인해요. 상세한 판정 로직은 [`tests/fsd-architecture-boundaries.test.ts`](repo://tests/fsd-architecture-boundaries.test.ts#L154-L220)에서 추적하세요.

`pnpm test`는 `build`를 가장 먼저 실행한 뒤 브랜드 아이콘, 계약·UI·워커·DB 테스트, `test:architecture-boundaries`, `test:storybook --run`까지 순서대로 실행해요. 따라서 전체 실행은 오래 걸릴 수 있고 `DATABASE_URL`이 필요한 통합 테스트는 해당 환경이 없으면 건너뛸 수 있어요. 최종 결과를 해석할 때는 명령이 성공했는지만 보지 말고, 통합 테스트가 skip 되었는지와 외부 호출이 mock으로 남아 있는지도 함께 확인하세요.

경계 위반이 나오면 import를 임의로 예외 처리하지 마세요. FSD slice 간에는 public API를 사용하고, 클라이언트 모듈의 실행 경로에 DB·서버 전용 모듈이 들어가지 않게 분리하세요. `app` 라우트와 페이지는 얇은 adapter로 유지하세요. 이미 의도된 예외가 있다면 [`steiger.config.ts`](repo://steiger.config.ts#L4-L65)의 좁은 범위 설정과 이유를 먼저 검토하세요.

다음 변경의 운영 맥락은 [시스템 경계 이해하기](../architecture/system-boundaries.md), 환경과 런타임 설정은 [구성과 런타임 설정](../operations/configuration-and-runtime.md)에서 이어서 확인하세요.
