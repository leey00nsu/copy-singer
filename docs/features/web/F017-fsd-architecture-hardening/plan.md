# Implementation Plan: fsd-architecture-hardening

> 이 문서는 승인된 spec.md를 구현 가능한 파일·경계·검증 단위로 구체화합니다.
> canonical docs surface 밖의 unmanaged docs 산출물이 있더라도 최종 SSOT는 이 파일로 유지합니다.

---

## 개요

- **기능 ID**: F017
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-09
- **상태**: Approved
- **변경 성격**: 동작을 보존하는 FSD 경계·문서·로컬 검사 리팩터링

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| 애플리케이션 | Next.js 16.3.0 App Router, React 19.2.8 | 현재 production runtime을 유지하고 루트 `app/`의 framework convention을 보존한다. |
| 아키텍처 기준 | Feature-Sliced Design 최신 Next.js 가이드 | 루트 `app/`과 `src/_app`·`src/_pages`의 역할을 판단하는 정본이다. |
| 기존 구조 검사 | Steiger 0.6.0, `@feature-sliced/steiger-plugin` 0.7.0 | 일반 FSD layer/slice 규칙은 기존 공식 plugin이 계속 담당한다. |
| 보완 구조 검사 | TypeScript 5.9 compiler API + Node `node:test` | 새 dependency 없이 import/export와 `use client` directive를 문법적으로 분석하고 정확한 진단을 만든다. |
| 실행기 | tsx 4.23.7 | 기존 TypeScript Node test 실행 방식을 그대로 재사용한다. |
| 정적 품질 | Biome 2.5.7, ESLint 9.39.4, TypeScript 5.9.3 | 기존 format/lint/typecheck 기준을 변경하지 않는다. |

새 runtime 또는 dev dependency는 추가하지 않는다.

---

## 기준 문서와 확인 사항

- FSD 정본: `https://fsd.how/docs/guides/tech/with-nextjs/`
  - Next.js가 인식하는 루트 `app/`을 유지한다.
  - FSD App/Pages 레이어는 이름 충돌을 피해 `src/_app`, `src/_pages`로 둔다.
  - 루트 route file은 FSD 공개 API를 re-export하거나 호출하는 adapter 역할을 한다.
  - 서버 전용 공개 API는 `index.server.ts`처럼 별도 entry point로 구분한다.
- 설치된 Next.js 16.3 문서:
  - `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
  - `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
  - `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- 현재 Steiger/FSD filesystem 구현은 layer discovery에서는 `_`를 정규화하지만 일부 sliced-layer 판정에서는 실제 basename을 사용한다. 그 결과 `_app`, `_pages`에서 일부 오탐이 발생하고 `_app` route/worker 소비가 `insignificant-slice` 계산에 반영되지 않는다.

---

## 아키텍처 결정

### 1. Next.js adapter와 FSD 레이어를 그대로 분리

```text
app/**                            Next.js routing contract
  └─ re-export / delegate
src/_app/**                       App composition, route handlers, background jobs
  └─ imports
src/_pages/**                     Page composition
  └─ imports
src/widgets/** → src/features/** → src/entities/** → src/shared/**
```

- 루트 `app/`은 routing file과 framework route config만 가진다.
- 실제 Page는 `src/_pages/<slice>/index.server.ts` 또는 client-safe public API에서 가져온다.
- 실제 Route Handler는 `src/_app/api-routes/<segment>/index.server.ts`에서 가져온다.
- `_app`, `_pages`는 공식 호환 패턴이므로 rename하지 않는다.

### 2. 실행 환경별 slice 공개 API

공개 API suffix를 다음처럼 사용한다.

| Entry point | 허용 내용 | 주 소비자 |
| --- | --- | --- |
| `index.ts` | browser-safe UI, client API, 순수 model/type | Client/Server Component |
| `index.model.ts` | Zod schema, 순수 type/value contract | Route Handler, worker, browser test |
| `index.server.ts` | DB, secret, server policy, server use case | Server Component, Route Handler, worker |
| 기존 특수 suffix | 이름에 드러난 제한된 capability | 해당 서버 consumer만 |

- `index.model.ts`는 contract만 export하고 client hook/UI 또는 server module을 끌어오지 않는다.
- 기존 `index.ts` export는 browser consumer 호환을 위해 유지할 수 있지만 server consumer는 가장 좁은 entry point를 사용한다.
- 다른 slice는 `<slice>/<segment>/...`를 import하지 않는다.

적용 대상:

| 현재 import | 목표 import |
| --- | --- |
| `@/features/analyze-vocal-profile/model/contract` | `@/features/analyze-vocal-profile/index.model` |
| `@/features/create-recommendation/model/contract` | `@/features/create-recommendation/index.model` |
| `@/features/manage-tickets/model/contract` | `@/features/manage-tickets/index.model` |

### 3. Authentication server/client 경계

- `admin-policy.ts`는 `process.env.ADMIN_EMAILS`를 직접 읽으므로 `server-only` module로 표시한다.
- `authentication/index.ts`에서 Admin policy export를 제거하고 UI 및 순수 dev-bypass policy만 유지한다.
- `authentication/index.server.ts`는 Admin policy와 server auth/session API를 계속 제공한다.
- Root Layout은 `UserMenu`를 `index.ts`, `isAdminEmail`과 session API를 `index.server.ts`에서 각각 import한다.
- 순수 함수인 `developmentAuthBypassUserId(environment)`는 전달받은 값만 평가하므로 browser-safe model에 남길 수 있다. 실제 `process.env` 접근은 server API가 담당한다.

### 4. Admin 조회 서비스 소유권

공용 Admin 조회 use case의 새 소유자는 `src/features/inspect-admin-operations`로 정한다.

```text
src/features/inspect-admin-operations/
├── api/admin-service.ts          server-only Prisma 조회·집계
└── index.server.ts               server 공개 API
```

- `getAdminOverview`, `listAdminUsers`, `listAdminMixingJobs` 구현을 내용 변경 없이 이동한다.
- `src/_pages/admin/ui/admin-page.tsx`, `src/_app/api-routes/admin/*`, Admin integration test가 Feature의 `index.server.ts`를 사용한다.
- 더 이상 사용하지 않는 `src/_pages/admin/api/`를 제거한다.
- Ticket 조정은 기존 `manage-tickets` Feature가 계속 소유하며 새 Feature에 합치지 않는다.
- 새 Feature는 `_app`·`_pages` consumer가 Steiger의 참조 계산에서 누락되는 현재 한계 때문에 narrow `insignificant-slice` override 대상에 추가한다.

### 5. Steiger 보완 검사

`tests/fsd-architecture-boundaries.test.ts`를 추가해 TypeScript source를 AST로 분석한다.

검사기는 다음 세 규칙을 제공한다.

1. **Slice public API**
   - `src/_pages`, `src/widgets`, `src/features`, `src/entities`의 target slice를 식별한다.
   - target의 `api`, `model`, `ui`, `lib`, `config` segment 안쪽을 다른 slice 또는 상위 layer가 직접 import하면 실패한다.
   - 같은 slice 내부의 상대 import와 slice-root `index*` entry point는 허용한다.
2. **Client-to-server graph**
   - `"use client"` source를 root로 내부 import/re-export graph를 순회한다.
   - `.server` entry, `server-only`, `next/headers`, `next/server`, Shared DB 등 server marker에 도달하면 import chain과 함께 실패한다.
3. **Root App adapter**
   - `app/**/*.{ts,tsx}`의 내부 alias target은 `@/_app` 또는 `@/_pages` 공개 API만 허용한다.
   - top-level에는 `use client` directive, import/export declaration과 Next.js route config 상수만 허용한다.
   - 허용 route config는 현재 Next.js convention의 `runtime`, `preferredRegion`, `dynamic`, `dynamicParams`, `revalidate`, `fetchCache`, `maxDuration`으로 제한한다.
   - 함수·클래스·업무 상수·직접 FSD segment import가 생기면 실패한다.

검사 helper는 실제 저장소 검사와 작은 in-memory fixture 검증에 함께 사용한다. 위반 메시지는 importer, import specifier, 위반 규칙과 가능한 공개 API 경로를 포함한다.

실행 연결:

- `test:architecture-boundaries`: 신규 Node test 단독 실행
- `check:architecture`: 기존 Steiger 이후 신규 test 실행
- `test`: 전체 회귀 suite에 신규 test 포함

Steiger config의 prefix override는 제거하지 않는다. 현재 사각지대와 소비자가 확인된 path만 유지하고, 새 `inspect-admin-operations`만 같은 근거로 추가한다.

---

## 파일 변경 계획

```text
README.md                                               # 현재 FSD Layout 및 규칙
package.json                                            # architecture test scripts
steiger.config.ts                                       # narrow exception 설명/대상
tests/
└── fsd-architecture-boundaries.test.ts                 # AST/source graph 회귀 검사
src/
├── _app/
│   ├── layout/root-layout.tsx                          # auth 공개 API 분리
│   └── api-routes/
│       ├── admin/{overview,users,mixing-jobs}-route.ts # Admin Feature public API
│       ├── admin/ticket-adjustments-route.ts           # manage-tickets model API
│       ├── recommendations/recommendations-route.ts    # recommendation model API
│       └── vocal-profiles/
│           └── vocal-profile-analysis-jobs-route.ts    # analysis model API
├── _pages/admin/
│   ├── ui/admin-page.tsx                               # Admin Feature public API
│   └── api/                                            # 이동 후 제거
└── features/
    ├── analyze-vocal-profile/index.model.ts
    ├── authentication/
    │   ├── index.ts
    │   └── model/admin-policy.ts
    ├── create-recommendation/index.model.ts
    ├── inspect-admin-operations/
    │   ├── api/admin-service.ts
    │   └── index.server.ts
    └── manage-tickets/index.model.ts
```

테스트 import 및 Feature 문서는 이동된 공개 API 경로와 함께 갱신한다. 생성물, Prisma schema/migration, `app/` route path와 Storybook 구성은 변경하지 않는다.

---

## 구현 순서

1. README Layout과 아키텍처 규칙을 현재 구조로 교체한다.
2. 세 Feature에 model public API를 추가하고 route handler의 deep import를 제거한다.
3. authentication Admin policy를 server-only API로 한정하고 Root Layout import를 분리한다.
4. Admin 조회 서비스를 `inspect-admin-operations` Feature로 이동하고 Page, route, integration test import를 갱신한다.
5. TypeScript AST 기반 architecture boundary test와 package script를 추가한다.
6. Steiger override를 재검증하고 현재 필요한 최소 예외 및 근거만 유지한다.
7. 정적 검사, architecture test, 전체 test, Storybook build를 실행하고 문서 evidence를 동기화한다.

각 단계는 tasks.md의 순차 task와 commit checkpoint에 맞춰 작은 단위로 완료한다.

---

## 테스트 전략

### 단위·구조 테스트

- in-memory source fixture로 public API 위반과 정상 slice-root import를 구분한다.
- Client Component의 직접 및 transitive server import를 각각 실패시킨다.
- root App adapter의 re-export/runtime config는 통과하고 함수 선언 또는 내부 segment import는 실패시킨다.
- 실제 `app`, `src`, `scripts` source tree를 같은 검사기로 확인한다.

### 기존 통합 회귀

- `tests/admin-operations.integration.ts`가 이동된 Admin Feature public API를 통해 기존 DB 결과를 검증한다.
- 기존 API contract와 Query test로 schema/public API 변경의 동작 보존을 확인한다.
- 기존 auth integration test로 Admin allowlist와 dev bypass가 보존됨을 확인한다.

### 실행 명령

```bash
pnpm run test:architecture-boundaries
pnpm run check
pnpm run test:admin
pnpm test
pnpm run build-storybook
```

- `pnpm run check`는 Biome, ESLint, TypeScript, Steiger와 신규 architecture boundary test를 포함한다.
- `pnpm test`는 Next.js production build와 기존 Node/Storybook browser 회귀에 신규 architecture test를 더한다.
- DB 환경이 없는 integration test는 기존 skip 정책을 유지하지만 source boundary 검사는 항상 실행된다.
- 별도 E2E 또는 외부 network test는 추가하지 않는다.

---

## 위험과 대응

| 위험 | 대응 |
| --- | --- |
| 공개 API barrel이 client/server graph를 다시 섞음 | `index.model.ts`와 `index.server.ts`를 분리하고 client graph를 transitive 검사한다. |
| Admin 서비스 이동 중 query/serialization 변화 | 구현을 그대로 이동하고 기존 integration/API contract test를 재사용한다. |
| source 검사 오탐으로 정상 Next.js config가 차단됨 | 공식 route config 이름만 명시적으로 허용하고 fixture test로 허용·거부 사례를 고정한다. |
| TypeScript alias/상대 경로 해석 누락 | `@/*`와 상대 import를 모두 절대 source path로 정규화하며 해석 불가 외부 package는 graph 대상에서 제외한다. |
| Steiger upstream 수정 후 override가 불필요해짐 | override 근거와 버전을 기록하고 dependency 갱신 시 `check:architecture`로 제거 가능성을 재평가한다. |

---

## 롤백 전략

- 모든 변경은 source/document/script 수준이며 DB migration이나 외부 상태 변경이 없다.
- model entry point와 import 변경은 기존 slice 내부 구현을 유지하므로 개별 commit 단위로 되돌릴 수 있다.
- Admin 서비스는 파일 이동만 수행하고 호출 계약을 보존해 이전 Page 소유 경로로 복원 가능하다.
- 신규 architecture test/script는 production build/start command와 분리되어 runtime rollback이 필요하지 않다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
- Canonical FSD guide: [Usage with Next.js](https://fsd.how/docs/guides/tech/with-nextjs/)
