# Tasks: openwiki-writing-style

## 태스크 규칙

- **상태**: 기본은 `[TODO]` → `[DOING]` → `[DONE]`; `workflow.agentReview.task.enabled=true`이면 `[DOING]` → `[REVIEW]` → `[DONE]`
- **구현 위임**: `workflow.agentExecution.task.enabled=true`이면 설정된 worker가 반환된 `workerContract`를 따르고 `workflow-stage` 재호출이나 재위임 없이 직접 실행하며, 프로젝트 코드와 태스크 범위 검사만 담당합니다. 메인 에이전트가 이 문서, 태스크 상태, 커밋, 승인, 원격 작업을 유지합니다.
- **태스크 공유 / 확인**:
  - `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 `tasks.md`에서 상태를 함께 갱신합니다
  - `[DOING] → [REVIEW]/[DONE]`: 완료 전 결과/검증을 공유하고 같은 수정에서 `Acceptance`와 `Checklist`를 함께 갱신합니다
  - `[REVIEW] → [DONE]`: 완료 전에 반환된 리뷰 Round와 fresh 태스크 리뷰 Evidence, Decision, Reviewed Head, Reviewed Tree를 기록합니다
  - 태스크 상태 변경 전에 승인이 필요한 경우는 문서화된 review checkpoint 또는 원격/파괴적 작업 직전뿐입니다.
  - 워크플로우가 요구하지 않는 standalone `OK` 승인 단계는 만들지 않습니다.
  - 해당 태스크의 `Checklist`에 unchecked 항목이 남아 있으면 `[DONE]`으로 전환하지 않습니다.
  - `workflow.agentReview.maxRounds`는 fresh 리뷰의 최대 실행 횟수입니다. 마지막 허용 Round가 `changes_requested`이면 지적을 한 번 반영하고 남은 finding과 그 결과의 target 변경을 잔여 위험으로 보존한 뒤, 추가 리뷰나 사용자 승인 없이 리뷰 게이트를 자동 완료합니다. `maxRounds=1`이면 Round 2는 없습니다. `blocked`는 자동 완료하지 않습니다.
- **PRD 매핑(권장)**: 각 태스크 라인에 `[PRD-FR-001]` 또는 `[PRD-SCOPE-V1-DESKTOP-EDITOR]` 같은 기존 PRD 요구사항 ID 태그를 추가하거나, PRD와 무관한 태스크는 `[NON-PRD]`로 표시하세요.
  - 단, `tasks.md`에서 PRD ID를 임의로 만들지 마세요. `docs/prd` 또는 상위 요구사항 문서에 먼저 정의된 ID만 참조해야 합니다.
  - 레거시 문서에 아직 PRD ID가 없다면, 먼저 원문 요구사항 문서에 ID를 backfill한 뒤 `spec.md`의 `PRD Refs`와 태스크 태그를 함께 맞추세요.
  - `[NON-PRD]`는 내부 구현 작업 전용입니다. 사용자 동작, acceptance criteria, 범위가 바뀌는 태스크라면 PRD를 먼저 backfill하고 `[PRD-...]`로 태깅하세요.
- **디자인 시스템 동기화(조건부)**: `docs/designs/design-system.md`를 변경하는 태스크는 영향 받는 디자인 문서, token/theme, 공통 UI, Storybook/workbench와 검증을 같은 task의 `Checklist`에서 추적하세요. 영향이 없는 영역은 변경하지 말고 영향 여부만 확인합니다.

---

## 로컬 추적 정보
- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/openwiki-writing-style`
- **대기 중 변경 요청**: -
  - 구현 중 새로 수용한 사용자 요청을 잠시 표시하는 sync marker입니다
  - 요청을 `tasks.md`와 관련 문서에 반영한 뒤 값을 비우세요
- **Feature 리뷰**: Done
  - Feature 리뷰 handoff를 시작하면 `Running`, 리뷰 결과 기록까지 끝나면 `Done`으로 변경
- **Feature 리뷰 Evidence**: features/web/F041-openwiki-writing-style/decisions.md
- **Feature 리뷰 Decision**: changes_requested
  - 형식: `결정: approve|changes_requested|blocked ...` (또는 `decision: ...`)
- **Feature 리뷰 Round**: 1
  - `workflow-stage --json`이 반환한 양의 정수이며 첫 리뷰는 `1`
- **Feature 리뷰 Head**: `1d8d703b5e80a6c7ed2c800f21e1b5454c3e2e2a`
  - Feature 리뷰가 확인한 project code commit SHA
- **Feature 리뷰 Tree**: `f76ec37fd7fa3cdc4f873fcb58265d8fc152338b`
  - Feature 리뷰가 확인한 project code tree SHA

---

## 태스크 엔트리 포맷

```markdown
- [TODO][PRD-FR-001] T-{feature-ref}-01 {태스크 제목}
  - Date: YYYY-MM-DD
  - Acceptance:
    - (검증 조건)
  - Checklist:
    - [ ] (서브 태스크)
  - Docs:
    - (`docs:<path>` 또는 `project:<path>` 대상을 사용하거나 이 섹션을 생략)
  - Review Evidence: -
  - Review Decision: -
  - Review Round: -
  - Reviewed Head: -
  - Reviewed Tree: -
```

> 위 예시의 `PRD-FR-001`은 가능한 `PRD-*` key 중 하나일 뿐입니다. 아직 PRD 원문에 정의되지 않았다면 태스크에 먼저 넣지 마세요.
> 처음엔 탐색/내부 작업이었더라도 제품 요구사항 변경으로 이어졌다면, `NON-PRD`로 두지 말고 PRD를 먼저 갱신한 뒤 `[PRD-...]`로 재태깅하세요.

---

## 태스크 목록

> 아래에 태스크를 추가하세요. **최소 1개가 필요**합니다.
> 태스크는 하나의 순차 리스트로 유지하고, 위에서 아래 순서 자체를 실행 우선순위로 취급하세요.
> 새 태스크 append에는 `npx lee-spec-kit task add <feature-ref> --title "..." --ref NON-PRD --acceptance "..." --check "..." --doc "docs:prd/system-architecture.md"` 사용을 우선하세요.
> 새 태스크는 마지막 기존 태스크 아래에 완전한 태스크 블록으로 추가하세요. `PRD-FR-001`이나 `PRD-SCOPE-V1-DESKTOP-EDITOR`처럼 이미 정의된 PRD key를 사용하거나, 내부 작업이면 `[NON-PRD]`를 사용합니다.
> placeholder 상태의 `Acceptance` / `Checklist`를 그대로 두지 마세요. 구체 항목이 아니면 구현을 시작하지 않습니다.
> 수동 편집이 필요하면 현재 태스크 근처가 아니라 `태스크 목록`의 마지막 기존 태스크 block 아래에만 append 하세요.

---

- [DONE][NON-PRD] T-F041-openwiki-writing-style-01 로컬 writing policy 적용 기준선 검증
  - Date: 2026-09-04
  - Acceptance:
    - 실행에 사용하는 lee-spec-kit CLI가 로컬 build 0.9.12이고 CopySinger의 OpenWiki 플래그가 활성 상태다.
    - OpenWiki provider가 준비되어 있고 기존 schema 2 receipt와 사용자 INSTRUCTIONS 내용이 재생성 전 기준선으로 확인된다.
    - 앱 코드와 curated 문서를 수정하지 않으며 실제 생성은 workflow의 Knowledge 전용 gate에서 수행한다.
  - Checklist:
    - [x] 로컬 CLI --version과 detect --json 결과를 확인한다.
    - [x] knowledge doctor --json으로 OpenWiki 실행 파일과 provider 준비 상태를 확인한다.
    - [x] 기존 receipt schema와 INSTRUCTIONS 내용을 확인하고 사용자 소유 writing skill 충돌 여부를 점검한다.
    - [x] 검증 결과를 decisions.md와 tasks.md에 기록한다.
  - Review Evidence: -
  - Review Decision: -
  - Reviewed Head: -
  - Reviewed Tree: -

## Knowledge Sync

- **Policy**: `.lee-spec-kit.json`의 `experimental.openwiki`에서 파생
- **Receipt**: `.lee-spec-kit/openwiki-sync.json`

---

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [x] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료 <!-- lee-spec-kit:completion:all-tasks -->
- [ ] 테스트 실행 및 통과 (아래에 명령어/결과 기록) <!-- lee-spec-kit:completion:tests -->
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함 <!-- lee-spec-kit:completion:final-outcome -->

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| 로컬 lee-spec-kit `--version` 및 `detect --json` | `2026-09-04` | `PASS — 0.9.12, PROJECT_DETECTED, experimentalOpenwiki=true` |
| 로컬 lee-spec-kit `knowledge doctor --json` | `2026-09-04` | `PASS — OpenWiki 0.5.0/OKF 0.2, openai-chatgpt gpt-5.6-luna OAuth ready, OPENWIKI_WRITING_POLICY_STALE` |
| 기존 receipt·INSTRUCTIONS·writing skill 기준선 검사 | `2026-09-04` | `PASS — receipt schema 2, INSTRUCTIONS sha256:6edc1607…f64db, 같은 이름 skill 없음` |
| 로컬 0.9.12 `knowledge sync F041-openwiki-writing-style --component web` | `2026-09-05` | `PASS — OPENWIKI_SYNCED, 9/9·skipped 0, adapter 1.5.0 새 receipt 생성. 추가 교정 없이 상대 링크 규칙 적용. D004 참조` |
| remediation sync + 동일 run resume | `2026-09-04` | `PASS — 30분 상한에서 8/15 보존 후 run 97f97a25…를 재개해 15/15 완료` |
| 로컬 0.9.12 `knowledge audit F041-openwiki-writing-style --component web --json` | `2026-09-05` | `PASS — 검증 후 OPENWIKI_COMMIT_REQUIRED. manifest/Claim 파일 9개, Claims 87개, line evidence 196개` |
| non-index 상세 페이지 `repo://` Markdown source-link coverage | `2026-09-05` | `PASS — 9/9개 문서에서 본문 source 링크 54개 검증. 내부 링크·출처 검증 통과` |
| 한국어 문체·planner job 전달·대표 페이지 표본 검사 | `2026-09-05` | `표본 확인 — 각 job에 상대 링크 정책 전달, 빠른 시작의 목적별 탐색과 원문 링크 확인. 일반 영문 용어·입력 가시성 표현의 품질 한계는 자동 검증과 구분. D004 참조` |
| OpenWiki 0.5.0 buildGraph 및 visualize HTTP API | `2026-09-05` | `PASS — 16 nodes, 43 edges, 1 connected component, 본문 root Knowledge href 0개. 실제 서버 HTTP 200 확인` |

<!-- lee-spec-kit:workflow-sync sha256:c97edef4c4a4f1035c0e6557a761aa3e697fb3ade862d8534b65a5641e4d4b8b -->
