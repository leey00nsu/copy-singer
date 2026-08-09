# Implementation Plan: fsd-architecture-migration

> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F014
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-09
- **상태**: Approved
- **구현 성격**: 동작을 바꾸지 않는 구조 이전
- **현재 기준선**: UI page 10개, Route Handler 24개, component 31개, `lib` TypeScript module 56개

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| Architecture | Feature-Sliced Design 2.1 pages-first | page에 코드를 먼저 유지하고 실제 재사용·도메인 경계가 확인된 코드만 하위 레이어로 내려 과도한 slice를 방지한다. |
| Architecture linter | `steiger@0.6.0` + `@feature-sliced/steiger-plugin@0.7.0` exact pin | 현재 공식 recommended rules와 `_app`/`_pages` prefix 인식을 사용한다. beta 도구이므로 lockfile 외에도 직접 버전을 고정한다. |
| Framework adapter | Next.js 16.3 root `app/` | 설치된 Next.js 문서와 FSD 공식 Next.js 가이드에 따라 framework special folder를 FSD source와 분리한다. |
| Module boundary | TypeScript path alias `@/* → ./src/*` | root adapter, tests, scripts와 FSD slice가 동일한 절대 import 기준을 사용하게 한다. |
| Server guard | 기존 `server-only` + `index.server.ts` | Client Component module graph로 DB, secret 및 Node.js 전용 구현이 유입되는 것을 build 단계에서 차단한다. |
| Naming/format | 기존 Biome 2.5.7 | 이동·생성 파일의 kebab-case와 formatting 기준을 F013 설정으로 유지한다. |

Steiger와 plugin은 서로 다른 최신 배포 버전을 사용하지만 `steiger@0.6.0`이 plugin `0.7.0`을 dependency로 요구하는 현재 공식 조합이다. 두 package를 devDependency에 명시해 설정 import와 lockfile 해석을 분명히 한다.

---

## 아키텍처 원칙

### 1. Framework adapter와 실제 구현 분리

```text
HTTP / RSC request
      │
      ▼
root app/                         Next.js convention과 route config만 유지
      │ re-export/import public API
      ▼
src/_app 또는 src/_pages         endpoint·page 조립
      │
      ▼
widgets / features / entities    재사용 UI, 사용자 행동, 도메인 표현
      │
      ▼
shared                           UI primitive, DB, config, 범용 lib, 외부 adapter
```

- root `app/`은 URL 구조, dynamic segment, `runtime`, `page/layout/route/loading/error/not-found` convention을 보존한다.
- page 구현은 `_pages` slice의 `index.ts` 또는 `index.server.ts`에서 가져온다.
- Route Handler 구현은 `_app/api-routes` 내부 endpoint public API에서 가져온다.
- root adapter에 request parsing, DB query, auth rule 또는 JSX 화면 구현을 남기지 않는다.

### 2. 레이어 의존 방향

```text
_app → _pages → widgets → features → entities → shared
```

- 아래 레이어는 위 레이어를 import하지 않는다.
- 같은 레이어의 서로 다른 slice 간 import는 만들지 않는다.
- 여러 entity를 조합하는 use case는 feature로, 여러 feature를 조합하는 route/worker orchestration은 `_app`으로 올린다.
- 한 page에서만 쓰는 코드는 `_pages/<slice>`에 유지한다.
- Steiger `insignificant-slice`가 단일 소비처를 지적하면 예외를 끄기보다 상위 소비 slice로 합친다.

### 3. Public API와 import locality

- slice root에는 외부 공개용 `index.ts`를 둔다.
- server 전용 export가 있는 slice/segment에는 별도 `index.server.ts`를 둔다.
- `shared/ui`, `shared/lib`는 거대한 layer barrel 대신 top-level group별 public API를 둔다.
- 같은 slice 내부에서는 상대 import를, slice 외부에서는 `@/` alias와 public API를 사용한다.
- test, root adapter, script 및 worker wrapper도 production public API를 우선 사용한다.

### 4. Client/server 경계

- `index.ts`: type-only 계약, 순수 model/lib, browser-safe UI와 client API만 export한다.
- `index.server.ts`: DB access, server auth, env secret, media persistence, queue/worker, Server Component와 Route Handler를 export한다.
- server 진입 모듈은 `import "server-only"`를 유지하거나 추가한다.
- Client Component의 dependency tree에서 `index.server.ts`, Prisma generated client, `process.env` secret reader 및 Node.js 전용 module이 발견되면 구조 오류로 취급한다.
- type과 persistence가 한 파일에 섞인 경우 type/serialization contract를 browser-safe model로 먼저 분리한다.

---

## 목표 파일 구조

실제 slice는 Steiger의 significant usage 기준에 맞춰 구현 중 통합할 수 있지만, 상위 구조와 책임은 다음과 같이 고정한다.

```text
app/                                  # Next.js framework adapters
├── layout.tsx
├── page.tsx
├── account/page.tsx
├── admin/page.tsx
├── api/**/route.ts
├── ...
└── vocal-profiles/**

src/
├── _app/
│   ├── api-routes/                   # 24개 endpoint handler 구현과 endpoint public API
│   │   ├── account/
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── conversions/
│   │   ├── mixing-jobs/
│   │   ├── recommendations/
│   │   └── vocal-profiles/
│   ├── background-jobs/              # mixing/analysis worker orchestration
│   ├── layout/                       # root layout composition과 metadata
│   ├── providers/                    # tooltip/toast 등 전역 provider
│   └── styles/                       # global CSS
├── _pages/
│   ├── account/
│   ├── admin/
│   ├── dev-svc/
│   ├── home/
│   ├── login/
│   ├── mixing-history/
│   ├── profile/
│   ├── recommendation-detail/
│   ├── vocal-profile-detail/
│   └── vocal-profiles/
├── widgets/
│   └── vocal-profile-workbench/      # home/profile에서 공유되는 큰 UI 조합
├── features/                         # 실제 재사용/조합 관계가 있는 use case만 유지
│   ├── authentication/
│   ├── manage-tickets/
│   ├── analyze-vocal-profile/
│   ├── create-mixing/
│   └── create-recommendation/
├── entities/                         # 독립적인 browser-safe 계약/표현과 자체 persistence
│   ├── mixing-job/
│   ├── recommendation/
│   ├── ticket/
│   └── vocal-profile/
└── shared/
    ├── config/                       # server env public API
    ├── db/                           # Prisma public API
    ├── lib/
    │   ├── audio/
    │   └── cn/
    ├── media/                        # Leemage 등 저장소/프록시 adapter
    └── ui/                           # shadcn/base-ui primitive별 public API
```

빈 layer 또는 사용되지 않는 예시 slice는 생성하지 않는다. `song-catalog`, key-fit scoring, dev conversion처럼 한 use case에만 종속된 기존 module은 독립 Entity를 강제하지 않고 해당 Feature 또는 Page에 유지한다.

---

## 기존 코드 이전 매핑

| 기존 경로/책임 | 목표 책임 | 이전 기준 |
| ---- | ---- | ---- |
| `app/**` | root Next adapter + `_pages`/`_app/api-routes` | root에는 special file과 route config만 유지하고 구현을 public API로 이동한다. |
| `components/ui/**`, `lib/utils.ts` | `shared/ui/**`, `shared/lib/cn` | primitive별 public API를 만들고 기존 class/variant 동작을 보존한다. |
| 범용 audio 처리 | `shared/lib/audio` | playback, recording, upload/compression처럼 domain 독립적인 순수 browser/server utility를 환경별로 분리한다. |
| `components/vocal-profile-workbench.tsx` | `widgets/vocal-profile-workbench` | home과 profile에서 재사용되는 큰 조합이므로 Widget으로 유지한다. |
| page 전용 component | 해당 `_pages/<slice>/ui` | 단일 page 소비자는 Feature/Widget으로 추출하지 않는다. |
| auth UI/client/session | `features/authentication` | client public API와 server public API를 분리하고 ticket entity만 하향 import한다. |
| vocal-profile contract/display/persistence | `entities/vocal-profile` | 독립 계약·표현·자체 persistence를 두고 분석 queue/worker orchestration은 Feature/App으로 올린다. |
| recommendation contract/display/ranking | `entities/recommendation` 또는 `features/create-recommendation` | 둘 이상의 상위 소비처가 있는 계약만 Entity에 두고 key-fit/catalog 등 use case 전용 로직은 Feature에 유지한다. |
| mixing contract/history | `entities/mixing-job` | job 계약과 자체 조회만 Entity에 두고 ticket/vocal-profile을 조합하는 queue는 Feature로 이동한다. |
| ticket ledger/service | `entities/ticket` | ticket 계약, ledger, 자체 persistence를 함께 두고 관리자 조합은 상위 Feature/Page에 둔다. |
| `lib/leemage/**`, `lib/db/**`, `lib/config/**` | `shared/media`, `shared/db`, `shared/config` | infrastructure adapter는 server public API로만 노출한다. |
| queue, synthesis, admin orchestration | `features/**` 및 `_app/background-jobs` | 여러 entity를 조합하는 로직을 하위 Entity에 넣지 않는다. |
| `scripts/*worker.ts` | root wrapper → `_app/background-jobs` | package script 이름과 worker 동작은 유지하고 구현 public API만 교체한다. |
| `tests/**` | 기존 위치 유지 | import를 새 public API로 바꾸되 F015 이전에는 test runner를 변경하지 않는다. |

---

## Root adapter 패턴

### Page adapter

```ts
export { AccountPage as default } from "@/_pages/account/index.server";
```

### Client error adapter

```ts
export { RecommendationError as default } from "@/_pages/recommendation-detail";
```

### Route Handler adapter

```ts
export const runtime = "nodejs";

export { getVocalProfiles as GET, createVocalProfile as POST } from "@/_app/api-routes/vocal-profiles/index.server";
```

실제 export 이름은 endpoint 의미를 드러내게 하며 `GET`, `POST` 같은 framework 이름은 root adapter에서만 alias한다. 기존 route의 `runtime` 및 다른 Next.js route config는 root special file에 유지해 배포 동작을 명확히 한다.

---

## Steiger 및 package script 계획

### 설정

root `steiger.config.ts`에 공식 recommended config를 적용한다.

```ts
import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

export default defineConfig([...fsd.configs.recommended]);
```

- 실행 root는 `./src`로 고정한다.
- `_app`과 `_pages`는 plugin의 prefixed layer 지원을 사용한다.
- `app`, `tests`, `scripts`, `generated`, `prisma`, `services`는 실행 root 밖이므로 FSD rule 대상이 아니다.
- rule disable은 구현 중 실제 false positive가 확인되고 대안이 없을 때만 최소 glob으로 추가하고 `decisions.md`에 기록한다.

### scripts

```json
{
  "check:architecture": "steiger ./src",
  "check": "pnpm run check:biome && pnpm run lint && pnpm run typecheck && pnpm run check:architecture"
}
```

- F013의 staged-only Husky hook은 변경하지 않는다.
- Steiger는 전체 import graph를 봐야 하므로 pre-commit에 넣지 않고 명시적 전체 `check`에만 연결한다.

---

## 구현 순서

### 1. Architecture 검사와 Shared 기반

- Steiger dependencies/config/script를 추가한다.
- `@/*` alias를 `src/*`로 전환할 준비를 하고 `shared/ui`, `shared/lib`, `shared/config`, `shared/db`, `shared/media`를 이전한다.
- compatibility import가 필요한 중간 상태는 태스크 안에서만 사용하고 태스크 완료 commit에는 build 가능한 경계를 만든다.

### 2. Entity·Feature·Widget 경계

- browser-safe 계약과 자체 persistence를 Entity로 분리한다.
- 여러 entity를 조합하는 auth, analysis, recommendation, mixing use case를 Feature로 올린다.
- home/profile 공용 workbench를 Widget으로, 단일 화면 구현은 Page에 둔다.
- 각 slice의 기본/server public API를 확정하고 Steiger violation을 0으로 만든다.

### 3. Page와 API adapter

- 10개 page와 loading/error/not-found 구현을 `_pages`로 옮긴다.
- 24개 handler 구현을 `_app/api-routes`로 옮기고 root route를 thin adapter로 바꾼다.
- root layout, provider와 global style을 `_app`으로 이전한다.

### 4. Worker·test·script 및 legacy 제거

- worker와 script import를 `_app`, Feature, Entity의 server public API로 전환한다.
- 모든 test import를 새 public API로 전환한다.
- `tsconfig` alias를 `./src/*`로 확정하고 root `components/`, `lib/`와 compatibility re-export를 제거한다.

### 5. 전체 검증과 architecture audit

- Steiger, Biome, ESLint, TypeScript, production build와 전체 test suite를 실행한다.
- root route inventory와 package worker entrypoint가 기준선과 일치하는지 확인한다.
- client entrypoint에서 server-only import가 없는지 정적 검색과 production build로 확인한다.

---

## 테스트 전략

### Architecture 검사

- `pnpm run check:architecture`: recommended FSD rule 오류 0건
- `pnpm run check`: Biome, ESLint, TypeScript, Steiger 통합 통과
- 정적 검색으로 root `components/`, `lib/`, 이전 alias import 및 client→server public API 참조가 없는지 확인

### 단위 테스트

- 기존 38개 test source의 위치와 runner를 유지하고 import만 public API 기준으로 갱신한다.
- vocal profile, audio, key-fit, recommendation, mixing, ticket, admin의 기존 순수 로직 및 UI test를 모두 실행한다.

### 통합 테스트

- 현재 Prisma/DB 조건을 사용하는 auth, vocal-profile, media, recommendation, mixing, ticket, admin integration test를 기존 명령으로 실행한다.
- DB가 필요한 개별 test의 skip/fail 정책은 기존 동작을 바꾸지 않는다.

### Framework 및 production 검증

- `pnpm run build`: 10개 page와 24개 Route Handler가 production build route inventory에 남는지 확인한다.
- `pnpm test`: build 이후 기존 전체 suite와 worker/process script 검증을 통과한다.
- `pnpm run verify:feature-config`: 기능 환경 변수 검증 경계가 유지되는지 확인한다.

### E2E 테스트

- 현재 별도 browser E2E framework가 없으므로 F014에서 추가하지 않는다.
- UI와 API 동작은 기존 integration/UI test 및 Next.js production build를 회귀 기준으로 사용한다.

---

## 위험과 대응

| 위험 | 대응 |
| ---- | ---- |
| 대량 이동 중 import 누락 | 책임별 순차 task commit, TypeScript와 build를 각 checkpoint에서 실행한다. |
| server-only module의 client 유입 | `index.server.ts`, `server-only`, client import 정적 검색과 production build를 함께 사용한다. |
| 과도한 Entity/Feature 분해 | pages-first 및 Steiger `insignificant-slice` 지적에 따라 단일 소비처 코드를 상위 slice로 되돌린다. |
| 같은 레이어 domain 간 순환 | cross-domain orchestration을 Feature 또는 `_app`으로 올리고 Entity는 독립 계약·persistence만 소유한다. |
| root adapter에 구현이 다시 누적 | root special file을 re-export/route config 중심으로 제한하고 최종 정적 검토에 포함한다. |
| beta linter upgrade 변동 | exact version pin과 lockfile을 사용하며 F014 중 자동 major/minor update를 허용하지 않는다. |
| Coolify 배포 회귀 | package start/worker script, 환경 변수, API URL과 DB schema를 변경하지 않고 production build를 필수 검증한다. |

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
- 공식 기준:
  - Feature-Sliced Design Next.js integration 및 pages-first migration
  - Steiger README와 recommended FSD rule source
  - 설치된 Next.js 16.3 project structure, `src` folder, Server/Client Component, Route Handler 문서
