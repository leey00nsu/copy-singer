# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `DNNN: recovery-grant-balance-report 결정 (2026-09-19)`
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

## D001: recovery-grant-balance-report 결정 (2026-09-19)

- **Context**: 가입 지급 복구 CLI는 `--apply` 없이 dry-run으로 동작하지만 결과에 지급 예정 금액만 담는다. 운영자는 현재 지갑 잔액과 지급 후 잔액을 알기 위해 DB를 따로 조회해야 했고, 승인 전 검토가 두 단계로 나뉘었다.
- **Constraints**: 지급 로직·멱등 키·충돌 검사·원장 스키마를 바꾸지 않는다. 필드는 additive로만 추가한다. 운영자 전용 실행 경로를 유지한다.
- **Options**: (A) 현행 유지 (B) dry-run 전용으로 별도 조회 명령 추가 (C) 세 결과 모두에 `balanceBefore`·`balanceAfter` 추가
- **Decision**: (C). `recoverSignupGrant`가 사용자 잠금 안에서 지갑을 한 번 읽고 세 결과에 잔액을 담는다.
- **Rationale**: (A)는 검토 단계를 줄이지 못한다. (B)는 운영 절차를 한 번 더 늘리고 dry-run 결과와 조회 결과가 어긋날 여지를 만든다. (C)는 같은 트랜잭션에서 읽어 값이 일관되고, additive 필드라 기존 소비자를 깨지 않는다.
- **Trace**:
  - **DOING 시작 시점**: 잔액은 이미 원장 행의 `balanceAfter`로 저장되고 있어 지갑 조회 1회만 추가하면 된다고 판단했다. 지갑 행이 없는 사용자는 0으로 처리한다.
  - **DONE 전 확정 시점**: 통합 테스트에 dry-run(`0 → 7`), 동시 실행의 `GRANTED`(`0 → 7`)·`NOOP`(`7 → 7`), 지급 후 재실행의 `NOOP`(`7 → 7`)을 고정했다. `pnpm exec tsc --noEmit`, `pnpm run lint`, 해당 통합 테스트, `pnpm test`(exit 0)가 모두 통과했다.
  - **머지 후 확인**: Knowledge 게시에서 `operations/recovery-runbook.md`가 결과 필드 변경을 반영하는지 확인한다.
- **Evidence**:
  - **Commit**: 태스크 커밋(`src/entities/ticket/api/ticket-service.ts` + `tests/signup-recovery.integration.ts`)
  - **PR**: -
  - **Test/Log**: `pnpm test` exit 0, `pnpm exec tsc --noEmit`, `pnpm run lint`, 통합 테스트 1 test pass
- **Consequences**: 운영자가 dry-run 한 번으로 잔액 변화를 확인할 수 있다. 원장·지갑 스키마와 지급 규칙은 그대로다.
