# Tasks: frontend-quality-foundation

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
- **브랜치**: `feat/frontend-quality-foundation`
- **스펙 승인**: 2026-08-09 사용자 응답 `자동진행`을 workflow 기본 옵션 `A`로 기록
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

- [DONE][NON-PRD] T-F013-frontend-quality-foundation-01 Biome 검사 기준선과 package script 구축
  - Date: 2026-08-09
  - Acceptance:
    - Biome가 지원 소스 전체의 format, lint, import assist를 검사하고 생성·빌드 경로를 제외한다.
    - 사람이 작성하는 JavaScript/TypeScript 파일 이름은 Next.js convention과 연속 확장자를 보존하면서 kebab-case로 검증된다.
    - 기존 ESLint lint script는 유지되고 Biome, ESLint, TypeScript를 묶은 로컬 정적 검사 명령이 제공된다.
    - 한 번의 포맷 기준선 정규화 후 애플리케이션 빌드와 기존 회귀 테스트가 통과한다.
  - Checklist:
    - [x] @biomejs/biome를 개발 의존성으로 설치하고 VCS, ignore, formatter, linter, assist 설정을 작성한다.
    - [x] Biome 검사·자동 수정·staged 검사와 TypeScript/통합 check package script를 추가한다.
    - [x] useFilenamingConvention을 kebab-case error로 구성하고 framework/generated 예외를 검증한다.
    - [x] Biome와 ESLint 충돌을 조정하고 지원 파일을 한 번 정규화한다.
    - [x] Biome, ESLint, TypeScript, build 및 관련 회귀 테스트를 실행한다.

- [DONE][NON-PRD] T-F013-frontend-quality-foundation-02 Husky staged pre-commit 검사 구축
  - Date: 2026-08-09
  - Acceptance:
    - pnpm install lifecycle 후 별도 수동 명령 없이 Husky hook이 준비된다.
    - pre-commit은 staged된 Biome 지원 파일만 read-only로 검사한다.
    - 정상 staged 변경은 통과하고 format 또는 lint 오류가 있는 staged 변경은 커밋 전에 실패한다.
    - hook 실행은 unstaged 파일과 Git index 내용을 자동 수정하지 않는다.
  - Checklist:
    - [x] husky를 개발 의존성으로 설치하고 prepare script를 구성한다.
    - [x] .husky/pre-commit에서 check:staged package script를 실행한다.
    - [x] 임시 index 또는 동등한 격리된 검증으로 성공·실패 경로와 index 불변성을 확인한다.
    - [x] hook 설치를 비활성화한 환경에서도 수동 check와 CI 검사가 동작하는지 확인한다.

- [DONE][NON-PRD] T-F013-frontend-quality-foundation-03 GitHub Actions 품질 게이트와 최종 회귀 검증
  - Date: 2026-08-09
  - Acceptance:
    - GitHub Actions가 frozen pnpm lockfile로 설치하고 Biome, ESLint, TypeScript, 기존 회귀 테스트를 실행한다.
    - DB 검증은 격리된 PostgreSQL service와 migration을 사용하고 운영 secret이나 외부 유료 서비스에 의존하지 않는다.
    - workflow는 read-only 권한으로 품질 검사만 수행하며 배포·push를 수행하지 않는다.
    - F014~F016이 추가 검사를 확장할 수 있는 안정적인 script 경계가 문서화된다.
  - Checklist:
    - [x] .github/workflows/quality.yml에 Node.js 22, pnpm cache, PostgreSQL service를 구성한다.
    - [x] HUSKY=0 설치와 테스트용 DATABASE_URL, prisma migrate deploy 및 카탈로그 import 단계를 구성한다.
    - [x] CI가 참조하는 모든 package script와 회귀 명령을 로컬에서 실행한다.
    - [x] workflow YAML, docs evidence, workflow-sync marker를 최종 상태와 동기화한다.

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [x] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료
- [x] 테스트 실행 및 통과 (아래에 명령어/결과 기록)
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run check:biome` | `2026-08-09` | `PASS (오류 0건, unsafe suggestion 경고 63건)` |
| `pnpm run lint` | `2026-08-09` | `PASS` |
| `pnpm run typecheck` | `2026-08-09` | `PASS` |
| `pnpm test` | `2026-08-09` | `PASS (Next.js production build 및 전체 회귀 suite)` |
| `pnpm run db:validate && pnpm run db:status` | `2026-08-09` | `PASS (schema valid, 10 migrations up to date)` |
| `pnpm run prepare && HUSKY=0 pnpm run prepare` | `2026-08-09` | `PASS (hook 설치 및 CI skip 경로)` |
| `GIT_INDEX_FILE=<temporary> .husky/_/pre-commit` | `2026-08-09` | `PASS (정상 변경 통과, 위반 변경 exit 1, 양쪽 index hash 불변)` |
| `HUSKY=0 pnpm run check:staged` | `2026-08-09` | `PASS (staged 파일 0개)` |
| `pnpm run check` | `2026-08-09` | `PASS` |
| `actionlint .github/workflows/quality.yml` | `2026-08-09` | `PASS (rhysd/actionlint container)` |
| `pnpm run test:vocal-profile-analysis-queue` | `2026-08-09` | `PASS (lease recovery 경계 안정화 후 동일 케이스 3회 및 suite 통과)` |
| `CI env + fresh PostgreSQL 17: install → generate → migrate → catalog import → check → db validate/status → test` | `2026-08-09` | `PASS (10 migrations, 100곡 import, 전체 build/회귀 suite)` |

<!-- lee-spec-kit:workflow-sync 2026-08-09T07:07:59.000Z -->
