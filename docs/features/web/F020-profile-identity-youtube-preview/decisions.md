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
