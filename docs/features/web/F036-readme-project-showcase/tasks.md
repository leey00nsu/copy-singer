# Tasks: readme-project-showcase

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
- **디자인 시스템 동기화(조건부)**: `docs/designs/design-system.md`를 변경하는 태스크는 영향 받는 디자인 문서, token/theme, 공통 UI, Storybook/workbench와 검증을 같은 task의 `Checklist`에서 추적하세요. 영향이 없는 영역은 변경하지 말고 영향 여부만 확인합니다.

---

## 로컬 추적 정보
- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/readme-project-showcase`
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

---

- [DONE][NON-PRD] T-F036-readme-project-showcase-01 README 쇼케이스와 제공 이미지 구성
  - Date: 2026-08-16
  - Acceptance:
    - Leemage README의 상단 정보 구조를 참고한 Copysinger 브랜드·소개·바로가기·제품 화면이 GitHub Markdown에서 유효하다.
    - 제공된 홈과 보컬 분석 결과 이미지가 저장소 내부 asset으로 순서대로 표시된다.
    - 제품 기능, 기술 스택, 실행·배포·테스트 정보가 현재 구현과 일치한다.
  - Checklist:
    - [x] 제공 PNG 두 장을 의미 있는 영문 파일명으로 저장하고 형식·크기를 확인한다.
    - [x] README hero, badge, anchor navigation과 screenshot gallery를 작성한다.
    - [x] 주요 기능·기술 스택·시스템 구성·Quick Start·운영 정보를 현재 코드 기준으로 재구성한다.
    - [x] 오래된 route·worker·환경설정 문구와 중복 설명을 제거한다.
  - Evidence: `aae9693` (`feat(F036): README 쇼케이스와 제공 이미지 구성`); 홈 2572×1850(358 KiB), 보컬 분석 결과 2644×1854(335 KiB) PNG를 repository asset으로 추가했다. README 17개 heading, 14개 anchor, 3개 asset과 10개 package script reference 정적 검증에서 누락 0건, legacy `SIGNUP_TICKET_GRANT`·`ENABLE_DEV_SVC`·제거 route 검색 0건, `git diff --check` PASS.

- [DONE][NON-PRD] T-F036-readme-project-showcase-02 환경 설정 정본과 문서 회귀 검증
  - Date: 2026-08-16
  - Acceptance:
    - README는 환경변수 목록을 나열하지 않고 `.env.example`이 각 변수의 의미와 fallback을 설명한다.
    - 내부 anchor, 상대 링크, 이미지 경로, package script와 runtime env 계약 검증이 통과한다.
  - Checklist:
    - [x] `.env.example`을 로컬·운영 영역으로 구분하고 변수별 용도·필수성·기본값/fallback을 주석으로 설명한다.
    - [x] runtime env 사용처와 `.env.example` key를 대조하고 legacy 변수 잔존을 검사한다.
    - [x] README anchor·asset·script와 PNG 형식·크기를 정적 검증한다.
    - [x] `git diff --check`와 `pnpm run db:validate`를 실행한다.
    - [x] spec, plan, tasks, decisions와 workflow sync marker를 최종 결과에 맞게 동기화한다.
  - Evidence: `62aaf61` (`feat(F036): 환경 설정 정본과 문서 회귀 검증`); `.env.example` 39개 key의 중복·필수 목록 누락·legacy key 0건, source에서 추출한 runtime/operational env 참조의 문서 누락 0건, README 내 개별 변수명 0건을 확인했다. README anchor·asset·script 누락 0건, PNG 2개 형식/크기 PASS, `git diff --check`, `pnpm run db:validate` PASS.

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [x] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료
- [x] 테스트 실행 및 통과 (아래에 명령어/결과 기록)
- [x] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| README anchor·asset·package script 정적 검사 | `2026-08-16` | PASS — 누락 0건 |
| `.env.example` key·runtime 참조·legacy·README 중복 검사 | `2026-08-16` | PASS — 39 keys, 누락·중복·legacy·README 변수명 0건 |
| `sips -g pixelWidth -g pixelHeight -g format public/readme-captures/*.png` | `2026-08-16` | PASS — PNG 2개, 각각 1 MiB 이하 |
| `git diff --check` | `2026-08-16` | PASS |
| `pnpm run db:validate` | `2026-08-16` | PASS — Prisma schema valid |

<!-- lee-spec-kit:workflow-sync 2026-08-16T21:38:37+09:00 -->
