# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D020: profile-identity-youtube-preview 결정 (2026-08-11)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: 사용자 counter 기반 프로필 기본 이름 (2026-08-11)

- **Context**: 프로필 생성 순서가 드러나는 기본 이름을 저장하고 사용자가 변경할 수 있어야 한다.
- **Constraints**: 분석 job은 재시도·동시 완료될 수 있고 삭제 후에도 기존 이름과 새 번호가 안정적이어야 한다.
- **Options**: 조회 시 생성 순서로 계산, 현재 개수+1, User의 next counter를 atomic increment.
- **Decision**: `User.nextVocalProfileNumber`와 nullable `VocalProfile.profileNumber/displayName`을 추가하고 생성 transaction에서 counter를 atomic increment한다.
- **Rationale**: 삭제와 rename에 영향받지 않으며 DB row update가 동시 생성 번호를 직렬화한다. SONG profile은 nullable column으로 기존 계약을 유지한다.
- **Trace**:
  - **DOING 시작 시점**: 현재 schema와 두 persistence 경로, durable job 재시도 경계를 확인했다.
  - **DONE 전 확정 시점**: User atomic increment 결과에서 할당 번호를 구하고 profile create를 같은 transaction에 묶어 저장 실패 시 counter도 rollback됨을 통합 테스트로 확인했다.
  - **머지 후 확인**: 통합 후 보강 예정.
- **Evidence**:
  - **Commit**: 구현 후 기록
  - **PR**: local workflow
  - **Test/Log**: `pnpm run test:vocal-profile-persistence`, `pnpm run test:vocal-profile-history`, `pnpm exec tsx --test tests/vocal-profile-contract.test.ts`
- **Consequences**: 기존 USER profile backfill과 User counter 초기화가 같은 migration에 필요하다.

## D002: 결정적 CSS artwork와 click-to-load YouTube player (2026-08-11)

- **Context**: 프로필을 이미지처럼 구분하고 추천 곡을 목록·상세에서 재생해야 한다.
- **Constraints**: 별도 cover storage가 없고 추천 목록은 최대 100곡이며 YouTube iframe은 무겁고 외부 처리를 시작한다.
- **Options**: 생성 bitmap 저장, 무작위 CSS, ID 기반 CSS; 모든 iframe 즉시 로드, 외부 link, click-to-load facade.
- **Decision**: profile UUID 기반 layered CSS gradient/noise artwork와 목록당 최대 한 개의 privacy-enhanced iframe을 사용하는 facade를 채택한다.
- **Rationale**: 저장·업로드 비용 없이 재접속 안정성을 제공하고 목록의 초기 player 비용과 외부 데이터 처리를 줄인다.
- **Trace**:
  - **DOING 시작 시점**: 카탈로그 100곡 모두 `sourceVideoId`를 보유하고 현재 응답은 sourceUrl만 노출함을 확인했다.
  - **DONE 전 확정 시점**: UUID hash의 hue·gradient geometry와 정적 SVG turbulence overlay로 구현해 animation·bitmap storage 없이 목록과 상세에서 같은 cover가 렌더링됨을 확인했다. YouTube는 server에서 11자 sourceVideoId를 검증하고 facade에서는 thumbnail만, 활성화 후에는 privacy-enhanced iframe만 생성하도록 확정했다.
  - **머지 후 확인**: 통합 후 보강 예정.
- **Evidence**:
  - **Commit**: 구현 후 기록
  - **PR**: local workflow
  - **Test/Log**: YouTube 공식 iframe/player parameter 및 privacy-enhanced mode 문서, `pnpm exec tsx --test tests/vocal-profile-contract.test.ts tests/vocal-profile-history-ui.test.tsx`, `pnpm exec tsx --test tests/api-contracts.test.ts tests/recommendation-presentation.test.ts tests/recommendation-ui.test.tsx tests/client-server-state-query.test.ts`, `pnpm run test:recommendation:db`
- **Consequences**: facade thumbnail은 lazy network request를 만들 수 있지만 iframe과 player script는 사용자가 재생하기 전 생성하지 않는다.

## D003: 프로필별 단일 추천과 중앙 reference capability (2026-08-11)

- **Context**: 같은 보컬 제출에서 추천 run이 중복 생성되어 `추천 2`가 표시되고, 중앙 대표 구간이 없는 프로필은 믹싱 요청 후에야 실패를 알 수 있었다.
- **Constraints**: 기존 추천 결과와 믹싱 이력은 최대한 보존해야 하며, client 상태만으로 server의 reference 검증을 대체할 수 없다.
- **Options**: 추천 이력을 계속 누적하고 최신 run만 숨김, 생성 시 기존 run만 재사용, DB unique를 포함한 singleton; 믹싱 실패를 그대로 노출, source reference fallback, capability 사전 노출.
- **Decision**: 프로필별 최신 추천 run 하나를 DB unique와 get-or-create로 보장하고, smart mid reference를 확보하지 못한 profile은 명시적 mixing-unavailable capability로 노출한다.
- **Rationale**: 현재 추천은 동일 분석 snapshot의 deterministic 결과이므로 중복 이력의 사용자 가치가 없고, 품질 계약을 깨는 source fallback보다 재분석 안내가 안전하다.
- **Trace**:
  - **DOING 시작 시점**: 지정 프로필은 medianMidi는 있지만 연속성과 voiced density 조건을 충족한 mid phrase가 없어 `smart-reference-mid-v1` synthesis reference가 unavailable임을 확인했다. 같은 profile에 같은 결과의 run 두 건이 약 6초 간격으로 저장된 것도 확인했다.
  - **DONE 전 확정 시점**: 최신 run 1건만 보존하는 migration과 profile unique index를 적용했고, 반복·동시 `createRecommendationRun` 호출이 동일 ID를 반환하며 DB row가 하나임을 통합 테스트로 확인했다. 추천 응답은 smart/reference asset과 descriptor version을 같은 선택 규칙으로 평가하고, 중앙 phrase 누락 시 목록·선택·상세에서 시작과 재시도를 차단한다. 지정 프로필 `ca4ae55a-6d53-4565-a204-f17dbf9e6d0f`도 run 1건과 `missing_mid_reference` 상태로 직렬화됨을 실데이터에서 확인했다.
- **Evidence**:
  - **Commit**: 구현 후 기록
  - **PR**: local workflow
  - **Test/Log**: `pnpm prisma migrate deploy`, `pnpm prisma validate`, `pnpm run test:recommendation:db`, `pnpm run test:recommendation`, `pnpm run test:vocal-profile-presentation`, `pnpm run test:mixing:db`, targeted Storybook, `pnpm run typecheck`, `pnpm run check:architecture`, `pnpm run build`
- **Consequences**: 기존 중복 run 중 최신 한 건만 남고 오래된 item 참조는 null 처리되며, 중앙 reference를 확보하지 못한 프로필은 새 분석 전까지 AI 믹싱을 생성할 수 없다.

## D004: 분석 job과 저장 프로필의 동일 목록 문법 (2026-08-11)

- **Context**: 분석 중 항목이 같은 보컬 프로필 목록 안에서 별도 알림 배너처럼 표시되어 저장 프로필과 다른 콘텐츠 유형처럼 보였다.
- **Constraints**: profile ID와 음역·안정도 값은 분석 완료 전 존재하지 않으며, 진행·실패·재시도 설명은 유지해야 한다.
- **Options**: 독립 상태 banner 유지, 저장 행과 동일한 clickable skeleton, 동일 grid의 non-interactive status row.
- **Decision**: 분석 job은 저장 profile row와 같은 grid column을 사용하되 neutral cover와 placeholder를 가진 비활성 행으로 렌더링한다.
- **Rationale**: 목록의 시각 문법을 통일하면서 아직 존재하지 않는 상세 페이지나 분석값을 암시하지 않는다.
- **Trace**:
  - **DOING 시작 시점**: 현재 job row가 `md:grid-cols-[minmax(0,1fr)_auto]`로 별도 구성되고 저장 row는 5-column grid임을 확인했다.
  - **DONE 전 확정 시점**: 저장 행과 job 행이 공통 grid token을 공유하도록 바꾸고 pending·processing·retry·failed 모두 생성일·미확정 값·상태가 같은 위치에 표시됨을 확인했다. 후속 D005에서 AI 믹싱과 상태를 분리한 최종 6-column으로 확장했다. 완료 전 행에는 링크나 버튼이 없고 `aria-busy=true`, 실패 행은 `aria-busy=false`와 재분석 action만 제공한다. 분석 완료 감지는 전체 페이지 reload 대신 App Router refresh를 사용한다.
- **Evidence**:
  - **Commit**: 구현 후 기록
  - **PR**: local workflow
  - **Test/Log**: `pnpm exec tsx --test tests/vocal-profile-history-ui.test.tsx`, `pnpm run test:storybook --run src/widgets/library/ui/vocal-profile-library.stories.tsx`, `pnpm run typecheck`, `pnpm run check:architecture`, `pnpm run build`, Storybook browser QA
- **Consequences**: 분석 완료 전 행은 클릭·hover 상세 affordance가 없고, 미확정 분석 컬럼에는 `—`만 표시한다.

## D005: 라이브러리 목록의 오른쪽 상태 컬럼 (2026-08-11)

- **Context**: AI 믹스 목록의 결과 설명은 대부분 상태 chip을 반복하고, 보컬 프로필의 마지막 AI 믹싱 횟수는 상태와 다른 활동 정보라 분석 job 상태와 역할이 섞였다.
- **Constraints**: 보컬 프로필의 AI 믹싱 횟수는 유지해야 하며, 실패 상세 설명과 재시도 안내는 상세 화면에서 계속 제공해야 한다.
- **Options**: 기존 컬럼 유지, AI 믹싱 횟수를 상태로 대체, AI 믹싱과 상태를 분리하고 두 목록의 상태 위치만 공통화.
- **Decision**: AI 믹스의 결과 컬럼을 제거하고, 보컬 프로필에는 별도 상태 컬럼을 추가해 두 목록 모두 상태를 desktop 오른쪽 끝·mobile identity 상단에 배치한다.
- **Rationale**: 중복 문장은 제거하면서 프로필 활용도를 나타내는 AI 믹싱 횟수와 lifecycle 상태를 각각 보존한다.
- **Trace**:
  - **DOING 시작 시점**: AI 믹스 결과 문구가 완료·진행·취소 상태를 반복하고 실패 사유만 추가 정보임을 확인했다. 보컬 프로필은 5-column의 마지막 열이 AI 믹싱 횟수이며 분석 job은 같은 위치를 상태로 사용하고 있었다.
  - **DONE 전 확정 시점**: AI 믹스 목록을 작업·생성일·상태 3-column으로 정리하고 succeeded지만 result asset이 준비되지 않은 경우 `결과 확인 중`으로 구분했다. 프로필은 AI 믹싱 횟수를 보존한 채 별도 상태를 추가해 저장·분석 job 모두 6-column을 공유하며, 저장 profile은 `사용 가능`, job은 실제 분석 상태와 미확정 AI 믹싱 `—`를 표시한다. Storybook 실화면에서 header/cell 좌표와 오른쪽 상태 정렬, 가로 overflow 없음, 분석 중 행의 non-interactive 상태를 확인했다.
- **Evidence**:
  - **Commit**: 구현 후 기록
  - **PR**: local workflow
  - **Test/Log**: `pnpm exec tsx --test tests/mixing-history-ui.test.tsx tests/vocal-profile-history-ui.test.tsx`, `pnpm run test:storybook --run src/widgets/library/ui/mixing-library.stories.tsx src/widgets/library/ui/vocal-profile-library.stories.tsx`, `pnpm run typecheck`, `pnpm run check:architecture`, `pnpm run lint`, `pnpm run build`, Storybook browser QA
- **Consequences**: 목록은 간결한 상태만 제공하고 구체적인 진행·실패 설명은 상세 화면이 담당한다.

## D006: 추천 목록 완료 chip과 sticky selection 경계 (2026-08-11)

- **Context**: 추천 목록의 완료 행이 `완료` chip과 `결과 확인` link를 함께 보여 중복되고, 선택 카드 내부만 sticky라 부모 aside 높이에 묶여 긴 목록 스크롤을 따라가지 못했다.
- **Constraints**: 결과 듣기·저장은 선택 카드와 상세에서 유지하며, sticky 카드는 공통 header를 가리거나 grid section 밖으로 넘어가면 안 된다.
- **Options**: 완료 link 유지, 완료 chip만 유지; 내부 card sticky 유지, aside 자체 sticky, viewport fixed card.
- **Decision**: compact 목록은 완료 chip만 표시하고 데스크톱 selection aside 자체를 header offset을 가진 sticky grid item으로 만든다.
- **Rationale**: 목록의 중복 action을 줄이고, fixed overlay 없이 CSS sticky의 section 경계와 반응형 동작을 활용한다.
- **Trace**:
  - **DOING 시작 시점**: compact succeeded branch가 chip 옆에 job detail link를 생성하고, sticky 요소의 containing block인 aside가 card 높이만 가져 이동 여유가 없음을 확인했다.
  - **DONE 전 확정 시점**: compact succeeded branch를 `MixingStatusBadge` 하나로 단순화하고 사용되지 않게 된 detailHref·runId 전달도 제거했다. selection aside 자체에 `lg:sticky lg:top-24 lg:self-start`를 적용했다. 100곡 Storybook에서 scrollY 4928일 때 card top이 96px로 유지되고 마지막 행에서는 card bottom과 grid bottom이 477.75px로 같아 section 경계에서 멈추는 것을 확인했다. 완료 fixture는 chip 1개, 결과 확인 link 0개, selection의 결과 듣기 button 1개였다.
- **Evidence**:
  - **Commit**: 구현 후 기록
  - **PR**: local workflow
  - **Test/Log**: `pnpm run test:recommendation`, `pnpm run test:storybook --run src/_pages/recommendation-detail/ui/recommendation-results.stories.tsx`, `pnpm run typecheck`, `pnpm run check:architecture`, `pnpm run lint`, `pnpm run build`, Storybook scroll browser QA
- **Consequences**: 목록 행에서는 완료 여부만 확인하고 결과 조작은 선택 카드나 상세 화면에서 수행한다.

## D007: 완료 결과 재생 상태에 따른 button 위계 (2026-08-11)

- **Context**: 완료 후 핵심 다음 행동인 `결과 듣기`가 outline이라 시작 전 primary AI 믹싱 action보다 낮은 위계로 보였다.
- **Constraints**: 같은 button이 플레이어를 열고 닫는 toggle이며 결과 저장은 보조 action으로 남아야 한다.
- **Options**: 항상 outline, 항상 primary, 닫힘 primary·열림 outline.
- **Decision**: 플레이어가 닫혔을 때 `결과 듣기`는 primary, 열린 뒤 `결과 닫기`는 outline으로 전환한다.
- **Rationale**: 현재 화면의 핵심 다음 행동을 강조하되, 이미 열린 결과를 닫는 보조 동작까지 과도하게 강조하지 않는다.
- **Trace**:
  - **DOING 시작 시점**: succeeded non-compact action이 `audioOpen`과 무관하게 항상 outline variant를 사용함을 확인했다.
  - **DONE 전 확정 시점**: 구현과 Storybook 검증 후 보강 예정.
- **Evidence**:
  - **Commit**: 구현 후 기록
  - **PR**: local workflow
  - **Test/Log**: 구현 후 기록
- **Consequences**: 같은 toggle control의 시각 위계가 열림 상태에 따라 바뀐다.
