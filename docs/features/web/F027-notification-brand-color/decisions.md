# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D027: notification-brand-color 결정 (2026-08-14)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: notification-brand-color 결정 (2026-08-14)

- **Context**: 문제 상황 또는 배경
- **Constraints**: 제약 조건 (시간/기술/운영/호환성)
- **Options**: 고려한 대안들
- **Decision**: 최종 선택
- **Rationale**: 선택 이유
- **Trace**:
  - **DOING 시작 시점**: 초기 판단/가설
  - **DONE 전 확정 시점**: 선택 근거 최종화
  - **머지 후 확인**: 실제 결과/영향
- **Evidence**:
  - **Commit**: 커밋 해시 또는 링크
  - **PR**: PR 링크
  - **Test/Log**: 테스트 결과/로그/스크린샷 경로
- **Consequences**: 결과 및 영향 (선택사항)


## D027-01: 브랜드 컬러 선택적 적용 범위 (2026-08-14)

- **Context**: 아이콘·버튼·칩이 검정 일색이라 알림 모달에서 아이콘(`bg-muted`)과 호버(`bg-accent≈muted`)가 구분 안 됨. 디자인 시스템은 "brand gradient는 연속 데이터·active signal에만, primary/보더/포커스 링은 단색 유지"를 규정.
- **Constraints**: 넓은 배경은 neutral 유지, 한 surface에 accent 2개 이상 금지, 한 화면에 primary 1개.
- **Options**: (a) 전체를 브랜드 컬러로, (b) 상태성만 선별 교체.
- **Decision**: (b) 채택. 상태성 아이콘·칩만 `data-accent`/`success`/`destructive`로 교체, primary 버튼 검정 유지.
- **Rationale**: 구분이 필요한 알림 타입·활성 칩에만 컬러 포인트를 주고, 전체 톤은 neutral로 절제해야 디자인 시스템 원칙을 지킨다.
- **Trace**:
  - **DOING 시작 시점**: `data-accent`가 Bell 배지와 waveform active에 이미 쓰이는 중간 보라임을 확인, 알림 모달을 대표 사례로 선정.
- **Evidence**:
  - **Commit**: TBD
  - **Test/Log**: Storybook 시각 검증
- **Consequences**: 알림 모달이 브랜드 컬러 첫 적용처, 이후 상태 칩에도 동일 규칙 적용.



## D027-02: 상태 칩 감사 결과 (2026-08-14)

- **Context**: 전역 Badge 15개 사용처를 grep으로 감사.
- **Decision**: 기존 톤 체계 유지. MixingStatusBadge active는 이미 `bg-data-accent/10`로 브랜드 컬러, succeeded는 primary(검정, 단일 primary 원칙), failed는 destructive로 적합. 필터·상태 칩의 secondary/outline도 neutral 유지가 맞음.
- **Rationale**: 디자인 시스템 "한 surface에 accent 2개 이상 금지" + "primary 버튼은 단색 유지"를 지키므로 추가 컬러 교체가 불필요.
- **Trace**:
  - **DONE 전 확정 시점**: 15개 Badge grep, 각각 tone 일관성 확인.
- **Consequences**: 알림 아이콘만 타입별 컬러로 교체하고 칩은 현행 유지.

