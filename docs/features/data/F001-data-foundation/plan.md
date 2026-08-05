# Implementation Plan: data-foundation

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F001
- **대상 레포**: copy-singer-data
- **작성일**: 2026-08-05
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| Database | PostgreSQL 16 (`postgres:16-alpine`) | 로컬 실행 비용이 낮고 운영 PostgreSQL과 호환되는 관계형 SSOT |
| ORM / Migration | Prisma ORM 7.9.1 (exact pin) | 현재 npm 최신 안정 버전이며 schema, migration, type-safe client를 한 흐름으로 관리 |
| Runtime adapter | `@prisma/adapter-pg` + `pg` | Prisma 7의 필수 driver adapter 방식으로 self-hosted PostgreSQL 연결 |
| Prisma config | root `prisma.config.ts` | Prisma 7의 datasource, migration 경로, 명시적 seed 명령 구성 방식 |
| Client generator | `prisma-client`, `output = "../generated/prisma"` | Prisma 7의 필수 custom output을 사용하고 생성 코드를 앱 코드와 분리 |
| Seed runtime | `tsx` | TypeScript seed를 별도 build 없이 명시적으로 실행 |
| Container orchestration | Docker Compose v2 | 사용자가 단일 명령으로 PostgreSQL을 시작하고 healthcheck를 확인 가능 |

---

## 아키텍처

### 구성 경계

```text
docker-compose.yml
  └─ postgres:16-alpine + named volume + healthcheck
                │
                │ DATABASE_URL
                ▼
prisma.config.ts ── prisma/schema.prisma ── prisma/migrations/*
                                              │
                         prisma generate       │ migrate deploy/dev
                                ▼              ▼
                    generated/prisma      PostgreSQL schema
                                │
                                ▼
                       lib/db/prisma.ts
                                │
                       prisma/seed.ts / 후속 서버 기능
```

- Docker Compose는 DB 컨테이너만 관리한다. Next.js와 Modal 서비스는 컨테이너화하지 않는다.
- Prisma CLI는 `.env` 계열 파일에서 `DATABASE_URL`을 읽고 schema/migration/seed를 수행한다.
- Prisma client는 `generated/prisma`에 생성하며 Git에는 포함하지 않고 `postinstall` 또는 `db:generate`로 재생성한다.
- `lib/db/prisma.ts`는 `PrismaPg` adapter와 개발 환경 global cache를 사용하는 서버 전용 singleton을 제공한다.
- 이 Feature에서는 해당 client를 사용자-facing route에 연결하지 않는다.

### 데이터 모델

#### Enum

- `RecordingKind`: `USER_TEST`, `SONG_SOURCE`, `SVC_REFERENCE`, `SVC_TARGET`
- `RecordingStatus`: `PENDING`, `READY`, `FAILED`, `DELETED`
- `VocalProfileSourceType`: `USER`, `SONG`
- `SongAnalysisStatus`: `PENDING`, `READY`, `FAILED`

#### 관계와 제약

- `Recording 1:N VocalProfile`: 동일 녹음을 analyzer version별로 다시 분석할 수 있다.
- `VocalProfile 1:0..1 Song`: 곡 프로필은 최대 한 곡의 현재 profile로 연결된다.
- `VocalProfile 1:N RecommendationRun`: 사용자 프로필별 추천 실행 이력을 보존한다.
- `RecommendationRun 1:N RecommendationItem`, `Song 1:N RecommendationItem`
- `VocalProfile(recordingId, analyzer, analyzerVersion)` unique
- `Song(title, artist)` unique, `Song.catalogOrder` unique
- `RecommendationItem(runId, rank)` 및 `(runId, songId)` unique
- 관계 조회에 쓰는 foreign key와 상태/생성일 기반 조회에 index를 둔다.

### 마이그레이션과 seed

- 초기 migration은 `prisma migrate dev --name init_data_foundation`으로 생성하고 SQL을 저장소에 커밋한다.
- 적용 검증은 빈 DB에서 `prisma migrate reset --force` 또는 동등한 재생성 절차로 수행한다.
- seed는 고정 UUID 또는 unique key 기반 `upsert`를 사용해 반복 실행 가능하게 만든다.
- 예제 데이터에는 합성 경로만 사용하고 실제 오디오 파일이나 개인정보를 포함하지 않는다.
- Prisma 7에서는 migration/reset 시 seed가 자동 실행되지 않으므로 `prisma db seed`를 별도 명령으로 노출한다.

### 환경 변수와 보안

- Compose 입력: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`
- 애플리케이션 입력: `DATABASE_URL`
- `.env.example`에는 로컬 전용 예시 값을 제공하되 `.env.local`과 실제 자격 증명은 기존 ignore 정책을 유지한다.
- `DATABASE_URL`을 `NEXT_PUBLIC_` 변수로 만들거나 client component에서 참조하지 않는다.

### 구현 경계와 실행 순서

1. 의존성, Compose, 환경 변수와 Prisma 기본 설정을 추가한다.
2. schema와 서버 전용 client를 구현하고 정적 검증을 통과시킨다.
3. 사용자가 `docker compose up -d`로 PostgreSQL을 시작한다.
4. 초기 migration을 생성·적용하고 idempotent seed 및 조회 검증을 실행한다.
5. README와 Feature 문서를 실제 명령 및 결과에 맞게 동기화한다.

---

## 파일 구조

```text
.
├── docker-compose.yml
├── prisma.config.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│       ├── migration_lock.toml
│       └── <timestamp>_init_data_foundation/
│           └── migration.sql
├── generated/
│   └── prisma/                 # generated, gitignored
├── lib/
│   └── db/
│       └── prisma.ts           # server-only Prisma client singleton
├── scripts/
│   └── verify-database.ts      # seeded relations smoke check
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

---

## 테스트 전략

- **정적 검증**: `npm run db:validate`, `npm run db:generate`, `npx tsc --noEmit`, `npm run lint`
- **Compose 검증**: `docker compose config`, 사용자가 기동한 뒤 `docker compose ps`의 PostgreSQL healthy 상태 확인
- **마이그레이션 검증**: 빈 로컬 DB에 migration 적용 후 `npm run db:status`로 최신 상태 확인
- **Seed 통합 테스트**: `npm run db:seed`를 두 번 실행해 idempotency 확인 후 `npm run db:verify`로 엔터티 관계와 constraint 대상 데이터 조회
- **회귀 검증**: `npm test` 및 `npm run build`로 기존 SVC UI가 영향을 받지 않았는지 확인
- **E2E 테스트**: 사용자-facing 동작이 없으므로 이 Feature에서는 추가하지 않는다.

### 구현 리스크

- 사용자가 PostgreSQL을 기동하기 전에는 migration과 seed 통합 검증을 완료할 수 없다. 정적 구성까지 먼저 완료하고 DB 실행이 필요한 지점에서 명확히 handoff한다.
- Prisma Client는 Node PostgreSQL adapter를 사용하므로 Cloudflare Worker client bundle에 포함되면 안 된다. 서버 전용 모듈로 격리하고 이 Feature에서는 Worker route에 import하지 않는다.
- `Json` 필드의 구조는 후속 분석·추천 Feature가 확정한다. 현재 schema는 저장 공간만 제공하고 JSON 내부 계약을 성급하게 고정하지 않는다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
- Idea: [I001-data-foundation.md](../../../ideas/I001-data-foundation.md)
- PRD: [copy-singer-prd.md](../../../prd/copy-singer-prd.md)
