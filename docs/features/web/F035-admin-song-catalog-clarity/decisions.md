# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `DNNN: admin-song-catalog-clarity 결정 (2026-08-16)`
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

## D001: 곡·버전 상태를 순수 presentation projection으로 분리 (2026-08-16)

- **Context**: 현재 Client Component가 DB lifecycle/source/analysis enum과 `activeSourceId`, revision 순서를 직접 해석해 raw 영문 badge와 모든 revision의 동일 action을 렌더링한다.
- **Constraints**: Prisma enum과 snapshot wire field의 내부 `target` 명칭은 호환성을 위해 유지하고, server page에서 Client Component로 전달하는 props는 직렬화 가능해야 한다.
- **Options**: UI 안에서 조건을 계속 분기, server page가 완성된 UI model 생성, shared model의 순수 presentation helper로 투영.
- **Decision**: `features/manage-song-catalog/model`에 직렬화 가능한 view input만 받는 순수 helper를 두고 현재 공개·교체 준비·공개 준비·이전 버전 역할, 한국어 상태와 다음 행동 가능 여부를 결정한다.
- **Rationale**: server/client 어느 쪽에서도 재사용 가능하고 DB 접근을 client graph에 포함하지 않으며, 복잡한 상태 조합을 Node 단위 테스트로 고정할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: active source와 최신 미공개 DRAFT를 각각 현재/준비 버전으로 우선하고 나머지를 이전 버전으로 낮추는 projection을 먼저 검증한다.
  - **DONE 전 확정 시점**: `presentAdminCatalogSources`가 revision 내림차순을 보장하고 active source를 현재 버전, 최신 non-superseded source를 교체/공개 준비, 나머지를 이전 버전으로 투영하도록 확정했다. 원곡 파일 누락·분석 대기/처리/실패·공개 준비·공개 중·보관 상태와 공개 차단 이유도 한 helper에서 파생한다.
  - **머지 후 확인**: local merge 후 기록.
- **Evidence**:
  - **Commit**: `6c19966` (`feat(F035): 곡·버전 상태 presentation 모델 정리`)
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `pnpm exec tsx --test tests/admin-song-catalog-ui.test.tsx` 5/5 PASS; targeted ESLint, `pnpm exec tsc --noEmit`, targeted Biome PASS
- **Consequences**: UI는 raw status 대신 사용자 의미를 렌더링하고, 내부 enum이나 API contract 변경 없이 정보 구조를 바꿀 수 있다.

## D002: 완성 원곡 파일 하나를 등록·교체의 단일 입력으로 사용 (2026-08-16)

- **Context**: 신규 등록은 파일 하나를 받지만 기존 상세에는 모든 revision의 `믹싱 target 음원` 입력과 `교체 음원` 입력이 동시에 노출돼 관리자가 서로 다른 두 파일이 필요한 것으로 오해할 수 있었다.
- **Constraints**: 기존 multipart API는 URL과 파일 하나로 source revision·target asset·분석 job을 이미 준비하며, source 생성 후 외부 파일 업로드만 실패한 부분 성공 상태는 복구할 수 있어야 한다.
- **Options**: 두 입력을 계속 노출하고 설명 추가, target uploader 완전 제거, 정상 상태에서 숨기고 target 누락 상태에서만 복구 입력 제공.
- **Decision**: 추가와 교체 모두 `YouTube 미리듣기 영상`과 보컬·반주가 함께 있는 `원곡 음원 파일` 하나만 받는다. revision별 재업로드는 `targetReady=false`일 때만 `원곡 파일 다시 업로드`로 제공한다.
- **Rationale**: 실제 server/Modal 데이터 흐름과 입력 개수를 일치시키면서 부분 업로드 실패의 운영 복구 능력은 유지한다.
- **Trace**:
  - **DOING 시작 시점**: 기존 target upload route는 삭제하지 않고 UI 노출 조건만 readiness로 제한하기로 했다.
  - **DONE 전 확정 시점**: 추가/교체 Dialog, 현재·교체 준비·이전 버전 panel과 snapshot/error copy를 변경했다. 정상 공개 버전에는 파일 입력이 없고 누락 revision에는 복구 입력 하나만 있음을 Storybook으로 확인했다.
  - **머지 후 확인**: local merge 후 기록.
- **Evidence**:
  - **Commit**: `b3cd57b` (`feat(F035): 추천곡 추가·영상과 원곡 교체 UI 재구성`)
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: 관리자 UI 5/5 PASS; CatalogManager Storybook 7/7 PASS; targeted ESLint, TypeScript PASS; legacy user-facing target/revision/Modal 검색 0건
- **Consequences**: 관리자는 보컬 단독 파일을 준비하지 않으며, 교체가 완료될 때까지 기존 공개 버전이 유지된다는 점을 Dialog에서 확인한다.
