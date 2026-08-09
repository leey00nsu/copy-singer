# Tasks: product-ui-redesign

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
- **브랜치**: `feat/product-ui-redesign`
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

- [DONE][PRD-FR-045] T-F018-01 Design System token과 공통 UI 기반 정리
  - Date: 2026-08-09
  - Acceptance:
    - 버전 관리되는 네 디자인 보드와 `design-system.md`가 visual reference와 장기 규칙의 정본으로 연결된다.
    - `components.json`이 실제 FSD CSS·Shared 경로를 가리키고 새 shadcn primitive가 `src/shared/ui` 공개 API에만 추가된다.
    - white/warm gray/black token, 낮은 radius·border·shadow와 의미 기반 accent가 적용되며 새 UI library가 추가되지 않는다.
    - 공통 `StatePanel`, Skeleton, Dialog, Sheet, Tabs, filter primitive의 기본·focus·disabled 상태를 Storybook에서 확인할 수 있다.
  - Checklist:
    - [x] 디자인 자산 경로·frontmatter·문서 링크와 Design System 책임 최종 확인
    - [x] `components.json` CSS 및 FSD alias 교정
    - [x] Tabs, Dialog, Sheet, DropdownMenu, Input, Select, Skeleton 추가 및 public API 정리
    - [x] `globals.css` semantic token, body background, radius와 elevation 갱신
    - [x] Button/Card 등 기존 primitive를 Design System 기준으로 보정
    - [x] StatePanel과 foundation Storybook/a11y test 추가
    - [x] legacy 전역 class 사용처 inventory와 제거 순서 기록

- [DONE][PRD-FR-046] T-F018-02 Public Landing·Google Login과 ProductShell 구축
  - Date: 2026-08-09
  - Acceptance:
    - `/`가 실제 제품 가치를 설명하는 public Landing이며 session에 따라 `/login` 또는 `/profile` CTA를 제공한다.
    - Google-only Login은 safe callback과 인증 configured/error 동작을 유지하고 기본 성공 목적지를 `/profile`로 사용한다.
    - 사용자 route가 persistent `(product)` layout 안에서 desktop sidebar와 mobile Sheet navigation을 공유한다.
    - Root Layout fixed `UserMenu` 제거 후에도 Account, Admin, logout과 dev SVC 접근·동작이 보존된다.
  - Checklist:
    - [x] Next.js `(public)`·`(product)` route group adapter 이동과 URL 목록 고정
    - [x] Root Layout provider/metadata와 Product Layout auth 책임 분리
    - [x] `widgets/product-shell` brand/navigation/user menu desktop·mobile 구현
    - [x] `_pages/home`을 public Landing 책임으로 전환 또는 `landing` slice로 정리
    - [x] Login visual hierarchy와 기본 callback 갱신
    - [x] Admin 복귀·logout navigation과 dev SVC 독립 layout 회귀 확인
    - [x] route/auth/architecture 및 ProductShell Storybook test 추가

- [DONE][PRD-FR-047] T-F018-03 Voice Scan·마이크 권한·Analyzing 상태 재구성
  - Date: 2026-08-09
  - Acceptance:
    - record/upload, 25MB, long audio trim, 5초 최소·약 10초 권장·60초 최대 계약이 유지된다.
    - idle, permission 요청·거부, recording, stopping, ready, analysis pending/processing/retry/failed 상태가 실제 동작과 일치한다.
    - live waveform, 경과 시간, stop/cancel과 upload 대안이 keyboard·screen reader에서도 이해 가능하다.
    - durable job과 localStorage 복구가 유지되고 성공 시 생성된 `/vocal-profiles/[id]`로 이동한다.
  - Checklist:
    - [x] Workbench를 input, prepared preview, analysis status와 dialog 책임으로 분리
    - [x] recorder explicit state와 10초 권장 marker 구현
    - [x] permission denied/device unavailable 상태와 upload 대안 구현
    - [x] WaveSurfer stream/plugin/Blob URL cleanup 경로 회귀 확인
    - [x] upload trim/compress, idempotency와 durable polling 보존
    - [x] 성공 profile navigation과 Query/history invalidate 적용
    - [x] recorder/workbench helper, cleanup, Storybook와 Query 회귀 test 추가

- [DONE][PRD-FR-048] T-F018-04 Voice Profile summary·history·detail 정보 위계 개선
  - Date: 2026-08-09
  - Acceptance:
    - 측정값에서 결정적으로 생성되는 중립적 profile label과 observable trait가 핵심 summary에 표시된다.
    - observed/practical range, median과 stability를 먼저 이해하고 기존 histogram, pitch trace, quality와 reference audio를 세부 정보에서 확인할 수 있다.
    - 성별, 건강, warm/clear 또는 장르 적합도처럼 현재 데이터에 없는 의미를 추정하지 않는다.
    - profile history, active/failed analysis job, detail audio, recommendation 생성과 삭제 동작이 유지된다.
  - Checklist:
    - [x] vocal profile presentation mapper와 threshold/fallback test 추가
    - [x] profile summary component와 Storybook state 추가
    - [x] `VocalProfileResults`를 summary/detail 위계와 semantic chart color로 재구성
    - [x] profile history를 desktop row/mobile stacked row로 전환
    - [x] analysis job row를 공통 state language로 전환
    - [x] source/reference audio, delete와 recommendation CTA 회귀 확인
    - [x] profile UI, visualization, history와 private media test 통과

- [DONE][PRD-FR-049] T-F018-05 Song Match 100곡 목록·검색·정렬·필터 개선
  - Date: 2026-08-09
  - Acceptance:
    - 100곡을 desktop semantic table과 mobile stacked row에서 곡·아티스트·적합도·추천 shift·mixing 상태로 비교할 수 있다.
    - title/artist 검색, score/shift/status 필터와 rank/score/title 정렬이 현재 run 데이터에만 기반해 동작한다.
    - filter state는 URL에 유지되고 빈 결과를 초기화할 수 있으며 행마다 waveform instance를 만들지 않는다.
    - mixing start/retry, idempotency, polling, result와 recommendation delete 동작이 기존 Query 정책을 유지한다.
  - Checklist:
    - [x] recommendation presentation/filter/sort 순수 helper와 test 추가
    - [x] URL query state와 desktop/mobile list 구현
    - [x] score 정수 표현, shift, reasons와 low-confidence 안내 정리
    - [x] mixing state/action을 행 단위 공통 component로 분리
    - [x] result audio lazy mount와 100개 행 performance 확인
    - [x] recommendation delete를 공통 Dialog로 전환
    - [x] recommendation UI/Query/Storybook 회귀 test 추가

- [DONE][PRD-FR-049] T-F018-06 Song Detail route와 저장 곡 음역 계약 확장
  - Date: 2026-08-09
  - Acceptance:
    - `/recommendations/[id]/songs/[itemId]`가 run ownership과 item 포함 여부를 검증하고 잘못된 주소를 not-found로 처리한다.
    - recommendation response는 기존 field를 보존하면서 저장된 song vocal profile과 original key를 nullable additive field로 제공한다.
    - 상세는 사용자·곡 음역, original/adjusted score, shift, 실제 reasons와 score breakdown만 표시한다.
    - album art, genre, difficulty, lyrics와 in-app preview를 생성하지 않고 source URL은 외부 링크로만 제공한다.
    - 목록과 상세의 mixing state가 동일 Query cache에서 동기화된다.
  - Checklist:
    - [x] Song vocal profile select/serializer와 Zod response contract 확장
    - [x] legacy/additive/nullable payload contract 및 DB integration test 추가
    - [x] `song-detail` Page slice와 App adapter/loading/not-found 추가
    - [x] range comparison, reason summary와 unavailable state 구현
    - [x] 동일 recommendation Query key의 mixing CTA/result 연결
    - [x] 외부 source link security label/rel 처리
    - [x] Song Detail desktop/mobile Storybook와 route 회귀 test 추가

- [TODO][PRD-FR-050] T-F018-07 Profile·AI Mix 통합 Library와 실제 필터 구축
  - Date: 2026-08-09
  - Acceptance:
    - `/library`가 보컬 프로필과 AI 믹싱을 명확한 tab으로 구분하고 새 Project model이 있는 것처럼 표시하지 않는다.
    - mixing title/artist 검색과 실제 status 필터가 전체 owner dataset에 server query로 적용된다.
    - tab/query/status/page가 URL에 유지되며 loading, empty, active, failed와 result-ready row를 구분한다.
    - 기존 `/vocal-profiles`와 `/mixing-history` URL과 기능은 동일 widget을 재사용해 유지된다.
  - Checklist:
    - [ ] `widgets/library` profile/mixing list 소유권과 Page 간 공유 구조 구현
    - [ ] Library search param schema와 Page server query 구현
    - [ ] `getMixingHistory` title/artist/status filter와 API query 확장
    - [ ] filter-aware Query key/polling/Zod contract 갱신
    - [ ] Library desktop table/mobile row/tab/filter/empty state 구현
    - [ ] legacy 두 history Page를 공유 widget으로 전환
    - [ ] ownership, pagination, filter, polling과 Library UI test 추가

- [TODO][PRD-FR-050] T-F018-08 Mixing Detail·실제 progress·terminal result 삭제 구현
  - Date: 2026-08-09
  - Acceptance:
    - `/library/mixes/[id]`가 owner-scoped detail을 표시하고 active job만 polling하며 terminal state에서 중지한다.
    - progress는 pending/preparing, submitted, processing, succeeded/failed/canceled의 실제 상태보다 세밀한 단계를 가장하지 않는다.
    - 성공 결과는 waveform 재생·download를 제공하고 실패는 안전한 다음 action을 제공한다.
    - terminal owner job만 삭제할 수 있고 active delete는 409로 거부되며 result asset cleanup과 ticket ledger 보존이 검증된다.
  - Checklist:
    - [ ] mixing detail Query key/options/schema와 status presentation helper 추가
    - [ ] `mixing-detail` Page slice와 App adapter/loading/not-found 추가
    - [ ] 실제 status timeline, audio result, download와 error state 구현
    - [ ] terminal-only delete server service와 stable API envelope 구현
    - [ ] result relation 해제, Leemage delete/scheduled cleanup과 ticket SetNull 검증
    - [ ] delete mutation/confirmation/cache invalidate/navigation 구현
    - [ ] active race, ownership, media cleanup, Query와 Storybook test 추가

- [TODO][PRD-FR-051] T-F018-09 Account·route 상태·반응형·Storybook 상태 행렬 완성
  - Date: 2026-08-09
  - Acceptance:
    - Account가 실제 사용자·Google 계정·ticket balance/ledger와 Library/Admin 링크만 제공한다.
    - 포함 route의 loading, error, not-found, empty, disabled, permission, processing와 success가 공통 상태 언어를 사용한다.
    - 360px mobile, 768px tablet, 1280px desktop에서 navigation, table/list, waveform, chart와 CTA가 겹치거나 잘리지 않는다.
    - keyboard, focus-visible, accessible label/live status와 reduced-motion 기준을 만족하고 Storybook a11y error가 없다.
  - Checklist:
    - [ ] Account flat layout과 ticket ledger pagination/navigation 개선
    - [ ] Product route `loading.tsx`, `error.tsx`, detail `not-found.tsx` 일관화
    - [ ] polling stale-data/error, disabled와 destructive confirmation 상태 검토
    - [ ] ProductShell·StatePanel·핵심 route state Storybook matrix 완성
    - [ ] 360×800, 768×1024, 1280×800 실제 browser smoke와 screenshot 비교
    - [ ] keyboard/focus/label/live region/reduced-motion 검증
    - [ ] Admin/dev SVC token·navigation·desktop smoke 회귀 확인

- [TODO][NON-PRD] T-F018-10 전체 회귀·디자인 정본·Feature 문서 최종화
  - Date: 2026-08-09
  - Acceptance:
    - 정적 검사, FSD 경계, targeted UI/DB/Query, Storybook build/browser와 전체 production build/test가 통과한다.
    - visual board와 구현의 공간감·정보 위계·상태 구조를 실제 화면에서 비교하고 의도된 차이를 Decisions에 기록한다.
    - Design System, token, Shared UI, Storybook, PRD와 Feature 문서가 최종 코드와 동기화된다.
    - DB migration, Modal/worker 알고리즘, Coolify와 `quality.yml`이 변경되지 않았음을 diff로 확인한다.
  - Checklist:
    - [ ] route/API/public API/raw color/legacy class와 새 dependency 최종 inventory
    - [ ] `pnpm run check`와 targeted test suite 통과
    - [ ] `pnpm run build-storybook`, Storybook browser/a11y test 통과
    - [ ] `pnpm test` production build와 전체 회귀 통과
    - [ ] design board 대비 desktop/tablet/mobile 최종 browser 검토
    - [ ] spec acceptance, Decisions evidence와 테스트 실행 기록 갱신
    - [ ] 최신 코드 이후 workflow-sync marker 1개와 workflow audit 통과

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
| `pnpm run check` | `2026-08-09` | 통과 — error 0, Biome warning 61건, Steiger 및 architecture 4/4 |
| `pnpm run test:auth-navigation` | `2026-08-09` | 통과 — safe callback·navigation·route group 4/4 |
| `pnpm exec tsx --test tests/effect-cleanup.test.ts tests/recommendation-ui.test.tsx` | `2026-08-09` | 통과 — cleanup·추천 UI 회귀 6/6 |
| `pnpm run test:voice-scan` | `2026-08-09` | 통과 — 녹음 정책·오류·상태·cleanup 12/12 |
| `pnpm run test:vocal-profile-analysis-queue` | `2026-08-09` | 통과 — idempotency·owner·lease·retry·cleanup 5/5 |
| `pnpm run test:vocal-profile-history` | `2026-08-09` | 통과 — UI 3/3, private audio·ownership 3/3 |
| `pnpm run test:recommendation` | `-` | 미실행 — 구현 전 |
| `pnpm run test:recommendation:db` | `-` | 미실행 — 구현 전 |
| `pnpm run test:mixing:ui` | `-` | 미실행 — 구현 전 |
| `pnpm run test:mixing:db` | `-` | 미실행 — 구현 전 |
| `pnpm run test:query` | `2026-08-09` | 통과 — Query/API/MSW 20/20, streaming proxy 1/1 |
| `pnpm run test:auth:db` | `-` | 미실행 — 구현 전 |
| `pnpm run test:tickets` | `-` | 미실행 — 구현 전 |
| `pnpm run test:architecture-boundaries` | `2026-08-09` | 통과 — `pnpm run check` 내부 4/4 |
| `pnpm run test:storybook --run` | `2026-08-09` | 통과 — 28 files, 61 tests |
| `pnpm run build-storybook` | `2026-08-09` | 통과 — chunk size warning만 있음 |
| `pnpm run build` | `2026-08-09` | 통과 — 기존 public/product/Admin/dev/API URL 보존 |
| `pnpm run test:base-ui` | `2026-08-09` | 통과 — 1/1 |
| `pnpm run test:process-scripts` | `2026-08-09` | 통과 — 5/5 |
| `pnpm test` | `-` | 미실행 — 구현 전 |

<!-- lee-spec-kit:workflow-sync 2026-08-09T15:35:26.000Z -->
