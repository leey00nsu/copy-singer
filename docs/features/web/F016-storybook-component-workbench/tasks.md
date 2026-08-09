# Tasks: storybook-component-workbench

## 태스크 규칙

- **상태**: `[TODO]` → `[DOING]` → `[DONE]`
- **태스크 공유 / 확인**:
  - `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 `tasks.md`에서 상태를 함께 갱신합니다
  - `[DOING] → [DONE]`: 완료 전 결과/검증을 공유하고 같은 수정에서 `Acceptance`와 `Checklist`를 함께 갱신합니다
  - 태스크 상태 변경 전에 승인이 필요한 경우는 문서화된 review checkpoint 또는 원격/파괴적 작업 직전뿐입니다.
  - 워크플로우가 요구하지 않는 standalone `OK` 승인 단계는 만들지 않습니다.
  - 해당 태스크의 `Checklist`에 unchecked 항목이 남아 있으면 `[DONE]`으로 전환하지 않습니다.
- **PRD 매핑(권장)**: 각 태스크 라인에 `[PRD-FR-001]` 또는 `[PRD-SCOPE-V1-DESKTOP-EDITOR]` 같은 기존 PRD 요구사항 ID 태그를 추가하거나, PRD와 무관한 태스크는 `[NON-PRD]`로 표시하세요.
  - 단, `tasks.md`에서 PRD ID를 임의로 만들지 마세요. `docs/prd` 또는 상위 요구사항 문서에 먼저 정의된 ID만 참조해야 합니다.
  - 레거시 문서에 아직 PRD ID가 없다면, 먼저 원문 요구사항 문서에 ID를 backfill한 뒤 `spec.md`의 `PRD Refs`와 태스크 태그를 함께 맞추세요.
  - `[NON-PRD]`는 내부 구현 작업 전용입니다. 사용자 동작, acceptance criteria, 범위가 바뀌는 태스크라면 PRD를 먼저 backfill하고 `[PRD-...]`로 태깅하세요.

---

## 로컬 추적 정보
- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/storybook-component-workbench`
- **대기 중 변경 요청**: -
  - 구현 중 새로 수용한 사용자 요청을 잠시 표시하는 sync marker입니다
  - 요청을 `tasks.md`와 관련 문서에 반영한 뒤 값을 비우세요
  - pre-PR 리뷰 handoff를 시작하면 `Running`, 리뷰 결과 기록까지 끝나면 `Done`으로 변경
  - 형식: `결정: approve|changes_requested|blocked ...` (또는 `decision: ...`)
  - PR 생성 전 최종 통과 기준은 `approve`
  - 기본 베이스라인으로 `agents/skills/create-pr.md`(`Pre-PR 기본 체크리스트`) 기준을 따르세요
- **PR 리뷰**: -
  - PR 리뷰 handoff를 시작하면 `Running`, 팀에서 별도 완료 상태를 추적할 때만 `Done`으로 변경
- **PR 리뷰 Evidence**: -
  - 리뷰 지적사항을 왜/어떻게 반영했는지 `결정: ...`(또는 `decision: ...`) 형식으로 기록

---

## 태스크 엔트리 포맷

```markdown
- [TODO][PRD-FR-001] T-{feature-ref}-01 {태스크 제목}
  - Date: YYYY-MM-DD
  - Acceptance:
    - (검증 조건)
  - Checklist:
    - [ ] (서브 태스크)
```

> 위 예시의 `PRD-FR-001`은 가능한 `PRD-*` key 중 하나일 뿐입니다. 아직 PRD 원문에 정의되지 않았다면 태스크에 먼저 넣지 마세요.
> 처음엔 탐색/내부 작업이었더라도 제품 요구사항 변경으로 이어졌다면, `NON-PRD`로 두지 말고 PRD를 먼저 갱신한 뒤 `[PRD-...]`로 재태깅하세요.

---

## 태스크 목록

> 아래에 태스크를 추가하세요. **최소 1개가 필요**합니다.
> 태스크는 하나의 순차 리스트로 유지하고, 위에서 아래 순서 자체를 실행 우선순위로 취급하세요.
> 새 태스크 append에는 `npx lee-spec-kit task add <feature-ref> --title "..." --ref NON-PRD --acceptance "..." --check "..."` 사용을 우선하세요.
> 새 태스크는 마지막 기존 태스크 아래에 완전한 태스크 블록으로 추가하세요. `PRD-FR-001`이나 `PRD-SCOPE-V1-DESKTOP-EDITOR`처럼 이미 정의된 PRD key를 사용하거나, 내부 작업이면 `[NON-PRD]`를 사용합니다.
> placeholder 상태의 `Acceptance` / `Checklist`를 그대로 두지 마세요. 구체 항목이 아니면 구현을 시작하지 않습니다.
> 수동 편집이 필요하면 현재 태스크 근처가 아니라 `태스크 목록`의 마지막 기존 태스크 block 아래에만 append 하세요.

- [DONE][NON-PRD] T-F016-01 Storybook Vite 기반과 격리 provider 구성
  - Date: 2026-08-09
  - Acceptance:
    - Next.js Vite Storybook dev server와 static build가 Tailwind 전역 스타일, `@/*` alias와 App Router mock을 사용해 시작된다.
    - story마다 새 QueryClient가 생성되고 Storybook 전용 MSW worker가 Next.js production public 경로와 분리된다.
    - Storybook/Vitest/Playwright 패키지는 devDependency이며 기존 Next.js build/start 명령을 바꾸지 않는다.
  - Checklist:
    - [x] Storybook 10.5.7, Vitest 4.1.10, Playwright 1.62.1 및 addon dependency를 고정 설치
    - [x] `.storybook/main.ts`, `preview.tsx`와 `vitest.config.ts` 구성
    - [x] story별 QueryClient/App Router/global CSS decorator 구현
    - [x] `.storybook/public`에 MSW worker 생성, `storybook-static` gitignore 및 production 분리 test 추가
    - [x] `storybook`, `build-storybook`, `test:storybook` script와 Chromium browser 설치
    - [x] Storybook smoke/static build, TypeScript와 FSD architecture 검사 통과

- [DONE][NON-PRD] T-F016-02 Shared UI primitive story와 Controls·interaction 추가
  - Date: 2026-08-09
  - Acceptance:
    - shared UI의 action/layout/input primitive를 Storybook에서 args와 Controls로 탐색할 수 있다.
    - click, toggle, slider, collapsible과 tooltip의 대표 interaction이 accessible role/name 기반 assertion으로 검증된다.
    - story는 component public API를 사용하고 중복 fixture markup을 최소화한다.
  - Checklist:
    - [x] Button/Badge/Card/Progress/Separator story 작성
    - [x] Slider/Switch/Collapsible/Tooltip/Label story 작성
    - [x] AudioWaveformPlayer의 network-independent story와 consumer 기반 Chart/Sonner coverage 판단 기록
    - [x] variant, disabled, composed layout 및 keyboard/click interaction `play` 함수 추가
    - [x] shared story Storybook browser/a11y test 통과

- [DONE][NON-PRD] T-F016-03 핵심 entity·feature·widget 상태 story 구성
  - Date: 2026-08-09
  - Acceptance:
    - ticket, vocal profile과 widget/form의 empty, data, pending, warning 및 interactive 상태가 실제 production component로 렌더된다.
    - story를 위해 필요한 경우 browser-safe presentation boundary만 동일 slice 안에서 추출하고 사용자 DOM/동작을 보존한다.
    - story graph에 Prisma, `server-only`, 실제 인증 또는 외부 API가 포함되지 않는다.
  - Checklist:
    - [x] TicketLedger empty와 grant/debit history story 작성
    - [x] TicketAdjustmentFields default와 pending/disabled story 작성
    - [x] VocalProfileResults 대표 분석과 low-confidence/legacy 안내 story 작성
    - [x] LongAudioDialog 또는 Recorder의 대표 상태와 confirm/close interaction story 작성
    - [x] server-only import inventory와 domain story browser/a11y test 통과

- [DONE][NON-PRD] T-F016-04 MSW 기반 Query success·error·polling story 연결
  - Date: 2026-08-09
  - Acceptance:
    - F015 Zod type과 MSW fixture/handler를 Node 및 Storybook browser runtime에서 재사용한다.
    - 대표 Query UI가 success, 권한/계약 오류와 active→terminal 전이를 backend 없이 결정적으로 재현한다.
    - story 전환과 browser test 사이에 Query cache, handler와 sequence cursor가 누출되지 않는다.
  - Checklist:
    - [x] `tests/msw` fixture/handler와 Node server import를 runtime-neutral/server-only 경계로 재확인
    - [x] Storybook preview MSW 초기화 및 unhandled request 정책 구성
    - [x] 대표 Query UI의 active/success/error story와 endpoint handler override 작성
    - [x] polling sequence factory, terminal stop 및 mutation/cache UI interaction 검증
    - [x] `pnpm run test:query`, Storybook browser test와 static build 통과

- [DOING][NON-PRD] T-F016-05 접근성·browser test와 production 회귀 최종화
  - Date: 2026-08-09
  - Acceptance:
    - testable story의 axe 검사와 대표 play interaction이 Playwright Chromium headless 환경에서 통과한다.
    - Storybook static output/worker/devDependency가 Next.js production bundle과 Coolify 실행 경로에 포함되지 않는다.
    - 전체 정적 검사, Next.js/Storybook build, 기존 test suite 및 production dependency audit이 통과한다.
  - Checklist:
    - [ ] global a11y error mode와 예외 사유 inventory 확정
    - [ ] `pnpm run storybook --ci --smoke-test` 통과
    - [ ] `pnpm run build-storybook` 통과
    - [ ] `pnpm run test:storybook --run` 통과
    - [ ] `pnpm run check`, `pnpm run build`, `pnpm test` 통과
    - [ ] `pnpm audit --prod` known vulnerability 0건 확인
    - [ ] spec acceptance, workflow-sync marker, Decisions/Tasks evidence와 최종 완료 조건 갱신

---

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [ ] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료
- [ ] 테스트 실행 및 통과 (아래에 명령어/결과 기록)
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run storybook --ci --smoke-test` | `2026-08-09` | PASS (Storybook 10.5.7 smoke) |
| `pnpm run build-storybook` | `2026-08-09` | PASS (3,268 modules, worker 포함) |
| `pnpm run test:storybook --run` | `2026-08-09` | PASS (16 files, 34 stories) |
| `pnpm run test:query` | `2026-08-09` | PASS (Query/API/MSW 20 + streaming 1 tests) |
| `pnpm run check` | `2026-08-09` | FAIL (기존 key-fit test fixture export Biome 2건, T-F016-05에서 정리) |
| `pnpm run build` | `-` | 미실행 |
| `pnpm test` | `-` | 미실행 |
| `pnpm audit --prod` | `-` | 미실행 |
| `pnpm run typecheck` | `2026-08-09` | PASS |
| `pnpm run lint` | `2026-08-09` | PASS |
| `pnpm run check:architecture` | `2026-08-09` | PASS |
| `pnpm run test:process-scripts` | `2026-08-09` | PASS (5 tests) |
| `pnpm run test:tickets` | `2026-08-09` | PASS (2 tests) |
| `pnpm run test:admin` | `2026-08-09` | PASS (2 tests) |
| `pnpm exec tsx --test tests/vocal-profile-results-ui.test.tsx` | `2026-08-09` | PASS (5 tests) |
