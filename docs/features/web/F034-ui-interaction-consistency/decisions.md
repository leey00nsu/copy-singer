# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `DNNN: ui-interaction-consistency 결정 (2026-08-16)`
> 결정 ID는 Feature별로 독립된 번호를 사용하며 Feature ID와 관계없이 `D001`부터 시작합니다.

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.
- 디자인 시스템 변경이나 예외를 기록할 때는 영향 받는 규칙과 범위, 예외 이유, 제거 조건, 실행 가능한 정본의 동기화 영향을 함께 남깁니다.

---

## D001: 녹음 파일의 실제 계약과 사용자 presentation을 분리 (2026-08-16)

- **Context**: 마이크 녹음도 내부 업로드를 위해 `File` 객체와 확장자가 필요하지만 준비 카드에 자동 생성 파일명이 노출되어 사용자가 관리해야 할 정보처럼 보인다. 직접 업로드한 파일명은 선택 확인에 유용하다.
- **Constraints**: prepare/upload pipeline의 `File`, MIME, extension과 idempotency 계약은 유지하고 녹음·업로드 양쪽의 크기·길이·waveform 정보도 보존해야 한다.
- **Options**: 모든 파일명 유지, 모든 파일명 숨김, 입력 출처를 추적해 자동 녹음만 숨기는 방식을 비교한다.
- **Decision**: 입력 출처를 presentation state로 명시하고 자동 녹음만 파일명을 숨긴다. 직접 업로드는 원래 이름을 유지한다. 두 idle input action은 같은 full-width rail을 사용하되 primary/secondary variant 차이를 유지한다.
- **Rationale**: 분석 계약을 건드리지 않으면서 사용자가 만든 선택 정보와 내부 구현 세부를 구분할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: `VocalProfileWorkbench`가 녹음·업로드를 모두 `prepareSelectedAudio(file)`로 합치고 `VoiceScanInput`이 항상 `audioFile.name`을 표시하는 현재 흐름을 확인했다.
  - **DONE 전 확정 시점**: `audioSource`를 녹음·업로드 준비 성공 시점에 설정하고 reset에서 해제했다. 자동 녹음 준비 카드는 내부 이름 없이 크기·길이를 표시하고 업로드 카드는 기존 파일명을 유지한다. recorder button과 upload label은 같은 responsive horizontal rail과 width를 사용한다.
  - **머지 후 확인**: Pending
- **Evidence**:
  - **Commit**: Pending
  - **PR**: -
  - **Test/Log**: Voice Scan Storybook 12/12 PASS; `pnpm exec tsc --noEmit` PASS
- **Consequences**: 화면 state가 하나 추가되지만 서버·파일 업로드·분석 데이터에는 변경이 없다.
