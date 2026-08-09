# Feature Spec: fsd-architecture-migration

> 기술 스택과 구체 명령은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F014
- **기능명**: fsd-architecture-migration
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-09
- **상태**: Approved

---

## 목적

현재 `app/`, `components/`, `lib/`에 라우팅, 화면 조립, 사용자 기능, 도메인 모델, DB 및 외부 서비스 코드가 혼재되어 있어 변경 영향 범위와 client/server 경계를 파악하기 어렵다. 10개 UI route, 24개 Route Handler와 기존 worker·test의 동작을 유지하면서 프론트엔드 코드를 Feature-Sliced Design(FSD) 구조로 이전한다.

Next.js 루트 `app/`은 URL과 framework convention만 담당하는 얇은 어댑터로 제한하고, 실제 페이지·API 처리·기능·도메인·공통 코드는 `src/`의 FSD 레이어로 분리한다. FSD의 하향 import, slice 간 public API 및 client/server 공개 API 경계를 Steiger로 검사해 이후 F015의 TanStack Query·Zod 도입과 F016의 Storybook 도입이 안정된 구조 위에서 진행되게 한다.

이 기능은 내부 아키텍처 리팩토링이며 사용자 동작, URL, HTTP 계약, DB schema 및 배포 방식을 변경하지 않는다.

---

## 사용자 스토리

### US-1: 변경 위치를 빠르게 찾는 개발자

**As a** copy-singer 개발자
**I want** 페이지, 사용자 기능, 도메인 모델과 공통 기반 코드의 소유 위치를 일관된 규칙으로 찾고 싶다.
**So that** 새 기능을 추가하거나 수정할 때 관련 없는 파일을 탐색하고 함께 변경하는 비용을 줄일 수 있다.

**Acceptance Criteria:**

- [ ] 애플리케이션 코드는 `src/_app`, `src/_pages`, `src/widgets`, `src/features`, `src/entities`, `src/shared` 중 실제 책임에 필요한 레이어에 배치된다.
- [ ] FSD의 pages-first 원칙을 적용해 페이지 전용 코드는 우선 해당 `_pages` slice에 유지하고, 둘 이상의 소비처가 있는 명확한 사용자 기능·도메인·대형 UI 조합만 하위 레이어로 추출한다.
- [ ] 기존 루트 `components/`와 `lib/`는 제거되고, 테스트·worker·script를 포함한 모든 내부 import가 새 소유 위치를 가리킨다.
- [ ] 사람이 작성하는 새 TypeScript/TSX 파일은 kebab-case를 사용하며 Next.js special file과 dynamic route segment 명명은 유지된다.

### US-2: 의존성 경계를 신뢰하는 유지보수자

**As a** copy-singer 유지보수자
**I want** 레이어 역방향 import, 같은 레이어의 slice 간 결합과 내부 파일 우회 import를 자동으로 검출하고 싶다.
**So that** 디렉터리 구조가 시간이 지나며 다시 느슨한 `components`/`lib` 구조로 퇴행하지 않게 할 수 있다.

**Acceptance Criteria:**

- [ ] 상위 레이어는 자신보다 아래 레이어만 import하며, 같은 레이어의 서로 다른 slice를 직접 import하지 않는다.
- [ ] slice 외부 소비자는 해당 slice 또는 Shared segment의 public API를 통해서만 import한다.
- [ ] Steiger 권장 FSD 검사가 `src/`를 대상으로 오류 없이 통과한다.
- [ ] Steiger 검사는 기존 로컬 통합 품질 명령에 포함되며 한 건의 architecture error라도 있으면 명령이 실패한다.
- [ ] architecture 검사 예외가 필요하면 파일별 임시 회피가 아니라 사유와 범위를 설정 및 `decisions.md`에 기록한다.

### US-3: client/server 경계를 안전하게 유지하는 개발자

**As a** Next.js 개발자
**I want** Client Component가 DB, secret 또는 Node.js 전용 모듈을 간접 import하지 않도록 공개 API를 분리하고 싶다.
**So that** 구조 이동 후에도 secret 노출과 client bundle build 오류를 방지할 수 있다.

**Acceptance Criteria:**

- [ ] browser에서 안전한 export는 기본 `index.ts`, server 전용 export는 `index.server.ts`로 분리한다.
- [ ] DB, 인증 검증, 환경 변수, media storage, queue·worker 및 외부 server adapter 진입점은 `server-only` 경계를 유지하거나 추가한다.
- [ ] `"use client"` 파일에서 server 전용 public API 또는 server 전용 내부 모듈로 이어지는 import 경로가 없다.
- [ ] root `app/`의 page와 Route Handler는 FSD public API를 조립하거나 re-export하는 얇은 framework adapter가 된다.

### US-4: 리팩토링 전후 동작을 동일하게 사용하는 사용자와 운영자

**As a** copy-singer 사용자 및 운영자
**I want** 내부 폴더가 바뀌어도 기존 화면, API, background worker와 데이터가 동일하게 동작하길 원한다.
**So that** Coolify 배포와 서비스 이용에 별도 마이그레이션이나 중단이 필요하지 않다.

**Acceptance Criteria:**

- [ ] 기존 10개 UI route의 URL, 인증·관리자 보호, loading/error/not-found 처리와 렌더링 동작이 유지된다.
- [ ] 기존 24개 Route Handler의 URL, HTTP method, runtime 선언, status code 및 response shape가 유지된다.
- [ ] mixing 및 vocal-profile analysis worker의 실행 명령과 처리 동작이 유지된다.
- [ ] DB schema, migration, 환경 변수 이름, 외부 서비스 계약과 Coolify 배포 구성이 변경되지 않는다.
- [ ] production build, 전체 기존 test suite, Biome, ESLint, TypeScript 검사가 통과한다.

---

## 기능 요구사항

### FR-1: Next.js framework adapter와 FSD 코드 분리

- Next.js App Router의 특수 디렉터리인 루트 `app/`은 유지한다.
- 루트 `app/`에는 `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx` 등 framework convention과 최소한의 route config만 둔다.
- 페이지 구현은 `src/_pages/<page-slice>`의 public API에서 가져오고, Route Handler 구현은 `src/_app/api-routes`의 public API에서 가져온다.
- root adapter에는 비즈니스 규칙, DB query, request validation helper 또는 재사용 UI 구현을 새로 두지 않는다.
- FSD의 `app`/`pages` 레이어와 Next.js 특수 폴더의 이름 충돌을 피하기 위해 FSD 레이어 이름은 `_app`과 `_pages`를 사용한다.

### FR-2: pages-first 레이어 및 slice 분류

- `src/_app`은 전역 provider·style·설정·API route composition 등 애플리케이션 구동 책임을 가진다.
- `src/_pages`는 route 단위 화면 조립과 해당 페이지에만 필요한 UI·model·server query를 가진다.
- `src/widgets`는 둘 이상의 페이지에서 재사용되는 독립적인 대형 UI/기능 조합이 확인된 경우에만 사용한다.
- `src/features`는 로그인, 분석 제출, 합성 요청 등 사용자가 수행하는 재사용 가능한 행동을 slice로 표현한다.
- `src/entities`는 user, ticket, vocal-profile, recommendation, mixing-job처럼 여러 상위 소비처가 공유하는 도메인 표현과 규칙을 slice로 표현한다.
- `src/shared`는 business domain에 종속되지 않은 UI primitive, 범용 lib, API 기반, config, DB 및 외부 adapter를 목적별 segment로 나눈다.
- 단일 소비처 코드나 아직 경계가 불명확한 코드는 상위 page에 유지해 과도한 slice 및 public API 생성을 피한다.

### FR-3: 단방향 의존성과 public API

- 레이어 의존 방향은 `_app → _pages → widgets → features → entities → shared`로 제한한다.
- `_app`과 `shared`를 제외한 레이어는 업무 의미의 slice 아래에 `ui`, `model`, `api`, `lib`, `config` 등 목적 기반 segment를 둔다.
- 다른 slice에서 소비하는 export는 slice root의 `index.ts` 또는 `index.server.ts`에 명시한다.
- Shared는 layer 전체 barrel을 만들지 않고 각 segment 또는 필요 시 segment group 단위의 public API를 제공한다.
- 같은 slice 내부 import는 상대 경로를 사용하고, slice 밖 import는 `@/` alias와 public API를 사용한다.
- tests, scripts, workers도 가능한 한 production public API를 소비하며 내부 파일 접근이 꼭 필요한 테스트는 해당 slice 내부 구조에 맞춰 위치 또는 접근 방식을 명시한다.

### FR-4: client/server 공개 API 보호

- client/server 양쪽에서 안전한 type, 순수 함수와 Client Component는 기본 `index.ts`에서 export할 수 있다.
- DB access, secret을 읽는 설정, server 인증, Node.js 전용 처리, Server Component와 Route Handler는 `index.server.ts`에서만 export한다.
- server 전용 모듈의 진입점은 `server-only` side effect를 사용해 client module graph 유입 시 build 단계에서 실패하게 한다.
- 동일 slice의 browser-safe public API가 server 전용 module을 transitively re-export하지 않게 한다.
- API response type처럼 양쪽에서 공유해야 하는 계약은 browser-safe model에 두되 실제 persistence 또는 외부 호출 구현과 분리한다.

### FR-5: Steiger architecture 검사

- 공식 FSD plugin의 recommended rules를 기반으로 `src/`의 layer, slice, segment, import와 public API 규칙을 검사한다.
- Next.js 통합을 위한 `_app`, `_pages` 명명과 framework adapter 구조를 인식하는 설정을 사용한다.
- generated output, external service source, migration, fixture 등 FSD 애플리케이션 코드가 아닌 경로는 검사 대상에서 제외한다.
- migration 완료 기준은 신규 architecture error 0건이며, 장기적인 broad disable 또는 무기한 warning baseline을 두지 않는다.
- architecture 전용 script를 제공하고 F013의 로컬 `check` 명령에 연결한다. Husky pre-commit의 staged-only 원칙은 유지하며 Steiger 전체 검사를 hook에 추가하지 않는다.

### FR-6: kebab-case 및 framework convention 유지

- 이동 또는 생성하는 TypeScript/TSX 구현 파일은 F013의 kebab-case 규칙을 따른다.
- `index.ts`, `index.server.ts`, Next.js special file, `[id]`, `[...all]` 등 도구와 framework가 요구하는 이름은 예외로 유지한다.
- import 대소문자와 실제 파일명이 모든 지원 filesystem에서 일치해야 한다.

### FR-7: 무중단 구조 이전과 회귀 검증

- 파일 이동은 동작 변경과 섞지 않고, 필요하면 shared 기반 → page 조립 → domain/feature 경계 → adapter 정리 순으로 점진 수행한다.
- 기존 root `app/` route inventory와 package script entrypoint를 기준선으로 고정한다.
- 이동 후 root `components/`, `lib/` 및 임시 compatibility re-export는 남기지 않는다.
- 변경된 import를 사용하는 production code, tests, scripts와 workers를 함께 갱신한다.
- 최종적으로 architecture 검사, 전체 정적 검사, production build와 기존 회귀 suite가 모두 통과해야 한다.

---

## 비기능 요구사항

- **성능**: 구조 이동만으로 client JavaScript bundle이 불필요하게 증가하지 않아야 하며, 큰 Client Component 경계를 상위로 확장하지 않는다.
- **보안**: secret, DB client, privileged auth 및 server 전용 외부 adapter가 client module graph에 포함되지 않아야 한다.
- **결정성**: pnpm lockfile과 저장소의 FSD/Steiger 설정을 기준으로 개발자별 architecture 검사 결과가 일치해야 한다.
- **유지보수성**: 새 slice 이름은 business language를 사용하고 `components`, `hooks`, `types`처럼 구현 형태만 나타내는 slice 이름을 사용하지 않는다.
- **호환성**: Next.js 16.3 App Router, React Server Components, React 19.2, TypeScript 5.9 및 현재 Node/pnpm 실행 조건과 호환되어야 한다.
- **회귀 방지**: 사용자 UI, 접근성 의미, API 계약, DB schema, worker 처리 및 운영 환경 변수에 의도하지 않은 변경이 없어야 한다.

---

## 범위 제외

- F015의 TanStack Query, MSW, Zod 도입 및 기존 `fetch` 흐름 재설계
- F016의 Storybook, story 작성, visual/a11y story 검사
- GitHub Actions `quality.yml` 및 Coolify 배포 pipeline 변경
- API URL, request/response schema, HTTP status 또는 인증 정책 변경
- Prisma schema·migration, PostgreSQL 데이터 이전 또는 외부 media/analyzer 계약 변경
- mixing·vocal-profile worker의 처리 알고리즘 변경
- FSD 도입을 이유로 한 UI redesign 또는 신규 제품 기능
- backend를 별도 package/repository로 분리하는 monorepo 전환

---

## 선행·후속 관계

- **선행 Feature**: F013 frontend-quality-foundation (완료)
- **후속 Feature**: F015 → F016
- F013의 Biome·ESLint·TypeScript·Husky 기반을 유지하고 로컬 `check`에 architecture 검사를 확장한다.
- F015는 이 기능에서 확정한 `api`/`model`/client-server public API 경계 위에 TanStack Query, MSW와 Zod를 배치한다.
- F016은 이 기능에서 확정한 `shared/ui`, entity/feature/page UI public API를 기준으로 story를 작성한다.

---

## 관련 문서

- PRD: 해당 없음
- PRD Refs: -
- 분류: 내부 아키텍처 리팩토링 (`NON-PRD`)
- 참고 기준:
  - Feature-Sliced Design 공식 Next.js 가이드
  - Feature-Sliced Design 공식 layers/public API/migration 가이드
  - Steiger 공식 recommended FSD rules
  - 저장소에 설치된 Next.js 16.3 App Router project structure 및 client/server component 문서
