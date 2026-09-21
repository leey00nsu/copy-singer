# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `DNNN: remove-github-ci-for-coolify 결정 (2026-09-21)`
> 결정 ID는 Feature별로 독립된 번호를 사용하며 Feature ID와 관계없이 `D001`부터 시작합니다.

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 수동 작성도 마지막 ADR 뒤에 추가해 D001 → D002 순서를 유지하세요. 문서 안내문 앞에 삽입하거나 기존 ID를 재번호화하지 마세요. 같은 결정의 재실행·검증 결과는 해당 ADR의 Trace/Evidence를 갱신하고, 새 선택이나 범위 변경일 때만 새 ADR을 만드세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.
- 디자인 시스템 변경이나 예외를 기록할 때는 영향 받는 규칙과 범위, 예외 이유, 제거 조건, 실행 가능한 정본의 동기화 영향을 함께 남깁니다.

---

## D001: Coolify를 단일 자동 배포 경로로 유지 (2026-09-21)

- **Context**: 새 Browser E2E GitHub Actions가 PR마다 실행되지만 실제 운영 배포는 Coolify의 기존 자동 배포를 사용한다.
- **Constraints**: Coolify 외부 설정과 앱 런타임은 변경하지 않고, 필요할 때 쓸 로컬 E2E 도구는 보존한다.
- **Options**: GitHub Actions 유지, Coolify 연동 CI로 확장, GitHub Actions 제거 후 Coolify 자동 배포 유지.
- **Decision**: `.github/workflows/e2e.yml`을 제거하고 로컬 E2E 명령·테스트는 유지한다.
- **Rationale**: 현재 운영 책임을 Coolify 한 경로로 유지하면서 중복 CI 운영을 없앤다.
- **Trace**:
  - **DOING 시작 시점**: 저장소의 유일한 workflow가 Browser E2E이며 Coolify 설정은 저장소 안에서 변경할 대상이 아님을 확인했다.
  - **DONE 전 확정 시점**: `.github/workflows/e2e.yml`만 삭제했고 `tests/e2e/TESTING.md`는 Coolify 자동 배포와 로컬 수동 검증의 경계를 설명하도록 정정했다. 앱 코드와 로컬 E2E 자산은 변경하지 않았다.
  - **머지 후 확인**: 대기 중
- **Evidence**:
  - **Commit**: local workflow checkpoint 예정
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: workflow 부재, E2E script·runner·journey 존재, stale CI 문구 부재 및 `git diff --check` PASS
- **Consequences**: GitHub Actions는 배포 게이트가 아니며, 배포 전 품질 검증은 로컬 검사와 Coolify 운영 절차에 의존한다.
