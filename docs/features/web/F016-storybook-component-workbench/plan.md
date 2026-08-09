# Implementation Plan: storybook-component-workbench

> 승인된 spec.md를 구현 가능한 구조와 검증 순서로 구체화합니다.
> canonical docs surface 밖의 unmanaged docs 산출물이 있더라도 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F016
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-09
- **상태**: Approved
- **선행 조건**: F015 완료 및 `main` 로컬 통합
- **변경 성격**: UI 개발·접근성·browser interaction test 기반 추가

Storybook 기반을 먼저 수동으로 작게 구성하고, shared primitive → 도메인 display → Query/MSW state → browser test 순서로 확장한다. 자동 initializer가 만드는 demo story나 범용 설정을 그대로 유지하지 않고 현재 FSD public API, Tailwind 4, QueryClient 수명과 Node test runner에 필요한 항목만 명시한다.

---

## 기술 스택

| 구분 | 선택 | 적용 버전 | 이유 |
| --- | --- | --- | --- |
| Component workbench | `storybook` | `10.5.7` | Storybook CLI, manager, Controls와 `storybook/test` interaction API 제공 |
| Next.js framework | `@storybook/nextjs-vite` | `10.5.7` | Next.js 16/React 19를 지원하고 Vitest addon에 필요한 Vite builder 사용 |
| Docs | `@storybook/addon-docs` | `10.5.7` | typed story의 자동 문서·Controls surface 제공 |
| Accessibility | `@storybook/addon-a11y` | `10.5.7` | axe 기반 panel 및 Storybook test 통합 |
| Story test bridge | `@storybook/addon-vitest` | `10.5.7` | CSF story/play 함수를 Vitest browser test로 변환 |
| Network mocking | `msw-storybook-addon` | `3.0.0` | 기존 MSW 2 handler를 Storybook browser worker에 연결 |
| Browser test | `vitest`, `@vitest/browser`, `@vitest/browser-playwright`, `@vitest/runner` | `4.1.10` | 별도 Storybook project와 real browser mode 실행 |
| Browser automation | `playwright` | `1.62.1` | headless Chromium provider 및 로컬 browser binary 관리 |
| Vite | `vite` | `8.2.1` | Next.js Storybook framework 및 Vitest browser plugin peer 충족 |

- 위 패키지는 모두 devDependency로 설치한다. F015의 `msw@2.15.0`은 그대로 재사용한다.
- Storybook 패키지는 같은 `10.5.7`로 고정해 addon/core version drift를 막는다.
- Storybook이 권장하는 Vite framework를 사용하며 Webpack builder, Jest test-runner, jsdom과 hosted visual service는 추가하지 않는다.
- Playwright Chromium binary는 패키지 설치와 별도로 `pnpm exec playwright install chromium`으로 준비한다.

---

## 아키텍처

### 1. Storybook 실행 경계

```text
package scripts
  ├─ storybook           → Storybook dev server (Vite, port 6006)
  ├─ build-storybook     → storybook-static/ 정적 산출물
  └─ test:storybook      → Vitest project "storybook" → Playwright Chromium

.storybook/main.ts
  ├─ framework: @storybook/nextjs-vite
  ├─ addons: docs, a11y, vitest
  ├─ stories: src/**/*.stories.ts(x)
  └─ staticDirs: .storybook/public only

.storybook/preview.tsx
  └─ addons: MSW CSF Next preview annotation
```

`storybook-static/`은 `.gitignore`에 추가한다. Next.js `public/`에는 MSW worker를 두지 않아 `pnpm build`와 Coolify production artifact가 mock file을 제공하지 않게 한다.

### 2. Preview provider

`.storybook/preview.tsx`에서 전역 CSS를 불러오고 아래 순서로 story를 감싼다.

```text
Story
  └─ per-story QueryClientProvider
       └─ app router navigation mock
            └─ toast/portal host가 필요한 UI
```

- QueryClient는 story mount마다 `createQueryClient(false)`로 생성하고 unmount 시 clear한다.
- retry/polling/stale policy는 production factory를 재사용하되 cache instance는 production browser singleton과 공유하지 않는다.
- preview parameter의 `nextjs.appDirectory = true`로 App Router component를 지원한다.
- 전역 CSS는 `src/_app/styles/globals.css` 한 곳만 import해 Tailwind token과 production theme를 동일하게 유지한다.
- story별 viewport/background/route는 parameter로 override하고 production component에 Storybook 분기를 넣지 않는다.

### 3. Story 소유 위치와 FSD

story는 대상 component 옆에 kebab-case로 둔다.

```text
src/shared/ui/button/button.stories.tsx
src/entities/ticket/ui/ticket-ledger.stories.tsx
src/widgets/vocal-profile-workbench/ui/long-audio-dialog.stories.tsx
src/_pages/.../<query-ui>.stories.tsx
```

- component는 해당 slice의 public API에서 import하고 server-only index를 사용하지 않는다.
- story fixture가 domain contract를 필요로 하면 browser-safe entity/feature model type을 사용한다.
- 순수 display story를 위해 분리가 필요하면 동일 slice 안에서 presentation boundary만 추출하고 page/server data fetch는 포함하지 않는다.
- Steiger가 story import까지 검사하도록 별도 ignore를 추가하지 않는다.

### 4. MSW fixture 재사용

F015의 `tests/msw`를 다음 역할로 유지·정리한다.

```text
tests/msw/fixtures.ts   # pure JSON fixtures, production inferred types 사용
tests/msw/handlers.ts   # runtime-neutral MSW handlers/factory
tests/msw/server.ts     # Node setupServer 전용
.storybook/preview.tsx # browser addon 초기화 + runtime-neutral handlers 사용
```

- `server.ts`의 `msw/node` import가 Storybook graph에 들어가지 않게 한다.
- browser story가 공통 fixture에 접근할 수 있도록 TypeScript/Vite가 동일 root file을 해석하되 production entry에서 re-export하지 않는다.
- handler factory는 호출할 때마다 sequence cursor를 새로 만들며 addon의 story reset lifecycle과 함께 상태를 격리한다.
- `.storybook/public/mockServiceWorker.js`만 생성하고 `main.ts`의 `staticDirs`로 Storybook에서 제공한다.

### 5. Story coverage 전략

한 파일에 variant를 과도하게 늘리지 않고 의미 있는 상태를 묶는다.

| 묶음 | 우선 story | 검증 포인트 |
| --- | --- | --- |
| Shared actions | Button, Badge, Switch, Slider | variant, disabled, accessible name, click/change |
| Shared layout | Card, Progress, Separator, Collapsible, Tooltip, Label | composition, open/closed, keyboard/ARIA |
| Media/data | AudioWaveformPlayer, TicketLedger, VocalProfileResults | empty/data/error-like presentation, stable fixture |
| Widget/form | LongAudioDialog 또는 Recorder, TicketAdjustmentFields | open/confirm, pending/disabled, form semantics |
| Query UI | active/success/error가 있는 대표 component | Query cache isolation, MSW handler, polling terminal |

단순 wrapper story를 모두 만들기보다 실제 상태·interaction·a11y 가치가 있는 story를 우선한다. Chart/Sonner는 직접 consumer story에서 coverage가 충분하면 별도 story를 생략하고 근거를 tasks/decisions에 기록한다.

### 6. Accessibility와 interaction

- preview의 a11y test mode를 `error`로 설정해 Vitest 실행에서 axe violation을 실패로 처리한다.
- Storybook test addon이 지원하는 `play` 함수에서 `canvas`, `userEvent`, `expect`를 사용한다.
- role/label/text 기반 query를 사용하고 CSS selector나 내부 implementation detail을 assertion으로 삼지 않는다.
- portal UI는 `within(document.body)` 또는 Storybook이 제공하는 canvas/body query를 목적에 맞게 구분한다.
- polling story는 MSW sequence factory와 명시적 `waitFor`를 사용하고 고정 sleep에 의존하지 않는다.

### 7. Vitest project 분리

root `vitest.config.ts`에 `storybook` project만 정의한다. 기존 Node 테스트는 package script에서 `tsx --test`를 계속 사용하므로 Vitest에 이관하지 않는다.

```text
vitest.config.ts
  └─ projects[storybook]
       ├─ storybookTest({ configDir: .storybook })
       ├─ browser.enabled = true
       ├─ provider = playwright({})
       ├─ instances = [{ browser: "chromium" }]
       └─ headless = true
```

Storybook 10.5.7의 `storybookTest` plugin이 `.storybook/preview.tsx` annotation을 test runtime에 직접 적용하므로 별도 setup file을 중복 생성하지 않는다. DB `.env`, Prisma setup 또는 Node integration global을 로드하지 않는다.

---

## 파일 구조

```text
.
├── .storybook/
│   ├── main.ts
│   ├── preview.tsx
│   └── public/
│       └── mockServiceWorker.js
├── src/
│   ├── shared/ui/**/**.stories.tsx
│   ├── entities/**/ui/**.stories.tsx
│   ├── features/**/ui/**.stories.tsx
│   ├── widgets/**/ui/**.stories.tsx
│   └── _pages/**/ui/**.stories.tsx
├── tests/msw/
│   ├── fixtures.ts
│   ├── handlers.ts
│   └── server.ts
├── vitest.config.ts
├── package.json
├── pnpm-lock.yaml
└── .gitignore
```

실제 story 파일 수와 대상은 component API를 확인하며 조정하되 spec의 필수 경계와 상태를 빠뜨리지 않는다.

---

## 테스트 전략

### Storybook 기반

- `pnpm run storybook --ci --smoke-test`: dev config/preview startup smoke
- `pnpm run build-storybook`: 모든 story의 Vite production bundle 및 static worker 포함 확인
- `pnpm run test:storybook --run`: Playwright Chromium에서 render, play, a11y test 실행
- Story별 QueryClient/handler reset과 active→terminal transition을 browser assertion으로 확인

### 기존 회귀

- `pnpm run test:query`: F015 Node MSW/query 계약이 browser fixture 정리 후에도 통과
- `pnpm run check`: Biome, ESLint, TypeScript, Steiger 통과
- `pnpm run build`: Next.js production build가 Storybook devDependency/config와 분리됨을 확인
- `pnpm test`: 기존 unit/integration/UI 전체 suite 및 새 Storybook test 연결 정책 검증
- `pnpm audit --prod`: production dependency 취약점이 Storybook 도입으로 증가하지 않음을 확인

Storybook browser test는 기본 `pnpm test`에 포함해 로컬 전체 회귀에서 누락되지 않게 하되, Playwright binary가 필요한 점을 README 또는 package script 오류로 명확히 드러낸다. `quality.yml`은 추가하지 않는다.

---

## 구현 순서

1. Storybook/Vite/Vitest/Playwright dependency, config, script와 전용 worker 기반을 추가한다.
2. shared UI primitive story와 Controls/interaction을 작성한다.
3. entity/feature/widget display story를 작성하고 필요한 presentation 경계를 최소 추출한다.
4. F015 MSW fixture와 Query state story를 browser runtime에 연결한다.
5. accessibility/browser test, static build와 전체 production 회귀를 확정한다.

---

## 배포·운영 영향

- Coolify의 Next.js server command, PostgreSQL service, environment variable과 health check는 변경하지 않는다.
- `storybook-static`은 로컬 산출물이며 별도 Coolify service나 production image publish 대상으로 취급하지 않는다.
- `.storybook/public/mockServiceWorker.js`는 Storybook static build에만 복사되고 Next.js `public`에는 포함되지 않는다.
- CI 도입은 연기 상태다. 향후 `quality.yml`을 추가할 때 local script를 job에 연결할 수 있다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
- 선행 Feature: `../F015-client-server-state-query/`
- 공식 기준: Storybook Next.js Vite, Vitest addon, accessibility testing, network mocking 문서
