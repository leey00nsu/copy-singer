# Tasks: login-branding-ui

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
- **브랜치**: `feat/login-branding-ui`
- **대기 중 변경 요청**: 결정: approve — 2026-08-11 사용자 `일단 A로 마무리` 응답을 workflow 승인 옵션 `A`로 기록하고 main fast-forward 통합, post-merge 검증 및 통합된 로컬 Feature 브랜치/관리 worktree 정리를 허가함
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

- [DONE][PRD-FR-052] T-F019-01 Copysinger 로고 master와 favicon 적용
  - Date: 2026-08-11
  - Acceptance:
    - 제공된 헤드폰·five-bar 파형의 silhouette과 dark/pink/violet/blue 관계를 보존한 transparent PNG master가 project asset으로 저장된다.
    - ProductBrand가 공통 ProductMark를 사용하고 Login이 재사용할 public API를 제공하며 favicon·apple touch icon은 같은 master에서 파생된다.
  - Checklist:
    - [x] ImageGen built-in edit와 chroma-key 제거로 transparent master 생성·검수
    - [x] favicon/apple touch icon deterministic 파생과 alpha·dimension·축소 QA
    - [x] ProductMark·ProductBrand·metadata 적용 및 Storybook 회귀

- [DONE][PRD-FR-051] T-F019-02 비로그인 ProductHeader 로그인 action 단일화
  - Date: 2026-08-11
  - Acceptance:
    - desktop과 mobile 비로그인 header는 primary 로그인 action 하나만 제공하고 기존 callback URL을 유지한다.
  - Checklist:
    - [x] desktop/mobile 중복 무료로 시작하기 action 제거
    - [x] ProductShell Storybook과 auth navigation 회귀 검증

- [DONE][PRD-FR-046] T-F019-03 최소 로그인 화면과 Google 시작 button 적용
  - Date: 2026-08-11
  - Acceptance:
    - 로그인 page는 header 홈으로를 제거하고 중심에 logo, Copysinger, Google icon이 포함된 구글로 시작하기 button만 정적으로 표시한다.
    - 기존 OAuth pending·configured false·runtime error와 safe callback/session redirect 계약을 유지한다.
  - Checklist:
    - [x] LoginScreen composition 분리와 불필요한 static copy 제거
    - [x] multicolor GoogleIcon과 outline 구글로 시작하기 action 적용
    - [x] unit·Storybook·browser·check·build 회귀 검증

- [DONE][PRD-FR-046] T-F019-04 로그인 안내와 약관 동의 문구 보완
  - Date: 2026-08-11
  - Acceptance:
    - `Copysinger` 아래에는 muted `계속하려면 로그인하세요.`를 표시한다.
    - Google action 아래에는 첨부 reference의 Google 로그인 및 이용 약관·개인정보 처리방침 동의 문구를 보조 위계로 표시한다.
  - Checklist:
    - [x] LoginScreen 안내·동의 문구와 responsive spacing 적용
    - [x] Storybook·auth navigation·browser·check·build 회귀 검증

- [DONE][PRD-FR-053] T-F019-05 이용 약관·개인정보 처리방침 공개 page와 Link 적용
  - Date: 2026-08-11
  - Acceptance:
    - `/terms`와 `/privacy`가 인증 없이 열리고 현재 구현의 계정·음성·추천·믹싱·ticket·외부 처리·삭제 계약에 맞는 문서를 제공한다.
    - 로그인 동의 문구와 ProductFooter의 약관·개인정보 문서명이 실제 route Link로 동작한다.
    - 확인되지 않은 운영 주체 연락처와 국외 처리 지역은 draft 확인 항목으로 명시하고 임의 정보를 생성하지 않는다.
  - Checklist:
    - [x] current data-flow와 2026 PIPC 작성지침 기반 legal content 작성
    - [x] 공통 LegalDocumentLayout과 `/terms`·`/privacy` public adapter 구현
    - [x] LoginScreen·ProductFooter link 및 Storybook·unit·browser·check·build 검증

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [x] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료
- [x] 테스트 실행 및 통과 (아래에 명령어/결과 기록)
- [x] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

- 2026-08-11 구현 승인: 사용자 응답 `일단 A로 마무리`를 workflow 승인 옵션 `A`로 기록함.

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run test:storybook --run src/_pages/legal/ui/legal-pages.stories.tsx src/_pages/login/ui/login-screen.stories.tsx src/widgets/product-shell/ui/product-shell.stories.tsx` | `2026-08-11` | 통과 — legal page 핵심 section·draft notice·login/footer Link·Google/OAuth/header 상태 10/10 |
| `pnpm run test:auth-navigation` | `2026-08-11` | 통과 — `/terms`·`/privacy` public adapter, legal content/link, safe callback·route group·제품 navigation 7/7 |
| `pnpm run check` | `2026-08-11` | 통과 — Biome 기존 warning 59개, ESLint·TypeScript·FSD/architecture 오류 0 |
| `pnpm run build` | `2026-08-11` | 통과 — Next.js 16.3 production build와 `/login`·`/terms`·`/privacy` route 생성 완료 |
| in-app browser `/login`·`/terms`·`/privacy` visual QA | `2026-08-11` | 통과 — login Link 실제 이동, mobile 390px legal 문서 overflow 0, 문서 간 이동·metadata title·draft/국외 이전 section·console error 0 |
| bundled Pillow asset audit | `2026-08-11` | 통과 — master 1024², favicon 64², apple icon 180², RGBA·transparent corner·nonempty alpha 확인 |

<!-- lee-spec-kit:workflow-sync 2026-08-11T09:01:20.000Z -->
