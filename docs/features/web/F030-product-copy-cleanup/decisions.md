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
  - **Commit**: `5460c09` (`feat(F030): 구현 승인 피드백 반영`)
  - **PR**: -
  - **Test/Log**: auth 8/8 PASS; voice-scan 4/4 PASS; recommendation ranking 10/10 + UI/presentation/synthesis 20/20 PASS; landing/login Storybook 6/6 PASS; lint/typecheck PASS; 첫 전체 `pnpm test`에서 unrelated admin custom mixing Storybook 1건이 타이밍성 실패 후 단독 3/3 PASS, 재실행한 전체 `pnpm test` PASS
- **Consequences**: 카피 Feature에 제한적인 타이포그래피 조정이 포함되지만, 목적은 한글 헤드라인 가독성 보완으로 한정된다.

## D005: 브랜드 자산 재사용과 결과지향적 랜딩 용어 체계 적용 (2026-08-14)

- **Context**: 후속 구현 승인 피드백에서 로그인 본문의 텍스트형 브랜드를 실제 로고+로고텍스트로 바꾸고, 목소리 분석/랜딩의 카피를 더 짧고 결과지향적으로 재정리하며 3단계 제품 용어를 고정해 달라는 요청이 들어왔다.
- **Constraints**: 기능 플로우와 데이터 계약은 바꾸지 않고, 기존 공용 브랜드 컴포넌트와 랜딩 시각 구조를 재사용한다. 분석 입력의 실제 5초 최소·60초 제한은 동작 제약으로 유지하되 랜딩의 매력 포인트에서는 10초 권장 경험을 우선 전달한다.
- **Options**: 화면별로 새 로고/카피를 직접 만들거나, 공용 `ProductBrand`를 재사용하고 단계명만 canonical 용어로 고정하면서 결과지향적 상세 카피를 적용하는 방식을 비교한다.
- **Decision**: 로그인은 공용 `ProductBrand`를 사용한다. 랜딩 단계명은 `목소리 분석` / `노래 · 키 추천` / `AI 믹싱`으로 고정하고, Hero와 상세 단계는 `내 목소리로 완성` 등 사용자 결과 중심 문구를 사용한다. 분석 입력 화면은 사용자가 제시한 문구를 기준으로 간결화한다.
- **Rationale**: 브랜드 표현은 한 소스에서 관리해야 시각적 불일치를 막을 수 있고, 단계명과 결과 카피의 역할을 분리하면 제품 구조는 일관되면서도 랜딩이 기술 설명서처럼 보이지 않는다.
- **Trace**:
  - **DOING 시작 시점**: 로그인 브랜드, 목소리 분석 좌·우 카피, 랜딩 Hero/CTA/3단계/지표/가이드 카드를 T05 단일 후속 태스크로 묶었다.
  - **DONE 전 확정 시점**: 로그인 본문은 공용 `ProductBrand`를 사용해 실제 브랜드 SVG와 로고텍스트를 함께 렌더링하도록 바꿨다. 목소리 분석은 `한 소절이면 / 나에게 맞는 노래를 찾을 수 있어요.` 중심으로 좌·우 안내를 재작성하고 초기 녹음 CTA를 `녹음 시작`, 업로드 CTA를 `녹음 파일로 분석하기`로 정리했다. 랜딩은 `나에게 맞는 노래를 찾고 / 내 목소리로 완성하세요.`를 Hero로 사용하고 `내 목소리로`에 기존 GradientText 포인트를 적용했다. 3단계명은 `목소리 분석` / `노래 · 키 추천` / `AI 믹싱`으로 통일하고 지표·가이드 섹션도 결과지향적 문구로 교체했다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: `e931419` (`feat(F030): 브랜드·분석·랜딩 카피 피드백 반영`)
  - **PR**: -
  - **Test/Log**: auth 8/8 PASS; voice-scan 4/4 PASS; landing/login/voice-input targeted Storybook 16/16 PASS; ESLint PASS; `tsc --noEmit` PASS; 첫 전체 `pnpm test`에서 unrelated `VoiceOrb` WebGL 준비 타이밍 1건 실패 후 단독 3/3 PASS, 재실행한 전체 `pnpm test` PASS (Storybook 154/154).
- **Consequences**: 랜딩의 카피 밀도와 단계명은 크게 바뀌지만 레이아웃·기능·데이터 흐름은 유지한다.

## D006: 계정 카드의 Google 연결 상태 chip은 제거하고 상세 정보는 유지 (2026-08-14)

- **Context**: 구현 승인 단계에서 내 계정의 `Google 연결됨` chip이 불필요하므로 제거해 달라는 요청이 들어왔다.
- **Constraints**: 인증 데이터와 로그인 방식 표시는 유지하고, 계정/티켓 동작이나 API 계약은 변경하지 않는다.
- **Options**: 연결된 경우의 chip만 숨기거나, 연결 여부와 무관하게 계정 카드 상단의 연결 상태 chip 자체를 제거하는 방식을 비교한다.
- **Decision**: 계정 카드 상단의 Google 연결 상태 Badge를 전체 제거한다. `로그인 방식`과 연결일 등 상세 정보는 그대로 유지한다.
- **Rationale**: 같은 카드 안에서 로그인 방식이 이미 제공되므로 상태 chip은 정보를 중복하며, 미연결 상태 chip까지 남길 이유도 없다.
- **Trace**:
  - **DOING 시작 시점**: `AccountOverview`와 직접 문자열을 검증하는 account 테스트/Storybook만 후속 T06 범위로 잡는다.
  - **DONE 전 확정 시점**: 계정 카드 상단의 `Google 연결됨`/`Google 연결 정보 없음` Badge와 관련 아이콘을 제거했다. 이름·이메일·로그인 방식·연결일은 그대로 유지했고 account 단위/Storybook 테스트로 양쪽 상태 모두 chip이 사라지는 것을 확인했다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: `8436191` (`feat(F030): 내 계정 Google 연결 상태 chip 제거`)
  - **PR**: -
  - **Test/Log**: account unit 2/2 PASS; account Storybook 3/3 PASS; ESLint PASS; `tsc --noEmit` PASS; 전체 `pnpm test` 중 변경 무관 타이밍성 Storybook 2건과 Leemage cleanup 1건은 각각 단독 재실행 13/13, 3/3 PASS.
- **Consequences**: 계정 카드 상단이 단순해지며, 인증 제공자 정보는 상세 필드에서 계속 확인할 수 있다.
