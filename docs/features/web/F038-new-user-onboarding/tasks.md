# Tasks: new-user-onboarding

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
- **브랜치**: `feat/new-user-onboarding`
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

- [DONE][PRD-FR-067] T-F038-new-user-onboarding-01 온보딩 완료 상태와 인증 API 구현
  - Date: 2026-08-17
  - Acceptance:
    - 기존 사용자는 migration 시 완료 상태로 이관되고 이후 생성되는 신규 사용자는 미완료로 시작한다.
    - 미완료 사용자의 server snapshot은 가입 지급이 반영된 분석·믹싱 티켓 현재 잔액을 반환한다.
    - 인증된 완료 요청은 session 사용자만 멱등적으로 완료하고 반복·동시 요청과 미인증 요청을 안전하게 처리한다.
  - Checklist:
    - [x] Next.js 16.3.0 관련 Route Handler와 server/client boundary 문서를 확인한다.
    - [x] Prisma schema와 기존 사용자 backfill migration을 추가한다.
    - [x] onboarding contract, server snapshot/completion service와 인증 Route Handler를 구현한다.
    - [x] DB/API targeted integration tests를 추가하고 통과시킨다.

- [DONE][PRD-FR-067] T-F038-new-user-onboarding-02 신규 사용자 온보딩 모달과 제품 shell 연결
  - Date: 2026-08-17
  - Acceptance:
    - 최초 인증 제품 화면에서 한 화면 모달이 열리고 서비스 흐름과 두 티켓 용도·현재 잔액을 표시한다.
    - 시작하기 성공 후에만 모달이 닫히며 저장 실패 시 오류와 재시도 action을 유지한다.
    - 완료 사용자, 기존 사용자와 개발 인증 bypass에는 모달이 노출되지 않는다.
  - Checklist:
    - [x] 공용 Dialog/Button과 semantic token을 재사용해 온보딩 UI와 client mutation을 구현한다.
    - [x] ProductLayout snapshot을 serializable prop으로 ProductShell에 연결하고 callback 경로를 유지한다.
    - [x] desktop/mobile Storybook success·failure·완료 상태 interaction을 추가한다.
    - [x] 접근성 focus와 360px 이하 viewport의 overflow를 검증한다.

- [TODO][PRD-FR-067] T-F038-new-user-onboarding-03 온보딩 회귀 검증과 문서 동기화
  - Date: 2026-08-17
  - Acceptance:
    - 인증·티켓 기존 동작과 production build가 온보딩 변경 후에도 통과한다.
    - spec·plan·tasks·decisions와 실제 구현 및 검증 evidence가 일치한다.
  - Checklist:
    - [ ] 신규 targeted test와 auth/ticket/Storybook 회귀 검사를 실행한다.
    - [ ] Biome, lint, typecheck, architecture와 production build를 실행한다.
    - [ ] 실제 desktop/mobile 모달을 브라우저에서 확인하고 스크린샷 evidence를 남긴다.
    - [ ] feature 문서와 workflow sync marker를 최종 구현에 맞게 갱신한다.

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
| `pnpm run db:validate && pnpm run db:migrate:deploy` | `2026-08-17` | PASS — schema 유효, onboarding migration 적용 |
| `pnpm run test:onboarding` | `2026-08-17` | PASS — 2 tests, 기존 사용자 backfill 계약과 계정 소유·멱등 완료 검증 |
| `pnpm exec biome check <F038 task 01 files>` | `2026-08-17` | PASS — 11 files |
| `pnpm exec tsc --noEmit` | `2026-08-17` | PASS |
| `pnpm exec tsx --test tests/api-contracts.test.ts` | `2026-08-17` | PASS — 10 tests, onboarding snapshot/completion 계약 포함 |
| `pnpm run test:storybook --run src/features/complete-onboarding/ui/new-user-onboarding-dialog.stories.tsx src/widgets/product-shell/ui/product-shell.stories.tsx` | `2026-08-17` | PASS — Chromium 12 tests, desktop/mobile/loading/error/completed/bypass |
| `pnpm run test:architecture-boundaries` | `2026-08-17` | PASS — 4 tests |

<!-- lee-spec-kit:workflow-sync 2026-08-17T05:00:53.000Z -->
