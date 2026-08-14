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
  - **Commit**: `9103811` (`feat(F030): 공통 진입·탐색 카피 정리`)
  - **PR**: -
  - **Test/Log**: `pnpm run test:auth-navigation` 8/8 PASS; landing/login/notifications targeted Storybook 8/8 PASS
- **Consequences**: 사용자-facing 문구는 짧아지지만, 구현 세부를 디버깅해야 하는 정보는 UI가 아니라 로그/코드에 남는다.

## D002: 핵심 플로우는 처리 방식보다 상태와 다음 행동을 설명 (2026-08-14)

- **Context**: 보컬 프로필·라이브러리·AI 믹싱 화면에 polling, retry queue, 포인트 수, reference 생성 규칙처럼 사용자 행동에 필요하지 않은 처리 세부가 노출돼 있다.
- **Constraints**: 분석/추천/믹싱의 실제 상태와 지원 제약은 숨기지 않고, 사용자가 복구 또는 다음 행동을 선택하는 데 필요한 정보는 유지한다.
- **Options**: 내부 처리 세부를 쉬운 말로 모두 번역하거나, 사용자의 현재 상태와 다음 행동에 직접 필요한 정보만 남기는 방식을 비교한다.
- **Decision**: 구현 세부 자체를 설명하지 않고 `현재 상태 → 필요한 제약 → 다음 행동` 순서로 카피를 정리한다.
- **Rationale**: 내부 구현을 쉬운 말로 바꾸는 것만으로는 과설명이 남는다. 사용자가 판단할 정보만 남겨야 화면 밀도와 사실성이 함께 개선된다.
- **Trace**:
  - **DOING 시작 시점**: `최대 720포인트`, 자동 polling/retry, reference segment 배분 규칙, 백그라운드 저장 표현을 우선 제거 후보로 잡는다.
  - **DONE 전 확정 시점**: 보컬 분석에서 대기열·백그라운드·서버 설정을 제거하고, 프로필 결과에서 `720포인트`·reference 배분 규칙을 제거했다. 추천 화면의 catalog/scoring 식별자와 AI 믹싱의 GPU·target·임의 진행률 설명도 없애고 실제 상태와 다음 행동만 남겼다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: `4a5c57d` (`feat(F030): 프로필·추천·믹싱 핵심 플로우 카피 정리`)
  - **PR**: -
  - **Test/Log**: `pnpm run test:vocal-profile-presentation` 12/12 PASS; `pnpm run test:mixing:ui` 8/8 PASS; `pnpm run test:recommendation` ranking 10/10 + UI/presentation/synthesis 19/19 PASS
- **Consequences**: 디버깅/운영 정보는 사용자 UI가 아니라 로그와 관리자 진단 경계에 남는다.

## D003: 잔여 감사는 노출 경계와 역할을 구분해 적용 (2026-08-14)

- **Context**: 전체 `app`/`src`에는 일반 사용자 화면뿐 아니라 관리자 도구, 서버 오류 문자열, 접근성 레이블, 법적 문서와 개발 진단 문구가 함께 존재한다.
- **Constraints**: `~요` 톤을 기계적으로 전체 문자열에 적용하면 법적 의미, 관리자 진단 정확성 또는 API 내부 계약을 손상할 수 있다.
- **Options**: 한국어 문장형 문자열을 일괄 치환하거나, 실제 사용자 노출 여부와 화면 역할을 확인해 수정 대상을 선별하는 방법을 비교한다.
- **Decision**: 실제 제품 UI에 노출되는 문장형 카피를 우선 정리하고, 법적 문서·접근성용 명칭·필요한 관리자 전문 용어·내부 전용 오류는 맥락상 예외로 둔다.
- **Rationale**: 톤 일관성보다 사실성·기능적 의미가 우선이며, 역할별 경계를 구분해야 AI식 일괄 문체 변환을 피할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 전체 문자열을 검색하되 변경 후보마다 실제 렌더링/전달 경로를 확인하고, 일반 사용자에게 직접 보이는 문구만 적극적으로 정리한다.
  - **DONE 전 확정 시점**: 일반 UI 전체를 재검색해 `~습니다/~합니다` 계열 문장과 추상적·내부 구현 표현을 제거했다. 관리자 전문 용어는 필요한 범위에서 유지하되 toast/dialog/API 오류는 자연스러운 `~요` 톤으로 맞췄고, 인앱 알림을 만드는 worker와 그대로 전달되는 API 메시지도 같은 기준으로 정리했다. 사용자에게 필요 없는 raw network/storage 오류 세부는 일반화했다. 로그인 약관 동의 문장과 법적 문서는 의미 보존을 위해 formal 문체 예외로 유지했다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: `4aad874` (`feat(F030): 프로젝트 잔여 카피 감사와 회귀 검증`)
  - **PR**: -
  - **Test/Log**: 일반 UI formal tone 재검색은 법적 동의 1건만 의도적 예외; vague/internal UI 검색 0건; `pnpm test` PASS; Storybook 154/154 PASS; `pnpm run lint` PASS; `pnpm exec tsc --noEmit` PASS
- **Consequences**: 프로젝트에 formal 문체가 일부 남을 수 있지만, 법적·관리자·내부 경계의 의도된 예외로 구분한다.

## D004: 구현 승인 피드백은 카피 정확성과 한글 줄바꿈까지 보완 (2026-08-14)

- **Context**: 구현 승인 단계에서 랜딩 핵심 문구 교체, 프로필/로그인 헤드라인의 한글 단어 분절 개선, 고정 `100곡` 표현 제거 요청이 들어왔다.
- **Constraints**: 기존 레이아웃과 기능 플로우는 유지하고, 카탈로그 개수는 실제 데이터와 어긋나는 정적 약속을 만들지 않는다.
- **Options**: 헤드라인 문구만 바꾸거나, 문구 교체와 함께 작은 화면의 `break-keep`/반응형 글자 크기를 조정하고 고정 카탈로그 숫자를 제거하는 방식을 비교한다.
- **Decision**: 지정된 랜딩 문구를 그대로 사용하고, 프로필/로그인 헤드라인은 제한적인 모바일 타이포그래피와 한글 줄바꿈 규칙으로 보완한다. `100곡`은 fixture/runtime 결과에서 실제로 100인 경우만 표시하고 정적 제품 설명에서는 제거한다.
- **Rationale**: 텍스트 자체가 맞더라도 단어 중간 분절이 생기면 가독성이 떨어지며, 카탈로그 규모는 변할 수 있으므로 정적 숫자는 실제 제품 계약과 맞지 않는다.
- **Trace**:
  - **DOING 시작 시점**: 사용자 피드백 3건을 T04로 추가하고, 대규모 리디자인 없이 카피·줄바꿈·동적 개수 정합성만 수정한다.
  - **DONE 전 확정 시점**: 랜딩 hero의 accessible/visual headline을 사용자 지정 문구로 교체했다. 프로필·로그인 헤드라인은 `break-keep`과 모바일 `2rem` 기준으로 조정해 한글 음절 단위 분절을 막았고, 추천 페이지 메타의 정적 `100곡`은 제거했다. 추천 결과 화면의 곡 수는 기존처럼 `run.items.length`를 사용하므로 실제 카탈로그 크기에 따라 바뀐다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: -
  - **PR**: -
  - **Test/Log**: auth 8/8 PASS; voice-scan 4/4 PASS; recommendation ranking 10/10 + UI/presentation/synthesis 20/20 PASS; landing/login Storybook 6/6 PASS; lint/typecheck PASS; 첫 전체 `pnpm test`에서 unrelated admin custom mixing Storybook 1건이 타이밍성 실패 후 단독 3/3 PASS, 재실행한 전체 `pnpm test` PASS
- **Consequences**: 카피 Feature에 제한적인 타이포그래피 조정이 포함되지만, 목적은 한글 헤드라인 가독성 보완으로 한정된다.
