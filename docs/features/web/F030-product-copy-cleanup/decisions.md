# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `DNNN: product-copy-cleanup 결정 (2026-08-14)`
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

## D001: 화면 맥락을 기준으로 카피를 직접 정리 (2026-08-14)

- **Context**: 제품 UI 재설계와 기능 추가 과정에서 제목을 다시 설명하는 보조 문구, 내부 처리 방식을 그대로 노출하는 문구, `~습니다`/`~요`가 섞인 문장형 카피가 누적됐다.
- **Constraints**: 기능 동작, API, 데이터 모델, 레이아웃은 변경하지 않는다. 접근성 레이블과 법적 의미는 보존한다.
- **Options**: 공용 copy dictionary를 새로 도입하거나, 현재 컴포넌트의 문자열을 화면 맥락과 구현 계약에 맞춰 직접 정리하는 방법을 비교한다.
- **Decision**: 새 카피 추상화 없이 현재 문자열을 직접 정리하고, 문장형 안내만 자연스러운 `~요` 톤으로 통일한다.
- **Rationale**: 이번 Feature는 카피 정합성 정리이며 새 추상화는 범위를 넓히고 문맥별 미세한 표현 차이를 오히려 숨길 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 우선 공통 진입/탐색 화면에서 반복 설명·기술 용어·톤 혼용을 분류하고, 접근성/법적 텍스트는 별도 예외로 유지한다.
  - **DONE 전 확정 시점**: 랜딩의 `가장 나답게`·`원곡의 매력` 같은 추상 표현을 실제 분석/추천/믹싱 동작으로 교체하고, 로그인에서 영속되지 않는 추천 결과를 저장된 것처럼 설명하던 문구를 제거했다. OAuth 환경변수 같은 내부 설정 용어도 사용자 문구에서 제거했다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: -
  - **PR**: -
  - **Test/Log**: `pnpm run test:auth-navigation` 8/8 PASS; landing/login/notifications targeted Storybook 8/8 PASS
- **Consequences**: 사용자-facing 문구는 짧아지지만, 구현 세부를 디버깅해야 하는 정보는 UI가 아니라 로그/코드에 남는다.
