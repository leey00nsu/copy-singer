---
type: 서비스 온보딩 작업 지도
title: Copysinger Quickstart
description: Copysinger의 로컬 설치·PostgreSQL·Prisma·worker 실행 순서와 실제 App Router 공개 표면을 안내하고, 변경 목적에 따라 아키텍처·도메인·운영·통합·워크플로·테스트 문서로 연결하는 시작점이다.
tags: [quickstart, onboarding, routing, operations, workflows]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-04T00:46:29.331Z
sources:
  - id: openwiki-source-65f9f953a411237fb5f35d5a
    resource: repo://app/(product)/account/page.tsx
  - id: openwiki-source-702fd8c43d08b041118eb9dc
    resource: repo://app/(product)/library/mixes/%5Bid%5D/page.tsx
  - id: openwiki-source-e302261d705563ff26ecd669
    resource: repo://app/(product)/library/page.tsx
  - id: openwiki-source-a0cea4ab02bd71d859aa226a
    resource: repo://app/(product)/notifications/page.tsx
  - id: openwiki-source-32949d8af662e0e73370a7c5
    resource: repo://app/(product)/profile/page.tsx
  - id: openwiki-source-ef3bfe98427d89b56baf0547
    resource: repo://app/(product)/recommendations/%5Bid%5D/page.tsx
  - id: openwiki-source-8420e9a8a67fe85a5fba630d
    resource: repo://app/(product)/recommendations/%5Bid%5D/songs/%5BitemId%5D/page.tsx
  - id: openwiki-source-a51a46bba4ff646eb914c57c
    resource: repo://app/(public)/page.tsx
  - id: openwiki-source-a94cea82e631eedd9323e1f1
    resource: repo://app/api/mixing-jobs/route.ts
  - id: openwiki-source-b79fbbd921df689b4bbdc82f
    resource: repo://docker-compose.yml
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-eaa76879de1a19c0db5c6ebb
    resource: repo://src/_app/background-jobs/mixing/worker.ts
generated: { by: "openwiki/0.5.0", at: "2026-09-04T00:46:29.331Z" }
---

# Copysinger Quickstart

## 이 페이지를 읽는 법

Copysinger는 브라우저 요청을 즉시 처리하는 Next.js 앱이면서, 무거운 오디오 분석·변환은 PostgreSQL에 접수한 durable job을 별도 Node worker가 처리하는 서비스다. 이 문서는 폴더 목록이 아니라 **다음에 읽거나 실행할 곳을 결정하는 지도**다. 먼저 로컬 실행을 완료한 다음, 바꾸려는 책임에 맞춰 아래 관련 문서로 이동한다.

```mermaid
flowchart TD
    Start["시작: 로컬 환경 준비"] --> Setup["설치, PostgreSQL, Prisma, pnpm dev"]
    Setup --> Surface["실제 App Router 화면과 API"]
    Surface --> Profile["보컬 녹음과 분석"]
    Surface --> Recommend["프로필 상세에서 추천과 AI 믹싱"]
    Surface --> Admin["관리자 카탈로그 운영"]
    Profile --> Ops["lease, retry, recovery 운영"]
    Recommend --> Ops
    Admin --> Ops
    Ops --> Integrations["Modal, SoulX-Singer, Leemage 경계"]
    Integrations --> Verify["테스트와 검증"]
```

이 그림은 로컬 설정에서 런타임 표면, 비동기 작업, 외부 통합, 검증으로 이어지는 탐색 순서를 보여준다. 추천은 `/recommendations` 단독 경로가 아니라 프로필에서 시작해 `/recommendations/[id]`로 진입한다.

## 1. 로컬에서 실행하기

### 사전 요구사항

- Node.js `22.13.0` 이상
- `pnpm 11.9.0`
- Docker 20 이상과 PostgreSQL
- Google OAuth web client
- Leemage project와 API key
- 배포된 Modal 분석·믹싱 서비스
- production 결과 오디오 변환이 필요하면 FFmpeg

설정 키와 선택 조건은 `.env.example`을 기준으로 확인한다. `.env.local`이나 무시되는 환경 파일의 값은 문서에 복사하지 않는다.

### 재현 가능한 Quick Start

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
docker compose up -d
pnpm run db:migrate:deploy
pnpm run db:generate
pnpm dev
```

`pnpm dev`는 `next dev`와 함께 mixing, vocal-profile-analysis, song-analysis worker를 `concurrently --kill-others-on-fail`로 시작한다. 기본 웹 주소는 [http://localhost:3000](http://localhost:3000)이다. Compose는 `postgres:16-alpine`을 사용하고 기본적으로 호스트 `5433`을 컨테이너 PostgreSQL `5432`에 연결하며, `postgres_data` 볼륨과 readiness healthcheck를 제공한다. 포트나 DB 기본값을 바꿔야 할 때는 Compose와 애플리케이션 설정의 환경 변수를 함께 맞춘다.

DB 스키마 변경을 개발 중 만들 때는 `pnpm run db:migrate`, 상태 확인은 `pnpm run db:status`, 모델 검증은 `pnpm run db:validate`, 생성 client 갱신은 `pnpm run db:generate`를 사용한다. 기존 migration을 적용하는 초기화·배포 경로는 `pnpm run db:migrate:deploy`다.

## 2. 실제 공개 표면과 변경 진입점

### 주요 화면

| 경로 | 역할 |
| --- | --- |
| `/` | 공개 랜딩 |
| `/profile` | 목소리 녹음·업로드와 보컬 프로필 분석 |
| `/vocal-profiles/[id]` | 보컬 프로필 상세 |
| `/recommendations/[id]` | 프로필에서 시작한 추천 결과 (`/recommendations` 단독 화면은 없음) |
| `/recommendations/[id]/songs/[itemId]` | 추천 곡 상세 |
| `/library`, `/library/mixes/[id]` | 보컬 프로필과 믹싱 결과·상세 |
| `/account`, `/notifications` | 계정·티켓 원장과 알림 |
| `/admin`, `/admin/songs`, `/admin/custom-mixing` | 관리자 운영·카탈로그·커스텀 믹싱 |

API도 동일한 App Router 경계 아래에 있다. 대표적인 공개 표면은 `/api/vocal-profiles`, `/api/vocal-profile-analysis-jobs`, `/api/recommendations`, `/api/mixing-jobs`이며, 각 리소스의 `[id]`·`audio` 하위 route가 상태 조회와 미디어 전달을 담당한다. 인증은 `/api/auth/[...all]`, 관리자 작업은 `/api/admin/*` 아래에 있다. `app/api/mixing-jobs/route.ts` 같은 root adapter는 server 구현을 export하는 얇은 연결점이므로 업무 로직은 대응하는 `src/_app/api-routes`와 FSD public API를 먼저 찾는다.

| 변경 목적 | 우선 읽을 문서 | 실제 시작 표면 |
| --- | --- | --- |
| 전체 요청 경계, FSD 의존 방향, DB와 worker 관계 | [시스템 아키텍처와 런타임 경계](architecture/system-map.md) | `app/`, `src/_app/`, `src/_pages/` |
| 인증, Google OAuth, 소유권, 관리자 권한 | [인증·권한·데이터 소유권](operations/auth-and-ownership.md) | `app/api/auth/`, 제품·관리자 page/API handler |
| 녹음·업로드에서 보컬 프로필 결과까지 | [보컬 분석 워크플로](workflows/vocal-analysis.md) | `/profile`, `/api/vocal-profiles`, `/api/vocal-profile-analysis-jobs` |
| 공개 카탈로그, 분석 revision, publish/archive | [곡 카탈로그 수집·분석·게시](workflows/catalog-publishing.md) | `/admin/songs`, `app/api/admin/catalog/` |
| 프로필 기반 곡·키 추천과 믹싱 접수 | [추천에서 AI 믹싱까지](workflows/recommendation-and-mixing.md) | `/recommendations/[id]`, `/api/recommendations`, `/api/mixing-jobs` |
| Modal·SoulX-Singer HTTP 계약과 모델 처리 | [Modal 처리와 SoulX-Singer 계약](integrations/modal-processing.md) | `services/`, worker adapter와 API route |
| Leemage bytes, metadata, private proxy, 삭제 | [미디어 저장소·프록시·정리](integrations/media-storage.md) | `src/shared/media/`, media API/proxy |
| claim, lease, heartbeat, polling, retry, refund, cleanup | [백그라운드 작업·lease·재시도·복구](operations/job-processing.md) | `scripts/*-worker.ts`, `src/_app/background-jobs/` |
| 로컬·production 설정과 배포 절차 | [로컬·production 설정과 검증](operations/local-and-production.md) | `package.json` scripts, Docker, Modal deploy |
| 변경 전후 테스트 범위와 실행 명령 | [테스트와 변경 안전성](testing/verification-strategy.md) | `tests/`, package scripts |

Root `app` 파일은 Next.js route convention과 FSD public API를 연결하는 adapter다. 실제 페이지 조합·API handler·worker runner를 수정할 때는 대응하는 `src/_app`, `src/_pages`, `src/features`, `src/entities`, `src/shared` public API를 먼저 찾고, adapter에 업무 로직을 넣지 않는다.

## 3. 런타임을 빠르게 이해하기

브라우저는 화면 요청과 작업 접수·상태 조회를 Next.js App Router에 보낸다. API는 인증·입력 검증 후 PostgreSQL에 job과 metadata를 저장하고 빠르게 응답한다. worker는 DB에서 작업을 원자적으로 claim하고 lease를 갱신하면서 Leemage 입력을 읽고 Modal 분석 또는 SoulX-Singer 변환을 호출한다. 완료 결과의 bytes는 Leemage에, 상태·소유권·파일 metadata·알림은 PostgreSQL에 남긴다. 따라서 외부 작업 ID, lease, 재시도 가능성, asset 상태를 함께 보지 않고 단일 route만 바꾸면 복구·중복 처리 규칙을 깨뜨릴 수 있다.

```mermaid
sequenceDiagram
    participant Browser as Browser
    participant App as Next.js App Router
    participant DB as PostgreSQL
    participant Worker as Node Worker
    participant Media as Leemage
    participant Model as Modal or SoulX-Singer
    Browser->>App: 작업 접수 또는 상태 조회
    App->>DB: job와 metadata 저장
    App-->>Browser: 즉시 응답
    Worker->>DB: 원자적 claim과 lease
    Worker->>Media: 입력 bytes 읽기
    Worker->>Model: 분석 또는 변환 요청
    Model-->>Worker: 결과 bytes 또는 외부 job 상태
    Worker->>Media: 결과 asset 저장
    Worker->>DB: 상태, 소유권, metadata, 알림 갱신
```

이 시퀀스는 동기 API 접수와 durable worker 처리, 외부 미디어·모델 경계를 요약한다.

## 4. 운영·통합 경계에서 확인할 것

- 세 worker는 `scripts/mixing-worker.ts`, `scripts/vocal-profile-analysis-worker.ts`, `scripts/song-analysis-worker.ts`에서 `.env.local`, `.env`를 읽고 각각의 server runner를 시작한다. worker가 죽으면 `pnpm dev`/`pnpm start`의 `--kill-others-on-fail` 감독 정책에 따라 전체 프로세스가 종료된다.
- PostgreSQL은 runtime source of truth다. 분석·믹싱은 재시작을 고려한 durable queue이며, worker의 claim·lease·heartbeat·polling과 실패 시 backoff/refund 규칙은 [작업 처리 문서](operations/job-processing.md)에서 확인한다.
- 분석 서비스를 배포하거나 계약을 바꿀 때는 다음 명령을 사용한다.

```bash
pnpm run modal:vocal-profile:deploy
pnpm run modal:song-catalog:deploy
```

Modal API key와 URL 같은 secret은 server-side 설정으로만 유지하고 이 페이지나 커밋에 값을 기록하지 않는다.

## 5. Production 전환

```bash
pnpm install --frozen-lockfile
pnpm run db:migrate:deploy
pnpm build
pnpm start
```

`pnpm start`도 웹과 세 worker를 함께 감독한다. 단일 인스턴스가 아닌 배포, 환경 변수 의미, Modal hook, process supervision과 새 PostgreSQL의 catalog snapshot 복원은 [로컬·production 설정과 검증](operations/local-and-production.md)을 정본으로 삼는다.

## 6. 변경 후 검증

빠른 정적 검사는 다음 순서로 실행한다.

```bash
pnpm run check
pnpm run db:validate
```

개별 경계가 바뀌면 `pnpm run lint`, `pnpm run typecheck`, `pnpm run check:architecture`를 분리해 확인하고, 전체 회귀는 `pnpm test`를 사용한다. UI/Storybook 작업은 다음을 추가한다.

```bash
pnpm storybook
pnpm run test:storybook --run
```

작업 유형별로는 보컬 queue/adapter, recommendation/key-fit, auth ownership, media, tickets, mixing DB/UI, admin 통합 테스트가 각각의 위험을 보호한다. 정확한 테스트 파일과 package script 매핑은 [테스트와 변경 안전성](testing/verification-strategy.md)에서 찾는다.
