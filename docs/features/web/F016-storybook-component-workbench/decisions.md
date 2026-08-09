# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

---

## D001: Vite Storybook과 production 격리 경계 (2026-08-09)

- **Context**: Next.js App Router UI를 실제 애플리케이션과 backend 없이 렌더하고 Storybook story를 real browser test로 재사용할 기반이 없다.
- **Constraints**: Next.js 16/React 19/Tailwind 4/FSD public API와 호환되어야 하며 Storybook, MSW worker와 Playwright가 Coolify production runtime 또는 Next.js `public`에 포함되면 안 된다. 기존 Node `node:test` suite를 유지해야 한다.
- **Options**: Webpack 기반 Storybook과 legacy test-runner, Vite 기반 Storybook과 Vitest browser project, 별도 Vite demo app을 검토한다.
- **Decision**: `@storybook/nextjs-vite`와 Storybook 10의 CSF Next preview를 사용하고, Vitest browser project는 공식 10.5.7 template처럼 `storybookTest` plugin이 preview annotation을 직접 읽도록 구성한다. 별도 `vitest.setup.ts`는 두지 않는다.
- **Rationale**: Vite builder는 Vitest addon과 직접 통합되고 Next.js 16/React 19 peer 범위를 충족한다. 설치 버전의 공식 template을 따르면 preview annotation 이중 등록을 피하면서 기존 `tsx --test` Node suite와 browser project를 분리할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: Storybook 공식 권장인 `@storybook/nextjs-vite`와 Vitest addon을 사용하고 모든 패키지를 devDependency로 제한한다. preview는 production QueryClient singleton 대신 story별 instance를 만들며 worker는 `.storybook/public`에서만 제공한다.
  - **DONE 전 확정 시점**: Storybook 10.5.7 CSF Next preview, story별 QueryClient, App Router parameter와 Tailwind 전역 CSS를 구성했다. MSW addon의 기본 worker setup은 Storybook 내부·정적 asset request만 제외하고 그 외 unhandled request를 warning으로 알려 주며 story 종료 시 handler를 reset한다. worker를 `.storybook/public`에서만 제공하고 production 경계 test로 Next.js `public` 유입을 막았다.
  - **머지 후 확인**: 로컬 통합 후 갱신 예정
- **Evidence**:
  - **Commit**: docs `12eb3dc`, project `86c16c2`
  - **PR**: 로컬 workflow (원격 PR 없음)
  - **Test/Log**: Storybook smoke/static build/browser test, `pnpm run typecheck`, `pnpm run check:architecture`, production 경계 test PASS (2026-08-09)
- **Consequences**: Storybook 실행에는 로컬 Playwright Chromium 설치가 필요하지만 Next.js build/start와 Coolify runtime에는 새 command, 환경 변수 또는 production dependency가 추가되지 않는다.

---

## D002: Shared primitive story coverage 경계 (2026-08-09)

- **Context**: shared UI는 작은 primitive가 많고 모든 wrapper에 비슷한 story를 만들면 유지보수 비용만 늘 수 있다. 반대로 form/overlay interaction을 생략하면 Storybook browser test의 실효성이 낮아진다.
- **Constraints**: story는 public API만 import하고 실제 network/audio device에 의존하지 않아야 한다. Controls, 접근 가능한 이름과 keyboard/click assertion을 우선하며 production component에 Storybook 전용 분기를 넣지 않는다.
- **Options**: 모든 primitive에 단일 smoke story만 추가, interactive primitive만 coverage, 지정 primitive 전체에 상태 story를 두되 Chart/Sonner는 consumer coverage로 대체하는 방식을 검토한다.
- **Decision**: Button/Badge/Card/Progress/Separator/Slider/Switch/Collapsible/Tooltip/Label/AudioWaveformPlayer에는 colocated typed story를 둔다. interaction은 Button·Label·Slider·Switch·Collapsible·Tooltip에서 검증한다. Chart는 T-F016-03의 실제 VocalProfileResults consumer로, Sonner는 preview의 production Toaster와 T-F016-04 mutation consumer로 coverage한다.
- **Rationale**: primitive의 variant와 form/overlay semantics는 가까운 story에서 빠르게 확인하면서, Chart/Toaster처럼 맥락 의존적인 wrapper는 실제 데이터를 가진 consumer에서 검증해야 의미 없는 demo duplication과 production 전용 분기를 피할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 지정된 shared primitive는 component 옆 kebab-case story로 구성하고, variant/layout은 args 또는 작은 composition으로 표현한다. interaction 가치가 있는 Button/Switch/Slider/Collapsible/Tooltip에는 role/name 기반 `play` assertion을 둔다. AudioWaveformPlayer는 URL fetch 없이 비활성 경계를 검증한다.
  - **DONE 전 확정 시점**: 11개 story file에 19개 상태를 구성하고 Button click/disabled, Label input, Slider keyboard, Switch toggle/disabled, Collapsible open, Tooltip hover를 검증했다. Audio fixture는 외부 URL 대신 inline WAV data URL을 사용한다. 새 모듈 로드로 Vitest server가 중간 reload되지 않도록 실제 Storybook graph의 Base UI/Wavesurfer/Sonner dependency를 `optimizeDeps.include`에 고정했다.
  - **머지 후 확인**: 로컬 통합 후 갱신 예정
- **Evidence**:
  - **Commit**: docs `3a05211`, project `38b15c0`
  - **PR**: 로컬 workflow (원격 PR 없음)
  - **Test/Log**: `pnpm run test:storybook --run` PASS (11 files, 19 stories), `pnpm run build-storybook` PASS (2,669 modules), `pnpm run lint`/`typecheck`/`check:architecture` PASS (2026-08-09)
- **Consequences**: shared story가 accessibility·interaction 회귀를 직접 보호하며 Chart와 toast의 사용자-visible 동작은 중복 primitive demo 대신 후속 consumer story evidence에 포함된다.

---

## D003: 도메인 story의 browser-safe presentation 경계 (2026-08-09)

- **Context**: ticket와 vocal profile UI는 실제 DB/auth/page shell 없이도 렌더 가능한 부분과 server data loader가 한 slice 안에 공존한다. Storybook에서 잘못된 barrel을 import하면 Prisma나 `server-only`가 browser bundle에 유입될 수 있다.
- **Constraints**: production component와 DOM 의미를 유지하고 실제 API, 인증 session, audio device 또는 private payload를 사용하지 않아야 한다. 필요한 fixture는 browser-safe inferred type을 만족해야 한다.
- **Options**: page 전체를 mock, 별도 story 전용 복제 component, 기존 presentation component를 public browser API로 직접 렌더하는 방식을 검토한다.
- **Decision**: cross-slice story는 Ticket, VocalProfile, ManageTickets public API를 사용하고, widget 내부에 colocate된 LongAudioDialog story는 같은 slice의 상대 import를 사용한다. page/server loader를 복제하지 않고 typed fixture를 presentation component props로 직접 전달한다. 직접 server-only/Prisma import는 source inventory로 금지하고 transitive browser 호환성은 Vite static build로 검증한다.
- **Rationale**: 기존 UI와 DOM을 그대로 검증하면서 DB/auth 조건을 제거할 수 있고, same-slice 내부 component를 Storybook 때문에 불필요하게 외부 public API로 넓히지 않는다. source inventory와 실제 browser build를 함께 사용하면 정적 금지 패턴과 transitive bundling 문제를 각각 잡을 수 있다.
- **Trace**:
  - **DOING 시작 시점**: TicketLedger, TicketAdjustmentFields, VocalProfileResults와 LongAudioDialog의 기존 browser public API를 직접 사용한다. test fixture를 현재 계약에 맞게 작성하고, server-only module inventory test와 Storybook Vite build로 import graph를 검증한다.
  - **DONE 전 확정 시점**: TicketLedger 2개, TicketAdjustmentFields 2개, VocalProfileResults 3개, LongAudioDialog 2개 상태를 추가했다. 실제 Recharts range/histogram/pitch consumer, dialog focus trap·Escape·confirm과 ticket form interaction을 Playwright Chromium에서 검증했다. Vocal low-confidence/legacy story는 inline audio URL을 전달하되 reference player를 만들지 않는 안내 분기만 사용해 network를 발생시키지 않는다.
  - **머지 후 확인**: 로컬 통합 후 갱신 예정
- **Evidence**:
  - **Commit**: docs `9795519`, project `9d4c24f`
  - **PR**: 로컬 workflow (원격 PR 없음)
  - **Test/Log**: Storybook browser/a11y PASS (15 files, 28 stories), static build PASS (3,246 modules), server-only source inventory PASS, ticket/admin/vocal-profile 기존 UI test PASS, lint/typecheck/Steiger PASS (2026-08-09)
- **Consequences**: 도메인 story가 DB·auth·실제 audio 없이 재현 가능하며 Chart wrapper는 실제 VocalProfileResults 소비 경로에서 자동 검증된다. server-owned page shell은 Storybook 범위 밖으로 유지된다.

---

## D004: MSW handler 수명과 Query 상태 story (2026-08-09)

- **Context**: F015의 Node query test는 typed fixture와 handler factory를 가지지만 Storybook browser worker에서 실제 Query UI 상태를 재현하지 않는다. polling cursor와 Query cache가 story 간 공유되면 실행 순서에 따라 결과가 달라질 수 있다.
- **Constraints**: production Zod schema/type과 fixture를 복제하지 않고 `msw/node` import는 browser graph에서 제외해야 한다. 실제 API·DB 없이 success, 오류, active→terminal과 mutation 사용자 피드백을 결정적으로 검증해야 한다.
- **Options**: story마다 inline 응답 작성, 전역 고정 handler 사용, runtime-neutral handler factory를 story `beforeEach`에서 새로 생성하는 방식을 검토한다.
- **Decision**: 구현 후 확정 예정
- **Rationale**: 구현 후 확정 예정
- **Trace**:
  - **DOING 시작 시점**: `tests/msw/fixtures.ts`와 `handlers.ts`만 browser에서 재사용하고 `server.ts`는 Node 전용으로 유지한다. 각 story의 `beforeEach({ msw })`에서 handler/sequence factory를 생성하며 preview의 key 기반 QueryClient가 story별 cache를 소유한다.
  - **DONE 전 확정 시점**: 구현 후 갱신 예정
  - **머지 후 확인**: 로컬 통합 후 갱신 예정
- **Evidence**:
  - **Commit**: task commit 후 갱신 예정
  - **PR**: 로컬 workflow (원격 PR 없음)
  - **Test/Log**: 구현 후 갱신 예정
- **Consequences**: 구현 후 갱신 예정
