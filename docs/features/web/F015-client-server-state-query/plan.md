# Implementation Plan: client-server-state-query

> 승인된 spec.md를 구현 가능한 구조와 검증 순서로 구체화합니다.
> canonical docs surface 밖의 unmanaged docs 산출물이 있더라도 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F015
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-09
- **상태**: Approved
- **선행 조건**: F014 완료 및 FSD architecture 검사 통과
- **변경 성격**: client server-state 및 API contract 내부 리팩토링

기존 화면을 한 번에 다시 작성하지 않고 공통 client/schema 기반 → 도메인별 계약 → query/mutation 전환 → MSW 회귀 검증 순서로 진행한다. 각 도메인 전환이 끝날 때 기존 URL, wire contract, polling terminal 상태 및 사용자 피드백을 검증한다.

---

## 기술 스택

| 구분 | 선택 | 적용 버전 | 이유 |
| --- | --- | --- | --- |
| Server-state | `@tanstack/react-query` | `5.101.4` | query deduplication, cache, polling, cancellation과 mutation lifecycle을 화면별 timer 대신 선언적으로 관리 |
| Runtime schema | `zod` | `4.4.3` | API 입력·응답 runtime parse와 `z.infer` 기반 type 단일화 |
| Network fixture | `msw` | `2.15.0` (devDependency) | Node의 실제 `fetch` 경계를 가로채 API client/query를 wire 수준에서 검증하고 F016 story fixture로 재사용 |
| Test runner | Node.js `node:test` + `tsx` | 기존 Node `>=22.13.0`, `tsx 4.23.7` | 현재 test 체계를 유지하고 별도 Vitest/JSDOM 도입을 피함 |
| Framework | Next.js App Router / React | `16.3.0` / `19.2.8` | 기존 Server/Client Component 경계와 root layout 유지 |

- TanStack Query와 Zod는 production dependency, MSW는 test 전용 devDependency로 설치하고 pnpm lockfile을 함께 갱신한다.
- 새로운 상태관리 라이브러리, query persistence, Devtools 또는 browser mock worker는 추가하지 않는다.

---

## 아키텍처

### 1. Provider와 기본 정책

`src/_app/providers/query-provider.tsx`를 Client Component로 만들고 root layout 안에서 애플리케이션 콘텐츠를 감싼다. QueryClient는 server render마다 격리하고 browser에서는 hydration/render 동안 동일 instance를 재사용한다.

기본 query 정책은 다음과 같이 명시한다.

- 일반 query `staleTime`: 30초. Server Component의 `initialData`가 mount 직후 바로 다시 조회되지 않게 한다.
- browser `gcTime`: 5분. route 이동 직후 돌아왔을 때 짧은 cache 재사용을 허용하되 장기 persistence는 하지 않는다. server render에서는 request별 QueryClient를 폐기하므로 GC timer를 만들지 않게 `Infinity`를 사용한다.
- `refetchOnWindowFocus`: `false`. 기존 화면에 없던 focus refetch를 전역에서 새로 만들지 않는다.
- `refetchOnReconnect`: `true`. offline 이후 stale query가 복구될 수 있게 한다.
- query retry: `ApiError.retryable`이 참인 network/429/5xx만 최대 2회, 그 외 4xx·contract 오류는 0회.
- mutation retry: 기본 0회. idempotency key를 유지하는 mutation도 UI에서 명시적으로 다시 실행한다.
- polling query는 각 도메인의 기존 interval을 override하고 terminal predicate가 참이면 `false`를 반환한다.

Query cache는 local/session storage에 persist하지 않는다. vocal analysis resume은 기존 job ID 한 개만 localStorage에 저장하며 결과 payload는 저장하지 않는다.

### 2. Typed API client

`src/shared/api`에 browser-safe 공통 기반을 둔다.

```text
requestJson(input, init, schema)
  ├─ fetch/network 실패 → ApiError(kind: network, retryable: true)
  ├─ non-2xx 응답 → 기존 error/detail envelope parse
  │                    → ApiError(kind: http, status/code/retryable)
  ├─ invalid JSON/schema → ApiError(kind: contract, retryable: false)
  └─ valid response → schema가 검증한 inferred value
```

- `ApiError`는 `kind`, `status`, `code`, `retryable`과 사용자 표시용 message만 공개한다.
- raw response body와 Zod issue 전체는 UI error나 production client log에 노출하지 않는다.
- JSON request는 `Content-Type`을 자동 지정하고 FormData는 browser가 multipart boundary를 지정하게 둔다.
- `AbortSignal`을 query function에서 그대로 전달해 observer가 사라진 요청을 취소할 수 있게 한다.
- audio/blob/ReadableStream은 이 helper로 읽지 않고 기존 전용 경로를 유지한다.
- 서로 다른 기존 오류 wire format은 client에서만 정규화하며 Route Handler 응답 shape는 바꾸지 않는다.

### 3. Zod 계약 소유권

response schema는 해당 resource의 browser-safe entity model에, action request schema는 해당 feature model에 둔다.

| 소유 위치 | 계약 |
| --- | --- |
| `entities/vocal-profile/model` | profile, analysis job, job list, health 및 오류 response |
| `entities/recommendation/model` | recommendation run/item/synthesis 및 API error response |
| `entities/mixing-job/model` | mixing job, history page 및 오류 response |
| `features/analyze-vocal-profile/model` | analysis FormData metadata/header 규칙 |
| `features/create-recommendation/model` | recommendation 생성 JSON request |
| `features/create-mixing/model` | mixing 생성 JSON request |
| `features/development-conversion/model` | health, conversion job/오류 response와 client upload 설정 |
| `features/manage-tickets/model` | ticket adjustment request/response |

- 기존 수기 response type은 가능한 한 `z.infer<typeof ...Schema>`로 교체한다.
- schema는 현재 wire 값을 허용하는 데 필요한 범위만 정의하고 URL/status/field 명칭을 변경하지 않는다.
- Route Handler는 JSON body, route param, pagination query 및 이미 parse하는 FormData의 검증 가능한 값을 `safeParse`한다.
- Zod validation detail은 기존 endpoint별 `INVALID_REQUEST` 또는 현재 error envelope로 변환한다.
- Modal conversion upload route는 `request.body`를 그대로 upstream에 전달한다. 이 route는 `content-type`과 body 존재만 확인하고, upstream JSON response는 browser client에서 schema 검증한다.

### 4. Query/options와 mutation 배치

각 domain/feature의 `api` segment에 browser API 함수와 query options/key factory를 둔다. component는 public API를 통해서만 소비한다.

| Slice | Query / mutation |
| --- | --- |
| `features/analyze-vocal-profile` | analyzer health, analysis job list/detail, submit analysis |
| `entities/vocal-profile` | profile delete API와 관련 cache helper |
| `entities/recommendation` | recommendation detail query와 delete API |
| `features/create-recommendation` | recommendation 생성 mutation |
| `entities/mixing-job` | paginated history query |
| `features/create-mixing` | mixing 생성 mutation 및 recommendation cache patch |
| `features/development-conversion` | Modal health, conversion detail polling, submit/delete mutation |
| `features/manage-tickets` | ticket adjustment mutation |

key factory는 예를 들어 `vocalProfileKeys.analysisJobs()`, `recommendationKeys.detail(runId)`, `mixingJobKeys.history(page)`, `conversionKeys.detail(jobId)` 형태의 readonly tuple을 반환한다. ID 또는 page가 없는 query는 `enabled`로 제어하고 빈 문자열 key로 요청하지 않는다.

### 5. 화면 전환 규칙

#### Vocal profile workbench와 job cards

- health와 job detail/list를 query로 전환하고 1.5초/3초 polling 주기를 유지한다.
- job detail이 `succeeded` 또는 `failed`가 되면 polling을 중단하고 localStorage ID를 제거한다.
- 성공 profile은 query result에서 화면에 투영하고 관련 list query를 invalidate한다.
- 업로드 준비, recorder, audio object URL과 dialog처럼 브라우저 로컬 UI state는 기존 `useState`/effect를 유지한다.
- job list에서 active job이 사라지는 기존 reload 동작은 완료된 server-rendered profile list를 다시 가져오기 위해 유지한다.

#### Recommendation detail과 mixing

- recommendation detail은 run ID query와 optional `initialData`를 사용한다.
- synthesis가 `preparing|queued|processing`인 item이 하나라도 있으면 5초 polling하고 모두 terminal이면 중단한다.
- mixing mutation 시작 시 해당 item만 `preparing`으로 cache patch하고, 실패 시 endpoint error를 `failed` synthesis로 반영한다.
- 성공 시 recommendation detail과 mixing history를 invalidate해 서버 결과를 다시 받는다.
- recommendation 삭제 성공 후 기존 `/profile` navigation을 유지한다.

#### Mixing history

- Server Component의 첫 page payload를 `initialData`로 전달한다.
- `pending|preparing|submitted|processing` 작업이 있는 동안 5초 polling한다.
- page를 query key에 포함하고 terminal-only page에서는 polling하지 않는다.

#### Development conversion

- local file/settings는 UI state로 유지하고 health, recommendation handoff와 conversion job만 query server-state로 전환한다.
- queued/processing job은 2.5초 polling하고 succeeded/failed에서는 중단한다.
- submit은 FormData를 기존 필드명으로 보내고 Modal proxy stream을 건드리지 않는다.
- job 성공/실패 toast는 terminal 상태 전이 시 한 번만 표시한다.

#### Ticket adjustment

- pending/error는 mutation state를 사용한다.
- 성공 response를 기존 callback에 전달하고 기존 admin server data refresh 방식은 유지한다.

### 6. Server Component 및 hydration 경계

- root에 `HydrationBoundary`를 선제적으로 추가하지 않는다.
- 현재 server에서 이미 가져오는 vocal analysis jobs와 mixing history는 component의 `initialData`로 seed한다.
- recommendation 상세처럼 현재 browser에서만 조회하는 화면은 기존 동작대로 client query를 사용한다.
- 향후 여러 query를 server prefetch해야 할 때만 dehydration/hydration을 별도 결정한다.
- provider는 Client Component지만 `children`으로 전달되는 Server Component를 client 구현으로 변환하지 않는다.

---

## 파일 구조

구체 구현 중 schema 복잡도에 따라 동일 segment 안에서 파일을 더 나눌 수 있으나 소유 레이어와 public API는 아래를 유지한다.

```text
src/
├── _app/
│   ├── layout/root-layout.tsx
│   └── providers/
│       ├── index.ts
│       └── query-provider.tsx
├── entities/
│   ├── vocal-profile/{api,model}/...
│   ├── recommendation/{api,model}/...
│   └── mixing-job/{api,model}/...
├── features/
│   ├── analyze-vocal-profile/{api,model}/...
│   ├── create-recommendation/{api,model}/...
│   ├── create-mixing/{api,model}/...
│   ├── development-conversion/{api,model}/...
│   └── manage-tickets/{api,model}/...
├── shared/
│   └── api/
│       ├── api-error.ts
│       ├── index.ts
│       └── request-json.ts
├── _pages/.../ui/*.tsx
└── widgets/vocal-profile-workbench/ui/vocal-profile-workbench.tsx

tests/
├── client-server-state-query.test.ts
└── msw/
    ├── fixtures.ts
    ├── handlers.ts
    └── server.ts
```

- 새 TypeScript/TSX 파일은 kebab-case로 작성한다.
- `index.ts`/`index.server.ts`에서 browser/server export를 분리하고 server-only module을 client public API에서 re-export하지 않는다.
- root `app/` adapter에는 query/schema 구현을 두지 않는다.

---

## 구현 순서

1. dependency와 Query provider, 공통 typed API client/error를 추가한다.
2. entity/feature별 Zod schema를 추가하고 기존 public response type을 inferred type으로 연결한다.
3. JSON body/param/query를 받는 대상 Route Handler를 Zod 입력 검증으로 교체한다.
4. vocal profile query/mutation과 durable polling을 전환한다.
5. recommendation/mixing query/mutation, initialData 및 cache patch를 전환한다.
6. development conversion과 ticket mutation을 전환한다.
7. MSW Node fixture 및 contract/query 회귀 테스트를 추가한다.
8. 남은 대상 client `fetch`/수동 polling이 없는지 inventory하고 전체 품질·build·test를 검증한다.

각 단계에서 동작 변경과 무관한 대규모 UI 재구성은 피하고, 해당 domain의 schema/client/query/component를 함께 완료한다.

---

## 테스트 전략

### 단위 테스트

- Zod schema가 대표 valid fixture를 parse하고 필수 필드 누락, 잘못된 enum/UUID/page를 거부하는지 검증한다.
- `ApiError`가 network, 4xx, retryable 5xx와 malformed success response를 구분하는지 검증한다.
- domain terminal predicate와 query key가 status/ID/page에 따라 결정적으로 동작하는지 검증한다.
- 기존 pure UI/render test와 local browser-state cleanup test를 유지한다.

### 통합 테스트

- `tests/msw/server.ts`의 `setupServer`로 실제 typed API client의 `fetch`를 intercept한다.
- 테스트마다 새 QueryClient를 만들고 retry delay/poll interval을 짧게 override하며 종료 후 `clear()`한다.
- in-progress → terminal MSW sequence에서 QueryObserver 요청 수가 terminal 이후 증가하지 않는지 검증한다.
- mutation 성공 뒤 detail/list cache patch 또는 invalidation이 의도한 key에만 적용되는지 검증한다.
- 400/401/403/404는 재시도되지 않고 retryable 5xx/network는 최대 횟수만 재시도하는지 검증한다.
- aggregate `pnpm test`에 `test:query` script를 연결한다.

### 정적·회귀 검증

- 대상 Client Component에서 server-state용 직접 `fetch`, `setInterval`, `setTimeout`이 제거됐는지 `rg`로 확인한다. audio/UI timer는 허용 범위를 문서화한다.
- `pnpm run check`로 Biome, ESLint, TypeScript와 Steiger를 실행한다.
- `pnpm run build`로 Next.js Client/Server 경계와 production bundle을 검증한다.
- `pnpm test`로 기존 전체 suite와 신규 MSW/query suite를 검증한다.
- `pnpm audit --prod`로 새 production dependency의 알려진 취약점을 확인한다.

### E2E

- 별도 browser E2E framework는 도입하지 않는다.
- 기존 node/render/integration test와 MSW query test로 리팩토링 회귀를 검증하고, 실제 Modal/PostgreSQL/Coolify 종단 검증은 기존 운영 smoke 절차를 유지한다.

---

## 위험과 대응

| 위험 | 대응 |
| --- | --- |
| Zod schema가 실제 legacy response보다 좁아 정상 응답을 거부 | 기존 serializer/fixture를 기준으로 schema 작성 후 모든 대표 응답을 parse하는 contract test 추가 |
| Query 기본 refetch/retry가 요청량 또는 toast 중복을 늘림 | 전역 기본값을 명시하고 terminal 전이 side effect를 ref로 한 번만 처리 |
| initialData가 장시간 stale하게 유지 | 30초 기본 stale time 후 명시적 invalidation/polling으로 갱신, active job은 domain interval override |
| mutation cache patch가 server truth와 달라짐 | 최소 필드만 임시 patch하고 성공 시 server detail query invalidate |
| Modal stream이 Zod 도입 중 buffering됨 | conversion proxy의 `request.body` 전달 코드를 회귀 기준으로 유지하고 long upload 기존 test 실행 |
| MSW가 production bundle에 포함됨 | `tests/`에서만 import하고 `msw`를 devDependency로 유지 |
| 인증 사용자 데이터 cache가 잔존 | storage persistence 금지, full reload/session navigation 유지, private payload를 query key에 포함하지 않음 |

---

## 배포 및 롤백

- 환경 변수, PostgreSQL migration, worker command 및 Coolify service 구성 변경은 없다.
- build artifact에는 TanStack Query와 Zod runtime만 추가되며 MSW는 production runtime에서 import하지 않는다.
- 문제 발생 시 domain별 component를 이전 fetch 흐름으로 되돌릴 수 있도록 task checkpoint를 기능 단위로 분리한다.
- GitHub Actions `quality.yml` 추가는 계속 연기하고 로컬 `check`, build, test를 승인 근거로 사용한다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
- 공식 참고:
  - TanStack Query Advanced Server Rendering, `useQuery`, Important Defaults
  - Zod Basics
  - MSW Node integration
  - Next.js 16.3 Server and Client Components (local installed docs)
