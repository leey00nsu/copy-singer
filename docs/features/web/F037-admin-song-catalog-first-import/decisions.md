# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `DNNN: admin-song-catalog-first-import 결정 (2026-08-16)`
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

## D001: 빈 카탈로그를 명시적 최초 복원 상태로 렌더링 (2026-08-16)

- **Context**: snapshot import API는 Catalog를 upsert할 수 있지만 `/admin/songs`의 선행 목록 조회가 `CATALOG_NOT_FOUND`를 던져 신규 배포 DB에서 import UI에 도달하지 못한다.
- **Constraints**: 관리자 서버 권한을 유지하고, 일반 catalog API의 누락 오류 계약과 기존 카탈로그 관리 동작을 바꾸지 않아야 한다. 읽기 요청이 DB row를 암묵적으로 만들면 안 되며 snapshot import의 transaction·idempotency를 재사용해야 한다.
- **Options**: 페이지 GET에서 빈 Catalog 자동 생성, 별도 초기화 API·버튼 추가, 페이지 전용 nullable 조회로 import 전용 초기 상태 렌더링.
- **Decision**: 페이지 전용 nullable 조회 경계와 명시적 최초 복원 UI를 사용한다. 초기 상태에는 import만 제공하고 import API 성공 후 route refresh로 기존 관리 상태로 전환한다.
- **Rationale**: 별도 초기화 개념이나 GET side effect 없이 이미 Catalog 생성 책임을 가진 import API를 정상 UI 경로에서 사용할 수 있고, 기존 API 오류 계약도 보존할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: `listAdminCatalog`가 `catalogOrThrow()`를 먼저 호출하고, 같은 페이지 아래의 `CatalogSnapshotToolbar`에 import action이 있어 도달 불가능한 순환을 확인했다. `importDatabaseSongCatalog`는 transaction 안에서 Catalog를 upsert하므로 별도 초기화 API는 불필요하다고 판단했다.
  - **DONE 전 확정 시점**: `findAdminCatalog`이 카탈로그 부재만 `null`로 반환하고 기존 `listAdminCatalog`는 409 `CATALOG_NOT_FOUND`를 유지하도록 분리했다. 페이지는 `null`일 때 import toolbar와 안내만 렌더링하고, import 성공 후 기존 `router.refresh()`로 일반 목록 상태를 다시 조회한다. DB·UI·snapshot 회귀와 production build가 통과했다.
  - **머지 후 확인**: 실제 결과/영향
- **Evidence**:
  - **Commit**: 커밋 해시 또는 링크
  - **PR**: PR 링크
  - **Test/Log**: `pnpm run test:admin` 8/8, `tests/admin-song-catalog.integration.ts` 3/3, `tests/catalog-snapshot.integration.ts` 2/2, `pnpm run build`, `pnpm run lint`, `pnpm exec tsc --noEmit` PASS
- **Consequences**: 카탈로그가 없는 상태가 서버 오류가 아니라 복구 가능한 관리자 상태가 된다. 기존 카탈로그가 있는 환경의 UI·API와 snapshot 형식은 변경하지 않는다.
