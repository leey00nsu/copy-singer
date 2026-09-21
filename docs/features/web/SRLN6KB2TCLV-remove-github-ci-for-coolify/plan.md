# Implementation Plan: remove-github-ci-for-coolify

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: SRLN6KB2TCLV
- **대상 레포**: copy-singer-web
- **작성일**: 2026-09-21
- **상태**: Approved
  - 값: Draft | Review | Approved
- **Plan 검수**: Done
  - 값: Pending | Running | Done
- **Plan 검수 Evidence**: 검수 비활성화(`workflow.agentReview.plan.enabled=false`)
  - 예: `docs/features/F001-foo/decisions.md` 또는 docs 루트 아래의 실제 리뷰 산출물
- **Plan 검수 Decision**: 결정: approve — 단일 workflow 삭제와 운영 문서 정정으로 범위가 제한됨
  - 형식: `결정: approve|changes_requested|blocked ...` 또는 `decision: ...`
- **Plan 검수 Round**: -
  - `workflow-stage --json`이 반환한 양의 정수이며 첫 리뷰는 `1`
- **Plan 검수 Spec Hash**: -
  - `workflow-stage --json`이 반환한 정확한 `specHash`
- **Plan 검수 Plan Hash**: -
  - `workflow-stage --json`이 반환한 정확한 `planHash`

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| 배포 경로 | Coolify 자동 배포 유지 | 사용자가 지정한 현재 운영 경로를 단일 자동 배포 경로로 유지한다. |
| E2E 실행 | 로컬 명령 유지 | CI 제거 후에도 필요할 때 동일한 브라우저 회귀 검사를 실행할 수 있다. |

---

## 아키텍처

애플리케이션과 Coolify의 배포 흐름은 변경하지 않는다. GitHub가 PR 이벤트로 실행하던 Browser E2E workflow 파일만 제거한다. 테스트 구현과 로컬 실행 명령은 남긴다.

---

## 파일 구조

```text
.github/workflows/e2e.yml  # 삭제
tests/e2e/TESTING.md       # CI 설명을 로컬 수동 검증 설명으로 정정
```

---

## Curated Documentation Impact

README 보호와 보조 산출물 위치는 `agents` 문서의 해당 규칙을 우선합니다. README 불일치는 수정 요청이 없으면 `decisions.md`의 경로·근거·보류 사유를 참조하는 `NONE`으로 기록할 수 있으며, 이 예외에 별도 후속 항목이나 수정 승인을 요구하지 않습니다. 보존할 Feature 보조 산출물은 활성 Feature의 `artifacts/`에 저장하고 상대경로로 연결합니다.

발견한 문서 불일치는 `decisions.md`에만 남기고 종료하지 않습니다. 현재 사실의 명백한 오류가 승인 범위 안에 있으면 `UPDATE`/`ADD`와 task `Docs`로 연결합니다. 제품 의도 확인이나 범위 확장이 필요하면 충돌한 문서 경로·근거, 확인할 질문, 보류 이유와 실제 후속 task/Feature/issue 참조를 기록합니다. 없는 번호나 승인을 만들지 않습니다. 추적 항목 생성에 승인이 필요하면 사용자 확인 전 해결된 것으로 기록하지 않습니다. `NONE`의 근거에는 알려진 불일치가 없거나, 남은 불일치가 해당 후속 항목으로 추적되고 있음을 설명합니다. 코드나 OpenWiki에 맞추기 위해 미구현 PRD 요구를 삭제하지 않습니다.

> 모든 결정이 `NONE`이어도 영향 판정을 완료합니다. `NONE`은 사람이 관리하는 상위 문서를 검토했지만 변경할 필요가 없다는 뜻입니다. 생성형 OpenWiki 동기화는 별도로 판정합니다.

- **Schema**: 2
- **Assessment**: Complete
  - 값: Pending | Complete
- **Product requirements**: NONE
  - 값: NONE | UPDATE | ADD
- **System architecture**: NONE
  - 값: NONE | UPDATE | ADD
- **Onboarding entrypoint**: NONE
  - 값: NONE | UPDATE | ADD
- **Operational/runtime contract**: UPDATE
  - 값: NONE | UPDATE | ADD
- **Reason**: GitHub Actions가 PR마다 실행된다는 현재 E2E 운영 설명을 제거하고, Coolify 자동 배포와 분리된 로컬 검증 경계를 명시한다.
- **Targets**: project:tests/e2e/TESTING.md
  - UPDATE 또는 ADD가 하나라도 있으면 쉼표로 구분한 `docs:<path>`와 `project:<path>` 대상을 기록합니다.
  - `docs:<path>`는 설정된 docs 디렉터리 기준이고 `project:<path>`는 프로젝트 저장소 루트 기준입니다. 루트 이름을 반복하지 마세요(예: `docs:docs/agents/constitution.md`가 아니라 `docs:agents/constitution.md`).
  - 모든 대상은 task `Docs` 목록에 연결하고 Feature 리뷰 전에 활성 Feature scope로 커밋합니다.

---

## Additional Curated Impacts

> constitution/custom, 디자인 시스템, API·데이터, 보안, 배포, 관측성처럼 조건부로 존재하는 상위 문서를 판정합니다. 해당 영향이 없으면 `Decision: NONE`을 명시하고 표는 비워 둡니다.

- **Assessment**: Complete
- **Decision**: DECLARED
  - 값: NONE | DECLARED

| Kind | Decision | Target | Reason |
| ---- | -------- | ------ | ------ |
| release-deployment | UPDATE | project:tests/e2e/TESTING.md | GitHub Actions CI 제거 후 Coolify 자동 배포와 로컬 E2E의 책임 경계를 설명한다. |

허용 Kind: `engineering-agent-policy`, `design-system-ux`, `api-data-contract`, `security-privacy`, `release-deployment`, `observability`, `other-curated`

`DECLARED` 행의 Decision은 `UPDATE` 또는 `ADD`이고, Target은 `docs:<path>` 또는 `project:<path>`여야 합니다. 모든 Target은 task `Docs` 목록에 연결합니다.
`docs:<path>`는 설정된 docs 디렉터리에서, `project:<path>`는 프로젝트 저장소 루트에서 해석합니다.

---

## Verification Contract

Feature 완료 전 검사는 실제 `workflow.featureChecks`(컴포넌트 override 포함)를 기준으로 작성합니다. 추가 자동 검사는 실행 설정에도 등록하세요. build 포함 여부와 중복 생략 근거, 수동 검증 증거를 명시하세요.


### 변경 분류

- **유형**: NEW_BEHAVIOR
- **위험도**: LOW

### 관찰 가능한 계약

- **지원해야 하는 동작**: GitHub Actions Browser E2E는 실행되지 않고 Coolify의 기존 자동 배포는 저장소 변경 없이 유지된다.
- **전제조건**: Coolify 자동 배포는 저장소 외부에서 이미 구성되어 있다.
- **성공 후 보장**: `.github/workflows/e2e.yml`이 없고 로컬 E2E 명령과 테스트 파일은 남아 있다.
- **중요한 실패 후 보장**: 다른 workflow, Coolify 설정, 애플리케이션 코드는 변경되지 않는다.
- **의도적으로 지원하지 않는 사례**: GitHub Actions를 Coolify webhook이나 다른 CI로 대체하는 작업.

### 테스트 결정

| 계약 / 요구사항 | 결정                  | 테스트 수준                     | 보호할 현실적인 회귀 | 독립적인 Oracle            |
| --------------- | --------------------- | ------------------------------- | -------------------- | -------------------------- |
| AC-01, AC-02 | NONE | 비테스트(파일 구조 검사) | workflow 잔존 또는 다른 workflow 변경 | 승인된 스펙과 git diff |
| AC-03 | NONE | 비테스트(파일 존재·script 검사) | 로컬 E2E 자산의 우발적 삭제 | `package.json`, `tests/e2e/` |
| AC-04 | NONE | 비테스트(문서 검색) | 제거된 CI를 계속 안내 | `tests/e2e/TESTING.md` 내용 |

### 의도적으로 제외하는 테스트

- 애플리케이션 런타임 코드는 바뀌지 않으므로 전체 빌드·브라우저 E2E 재실행은 제외한다.
- Coolify 외부 설정과 실제 배포 trigger는 저장소 밖이므로 변경하거나 원격 배포를 유발하지 않는다.

### 검증 실행

- **구현 중**: 삭제·수정 대상 외 파일이 바뀌지 않았는지 `git diff --name-status`로 확인한다.
- **태스크 완료 전**: `test ! -e .github/workflows/e2e.yml`, package script와 `tests/e2e/` 존재, GitHub Actions 문구 제거를 검사한다.
- **Feature 완료 전**: lee-spec-kit workflow/feature audit를 실행한다. 설정된 전체 Feature checks는 코드 변경이 없어 생략 근거를 기록한다.
- **수동/UI 검증**: 없음 — UI 및 Coolify 외부 설정을 변경하지 않는다.
- **전체 테스트 필요 여부**: No — workflow 삭제와 설명 정정만 있으며 실행 코드·테스트 구현은 동일하다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
