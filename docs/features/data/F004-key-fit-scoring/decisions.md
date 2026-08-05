# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D004: key-fit-scoring 결정 (2026-08-06)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: versioned deterministic weighted scorer 사용 (2026-08-06)

- **Context**: 한 사용자 profile과 100곡 profile을 비교해 원키 점수와 추천 shift를 설명 가능한 방식으로 계산해야 한다.
- **Constraints**: F002/F003의 aggregate metric만 사용해야 하며 같은 입력은 같은 결과여야 하고 F005가 계산 근거를 저장·표현할 수 있어야 한다.
- **Options**: 단순 음역 포함 여부, 학습 기반 ranking, versioned weighted pure function.
- **Decision**: `key-fit-v1` 순수 함수에서 테시투라 겹침, 테시투라 초과, robust 극단음 초과, 사용자 confidence를 고정 weight로 합산하고 -6~+6 후보를 결정적 tie-break로 비교한다.
- **Rationale**: MVP 데이터만으로 재현 가능하고 각 점수 기여도를 노출할 수 있으며 후속 fixture 평가에 따라 새 version을 추가하기 쉽다.
- **Trace**:
  - **DOING 시작 시점**: 실제 100곡 F003 profile이 MIDI 구간 순서를 만족하고 F002와 같은 `librosa-pyin` 0.11.0 계약임을 확인했다.
  - **DONE 전 확정 시점**: fixture와 100곡 회귀 결과로 weight·tie-break·성능을 확정한다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: 구현 커밋 예정
  - **PR**: 로컬 workflow로 생성하지 않음
  - **Test/Log**: 구현 후 [tasks.md](./tasks.md)에 기록
- **Consequences**: weight나 후보 정책 변경은 기존 결과를 덮어쓰지 않고 새 scoring version으로 추가해야 한다.
