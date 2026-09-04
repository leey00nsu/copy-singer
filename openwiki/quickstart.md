---
type: 로컬 온보딩과 작업 경로
title: Copysinger 빠른 시작과 작업 경로
description: Node.js·pnpm·PostgreSQL을 준비해 Next.js와 세 durable worker를 함께 실행하고, 데이터베이스·설정·정적 검사를 확인하는 최소 절차를 안내한다. 인증, 보컬 분석, 추천, 믹싱, 관리자 작업의 코드와 심화 문서로 이어지는 탐색 경로도 제공한다.
tags: [quickstart, onboarding, local-development, task-routing]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-04T09:11:21.096Z
sources:
  - id: openwiki-source-b79fbbd921df689b4bbdc82f
    resource: repo://docker-compose.yml
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-2798a6200ef792b731721034
    resource: repo://prisma/schema.prisma
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-904d8953f6839fec7c58c800
    resource: repo://scripts/mixing-worker.ts
  - id: openwiki-source-932d9872d5647bdfeb9f5cd7
    resource: repo://scripts/song-analysis-worker.ts
  - id: openwiki-source-f1adf7db889a7f8493008153
    resource: repo://scripts/verify-database.ts
  - id: openwiki-source-3e61fbe0b48f056b7e7ac181
    resource: repo://scripts/verify-feature-config.ts
  - id: openwiki-source-4190e707c6ec6879dbd06e87
    resource: repo://scripts/vocal-profile-analysis-worker.ts
  - id: openwiki-source-1e6e6f1135b9a641599ec77e
    resource: repo://src/_app/layout/index.server.ts
  - id: openwiki-source-3fe0beab1a994cc8f1d9162f
    resource: repo://src/_app/layout/root-layout.tsx
  - id: openwiki-source-200291f8a1aaa391d1b68ec4
    resource: repo://src/shared/config/server-env.ts
generated: { by: "openwiki/0.5.0", at: "2026-09-04T09:11:21.096Z" }
---

# Copysinger 빠른 시작과 작업 경로

이 페이지의 목표는 로컬에서 Copysinger를 실행한 뒤 **무엇을 확인하고 어느 코드로 이동할지** 결정하는 것이다. 현재 개발 명령은 Next.js 웹 앱과 `worker:mixing`, `worker:vocal-profile-analysis`, `worker:song-analysis`를 한 번에 시작한다. 기본 웹 주소는 `http://localhost:3000`이다.

## 시작 전 준비

`package.json`이 요구하는 런타임은 Node.js `>=22.13.0`과 pnpm `11.9.0`이다. 로컬 데이터베이스에는 Docker가 필요하다. 기능을 실제로 사용하려면 설정 키의 의미에 맞는 다음 준비도 필요하다.

- `DATABASE_URL`: Prisma가 접속할 PostgreSQL 연결 문자열
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`: Better Auth 세션 서명과 애플리케이션 URL
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth web client
- `ADMIN_EMAILS`: 관리자 계정으로 허용할 이메일 목록
- `LEEMAGE_API_KEY`, `LEEMAGE_PROJECT_ID`: 사용자 오디오와 결과 파일을 저장할 Leemage project
- Modal 분석·믹싱 endpoint와 인증 키: 보컬 프로필 분석, 곡 분석, AI 믹싱 worker가 호출할 외부 서비스
- FFmpeg: production 결과 오디오 변환이 필요한 실행 환경

실제 값은 `.env.example`의 설명과 운영 문서의 조건을 보고 `.env.local`에 준비한다. 비밀값이나 ignored 환경 파일의 내용은 문서에 복사하지 않는다. 서버 전용 설정은 `src/shared/config/server-env.ts`에서 정수 범위와 기본값을 검증한다. 예를 들어 티켓 수량은 0 이상, worker concurrency는 각 worker별 허용 범위 안의 정수여야 하며 잘못된 값이면 서버 설정 로딩이 실패한다.

## PostgreSQL부터 통합 개발 실행까지

Compose는 `postgres:16-alpine`을 실행하고, 호스트 포트 `${POSTGRES_PORT:-5433}`을 컨테이너의 `5432`에 연결한다. 데이터베이스·사용자·비밀번호의 Compose 기본값은 각각 `copy_singer`, `copy_singer`, `copy_singer_dev`지만, 애플리케이션의 `DATABASE_URL`이 실제 선택한 값과 일치하는지 확인한다. 데이터는 `postgres_data` named volume에 남는다.

다음 순서를 그대로 실행한다.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
docker compose up -d
pnpm run db:migrate:deploy
pnpm run db:generate
pnpm dev
```

`pnpm dev`의 `concurrently --kill-others-on-fail` 정책 때문에 웹 또는 worker 하나가 실패하면 나머지도 종료된다. 각 worker entrypoint는 `.env.local`과 `.env`를 dotenv로 읽은 뒤 `src/_app/background-jobs/`의 server runner를 동적으로 시작한다. 따라서 브라우저에서 웹이 열리는 것만으로 외부 분석·믹싱까지 준비됐다고 판단하지 않는다.

<!-- openwiki: mermaid parse failed and this diagram was converted to a text fence so it does not break rendering. Fix the diagram source and restore the mermaid fence. Parser error: Heuristic: an unescaped angle bracket inside a label breaks rendering; rephrase the label. -->
```text
flowchart TD
    A["Node.js >=22.13.0와 pnpm 11.9.0"] --> B["pnpm install --frozen-lockfile"]
    B --> C[".env.local 준비"]
    C --> D["docker compose up -d"]
    D --> E["pnpm run db:migrate:deploy"]
    E --> F["pnpm run db:generate"]
    F --> G["pnpm dev"]
    G --> H["Next.js와 세 worker 확인"]
    H --> I["http://localhost:3000 확인"]
```

이 흐름은 의존성, 설정, PostgreSQL, Prisma, 통합 프로세스의 의존 순서를 보여준다.

### 실행 확인 지점

1. `http://localhost:3000`이 열리는지 확인한다.
2. 터미널에 `web`, `mixing`, `analysis`, `songs` 프로세스가 모두 살아 있는지 확인한다.
3. 로그인·파일 저장·외부 분석을 사용할 때는 `pnpm run verify:feature-config`로 인증·관리자·Leemage 키가 설정됐는지 검사한다. 이 명령은 값 자체를 출력하지 않는다.
4. seed 또는 fixture 데이터의 관계 그래프까지 확인하려면 PostgreSQL이 준비된 상태에서 다음을 실행한다.

```bash
pnpm run db:verify
```

`db:verify`는 `DATABASE_URL`이 없으면 실패한다. 있으면 user `VocalProfile`이 `USER_TEST` recording과 연결됐는지, song이 vocal profile과 연결됐는지를 확인하고 ID를 출력한다. 이는 앱이 뜨는지와 별개로 데이터베이스 관계가 온전한지 확인하는 smoke check다.

분석과 믹싱은 웹 요청이 PostgreSQL에 durable job을 접수한 뒤 worker가 처리한다. worker가 처리 중인 작업의 lease를 저장하므로 재시작·만료·재시도 동작을 조사할 때는 웹 로그만 보지 않는다. 상세한 claim, lease, retry 규칙은 [Durable worker와 작업 lifecycle](operations/job-processing.md)에서 확인한다.

## 기능별 task-routing map

| 하려는 일 | 화면 진입점 | 먼저 찾을 코드 | 다음 문서 |
| --- | --- | --- | --- |
| 인증·사용자 소유권·관리자 접근 확인 | `/login`, `/account`, `/admin` | `src/features/authentication`, `src/shared/auth`, `src/_app` | [인증과 사용자 데이터 소유권](concepts/access-control.md) |
| 녹음·업로드와 보컬 분석 | `/profile`, `/vocal-profiles/[id]` | `src/features/analyze-vocal-profile`, `src/entities/vocal-profile`, `src/_app/background-jobs/vocal-profile-analysis`, `scripts/vocal-profile-analysis-worker.ts` | [보컬 프로필 분석 workflow](workflows/vocal-profile-analysis.md) · [보컬 분석과 추천](concepts/vocal-analysis-and-recommendations.md) |
| 곡 카탈로그·추천·키 적합도 | `/recommendations/[id]`, `/recommendations/[id]/songs/[itemId]` | `src/features/create-recommendation`, `src/entities/recommendation`, `src/entities/song-catalog`, `src/_app/background-jobs/song-analysis` | [곡 카탈로그와 추천 snapshot](concepts/catalog-and-recommendations.md) |
| 추천곡을 AI 믹싱으로 연결 | 추천곡 상세, `/library/mixes/[id]` | `src/features/create-mixing`, `src/entities/mixing-job`, `src/_app/background-jobs/mixing`, `scripts/mixing-worker.ts` | [추천 선택에서 AI 믹싱 결과까지](workflows/recommendation-to-mixing.md) |
| 관리자 곡·asset·분석 운영 | `/admin/songs`, `/admin/custom-mixing` | `src/features/manage-song-catalog`, `src/features/inspect-admin-operations`, `src/_pages/admin-song-catalog`, `src/_app/background-jobs/song-analysis` | [관리자 카탈로그 관리 workflow](workflows/catalog-management.md) |

공통 구조를 먼저 파악해야 한다면 [시스템 지도와 런타임 경계](architecture/system-map.md)와 [Feature-Sliced 모듈과 공개 API 경계](architecture/module-boundaries.md)를 읽는다. `app/`은 Next.js route adapter이고, 실제 조합은 `src/_app/`·`src/_pages/`와 FSD 계층에 있다. 계층은 `_app → _pages → widgets → features → entities → shared` 방향으로 내려가며, slice 간 참조는 대상 slice의 public API를 사용한다. DB·secret을 다루는 server API와 browser-safe API를 섞지 않는 것이 안전한 변경의 기본 경계다.

## 변경 후 검증

먼저 변경 범위에 맞는 정적 검사를 실행한다.

```bash
pnpm run check
pnpm run db:validate
```

`pnpm run check`는 Biome, ESLint, TypeScript, Steiger 기반 architecture 검사를 순서대로 실행한다. Prisma schema를 바꿨다면 `db:validate`와 migration 상태를 함께 확인하고, 로컬 데이터베이스에 migration을 만들 때는 `pnpm run db:migrate`를 사용한다. 배포·기존 데이터베이스에는 `pnpm run db:migrate:deploy`를 사용한다.

전체 회귀 검증은 build, domain/unit, PostgreSQL integration, API contract, FSD boundary, Storybook 검사를 포함한다.

```bash
pnpm test
```

좁은 검증 진입점은 [검증 전략과 회귀 경계](testing/test-strategy.md)에서 고른다. 인증은 `pnpm run test:auth:db`, 보컬 분석 queue는 `pnpm run test:vocal-profile-analysis-queue`, 추천은 `pnpm run test:recommendation`, 믹싱 queue는 `pnpm run test:mixing:db`, 관리자 작업은 `pnpm run test:admin`처럼 변경한 경계에 맞춰 실행한다. 외부 저장소 연동을 바꿨다면 `pnpm run test:media`도 포함한다.

## 운영으로 확장할 때

로컬 실행과 배포 설정을 분리해야 할 때는 [설정·로컬 실행·배포 운영](operations/configuration-and-deployment.md)을 기준으로 삼는다. Modal 분석기를 직접 배포하는 script는 다음과 같다.

```bash
pnpm run modal:vocal-profile:deploy
pnpm run modal:song-catalog:deploy
```

외부 서비스 adapter와 artifact 계약은 [외부 서비스 연동 계약](integrations/external-services.md)에서, 데이터 관계와 revision·소유권 불변식은 [도메인 데이터 모델과 영속성 불변식](architecture/data-model.md)에서 확인한다. 로컬 PostgreSQL을 중지할 때는 `docker compose down`을 사용하며, named volume까지 삭제하는 명령은 기존 데이터를 지우므로 초기화가 목적일 때만 선택한다.
