# Tasks: profile-identity-youtube-preview

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
- **브랜치**: `feat/profile-identity-youtube-preview`
- **대기 중 변경 요청**: 결정: changes_requested — primary 결과 듣기 icon의 흰색 foreground 상속
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

---

- [DONE][PRD-DATA-011] T-F020-profile-identity-youtube-preview-01 보컬 프로필 이름·순번 persistence와 rename API
  - Date: 2026-08-11
  - Acceptance:
    - 기존 USER 프로필을 결정적으로 backfill하고 새 프로필은 동시 생성·삭제에도 재사용 없는 사용자별 번호와 기본 이름을 저장한다.
    - 본인 프로필 이름만 trim 후 1~40자로 변경할 수 있고 목록·상세 응답에 저장된 이름이 반영된다.
  - Checklist:
    - [x] Prisma schema와 migration, atomic counter allocation 구현
    - [x] rename contract·owner-checked PATCH·query invalidation 구현
    - [x] migration·동시성·validation·ownership 테스트

- [DONE][PRD-FR-055] T-F020-profile-identity-youtube-preview-02 결정적 grainy gradient 프로필 artwork
  - Date: 2026-08-11
  - Acceptance:
    - 목록과 상세가 파형 glyph 대신 같은 profile ID에서 안정적으로 생성된 square grainy gradient cover를 표시한다.
  - Checklist:
    - [x] pure artwork token generator와 공통 UI 구현
    - [x] library/detail 적용과 접근성·반응형 Storybook 검증

- [DONE][PRD-FR-056] T-F020-profile-identity-youtube-preview-03 추천 YouTube source 계약과 공통 player
  - Date: 2026-08-11
  - Acceptance:
    - 추천 응답은 검증된 nullable sourceVideoId를 제공하고 player는 privacy-enhanced domain·autoplay off·accessible title을 사용한다.
  - Checklist:
    - [x] server serializer video ID validation과 response schema 구현
    - [x] click-to-load facade/player 공통 component와 contract tests

- [DONE][PRD-FR-049] T-F020-profile-identity-youtube-preview-04 추천 목록·상세 영상 UI 통합
  - Date: 2026-08-11
  - Acceptance:
    - 목록 왼쪽에서 행 동작과 충돌 없이 원본 영상을 재생하며 동시에 iframe 하나만 활성화된다.
    - 상세 제목 위에 16:9 player가 표시되고 외부 출처 열기 action이 제거된다.
  - Checklist:
    - [x] recommendation list facade·single-active full-width row·responsive layout 적용
    - [x] song detail player 배치와 external source action 제거
    - [x] Storybook·unit·build·desktop/mobile browser QA

- [DONE][PRD-FR-045] T-F020-profile-identity-youtube-preview-05 전역 수치·기술 정보 폰트 Pretendard 통일
  - Date: 2026-08-11
  - Acceptance:
    - font-mono를 사용하는 숫자·시간·분석값·기술 정보까지 Pretendard로 표시하고 Geist Mono 로딩을 제거한다.
  - Checklist:
    - [x] 전역 mono font token을 Pretendard로 통일
    - [x] Geist Mono import·CSS variable 제거
    - [x] typecheck·build·UI 회귀 검증

- [DONE][PRD-FR-049] T-F020-profile-identity-youtube-preview-06 추천 곡 상세 내부 순위 표기 제거
  - Date: 2026-08-11
  - Acceptance:
    - 추천 곡 상세 eyebrow는 Song match만 표시하고 내부 rank의 #N 표기를 노출하지 않는다.
  - Checklist:
    - [x] Song match eyebrow에서 #N 제거
    - [x] 상세 unit·Storybook·build 회귀 검증

- [DONE][PRD-FR-057] T-F020-profile-identity-youtube-preview-07 프로필별 추천 스냅샷 singleton persistence
  - Date: 2026-08-11
  - Acceptance:
    - 같은 보컬 프로필의 반복·동시 추천 생성은 동일 run을 반환하고 DB에는 최신 스냅샷 한 건만 존재한다.
  - Checklist:
    - [x] 기존 중복 run 최신 1건 보존 migration과 unique invariant 추가
    - [x] recommendation get-or-create와 P2002 경합 복구 구현
    - [x] DB integration·migration 검증

- [DONE][PRD-FR-057] T-F020-profile-identity-youtube-preview-08 프로필 추천 활동 UI 단순화
  - Date: 2026-08-11
  - Acceptance:
    - 보컬 프로필 목록·상세에서 추천 개수를 제거하고 기존 추천이 있으면 결과 보기 action만 제공한다.
  - Checklist:
    - [x] 목록·상세 추천 count chip/text 제거
    - [x] 새 추천 만들기 action 제거와 기존 결과 navigation 유지
    - [x] component·presentation 회귀 검증

- [DONE][PRD-FR-057] T-F020-profile-identity-youtube-preview-09 중앙 대표 구간 누락과 믹싱 불가 사전 안내
  - Date: 2026-08-11
  - Acceptance:
    - 중앙 대표 구간이 없는 프로필은 결과에서 누락 상태를 보고 추천 목록·선택·곡 상세에서 믹싱 불가와 재분석 경로를 요청 전에 확인한다.
  - Checklist:
    - [x] low·mid·high 고정 슬롯과 mid placeholder 구현
    - [x] recommendation mixing capability contract·serializer 구현
    - [x] 모든 추천 mixing action의 unavailable state와 재분석 link 구현
    - [x] contract·component·Storybook·build 검증

- [DONE][PRD-FR-051] T-F020-profile-identity-youtube-preview-10 분석 job 행과 저장 프로필 목록 UI 통일
  - Date: 2026-08-11
  - Acceptance:
    - 분석 대기·진행·실패 항목이 저장 프로필과 같은 5-column 목록 구조로 표시되며 완료 전에는 클릭·hover 상세 affordance가 없다.
  - Checklist:
    - [x] neutral loading cover와 상태별 first-cell content 구현
    - [x] 생성일·미확정 분석값·상태 column 정렬 및 aria-busy 적용
    - [x] pending·processing·retry·failed Storybook과 목록 회귀 검증

- [DONE][PRD-FR-050] T-F020-profile-identity-youtube-preview-11 라이브러리 상태 컬럼 공통화
  - Date: 2026-08-11
  - Acceptance:
    - AI 믹스는 결과 설명 컬럼 없이 작업·생성일·상태만 표시하고, 보컬 프로필은 AI 믹싱 횟수를 유지한 6-column 구조에서 상태를 맨 오른쪽에 표시한다.
    - 두 목록은 mobile에서 상태를 identity 영역 위에 표시하며 결과 확인 중과 프로필 분석 상태를 정확히 구분한다.
  - Checklist:
    - [x] AI 믹스 결과 column 제거·상태 재배치·결과 확인 중 label 구현
    - [x] 보컬 프로필 AI 믹싱·상태 분리 6-column 및 mobile metadata 구현
    - [x] 두 목록 Storybook·component·responsive browser 회귀 검증

- [DONE][PRD-FR-049] T-F020-profile-identity-youtube-preview-12 추천 완료 상태와 sticky 선택 카드 단순화
  - Date: 2026-08-11
  - Acceptance:
    - 추천 목록의 완료 행은 `완료` chip만 표시하고 `결과 확인` link를 노출하지 않는다.
    - 데스크톱 선택 카드가 공통 header 아래에서 목록 스크롤을 따라가며 grid section 경계 안에 유지된다.
  - Checklist:
    - [x] compact succeeded 결과 확인 link 제거와 완료 chip 유지
    - [x] selection aside sticky containing block·top offset 수정
    - [x] polling·completed·dense Storybook과 scroll browser QA

- [DONE][PRD-FR-051] T-F020-profile-identity-youtube-preview-13 완료 결과 재생 버튼 위계 조정
  - Date: 2026-08-11
  - Acceptance:
    - 완료 선택 카드의 재생 전 `결과 듣기`는 primary이고 재생 후 `결과 닫기`는 outline으로 표시된다.
  - Checklist:
    - [x] audioOpen 기반 결과 button variant 전환
    - [x] completed Storybook에서 닫힘·열림 위계 검증
    - [x] recommendation·typecheck·build 회귀 검증

- [TODO][PRD-FR-051] T-F020-profile-identity-youtube-preview-14 결과 듣기 icon foreground 통일
  - Date: 2026-08-11
  - Acceptance:
    - primary `결과 듣기`의 icon이 별도 성공색 없이 button의 흰색 foreground를 상속하고 outline 전환 후에도 해당 variant의 전경색을 상속한다.
  - Checklist:
    - [ ] Headphones icon의 고정 success color 제거
    - [ ] completed Storybook에서 icon·button computed color 일치 검증
    - [ ] typecheck·build 회귀 검증

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
| `pnpm exec tsx --test tests/vocal-profile-contract.test.ts` | `2026-08-11` | 통과 — rename trim·빈 값·40자 제한 포함 6/6 |
| `pnpm run test:vocal-profile-history` | `2026-08-11` | 통과 — stored name·owner scope·private audio 포함 6/6 |
| `pnpm run test:vocal-profile-persistence` | `2026-08-11` | 통과 — 기본 이름·counter 증가와 실패 rollback 포함 3/3 |
| `pnpm run typecheck` | `2026-08-11` | 통과 |
| `pnpm run check:architecture` | `2026-08-11` | 통과 — Steiger·boundary 4/4 |
| `pnpm exec tsx --test tests/vocal-profile-contract.test.ts tests/vocal-profile-history-ui.test.tsx` | `2026-08-11` | 통과 — artwork 결정성·분산과 library 회귀 포함 10/10 |
| `pnpm run test:storybook --run src/widgets/library/ui/vocal-profile-library.stories.tsx` | `2026-08-11` | 통과 — profile artwork와 분석 pending·processing·retry·failed 동일 목록 구조 6/6 |
| `pnpm exec tsx --test tests/api-contracts.test.ts tests/recommendation-presentation.test.ts tests/recommendation-ui.test.tsx tests/client-server-state-query.test.ts` | `2026-08-11` | 통과 — video ID·URL·facade/player·추천 회귀 30/30 |
| `pnpm run test:recommendation:db` | `2026-08-11` | 통과 — 반복·동시 추천 singleton, sourceVideoId, synthesis 포함 3/3 |
| `pnpm prisma migrate deploy` | `2026-08-11` | 통과 — 중복 run 최신 1건 보존 및 profile unique migration 적용 |
| `pnpm prisma validate` | `2026-08-11` | 통과 — profile별 recommendation run unique schema 유효 |
| `pnpm run test:recommendation` | `2026-08-11` | 통과 — ranking 10/10, compact 완료 chip 단독 표시와 mixing 불가 포함 presentation·UI·detail 23/23 |
| `pnpm run test:storybook --run src/_pages/recommendation-detail/ui/recommendation-results.stories.tsx src/_pages/song-detail/ui/song-detail.stories.tsx` | `2026-08-11` | 통과 — 목록·상세 mixing 불가와 재분석 link 포함 13/13 |
| `pnpm run build` | `2026-08-11` | 통과 — Next.js production build 및 25개 static page 생성 |
| `Storybook browser QA (desktop 1440px / mobile 390px)` | `2026-08-11` | 통과 — 재생 전후 요약 행·곡 셀 폭 유지, 4-column 확장 행, iframe 최대 1개, 200px 최소 높이와 가로 overflow 없음 |
| `rg -n "Geist_Mono\|font-geist-mono\|next/font/google" src` | `2026-08-11` | 통과 — 잔여 Geist Mono import·variable 없음 |
| `pnpm run test:storybook --run src/_pages/recommendation-detail/ui/recommendation-results.stories.tsx src/widgets/library/ui/vocal-profile-library.stories.tsx` | `2026-08-11` | 통과 — 추천 수치·프로필 분석 UI 회귀 14/14 |
| `pnpm exec tsx --test tests/recommendation-song-detail.test.tsx` | `2026-08-11` | 통과 — Song match #N 제거 포함 상세 회귀 5/5 |
| `pnpm run test:storybook --run src/_pages/song-detail/ui/song-detail.stories.tsx` | `2026-08-11` | 통과 — 원본 영상·Song match label 1/1 |
| `pnpm exec tsx --test tests/vocal-profile-history-ui.test.tsx` | `2026-08-11` | 통과 — 분석 중 5-column·aria-busy·비클릭 상태와 저장 목록 회귀 3/3 |
| `pnpm exec tsx --test tests/api-contracts.test.ts tests/recommendation-ui.test.tsx tests/vocal-profile-results-ui.test.tsx tests/vocal-profile-reference-bands.test.ts tests/mixing-reference.test.ts` | `2026-08-11` | 통과 — capability contract·중앙 placeholder·요청 전 차단 26/26 |
| `pnpm run test:vocal-profile-presentation` | `2026-08-11` | 통과 — 중앙 대표 구간 누락과 profile UI 회귀 12/12 |
| `pnpm run test:mixing:db` | `2026-08-11` | 통과 — reference 선택·티켓 차감 전 방어·queue 회귀 1/1 |
| `Storybook browser QA (analysis job row desktop)` | `2026-08-11` | 통과 — 저장 행과 같은 6개 열, AI 믹싱 placeholder·상태 분리, interactive target·runtime error 없음 |
| `pnpm exec tsx --test tests/mixing-history-ui.test.tsx tests/vocal-profile-history-ui.test.tsx` | `2026-08-11` | 통과 — AI 믹스 3-column·결과 확인 중과 프로필 6-column·사용 가능 상태 포함 6/6 |
| `pnpm run test:storybook --run src/widgets/library/ui/mixing-library.stories.tsx src/widgets/library/ui/vocal-profile-library.stories.tsx` | `2026-08-11` | 통과 — 결과 column 제거·오른쪽 상태와 프로필 6-column 상태 11/11 |
| `pnpm run lint` | `2026-08-11` | 통과 |
| `Storybook browser QA (library status columns desktop)` | `2026-08-11` | 통과 — AI 믹스 3열·프로필 6열 header/cell 좌표 일치, 상태 맨 오른쪽, 가로 overflow 없음 |
| `pnpm run test:storybook --run src/_pages/recommendation-detail/ui/recommendation-results.stories.tsx` | `2026-08-11` | 통과 — polling 완료 chip·sticky selection·결과 듣기 primary→결과 닫기 outline 포함 11/11 |
| `Storybook browser QA (recommendation sticky selection)` | `2026-08-11` | 통과 — 100곡 목록 중간에서 top 96px 유지, grid 끝에서 containment, 완료 chip 1개·결과 확인 link 0개·선택 카드 결과 듣기 유지 |

<!-- lee-spec-kit:workflow-sync 2026-08-11T21:34:24+09:00 -->
