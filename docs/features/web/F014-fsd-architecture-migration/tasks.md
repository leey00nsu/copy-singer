# Tasks: fsd-architecture-migration

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
- **브랜치**: `feat/fsd-architecture-migration`
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

- [DONE][NON-PRD] T-F014-fsd-architecture-migration-01 Steiger와 Shared 기반 이전
  - Date: 2026-08-09
  - Acceptance:
    - Steiger recommended FSD 검사가 src를 대상으로 실행되고 로컬 check에 연결된다.
    - shared UI, cn, DB, server config 등 독립 기반 모듈이 public API와 client/server 경계를 갖고 src/shared로 이전된다.
    - 중간 alias 호환 범위에서도 production build와 Shared 관련 회귀 검사가 통과한다.
  - Checklist:
    - [x] steiger@0.6.0과 @feature-sliced/steiger-plugin@0.7.0을 exact devDependency로 설치하고 설정 및 check:architecture script를 추가한다.
    - [x] components/ui, lib/utils, lib/db, lib/config과 독립 범용 모듈을 shared 목적별 segment로 이동한다.
    - [x] 이동한 모듈의 소비 import와 테스트를 public API 기준으로 갱신한다.
    - [x] pnpm run check:architecture, pnpm run check, pnpm run build 및 관련 테스트를 실행한다.

- [DONE][NON-PRD] T-F014-fsd-architecture-migration-02 보컬 프로필·인증·티켓 경계 이전
  - Date: 2026-08-09
  - Acceptance:
    - 보컬 프로필과 티켓의 독립 계약·표현·persistence가 Entity에 있고 분석 및 인증 조합은 Feature/App 경계에 있다.
    - browser-safe index.ts와 server-only index.server.ts가 분리되고 Client Component에서 server 전용 import가 없다.
    - 관련 auth, vocal-profile, ticket, media 테스트와 production build가 기존 동작으로 통과한다.
  - Checklist:
    - [x] vocal-profile과 ticket 모듈을 significant Entity slice 및 public API로 재구성한다.
    - [x] analysis queue/worker, authentication, ticket 관리처럼 여러 책임을 조합하는 코드를 Feature 또는 App 계층으로 올린다.
    - [x] Leemage media adapter와 audio utility의 소유 위치 및 server-only 경계를 확정한다.
    - [x] 관련 app, component, route, script, worker, test import를 새 public API로 갱신한다.
    - [x] Steiger, 정적 검사, production build와 관련 테스트를 실행한다.

- [DONE][NON-PRD] T-F014-fsd-architecture-migration-03 추천·믹싱·관리자·개발 합성 경계 이전
  - Date: 2026-08-09
  - Acceptance:
    - 추천과 mixing-job의 공유 계약·표현은 Entity에 있고 여러 Entity를 조합하는 생성·queue·관리 흐름은 Feature/App에 있다.
    - key-fit, song catalog와 개발 합성 코드는 실제 소비 관계에 따라 Page 또는 Feature에 배치되어 같은 레이어 cross-import가 없다.
    - recommendation, mixing, catalog, admin, conversion 관련 기존 테스트와 production build가 통과한다.
  - Checklist:
    - [x] recommendation과 mixing 모듈을 Entity와 Feature 책임으로 분리한다.
    - [x] admin service, key-fit, song catalog, conversion orchestration을 pages-first와 significant usage 기준으로 배치한다.
    - [x] 관련 app, component, route, script, worker, data 및 test import를 public API 기준으로 갱신한다.
    - [x] Steiger violation을 예외 없이 해소하고 정적 검사, build와 관련 테스트를 실행한다.

- [TODO][NON-PRD] T-F014-fsd-architecture-migration-04 Widget·Page·Layout과 root page adapter 이전
  - Date: 2026-08-09
  - Acceptance:
    - 10개 UI route 구현과 loading/error/not-found 경계가 _pages public API로 이전되고 URL과 렌더링 동작이 유지된다.
    - 공유 workbench만 Widget으로 유지되고 단일 화면 UI는 해당 Page slice에 배치된다.
    - root page/layout special file은 framework config와 FSD public API 조립만 담당하며 root components 디렉터리가 제거된다.
  - Checklist:
    - [ ] page 전용 component와 10개 page 구현을 _pages slice로 이동한다.
    - [ ] home/profile 공용 vocal-profile workbench를 Widget으로 이동하고 나머지 UI의 significant usage를 검증한다.
    - [ ] root layout, provider와 global styles를 _app으로 옮기고 root page/layout/loading/error/not-found를 thin adapter로 전환한다.
    - [ ] UI 테스트 import를 갱신하고 Steiger, 정적 검사, production build와 UI 회귀 테스트를 실행한다.

- [TODO][NON-PRD] T-F014-fsd-architecture-migration-05 API·worker adapter 전환과 legacy 제거 및 최종 검증
  - Date: 2026-08-09
  - Acceptance:
    - 24개 Route Handler 구현이 _app/api-routes로 이전되고 root route.ts는 method export와 route config만 유지한다.
    - mixing 및 vocal-profile analysis worker entry command와 동작이 유지되고 server public API를 사용한다.
    - root lib과 compatibility re-export가 제거되고 @ alias가 src만 가리키며 전체 품질·build·test suite가 통과한다.
  - Checklist:
    - [ ] 24개 handler를 endpoint public API로 이동하고 root route adapter의 URL, method, runtime, status/response 계약을 검증한다.
    - [ ] background worker implementation과 root script wrapper import를 _app 및 server public API 기준으로 갱신한다.
    - [ ] 모든 test와 script import를 갱신하고 root lib, 임시 alias fallback 및 compatibility export를 제거한다.
    - [ ] route inventory, client-to-server import, Steiger, pnpm run check, pnpm test와 feature config 검증을 실행한다.

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
| `pnpm run check:architecture` | `2026-08-09` | `PASS (Steiger recommended rules 오류 0건)` |
| `pnpm run check` | `2026-08-09` | `PASS (Biome 경고 63건, ESLint·TypeScript·Steiger 오류 0건)` |
| `pnpm run build` | `2026-08-09` | `PASS (Next.js production build 및 기존 route inventory 유지)` |
| `pnpm test` | `-` | `대기` |
| `pnpm run verify:feature-config` | `2026-08-09` | `PASS (auth, admin, Leemage 환경 변수 검증)` |
| `pnpm exec tsx --test tests/base-ui-link-button.test.ts tests/audio-waveform-player.test.ts tests/profile-audio-preparation.test.ts tests/vocal-profile-recorder.test.ts tests/compress-mixing-result.test.ts tests/process-scripts.test.ts` | `2026-08-09` | `PASS (13 tests)` |
| `pnpm run test:auth:db` | `2026-08-09` | `PASS (3 tests)` |
| `pnpm run test:tickets` | `2026-08-09` | `PASS (2 tests)` |
| `pnpm run test:media` | `2026-08-09` | `PASS (5 tests)` |
| `pnpm run test:vocal-profile-analyzer` | `2026-08-09` | `PASS (8 tests)` |
| `pnpm run test:vocal-profile-persistence` | `2026-08-09` | `PASS (3 tests)` |
| `pnpm run test:vocal-profile-analysis-queue` | `2026-08-09` | `PASS (5 tests)` |
| `pnpm run test:vocal-profile-history` | `2026-08-09` | `PASS (6 tests)` |
| `pnpm run test:admin` | `2026-08-09` | `PASS (2 tests)` |
| `pnpm exec tsx --test tests/vocal-profile-contract.test.ts tests/vocal-profile-visualization.test.ts tests/long-audio-upload.test.ts tests/reference-preview.test.ts tests/vocal-profile-reference-bands.test.ts tests/vocal-profile-results-ui.test.tsx` | `2026-08-09` | `PASS (21 tests)` |
| `pnpm run test:catalog` | `2026-08-09` | `PASS (7 tests)` |
| `pnpm run test:catalog-targets` | `2026-08-09` | `PASS (1 test)` |
| `pnpm run test:key-fit` | `2026-08-09` | `PASS (19 tests)` |
| `pnpm run test:recommendation` | `2026-08-09` | `PASS (18 tests)` |
| `pnpm run test:recommendation:db` | `2026-08-09` | `PASS (3 tests)` |
| `pnpm run test:mixing:db` | `2026-08-09` | `PASS (1 test)` |
| `pnpm run test:mixing:ui` | `2026-08-09` | `PASS (1 test)` |
| `pnpm run test:process-scripts` | `2026-08-09` | `PASS (2 tests)` |
| `pnpm run catalog:verify` | `2026-08-09` | `PASS (100곡 artifact READY 상태 확인)` |

<!-- lee-spec-kit:workflow-sync 2026-08-09T07:59:50.000Z -->
