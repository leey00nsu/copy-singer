# Feature Spec: fsd-architecture-hardening

> 기술 스택의 버전, 파일 배치와 구체적인 검사 구현은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F017
- **기능명**: fsd-architecture-hardening
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-09
- **상태**: Approved

---

## 목적

F014에서 도입한 Feature-Sliced Design 구조는 최신 `fsd.how` Next.js 가이드가 제안하는 방식과 일치한다. 루트 `app/`은 Next.js App Router의 진입점으로 두고, FSD의 App/Pages 레이어는 충돌을 피하기 위해 `src/_app`, `src/_pages`로 배치한다. 따라서 두 디렉터리의 공존이나 `_` 접두사는 제거 대상이 아니다.

다만 현재 저장소에는 구조를 처음 접하는 개발자가 오래된 README를 보고 잘못 이해할 수 있는 문제, slice 내부 segment를 직접 참조하는 import, browser-safe 공개 API에 서버 환경 의존 코드가 함께 노출되는 문제, Page가 소유한 Admin 서비스를 App API route가 역으로 참조하는 문제, 그리고 `_app`·`_pages` 접두사 때문에 Steiger가 일부 규칙과 소비 관계를 정확히 판단하지 못하는 사각지대가 남아 있다.

이 기능은 공식 구조를 보존하면서 문서·공개 API·server/client 경계·서비스 소유권을 정리하고, 현재 도구가 놓치는 핵심 규칙을 저장소 자체 회귀 검사로 보강한다. 사용자 화면, HTTP 계약, PostgreSQL schema, Coolify 배포 구성은 변경하지 않으며 GitHub Actions `quality.yml` 연기 상태도 유지한다.

---

## 사용자 스토리

### US-1: 프로젝트 구조를 이해하는 개발자

**As a** copy-singer에 새로 참여한 개발자
**I want** README에서 Next.js App Router와 FSD 레이어의 역할 및 import 방향을 정확히 확인하고 싶다.
**So that** 루트 `app/`과 `src/_app`·`src/_pages`를 중복 구조로 오해하지 않고 올바른 위치에 코드를 추가할 수 있다.

**Acceptance Criteria:**

- [ ] README가 현재 존재하는 디렉터리를 기준으로 루트 `app/`을 얇은 Next.js adapter, `src/_app`을 애플리케이션 조립 레이어, `src/_pages`를 FSD Pages 레이어로 설명한다.
- [ ] README가 `_app → _pages → widgets → features → entities → shared` 의존 방향과 slice 공개 API 원칙을 설명한다.
- [ ] README가 client-safe, server-only 등 용도별 공개 API entry point 규칙을 설명한다.
- [ ] 문서가 `src/_app`, `src/_pages`의 이름을 최신 `fsd.how` Next.js 가이드와 일치하는 의도적 예외로 명시한다.

### US-2: 안전한 slice 경계를 사용하는 개발자

**As a** 기능과 route를 수정하는 개발자
**I want** 다른 slice의 내부 segment 대신 명시적인 공개 API를 사용하고 싶다.
**So that** 내부 파일 이동이 소비자를 불필요하게 깨뜨리지 않고 browser/server module graph가 섞이지 않는다.

**Acceptance Criteria:**

- [ ] 다른 FSD slice에서 `ui`, `model`, `api`, `lib`, `config` 등의 내부 segment를 직접 import하는 기존 경로가 제거된다.
- [ ] route handler가 필요한 Zod schema와 타입을 해당 Feature의 client-safe/model 공개 API에서 가져온다.
- [ ] 서버 환경 변수나 server-only module에 의존하는 인증 정책은 server 전용 공개 API로만 노출된다.
- [ ] UI와 서버 정책을 함께 사용하는 Server Component는 각 용도에 맞는 공개 API를 분리해 import한다.
- [ ] 변경 후 browser/client module graph에서 server 전용 공개 API가 참조되지 않는다.

### US-3: 올바른 레이어가 서비스를 소유하도록 유지하는 개발자

**As a** Admin 화면과 Admin API route를 함께 유지보수하는 개발자
**I want** 두 진입점이 공유하는 Admin 조회 서비스를 Page 내부가 아닌 재사용 가능한 하위 레이어에서 사용하고 싶다.
**So that** App 레이어가 Page slice 내부 구현을 역으로 참조하지 않고 서비스의 책임과 공개 경계가 명확해진다.

**Acceptance Criteria:**

- [ ] Admin Page와 Admin API route가 함께 사용하는 조회·집계 서비스는 적절한 Feature slice의 server 전용 공개 API가 소유한다.
- [ ] `src/_app`의 Admin route가 `src/_pages/admin` 내부 segment를 직접 import하지 않는다.
- [ ] Admin Page는 이동된 서비스의 server 공개 API를 사용하며 기존 렌더 결과와 권한 동작을 유지한다.
- [ ] Admin overview, users, mixing jobs endpoint의 응답 형태와 오류 의미가 변경되지 않는다.

### US-4: 자동화된 아키텍처 회귀 검사를 실행하는 유지보수자

**As a** FSD 구조를 유지하는 코드 리뷰어
**I want** Steiger가 현재 놓치는 prefix 및 Next.js adapter 경계를 로컬 검사에서 확인하고 싶다.
**So that** 새로운 deep import, client-to-server import 또는 두꺼운 route adapter가 조용히 유입되지 않는다.

**Acceptance Criteria:**

- [ ] 저장소 검사가 FSD slice 외부에서 발생하는 segment deep import를 탐지한다.
- [ ] 저장소 검사가 Client Component에서 server 전용 공개 API 또는 알려진 server-only module로 향하는 import를 탐지한다.
- [ ] 저장소 검사가 루트 `app/` adapter가 허용된 FSD 공개 API를 통해 위임하는 구조인지 검증한다.
- [ ] Steiger의 `_app`·`_pages` prefix 처리 한계 때문에 필요한 override는 최소 범위로 유지되고 이유가 설정 또는 문서에 기록된다.
- [ ] 새 검사는 표준 로컬 quality/test 명령에 포함되고 위반 시 non-zero exit code를 반환한다.

---

## 기능 요구사항

### FR-1: 최신 FSD Next.js 구조를 정본으로 유지

- 구조 판단의 정본은 `https://fsd.how/docs/guides/tech/with-nextjs/`의 최신 Next.js 가이드다.
- 루트 `app/`은 Next.js가 요구하는 routing·metadata·route handler adapter 위치로 유지한다.
- FSD App/Pages 레이어는 각각 `src/_app`, `src/_pages`로 유지한다.
- 루트 `app/` module은 framework contract와 FSD 공개 API 연결에 집중하고 도메인 use case나 영속성 로직을 소유하지 않는다.
- `_app`, `_pages`를 일반 이름으로 바꾸거나 `src/app`을 Next.js router root로 새로 만드는 migration은 수행하지 않는다.

### FR-2: 현재 구조 문서화

- README의 오래된 `components`, `lib/db`, `lib/auth`, `lib/leemage`, `lib/mixing`, `lib/tickets` 중심 Layout 설명을 실제 FSD 구조로 교체한다.
- 각 레이어의 책임, 상위에서 하위로 향하는 의존 방향, slice와 segment의 의미를 간결하게 설명한다.
- 다른 slice의 소비자는 slice root의 공개 API를 통해 접근해야 함을 명시한다.
- 브라우저에 안전한 기본 공개 API와 서버 전용 공개 API를 분리하는 프로젝트 규칙을 설명한다.
- Steiger가 강제하는 범위와 저장소 보완 검사가 담당하는 범위를 구분해 설명한다.

### FR-3: slice 공개 API 정리

- 외부 소비자가 Feature 내부 `model/contract`를 직접 import하는 route handler를 공개 API 기반 import로 전환한다.
- schema/type처럼 runtime server와 browser 양쪽에서 안전하게 공유할 계약은 UI 및 server-only graph와 섞이지 않는 명시적 slice-root entry point에서 노출할 수 있다.
- 기존 `index.ts`, `index.server.ts` 또는 추가되는 용도별 entry point는 이름만으로 실행 환경과 책임을 구분할 수 있어야 한다.
- 동일 slice 내부 구현은 상대 경로를 사용할 수 있지만 다른 slice는 내부 segment 경로를 계약으로 삼지 않는다.
- public API 정리로 기존 export 이름, Zod validation 결과와 HTTP 응답 계약이 바뀌지 않아야 한다.

### FR-4: authentication server/client 공개 경계

- `process.env`를 직접 읽거나 서버 구성에 의존하는 Admin 정책은 authentication의 server 전용 공개 API에서만 export한다.
- browser-safe authentication 공개 API는 Client Component가 실제 사용할 수 있는 UI와 순수 계약만 export한다.
- Root Layout과 다른 Server Component는 authentication UI와 server 정책을 각 공개 API에서 명시적으로 import한다.
- client graph가 server 환경 값이나 `server-only` module을 번들링할 수 있는 재노출 경로를 남기지 않는다.

### FR-5: Admin 서비스 소유권 이동

- Admin Page와 App API route가 공유하는 Admin 조회·집계 use case를 재사용 가능한 Feature slice로 이동한다.
- 새 소유 slice는 server 전용 공개 API를 제공하고 Prisma 및 인증/서버 의존성을 browser-safe API에서 분리한다.
- `src/_pages/admin`은 화면 조합과 Page 전용 presentation을 소유하고 공용 application service를 외부에 제공하지 않는다.
- `src/_app/api-routes/admin`은 Feature의 server 공개 API를 소비하고 Page 내부 `api` segment에 의존하지 않는다.
- 이동은 endpoint path, authorization, database query 의미, 정렬, 집계와 직렬화 결과를 보존해야 한다.

### FR-6: Steiger 보완 회귀 검사

- 현재 버전의 Steiger 및 FSD filesystem/plugin이 underscore-prefixed App/Pages 레이어를 분석할 때 발생하는 오탐·누락을 문서화한다.
- upstream 동작이 교정되기 전까지 `steiger.config.ts` override는 확인된 경로와 규칙에만 제한한다.
- 별도 저장소 검사가 최소한 다음 위반을 탐지한다.
  - 다른 slice의 내부 segment로 향하는 alias deep import
  - Client Component에서 server 전용 entry point로 향하는 import
  - 루트 Next.js adapter가 FSD 내부 segment를 우회 참조하거나 업무 로직을 직접 소유하는 명백한 구조 회귀
- 검사는 source tree의 현재 규칙을 명시적으로 표현하고, 허용 목록이 필요한 경우 이유와 범위를 코드 가까이에 기록한다.
- 새로운 위반 fixture 또는 실제 위반을 추가하면 검사가 결정적으로 실패해야 한다.

### FR-7: 호환성과 회귀 검증

- Biome, ESLint, TypeScript, Steiger, architecture boundary test, 기존 전체 test와 Next.js production build가 통과해야 한다.
- 기존 Storybook build/test와 TanStack Query·Zod·MSW 경계를 깨뜨리지 않아야 한다.
- Next.js route 목록, API path와 payload, PostgreSQL schema 및 migration에는 변경이 없어야 한다.
- Coolify의 Next.js·PostgreSQL 배포 명령이나 환경 변수 요구사항을 추가하지 않는다.
- GitHub Actions `quality.yml`을 생성하거나 변경하지 않는다.

---

## 비기능 요구사항

- **성능**: 아키텍처 정리로 production 요청에 추가 network hop, database query 또는 runtime validation을 도입하지 않는다. source 검사 시간은 기존 로컬 quality 흐름에서 반복 실행 가능한 수준이어야 한다.
- **보안**: 서버 환경 값과 server-only 정책이 browser-safe 공개 API를 통해 재노출되지 않아야 한다. Admin 권한 판정 및 endpoint 보호 수준을 낮추지 않는다.
- **신뢰성**: 구조 검사는 network, database, wall-clock과 무관하게 동일 source에서 결정적인 결과를 반환한다.
- **유지보수성**: 공개 API 이름과 소유 레이어가 실행 환경과 책임을 드러내며, override와 예외는 최소 범위·근거를 함께 가진다.
- **호환성**: 현재 Next.js App Router, F014 FSD 구조, F015 TanStack Query/Zod 계약, F016 Storybook 환경을 유지한다.
- **운영 영향**: 새 runtime dependency, 환경 변수, database migration, Coolify service 또는 CI workflow를 요구하지 않는다.

---

## 범위 제외

- `src/_app`, `src/_pages` 이름 변경 또는 FSD 레이어를 루트 `app/` 아래로 병합
- UI redesign, 신규 사용자 기능 또는 route URL 변경
- API request/response schema 및 PostgreSQL schema 변경
- TanStack Query, Zod, Storybook 사용 범위의 기능적 확장
- Steiger/FSD upstream package fork 또는 외부 issue·PR 생성
- 모든 architecture rule을 위한 범용 TypeScript parser/linter plugin 개발
- Coolify 배포 구성, Docker image 또는 process command 변경
- GitHub Actions `quality.yml` 및 별도 CI pipeline 추가

---

## 선행·후속 관계

- **선행 Feature**: F014 fsd-architecture-migration, F015 client-server-state-query, F016 storybook-component-workbench
- F014가 만든 Next.js adapter/FSD 레이어 구조를 재설계하지 않고 경계를 강화한다.
- F015의 Zod 계약은 공유 runtime contract로 유지하고 route handler의 공개 API 소비 방식을 정리한다.
- F016의 story와 browser test가 server-only graph를 참조하지 않는 production boundary를 유지한다.
- 향후 Steiger가 underscore prefix를 올바르게 분석하면 증거를 확인한 뒤 해당 override와 중복 보완 검사를 축소할 수 있다.

---

## 관련 문서

- PRD: 해당 없음
- PRD Refs: -
- 분류: 내부 아키텍처·개발 품질 개선 (`NON-PRD`)
- 정본: [Feature-Sliced Design — Usage with Next.js](https://fsd.how/docs/guides/tech/with-nextjs/)
- 연관 문서:
  - `../F014-fsd-architecture-migration/`
  - `../F015-client-server-state-query/`
  - `../F016-storybook-component-workbench/`
