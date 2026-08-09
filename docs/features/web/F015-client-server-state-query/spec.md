# Feature Spec: client-server-state-query

> 기술 스택의 버전, 파일 배치와 구체 설정은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F015
- **기능명**: client-server-state-query
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-09
- **상태**: Approved

---

## 목적

현재 분석, 추천, 믹싱, 개발용 음성 변환과 관리자 티켓 조정 화면은 각 Client Component가 `fetch`, `useEffect`, timer, loading/error state를 개별 구현한다. 동일한 작업 상태를 여러 화면에서 조회해도 캐시와 갱신 기준이 공유되지 않고, polling 중복·해제·terminal 상태 판단 및 mutation 이후 동기화를 화면마다 직접 관리한다. API 응답은 TypeScript 단언에 의존하므로 런타임 계약이 달라도 컴파일 단계에서 발견할 수 없다.

클라이언트의 원격 server state를 TanStack Query로 전환하고, F014에서 확정한 FSD 소유 경계 안에 query key/options, mutation 및 typed API client를 배치한다. Zod를 이용해 Route Handler 입력과 브라우저가 받는 JSON 응답을 런타임 검증하고, MSW fixture로 성공·실패·polling 전이 계약을 재현한다.

이 기능은 데이터 접근 기반을 정리하는 내부 리팩토링이다. 사용자 화면, URL, HTTP method/status/response shape, PostgreSQL schema, server-side DB 조회, worker 및 Coolify 배포 방식은 변경하지 않는다.

---

## 사용자 스토리

### US-1: 일관된 작업 상태를 확인하는 사용자

**As a** 보컬 분석, 곡 추천, 믹싱 또는 개발용 음성 변환을 실행하는 사용자
**I want** 화면 이동과 재조회 중에도 최신 작업 상태를 일관되게 확인하고 싶다.
**So that** 중복 요청이나 멈추지 않는 polling 때문에 상태가 뒤늦게 보이거나 서로 다르게 표시되지 않는다.

**Acceptance Criteria:**

- [x] 기존 Client Component의 원격 JSON 조회와 polling은 TanStack Query query를 사용한다.
- [x] 진행 중 상태만 기존 주기에 맞춰 polling하고 성공·실패·취소 등 terminal 상태에서는 자동 중단한다.
- [x] component unmount 또는 query 비활성화 후 별도 timer나 완료되지 않은 수동 polling loop가 남지 않는다.
- [x] vocal analysis의 기존 localStorage job resume 동작과 새로고침 후 복구가 유지된다.
- [x] Server Component가 전달하는 초기 결과·목록은 첫 화면에 즉시 표시되고 mount 직후 불필요한 중복 조회가 발생하지 않는다.

### US-2: mutation 결과를 바로 확인하는 사용자와 관리자

**As a** 분석·추천·믹싱·변환을 생성 또는 삭제하거나 티켓을 조정하는 사용자 및 관리자
**I want** 요청의 진행·성공·실패 상태와 갱신된 데이터를 즉시 확인하고 싶다.
**So that** 수동 새로고침 없이도 다음 행동을 안전하게 결정할 수 있다.

**Acceptance Criteria:**

- [x] 대상 JSON API mutation은 TanStack Query mutation으로 실행되고 기존 버튼 disable, toast 및 오류 메시지 동작을 유지한다.
- [x] 성공한 mutation은 관련 query cache를 직접 갱신하거나 정확한 query key만 invalidate한다.
- [x] 요청 재시도 가능 여부와 HTTP status가 typed API error로 보존되며, 인증·권한·일반 4xx 오류를 자동 재시도하지 않는다.
- [x] mutation의 요청 URL, payload, idempotency key, status code 및 response shape는 기존 계약을 유지한다.

### US-3: 런타임 API 계약을 신뢰하는 개발자

**As a** copy-singer 개발자
**I want** API 입력과 응답이 공유된 Zod schema에 의해 검증되길 원한다.
**So that** 잘못된 JSON, 누락된 필드와 backend/frontend 계약 drift를 실제 사용 지점에서 명확한 오류로 발견할 수 있다.

**Acceptance Criteria:**

- [x] JSON body, route parameter와 query parameter는 Route Handler 경계에서 Zod로 검증되고 기존 오류 status/shape를 유지한다.
- [x] typed API client는 성공 JSON 응답을 endpoint별 Zod schema로 검증한 뒤 inferred type을 반환한다.
- [x] HTTP 오류 응답과 schema 불일치는 구분 가능한 공통 API error로 정규화되며 사용자에게 raw payload, stack 또는 secret을 노출하지 않는다.
- [x] 기존 수동 type guard·정규식·`as` 단언 중 schema와 중복되는 검증은 제거된다.
- [x] multipart·binary·streaming 경계는 body를 강제로 buffering하지 않고 검증 가능한 metadata, parameter와 JSON 응답만 Zod로 검증한다.

### US-4: 재현 가능한 API 상태를 테스트하는 유지보수자

**As a** copy-singer 유지보수자
**I want** 외부 서버 없이 query와 API client의 주요 상태를 테스트하고 싶다.
**So that** loading, 오류, 재시도, cache 갱신과 polling 종료 회귀를 빠르고 결정적으로 찾을 수 있다.

**Acceptance Criteria:**

- [x] MSW Node fixture가 대표 endpoint의 성공, 인증/권한 오류, retryable 오류 및 계약 불일치 응답을 제공한다.
- [x] 진행 중 응답에서 terminal 응답으로 바뀌는 polling sequence를 test fixture로 재현할 수 있다.
- [x] 테스트별 새 QueryClient와 handler reset으로 cache 및 mock 상태가 다른 테스트에 누출되지 않는다.
- [x] MSW browser worker나 mock runtime은 production bundle과 실제 배포 요청 경로에 포함되지 않는다.

---

## 기능 요구사항

### FR-1: 애플리케이션 Query provider

- `src/_app`의 Client Component provider가 하나의 `QueryClientProvider`를 제공하며 root layout의 필요한 범위만 감싼다.
- browser render 중 QueryClient가 매 render마다 재생성되지 않게 하고, server request 간 cache를 공유하지 않는다.
- 기본 stale time, garbage collection, retry와 focus/reconnect refetch 정책을 명시해 TanStack Query 기본값이 기존 UX를 우연히 바꾸지 않게 한다.
- 인증·권한 오류와 일반 4xx는 재시도하지 않고, network·429·5xx 등 retryable 오류만 제한적으로 재시도한다.
- query cache는 브라우저 storage에 영속화하지 않는다. 기존 분석 job ID resume 정보만 현재 localStorage 정책을 유지한다.

### FR-2: FSD 소유권과 query key/options

- 공통 HTTP parsing, Zod response 적용과 API error 정규화는 `src/shared/api`에 둔다.
- endpoint schema, query key/options와 mutation은 해당 entity 또는 feature의 `api`/`model` segment에 두고 public API로 노출한다.
- query key는 도메인, resource identifier 및 pagination/filter를 안정적으로 포함하고 private 사용자 데이터를 key 자체에 넣지 않는다.
- query key/options factory를 사용해 component와 mutation이 임의 문자열 key를 중복 선언하지 않게 한다.
- Client Component는 query 결과를 화면 상태로 투영하되 원격 응답 전체를 별도 `useState`에 복제하지 않는다.

### FR-3: 조회 및 polling 전환 범위

다음 client-side JSON server state를 query로 전환한다.

| 도메인 | API | 동작 |
| --- | --- | --- |
| 보컬 분석 | `/api/vocal-profiles/health`, `/api/vocal-profile-analysis-jobs`, `/api/vocal-profile-analysis-jobs/:id` | readiness, 목록, 실행 상태 및 결과 조회 |
| 추천 | `/api/recommendations/:id` | 추천·합성 상태 조회와 polling |
| 믹싱 | `/api/mixing-jobs?page=:page` | 사용자 history와 진행 상태 polling |
| 개발용 변환 | `/api/health`, `/api/conversions/:id` | Modal 상태, 변환 작업 polling 및 추천 handoff 조회 |

- 진행 상태 query는 함수형 polling 조건으로 terminal 상태에서 interval을 반환하지 않는다.
- pagination과 resource ID가 바뀌면 서로 다른 cache entry를 사용한다.
- 추천 상세, 믹싱 history와 분석 job 목록의 Server Component 초기 props는 query `initialData` 또는 동등한 hydration 전략으로 연결한다.
- React Server Component의 직접 DB 조회는 client query로 대체하지 않으며 server/client 경계를 넓히지 않는다.

### FR-4: mutation 전환과 cache 동기화

다음 client-side mutation을 TanStack Query mutation으로 전환한다.

- 보컬 분석 제출, vocal profile 삭제, 추천 생성
- 믹싱 생성, 추천 run 삭제
- 개발용 변환 제출 및 삭제
- 관리자 티켓 조정

mutation 성공 시 생성된 resource는 detail/list cache에 반영하고, 삭제·조정 결과는 영향받는 query만 갱신 또는 invalidate한다. 기존 idempotency key, FormData 구성, navigation, localStorage, toast와 버튼 pending 동작은 유지한다. 낙관적 갱신은 롤백 규칙이 명확하고 기존 UX에 필요한 경우에만 사용한다.

### FR-5: Zod request schema

- JSON body를 받는 추천 생성, 믹싱 생성, 티켓 조정 endpoint는 endpoint별 Zod schema로 parse한다.
- UUID resource parameter, pagination query와 검증 가능한 scalar/header 값은 schema를 통해 범위·형식을 검사한다.
- 보컬 분석 multipart는 기존처럼 `formData()`를 사용하되 file presence/type/size 및 scalar metadata 검증을 schema 또는 schema 기반 helper로 일원화한다.
- 개발용 변환 upload proxy는 대용량 audio stream을 그대로 전달해야 하므로 `request.formData()`나 Zod parse를 위해 body를 buffering하지 않는다. content type 등 stream 외부 metadata와 upstream JSON 결과만 검증한다.
- validation 실패는 endpoint가 이미 사용하는 HTTP status와 error envelope를 유지하며 Zod 내부 issue 전체를 client에 노출하지 않는다.

### FR-6: Zod response schema와 typed API client

- query/mutation이 소비하는 모든 JSON success response에 endpoint별 Zod schema를 정의하고 TypeScript type은 가능한 한 `z.infer`에서 파생한다.
- 공통 error envelope는 현재 존재하는 `{ error: ... }`와 `{ detail: ... }` 응답을 읽어 단일 typed API error로 정규화하되 wire format은 바꾸지 않는다.
- response가 성공 status여도 schema와 맞지 않으면 contract error로 처리하고 원본 body를 UI나 log에 그대로 출력하지 않는다.
- API client는 JSON, no-content와 FormData 요청을 지원하지만 audio blob/stream을 JSON helper로 우회시키지 않는다.
- schema는 browser-safe module에 두고 DB model, secret, Node.js 전용 adapter를 re-export하지 않는다.

### FR-7: MSW fixture와 query 테스트 기반

- test runtime에서만 `setupServer`를 시작하고 각 테스트 후 handler와 request state를 초기화한다.
- endpoint handler는 production Zod schema/type과 동일한 계약을 사용하며 success/error/polling sequence override를 지원한다.
- query 테스트는 retry를 끄거나 fake timer를 사용해 시간과 network 상태에 결정적으로 동작한다.
- 최소한 API success parse, malformed response rejection, 4xx no-retry, retryable error 제한, terminal polling 중단 및 mutation cache 동기화를 검증한다.
- fixture는 F016 Storybook에서 재사용할 수 있는 구조로 두되 Storybook addon과 browser worker 연결은 F016 범위로 남긴다.

### FR-8: 호환성 및 회귀 검증

- 기존 API URL, method, authentication/authorization, idempotency semantics, status code와 JSON shape를 유지한다.
- binary audio fetch, download/streaming response, server-to-server Modal/media 호출과 worker polling은 TanStack Query 전환 대상이 아니다.
- 기존 loading/empty/error/accessibility 표현과 사용자 작업 흐름을 유지한다.
- Biome, ESLint, Steiger, TypeScript, 전체 test suite와 production build가 통과해야 한다.
- GitHub Actions `quality.yml`은 연기 상태를 유지하며 F015에서 추가하지 않는다.

---

## 비기능 요구사항

- **성능**: 동일 query key의 동시 요청은 deduplicate되고, 초기 server data가 있는 화면에서 즉시 중복 refetch하지 않아야 한다. polling은 화면과 작업 상태에 필요한 동안에만 실행한다.
- **보안**: 인증된 response cache를 storage에 persist하지 않고 query key·오류 UI·client log에 token, API key, raw private payload를 남기지 않는다. server-only module은 client graph에 포함하지 않는다.
- **신뢰성**: query cancellation/unmount, network 오류, malformed response와 terminal 상태를 결정적으로 처리하고 background timer leak이 없어야 한다.
- **유지보수성**: endpoint 계약의 runtime schema와 compile-time type을 이중 수기 정의하지 않고, query key와 cache 갱신 규칙에 단일 소유 위치가 있어야 한다.
- **호환성**: Next.js 16.3 App Router, React Server Components, React 19.2, TypeScript 5.9, 현재 pnpm/test runtime 및 F014 FSD 규칙과 호환되어야 한다.
- **운영 영향**: 새 외부 서비스, 환경 변수, PostgreSQL migration, Coolify service 또는 배포 단계가 필요하지 않아야 한다.

---

## 범위 제외

- React Server Component의 server-side DB query를 TanStack Query로 대체하는 작업
- audio blob, media streaming, download endpoint와 server/worker 내부 fetch 전환
- API URL, request/response wire schema, status code 또는 인증·권한 정책 변경
- 모든 Route Handler의 전면적인 Zod 변환; 이번 client server-state 흐름과 직접 연결된 endpoint를 우선한다.
- Query cache persistence, offline-first 동기화, optimistic update의 일괄 도입
- Storybook, MSW Storybook addon 및 browser service worker 연결(F016)
- GitHub Actions `quality.yml`, Coolify 배포 pipeline 및 PostgreSQL 구성 변경
- UI redesign, 신규 제품 기능, DB schema·migration 또는 외부 Modal/analyzer 계약 변경

---

## 선행·후속 관계

- **선행 Feature**: F014 fsd-architecture-migration (완료)
- **후속 Feature**: F016 storybook-component-workbench
- F014의 `_app → _pages → widgets → features → entities → shared` 의존 방향과 browser/server public API 분리를 유지한다.
- F016은 이 기능의 browser-safe Zod schema와 MSW fixture를 story 상태 재현에 재사용할 수 있다.

---

## 관련 문서

- PRD: 해당 없음
- PRD Refs: -
- 분류: 내부 데이터 접근 리팩토링 (`NON-PRD`)
- 참고 기준:
  - TanStack Query 공식 Advanced Server Rendering 및 `useQuery` 문서
  - TanStack Query 공식 Important Defaults 문서
  - Zod 공식 Basics 문서
  - MSW 공식 Node 통합 문서
  - 저장소에 설치된 Next.js 16.3 Server and Client Components 문서
