# Feature Spec: storybook-component-workbench

> 기술 스택의 버전, 파일 배치와 구체 설정은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F016
- **기능명**: storybook-component-workbench
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-09
- **상태**: Approved

---

## 목적

현재 shared UI와 핵심 도메인 컴포넌트는 실제 Next.js 화면 또는 개별 server-render test 안에서만 확인할 수 있다. loading, empty, error, active, terminal 같은 상태를 비교하려면 애플리케이션·PostgreSQL·외부 API 조건을 준비해야 하며, 컴포넌트별 접근성과 사용자 상호작용을 브라우저에서 반복 검증하는 표준 작업대가 없다.

Next.js App Router에 맞는 Vite 기반 Storybook을 도입해 재사용 UI와 핵심 entity/widget 상태를 애플리케이션 밖에서 탐색한다. F015의 browser-safe Zod 계약과 MSW fixture를 재사용해 실제 backend 없이 Query 상태를 재현하고, Storybook 접근성 검사와 Vitest browser mode interaction test로 대표 흐름을 검증한다.

이 기능은 개발·테스트 도구 도입이다. 실제 사용자 화면, Next.js production bundle, API/DB 계약, Coolify의 Next.js·PostgreSQL 배포 구성은 변경하지 않는다. GitHub Actions `quality.yml`은 연기 상태를 유지한다.

---

## 사용자 스토리

### US-1: 격리된 UI 상태를 탐색하는 개발자

**As a** copy-singer UI 개발자
**I want** shared UI와 핵심 도메인 컴포넌트의 대표 상태를 Storybook에서 즉시 열어보고 싶다.
**So that** 전체 애플리케이션과 backend를 실행하지 않고도 구현·리뷰·회귀 확인을 빠르게 할 수 있다.

**Acceptance Criteria:**

- [ ] Storybook dev server와 정적 build가 현재 Next.js App Router, React, Tailwind 전역 스타일 및 `@/*` alias 환경에서 동작한다.
- [ ] shared UI primitive의 기본, variant, disabled 및 상호작용 상태가 Controls로 탐색 가능하다.
- [ ] 핵심 entity/widget은 empty, loading 또는 active, success, error 같은 실제 사용자-visible 상태를 story로 제공한다.
- [ ] story는 server-only DB, secret, 실제 외부 API 또는 사용자 production data를 import하지 않는다.

### US-2: 상호작용과 접근성을 검증하는 유지보수자

**As a** copy-singer 유지보수자
**I want** 대표 story의 사용자 행동과 접근성 오류를 실제 Chromium 환경에서 자동 확인하고 싶다.
**So that** component 변경이 버튼·폼·키보드·ARIA 동작을 깨뜨리는 회귀를 merge 전에 찾을 수 있다.

**Acceptance Criteria:**

- [ ] 접근성 addon이 story별 axe 결과를 표시하고 자동 test 실행에서 위반을 실패로 처리한다.
- [ ] 대표 interactive story는 `play` 함수로 클릭, 입력, 상태 변화와 disabled 동작을 검증한다.
- [ ] Vitest Storybook project가 Playwright Chromium browser mode에서 headless로 실행된다.
- [ ] 기존 Node `node:test` suite와 Storybook browser test의 설정·cache·실행 명령이 서로 충돌하지 않는다.

### US-3: server state를 결정적으로 재현하는 개발자

**As a** Query 기반 화면을 개발하는 개발자
**I want** 성공, 권한 오류, retryable 오류와 polling 전이를 story 단위로 선택하고 싶다.
**So that** 실제 API 응답 타이밍에 의존하지 않고 각 UI 상태를 반복해서 확인할 수 있다.

**Acceptance Criteria:**

- [ ] Storybook 전용 MSW browser runtime이 story 시작 시 활성화되고 story 전환 후 handler state가 초기화된다.
- [ ] F015의 production Zod schema/type과 대표 MSW fixture를 복제하지 않고 재사용한다.
- [ ] story별 handler override로 success, error 및 active→terminal sequence를 재현할 수 있다.
- [ ] 각 story/test는 격리된 QueryClient를 사용해 이전 story의 인증 응답·mutation·polling cache가 누출되지 않는다.

### US-4: production과 분리된 도구를 운영하는 배포 담당자

**As a** Coolify로 Next.js와 PostgreSQL을 배포하는 운영자
**I want** Storybook 도구와 mock worker가 production 애플리케이션에 영향을 주지 않길 원한다.
**So that** 개발 도구를 도입해도 배포 이미지, API 경로와 실제 사용자 요청이 바뀌지 않는다.

**Acceptance Criteria:**

- [ ] Storybook, Vitest, Playwright, 접근성 addon과 browser MSW 연결은 devDependency 및 별도 script/config로만 존재한다.
- [ ] MSW service worker는 Storybook 전용 static directory/build에만 포함되고 Next.js `public` 및 production bundle에는 포함되지 않는다.
- [ ] 기본 `pnpm build`, `pnpm test`, `pnpm start`와 Coolify service 구성이 Storybook 실행을 요구하지 않는다.
- [ ] Storybook publish, Chromatic·외부 visual regression service와 GitHub Actions `quality.yml`은 이번 범위에 포함하지 않는다.

---

## 기능 요구사항

### FR-1: Next.js Vite Storybook 기반

- Vite builder를 사용하는 Next.js용 Storybook framework를 사용한다.
- `.storybook/main.ts`는 colocated CSF story, addon, Storybook 전용 static asset과 framework를 선언한다.
- `.storybook/preview.tsx`는 애플리케이션 전역 CSS와 필요한 decorator를 로드하고 App Router 환경을 전역 기본값으로 제공한다.
- `storybook`, `build-storybook`, `test:storybook` script를 분리해 개발 서버, 정적 산출물과 headless test를 각각 실행할 수 있게 한다.
- Storybook 정적 출력은 source control에 포함하지 않는다.

### FR-2: 애플리케이션 provider와 격리

- Storybook decorator는 story마다 새 QueryClient를 제공하며 authenticated query cache를 story 사이에 공유하거나 storage에 persist하지 않는다.
- tooltip, toast, theme처럼 component 렌더에 필요한 browser provider만 최소 범위로 제공한다.
- App Router navigation을 사용하는 Client Component는 Storybook의 Next.js navigation mock을 사용한다.
- Server Component, Prisma, `server-only`, process secret이 필요한 page module을 story에서 직접 import하지 않고 browser-safe UI boundary만 대상으로 한다.

### FR-3: shared UI story coverage

다음 재사용 primitive를 우선 coverage 대상으로 한다.

- Button, Badge, Card, Progress, Separator
- Slider, Switch, Collapsible, Tooltip, Label
- AudioWaveformPlayer는 실제 network audio에 의존하지 않는 기본/비활성 또는 fixture 상태만 제공한다.
- Chart와 Sonner는 별도 primitive보다 실제 consumer story에서 의미 있게 검증할 수 있으면 그 story로 coverage를 대체할 수 있다.

각 story는 가능한 경우 typed `Meta`/`StoryObj`, args와 Controls를 사용하며 동일 fixture markup을 중복 작성하지 않는다.

### FR-4: 핵심 도메인·widget story coverage

최소 다음 사용자-visible 경계를 포함한다.

| 경계 | 필수 상태 |
| --- | --- |
| TicketLedger | empty, grant/debit history |
| TicketAdjustmentFields | default, pending/disabled |
| VocalProfileResults | 대표 분석 결과, low-confidence 또는 legacy 안내 |
| VocalProfileRecorder 또는 LongAudioDialog | idle/recording/limit 또는 open/confirm interaction |
| Query 기반 대표 UI | loading 또는 active, success, error, terminal transition 중 실제 component가 지원하는 상태 |

- DB 조회와 page shell을 story에 억지로 포함하지 않고 필요한 경우 순수 display 경계를 추출한다.
- 컴포넌트 추출이 production 사용자 동작이나 DOM 의미를 바꾸지 않아야 한다.

### FR-5: Storybook 전용 MSW 연결

- F015의 MSW fixture/handler factory를 browser와 Node에서 재사용 가능한 모듈 경계로 정리한다.
- Storybook preview에서 MSW addon을 초기화하고 unhandled request는 개발자가 알 수 있도록 명시적 정책을 둔다.
- service worker 파일은 `.storybook` 아래 전용 static directory에 생성하고 Storybook dev/build에서만 제공한다.
- story별 handler는 실제 endpoint URL과 production Zod contract를 사용하되 token, cookie, private payload를 fixture에 포함하지 않는다.
- sequence handler의 mutable state는 story/test마다 새 factory instance에서 생성한다.

### FR-6: 접근성 및 interaction test

- 접근성 addon은 모든 testable story에 자동 실행되며 명시적으로 검증할 수 없는 예외는 story parameter와 이유를 기록한다.
- `play` 함수는 `storybook/test`의 접근 가능한 query와 user interaction API를 사용한다.
- 최소 Button/폼/widget/Query 대표 story에서 interaction assertion을 실행한다.
- animation, polling, audio/browser API로 불안정한 story는 fake backend state나 명시적 wait 조건으로 결정적으로 만든다.

### FR-7: Vitest browser project

- 기존 Node test runner를 교체하지 않고 Storybook 전용 Vitest project를 별도로 구성한다.
- Storybook Vitest addon이 CSF story를 browser test로 변환하고 Playwright Chromium headless instance에서 실행한다.
- test setup은 Storybook annotations와 addon 상태를 공유하되 Node integration test의 globals나 DB 환경을 로드하지 않는다.
- `test:storybook`은 watch가 아닌 1회 실행 모드를 제공하고 종료 코드로 실패를 전달한다.

### FR-8: 호환성과 회귀 검증

- `pnpm run storybook`이 개발 서버를 시작하고 대표 story를 렌더할 수 있어야 한다.
- `pnpm run build-storybook`과 `pnpm run test:storybook`이 독립적으로 통과해야 한다.
- Biome, ESLint, TypeScript, Steiger, 기존 전체 test suite와 Next.js production build가 통과해야 한다.
- Storybook 도입 전후 Next.js production route, API contract, PostgreSQL schema와 Coolify process 명령은 동일해야 한다.
- GitHub Actions `quality.yml`을 생성하거나 변경하지 않는다.

---

## 비기능 요구사항

- **성능**: Storybook은 필요한 story만 로드하고 server-only/DB graph를 browser bundle에 포함하지 않는다. Query polling과 MSW sequence는 story가 활성화된 동안에만 동작한다.
- **접근성**: 대표 story의 자동 axe 검사에 blocker가 없어야 하며 keyboard와 accessible name을 우선 검증한다.
- **보안**: story와 fixture에 실제 사용자 정보, cookie, token, API key, production URL 또는 raw private payload를 넣지 않는다.
- **신뢰성**: browser test는 network, production database, 외부 Modal/Leemage와 wall-clock timing에 의존하지 않고 반복 실행 결과가 같아야 한다.
- **유지보수성**: story는 component와 가까이 두고 public API로 import한다. fixture/schema는 F015 소유 모듈을 재사용하며 story 전용 분기를 production component에 흩뿌리지 않는다.
- **호환성**: Next.js 16.3 App Router, React 19.2, Tailwind CSS 4, F014 FSD import 규칙과 F015 TanStack Query/Zod/MSW 경계를 유지한다.
- **운영 영향**: 새 환경 변수, PostgreSQL migration, Coolify service 또는 production runtime dependency가 필요하지 않아야 한다.

---

## 범위 제외

- Storybook 또는 정적 산출물의 Coolify/외부 공개 배포
- Chromatic, Percy 등 hosted visual regression/approval service
- screenshot golden image 및 pixel-diff pipeline
- 모든 page/feature의 100% story coverage
- React Server Component, Prisma query와 실제 인증 session을 Storybook에서 직접 실행
- 실제 audio recording 장치, GPU 변환, Modal, Leemage 또는 PostgreSQL 연결
- Storybook을 기존 Node integration test runner의 대체재로 사용
- UI redesign, 신규 제품 기능, API/DB schema 변경
- GitHub Actions `quality.yml` 및 별도 CI pipeline 추가

---

## 선행·후속 관계

- **선행 Feature**: F015 client-server-state-query (완료)
- F014의 FSD public API와 browser/server module 경계를 유지한다.
- F015의 Query provider 정책, Zod schema와 MSW fixture를 story/test 기반으로 재사용한다.
- 향후 CI를 도입할 때 `build-storybook`과 `test:storybook`을 quality job에 연결할 수 있지만 이번 Feature에서는 로컬 script까지만 제공한다.

---

## 관련 문서

- PRD: 해당 없음
- PRD Refs: -
- 분류: 내부 UI 개발·테스트 도구 (`NON-PRD`)
- 참고 기준:
  - Storybook 공식 Next.js Vite framework 문서
  - Storybook 공식 Vitest addon 및 browser mode 문서
  - Storybook 공식 accessibility testing 문서
  - Storybook 공식 MSW network mocking 문서
  - 저장소의 F014 FSD 및 F015 Query/Zod/MSW 문서
