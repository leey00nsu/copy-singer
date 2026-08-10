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
    - 사용자 route가 persistent `(product)` layout 안에서 desktop top header와 mobile Sheet navigation을 공유한다.
    - Root Layout fixed `UserMenu` 제거 후에도 Account, Admin, logout과 dev SVC 접근·동작이 보존된다.
  - Checklist:
    - [x] Next.js `(public)`·`(product)` route group adapter 이동과 URL 목록 고정
    - [x] Root Layout provider/metadata와 Product Layout auth 책임 분리
    - [x] `widgets/product-shell` top-header brand/navigation/user menu와 mobile Sheet 구현
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

- [DONE][PRD-FR-050] T-F018-07 Profile·AI Mix 통합 Library와 실제 필터 구축
  - Date: 2026-08-09
  - Acceptance:
    - `/library`가 보컬 프로필과 AI 믹싱을 명확한 tab으로 구분하고 새 Project model이 있는 것처럼 표시하지 않는다.
    - mixing title/artist 검색과 실제 status 필터가 전체 owner dataset에 server query로 적용된다.
    - tab/query/status/page가 URL에 유지되며 loading, empty, active, failed와 result-ready row를 구분한다.
    - 기존 `/vocal-profiles`와 `/mixing-history` URL과 기능은 동일 widget을 재사용해 유지된다.
  - Checklist:
    - [x] `widgets/library` profile/mixing list 소유권과 Page 간 공유 구조 구현
    - [x] Library search param schema와 Page server query 구현
    - [x] `getMixingHistory` title/artist/status filter와 API query 확장
    - [x] filter-aware Query key/polling/Zod contract 갱신
    - [x] Library desktop table/mobile row/tab/filter/empty state 구현
    - [x] legacy 두 history Page를 공유 widget으로 전환
    - [x] ownership, pagination, filter, polling과 Library UI test 추가

- [DONE][PRD-FR-050] T-F018-08 Mixing Detail·실제 progress·terminal result 삭제 구현
  - Date: 2026-08-09
  - Acceptance:
    - `/library/mixes/[id]`가 owner-scoped detail을 표시하고 active job만 polling하며 terminal state에서 중지한다.
    - progress는 pending/preparing, submitted, processing, succeeded/failed/canceled의 실제 상태보다 세밀한 단계를 가장하지 않는다.
    - 성공 결과는 waveform 재생·download를 제공하고 실패는 안전한 다음 action을 제공한다.
    - terminal owner job만 삭제할 수 있고 active delete는 409로 거부되며 result asset cleanup과 ticket ledger 보존이 검증된다.
  - Checklist:
    - [x] mixing detail Query key/options/schema와 status presentation helper 추가
    - [x] `mixing-detail` Page slice와 App adapter/loading/not-found 추가
    - [x] 실제 status timeline, audio result, download와 error state 구현
    - [x] terminal-only delete server service와 stable API envelope 구현
    - [x] result relation 해제, Leemage delete/scheduled cleanup과 ticket SetNull 검증
    - [x] delete mutation/confirmation/cache invalidate/navigation 구현
    - [x] active race, ownership, media cleanup, Query와 Storybook test 추가

- [DONE][PRD-FR-051] T-F018-09 Account·route 상태·반응형·Storybook 상태 행렬 완성
  - Date: 2026-08-09
  - Acceptance:
    - Account가 실제 사용자·Google 계정·ticket balance/ledger와 Library/Admin 링크만 제공한다.
    - 포함 route의 loading, error, not-found, empty, disabled, permission, processing와 success가 공통 상태 언어를 사용한다.
    - 360px mobile, 768px tablet, 1280px desktop에서 navigation, table/list, waveform, chart와 CTA가 겹치거나 잘리지 않는다.
    - keyboard, focus-visible, accessible label/live status와 reduced-motion 기준을 만족하고 Storybook a11y error가 없다.
  - Checklist:
    - [x] Account flat layout과 ticket ledger pagination/navigation 개선
    - [x] Product route `loading.tsx`, `error.tsx`, detail `not-found.tsx` 일관화
    - [x] polling stale-data/error, disabled와 destructive confirmation 상태 검토
    - [x] ProductShell·StatePanel·핵심 route state Storybook matrix 완성
    - [x] 360×800, 768×1024, 1280×800 실제 browser smoke와 screenshot 비교
    - [x] keyboard/focus/label/live region/reduced-motion 검증
    - [x] Admin/dev SVC token·navigation·desktop smoke 회귀 확인

- [DONE][NON-PRD] T-F018-10 전체 회귀·디자인 정본·Feature 문서 최종화
  - Date: 2026-08-09
  - Acceptance:
    - 정적 검사, FSD 경계, targeted UI/DB/Query, Storybook build/browser와 전체 production build/test가 통과한다.
    - visual board와 구현의 공간감·정보 위계·상태 구조를 실제 화면에서 비교하고 의도된 차이를 Decisions에 기록한다.
    - Design System, token, Shared UI, Storybook, PRD와 Feature 문서가 최종 코드와 동기화된다.
    - DB migration, Modal/worker 알고리즘, Coolify와 `quality.yml`이 변경되지 않았음을 diff로 확인한다.
  - Checklist:
    - [x] route/API/public API/raw color/legacy class와 새 dependency 최종 inventory
    - [x] `pnpm run check`와 targeted test suite 통과
    - [x] `pnpm run build-storybook`, Storybook browser/a11y test 통과
    - [x] `pnpm test` production build와 전체 회귀 통과
    - [x] design board 대비 desktop/tablet/mobile 최종 browser 검토
    - [x] spec acceptance, Decisions evidence와 테스트 실행 기록 갱신
    - [x] 최신 코드 이후 workflow-sync marker 1개와 workflow audit 통과

- [DONE][PRD-FR-046] T-F018-11 Landing Hero 파형·마이크·확산 링 모션과 첫 화면 위계 보완
  - Date: 2026-08-10
  - Acceptance:
    - 랜딩 우측 visual은 서로 다른 진폭의 파형이 연속 애니메이션되고 마이크 중심에서 복수의 원형 ring이 물결처럼 바깥으로 확산된다.
    - 마이크 visual은 인증 상태에 따른 기존 primary CTA 목적지로 이동하는 접근 가능한 실제 action이며 reduced-motion에서는 정적인 상태로 안전하게 축소된다.
    - 1280px에서 제목과 visual이 균형을 이루고 360x800 첫 viewport 안에 제목·CTA·마이크 핵심 interaction이 노출된다.
  - Checklist:
    - [x] Landing Hero title/grid/spacing을 레퍼런스 비율로 조정
    - [x] 재사용 가능한 waveform bar와 ripple ring CSS motion 구현
    - [x] 마이크 action의 Link semantics, focus, reduced-motion 처리
    - [x] Landing Storybook·접근성·responsive test와 실제 브라우저 검증

- [DONE][PRD-FR-049] T-F018-12 Song Match 비교 밀도·필터·CTA 반응형 보완
  - Date: 2026-08-10
  - Acceptance:
    - desktop 목록은 곡 비교에 필요한 핵심 열만 남겨 100곡을 빠르게 훑을 수 있고 tablet에서 제목 열이 글자 단위로 붕괴하지 않는다.
    - mobile 첫 viewport에는 적어도 첫 곡이 보이며 상세 필터는 Sheet로 이동하고 적용 조건 수를 표시한다.
    - 목록의 반복 primary CTA를 낮추고 상세 진입을 주 interaction으로 유지하며 기존 mixing/query 계약은 보존된다.
  - Checklist:
    - [x] desktop row 높이와 column width를 compact comparison 수준으로 축소
    - [x] table breakpoint와 mobile filter Sheet 구현
    - [x] row reason/metadata/action 위계를 Song Detail 중심으로 재배치
    - [x] 100-item·360/768/1024/1280 Storybook 및 회귀 test 보강

- [DONE][PRD-FR-050] T-F018-13 Library 오류 언어·행 밀도·탭·액션 위계 보완
  - Date: 2026-08-10
  - Acceptance:
    - mixing 실패 raw detail이나 외부 오류 코드가 노출되지 않고 안전한 사용자 문구로 변환된다.
    - profile과 AI mix 목록은 desktop/mobile 모두 compact row로 탐색 가능하며 탭은 content 기반 좌측 정렬을 사용한다.
    - 목록에는 상태별 핵심 action 하나만 우선 노출하고 재생·다운로드·삭제 세부 동작은 상세 화면에서 보존된다.
  - Checklist:
    - [x] mixing error presentation mapper와 fallback test 추가
    - [x] profile/mix row spacing과 mobile metric grid 축소
    - [x] compact tabs, 명확한 추천·믹스 label, profile total·최신순 표시
    - [x] ProductShell 포함 dense Library Storybook·responsive 회귀 검증

- [DONE][NON-PRD] T-F018-14 리뷰 보완 통합 visual QA와 문서 동기화
  - Date: 2026-08-10
  - Acceptance:
    - Landing, Song Match, Library를 레퍼런스와 다시 비교해 공간감·정보 밀도·interaction 위계가 개선됐음을 screenshot으로 확인한다.
    - 360x800, 768x1024, 1024x800, 1280x800에서 horizontal overflow, 핵심 CTA clipping, console error와 접근성 오류가 없다.
    - Design System, Feature decisions, 테스트 기록과 workflow sync marker가 최종 코드와 일치한다.
  - Checklist:
    - [x] targeted test, Storybook browser/a11y, check/build 실행
    - [x] desktop/tablet/mobile 실제 browser screenshot 비교
    - [x] 서브에이전트 finding별 반영 결과와 잔여 위험 기록
    - [x] workflow-audit 통과

- [DONE][NON-PRD] T-F018-15 전체 구현 페이지별 ImageGen 리디자인 시안과 구현 차이 분석
  - Date: 2026-08-10
  - Acceptance:
    - 현재 App Router에 구현된 13개 page route 각각에 대해 네 reference board와 Design System을 따르는 독립 시안 이미지가 버전 관리된다.
    - 시안마다 현재 route의 실제 데이터·기능 계약을 보존하고 지원하지 않는 기능을 제공되는 것처럼 표시하지 않는다.
    - 현재 구현의 캡처 또는 검증 가능한 코드·Storybook 기준과 생성 시안을 페이지별로 대조한 차이·우선순위·구현 제약이 문서화된다.
  - Checklist:
    - [x] route·reference asset·current UI inventory 확정
    - [x] 현재 구현 desktop baseline capture와 기능 계약 기록
    - [x] 페이지별 built-in ImageGen 시안 생성·workspace 저장·시각 검수
    - [x] 페이지별 current-vs-concept gap analysis 문서 작성
    - [x] feature docs sync·workflow audit와 산출물 링크 검증

- [DONE][PRD-FR-046] T-F018-16 상단 헤더 shell·neutral token·crystal CTA/footer 정합화
  - Date: 2026-08-10
  - Acceptance:
    - 인증 제품 화면은 desktop에서 persistent sidebar 없이 레퍼런스와 같은 상단 header navigation을 공유하고 mobile에서는 접근 가능한 compact navigation을 제공한다.
    - Landing과 제품 shell은 neutral white/gray token을 사용하고 Landing은 첨부 reference 기반 crystal visual, footer CTA와 site footer를 일관되게 제공한다.
    - 기존 route, auth, Query 상태, responsive interaction과 접근성 계약을 보존하며 원본 보드·V2 문서·Storybook이 구현과 동기화된다.
  - Checklist:
    - [x] 첨부 crystal reference를 프로젝트용 최종 이미지 자산으로 생성·검수
    - [x] ProductShell desktop sidebar를 header navigation으로 전환하고 mobile navigation 회귀
    - [x] light semantic token을 neutral scale로 교정
    - [x] Landing footer CTA와 site footer composition 구현
    - [x] Landing·Login·제품 route·Admin/dev 예외 responsive Storybook/browser QA
    - [x] Design System·visual brief·gap analysis·feature decisions·workflow marker 동기화

- [DONE][NON-PRD] T-F018-17 DropdownMenu Group context 런타임 회귀 수정
  - Date: 2026-08-10
  - Acceptance:
    - UserMenu와 공통 DropdownMenu 예제의 label이 Base UI Menu.Group context 안에서 렌더링되고 계정 메뉴를 열 때 런타임 오류가 발생하지 않는다.
  - Checklist:
    - [x] UserMenu와 DropdownMenu Story의 Group/Label 구조 교정
    - [x] 계정 메뉴와 공통 DropdownMenu를 실제로 여는 Storybook 회귀 테스트 추가
    - [x] targeted Storybook·전체 check·workflow audit 통과

- [DONE][NON-PRD] T-F018-18 로그아웃 요청·세션 갱신 회귀 수정
  - Date: 2026-08-10
  - Acceptance:
    - 계정 메뉴의 로그아웃을 선택하면 Better Auth sign-out이 완료되고 세션이 제거된 뒤 public Landing으로 이동하며 실패 시 메뉴 밖에서도 확인 가능한 오류를 표시한다.
  - Checklist:
    - [x] 실제 sign-out 요청과 현재 UserMenu 이벤트·라우팅 동작 재현
    - [x] 로그아웃 성공·실패 상태와 navigation 구현·회귀 테스트
    - [x] 실제 브라우저·targeted Storybook·전체 check·workflow audit 통과

- [TODO][PRD-FR-046] T-F018-product-ui-redesign-01 원본 4장 기준 전 페이지 visual fidelity 재작업
  - Date: 2026-08-10
  - Acceptance:
    - 현재 구현은 기능과 데이터 계약만 보존하고 Landing, Login, Voice Scan, Voice Profile, Recommendation, Library, Mixing, Account, Admin의 레이아웃과 정보 위계를 네 원본 디자인 보드에 맞게 재구성한다.
    - crystal asset은 Landing 하단 Every voice has its song. CTA에서만 사용하고 다른 페이지에는 렌더링하지 않는다.
    - desktop/tablet/mobile에서 원본 보드의 여백, flat section, thin border, black CTA, restrained accent를 일관되게 적용하고 기존 auth/query/audio/ticket/admin 동작을 보존한다.
  - Checklist:
    - [ ] 기존 화면 구조를 visual source로 삼지 않는 규칙을 design/feature docs에 반영
    - [ ] 공통 shell/token/spacing/type scale을 원본 보드 기준으로 재점검
    - [ ] Landing/Login/Voice Scan 화면군 재작업
    - [ ] Voice Profile/Recommendation/Song Detail 화면군 재작업
    - [ ] Library/Mixing/Account 화면군 재작업
    - [ ] Admin을 동일한 visual language로 재작업하고 dev/svc는 개발 도구 예외 유지
    - [ ] 크리스탈 사용처가 Landing CTA 단 한 곳인지 정적 검사
    - [ ] 브라우저 screenshot으로 원본 보드와 desktop/tablet/mobile visual QA

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
| `pnpm run check` | `2026-08-10` | 통과 — error 0, 기존 Biome warning 60건, Steiger 및 architecture 4/4 |
| `pnpm run test:auth-navigation` | `2026-08-10` | 통과 — safe callback·Library/Account navigation·route group·keyboard/touch label·sign-out 후 replace/refresh 5/5 |
| `pnpm run test:storybook --run src/widgets/product-shell/ui/product-shell.stories.tsx src/_pages/home/ui/landing-page.stories.tsx src/_pages/library/ui/library-page.stories.tsx` | `2026-08-10` | 통과 — top header/no-aside·mobile navigation·crystal CTA/footer·dense Library 7/7 |
| `pnpm run test:storybook --run src/shared/ui/dropdown-menu/dropdown-menu.stories.tsx src/widgets/product-shell/ui/product-shell.stories.tsx` | `2026-08-10` | 통과 — 공통 메뉴와 계정 메뉴를 실제로 열어 Menu.Group context·menuitem 4/4 확인 |
| `pnpm run test:storybook --run src/widgets/product-shell/ui/product-shell.stories.tsx` | `2026-08-10` | 통과 — 일반 계정 메뉴와 개발 인증 우회 비활성 상태 4/4 |
| `pnpm exec tsx --test tests/effect-cleanup.test.ts tests/recommendation-ui.test.tsx` | `2026-08-09` | 통과 — cleanup·추천 UI 회귀 6/6 |
| `pnpm exec tsx --test tests/effect-cleanup.test.ts` | `2026-08-10` | 통과 — Library·Mixing Detail Query polling 포함 component timer/fetch inventory 2/2 |
| `pnpm run test:voice-scan` | `2026-08-10` | 통과 — 녹음 정책·오류·상태·cleanup 12/12 |
| `pnpm run test:vocal-profile-analysis-queue` | `2026-08-10` | 통과 — idempotency·owner·lease·retry·cleanup 5/5 |
| `pnpm run test:vocal-profile-history` | `2026-08-10` | 통과 — 공유 Library UI 3/3, private audio·ownership 3/3 |
| `pnpm run test:recommendation` | `2026-08-10` | 통과 — ranking 10/10, presentation·synthesis·list·detail 17/17 |
| `pnpm run test:storybook --run src/_pages/recommendation-detail/ui/recommendation-results.stories.tsx` | `2026-08-10` | 통과 — 100곡 dense list·mobile filter Sheet·polling·완료 상태 8/8 |
| `pnpm run test:storybook --run src/widgets/library/ui/mixing-library.stories.tsx src/widgets/library/ui/vocal-profile-library.stories.tsx src/_pages/library/ui/library-page.stories.tsx` | `2026-08-10` | 통과 — raw error 차단·10/12개 dense row·ProductShell 통합 10/10 |
| `pnpm run test:recommendation:db` | `2026-08-10` | 통과 — persistence·synthesis 3/3 |
| `pnpm run test:mixing:ui` | `2026-08-10` | 통과 — safe failure presentation·history 단일 action·실제 timeline·상세 adapter 8/8 |
| `pnpm run test:mixing:db` | `2026-08-10` | 통과 — queue·owner/filter/pagination·active 409·terminal 삭제·cleanup queue·ticket SetNull 1/1 |
| `pnpm run test:query` | `2026-08-10` | 통과 — detail/history Query key·terminal polling·삭제 envelope 포함 23/23, streaming proxy 1/1 |
| `pnpm run test:auth:db` | `2026-08-10` | 통과 — session/role·Google provider account ownership·강제 개발 인증 우회 session 식별 3/3 |
| `pnpm run test:tickets` | `2026-08-10` | 통과 — 실제 Account identity/provider/ticket UI 3/3, ledger balance·pagination clamp DB 1/1 |
| `pnpm run test:architecture-boundaries` | `2026-08-10` | 통과 — `pnpm run check` 내부 FSD·Client/Server·App adapter 4/4 |
| `pnpm run test:storybook --run` | `2026-08-10` | 통과 — 36 files, 93 tests, Landing motion·100곡 비교·dense ProductShell Library·development bypass 상태/a11y 포함; 최종 단일 ProductShell 재검증은 4/4 |
| `pnpm run build-storybook` | `2026-08-10` | 통과 — 36개 story file 정적 산출물 생성, 기존 chunk size warning만 있음 |
| `pnpm run build` | `2026-08-10` | 통과 — Next.js 16 production build와 기존 23개 public/product/Admin/dev route 보존 |
| `pnpm run test:base-ui` | `2026-08-10` | 통과 — TSX AST 기반 Link/Base UI non-native semantics 1/1 |
| `pnpm run test:process-scripts` | `2026-08-10` | 통과 — process supervisor·Storybook production boundary 5/5 |
| `pnpm test` | `2026-08-10` | 통과 — production build, 전체 unit·integration·DB·Query·architecture와 Storybook 36 files/92 tests |
| `find docs/designs/generated/page-redesigns/concepts-v2 -maxdepth 1 -type f -name '*.png'` | `2026-08-10` | 통과 — 채택 V2 시안 13개 확인; V1·중간 시안은 검수 후 폐기 |
| `git diff --check` | `2026-08-10` | 통과 — crystal·top-header 코드, current/V2 baseline, Design System·Feature 문서 whitespace 오류 없음 |

<!-- lee-spec-kit:workflow-sync 2026-08-10T17:29:00+09:00 -->
