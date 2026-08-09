# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D017: fsd-architecture-hardening 결정 (2026-08-09)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D017: 공식 Next.js FSD 구조와 공개 API 경계 유지 (2026-08-09)

- **Context**: 최신 FSD Next.js 가이드는 루트 `app/`과 `src/_app`·`src/_pages`를 함께 사용하지만, 저장소 README는 F014 이전의 `components`·`lib/*` 구조를 설명하고 있다. 현재 slice deep import와 server/client 공개 API 혼합도 문서 규칙으로 드러나지 않는다.
- **Constraints**: Next.js 16.3 App Router convention, 기존 route/API 동작, F014~F016 구조와 Coolify 배포 경로를 보존해야 한다. Steiger 0.6.0과 FSD plugin/filesystem의 underscore prefix 분석 한계도 현재 버전에서는 남아 있다.
- **Options**: (1) FSD layer를 Next.js `app/` 안으로 합치거나 `_app`·`_pages`를 rename, (2) 공식 split 구조를 유지하고 Steiger만 사용, (3) 공식 split 구조와 capability 공개 API를 유지하면서 확인된 Steiger 누락만 저장소 검사로 보완.
- **Decision**: 공식 split 구조와 `_app`·`_pages` 이름을 유지한다. slice consumer는 `index.ts`, `index.model.ts`, `index.server.ts` 등 실행 환경이 드러나는 root 공개 API를 사용하고, 현재 Steiger prefix 사각지대는 좁은 override와 저장소 검사로 보완한다.
- **Rationale**: 이 방식이 최신 FSD Next.js 가이드 및 Next.js route convention과 일치하고, URL·runtime 동작을 바꾸지 않으면서 내부 결합과 server/client graph 위험을 줄인다. Steiger 자체를 대체하지 않아 upstream 개선 후 예외를 축소하기도 쉽다.
- **Trace**:
  - **DOING 시작 시점**: `_app`·`_pages`를 rename하지 않고 공식 구조로 문서화한다. slice 공개 API는 browser/model/server capability로 나누고, Steiger 사각지대만 저장소 검사로 보완하는 방향을 검증한다.
  - **T-F017-02 시작 시점**: Zod contract는 UI/client barrel과 분리된 `index.model.ts`로 노출하고, 환경 변수를 읽는 Admin policy는 `server-only`와 `index.server.ts` 뒤에 한정한다. Next.js client module graph 규칙과 기존 export 소비자를 함께 확인한다.
  - **T-F017-02 완료 시점**: 설치된 Next.js 16.3 문서가 `use client` 아래 전체 import graph가 client bundle에 포함되고 `server-only`가 environment poisoning을 build time에 막는다고 명시함을 확인했다. 세 model entry를 추가하고 Root Layout의 UI/server import를 분리한 뒤 Query/API/auth 회귀를 통과했다.
  - **T-F017-03 시작 시점**: Admin Page와 `_app` API route가 함께 쓰는 조회·집계 use case를 `inspect-admin-operations` Feature의 `index.server.ts`로 이동한다. query/return 값은 바꾸지 않고 Page가 다른 App consumer에게 내부 API를 제공하는 역참조만 제거한다.
  - **T-F017-03 완료 시점**: 이동 전후 `admin-service.ts` diff가 없음을 확인하고 Page, 세 route, integration test를 새 Feature server API로 전환했다. 기존 Admin UI/DB 회귀와 Steiger를 통과했으며 `_pages/admin/api` 참조는 0건이다.
  - **T-F017-04 시작 시점**: TypeScript AST와 실제 source graph를 사용해 cross-slice segment import, `use client`에서 server marker까지의 transitive 경로, 루트 App adapter top-level을 검사한다. 타입 전용 import는 client runtime graph에서 제외하고 위반 fixture와 저장소 전체를 같은 helper로 검증한다.
  - **T-F017-04 완료 시점**: import/re-export/dynamic import를 해석하는 AST 검사와 세 규칙의 정상·위반 fixture, 실제 `app`·`src`·`scripts` compliance test를 추가했다. 신규 test를 `check:architecture`와 전체 `test`에 연결하고 전체 정적 check를 통과했다.
  - **T-F017-05 시작 시점**: 구현된 공개 API·server/client·App adapter 경계를 전체 source inventory와 정규 quality/test/build 명령으로 다시 검증한다. API·DB·Coolify·CI 범위가 변경되지 않았는지도 최종 diff에서 함께 확인한다.
  - **T-F017-05 완료 시점**: 실제 `app`·`src`·`scripts`에서 slice segment deep import가 0건임을 확인했고 source graph 및 App adapter 검사 4건이 통과했다. 전체 quality, Admin 회귀, Next.js production build, 전체 test와 Storybook build가 통과했으며 route diff는 공개 API import 교체뿐이고 Prisma·Coolify·GitHub Actions 변경 파일은 없다.
  - **DONE 전 확정 시점**: 실제 저장소 Layout과 공개 API 종류를 inventory하고 README에 adapter/layer/entry point 규칙 및 Steiger 0.6.0 narrow override 근거를 반영했다.
  - **머지 후 확인**: 로컬 통합 전이며 workflow의 local-ff 승인·검증 단계에서 결과를 기록한다.
- **Evidence**:
  - **Commit**: `c411825` (Feature 문서), `4ab5709` (T-F017-01), `b34af7e` (T-F017-02), `0c55216` (T-F017-03), `13dcb2b` (T-F017-04)
  - **PR**: 로컬 워크플로우로 원격 PR 없음
  - **Test/Log**: `git diff --check`, targeted Biome/ESLint, `pnpm run typecheck`, `pnpm run test:query` (21), `pnpm run test:auth:db` (3), `pnpm run test:admin` (2), Admin service move diff, `pnpm run test:architecture-boundaries` (4), `pnpm run check`, `pnpm test`, `pnpm run build-storybook` PASS
- **Consequences**: 개발자는 루트 `app/`과 FSD App/Pages 레이어를 구분하고 capability별 공개 API를 선택할 수 있다. Steiger가 놓치는 경계는 로컬 표준 검사에서 회귀 방지되며 runtime·API·DB·Coolify·CI 구성에는 영향이 없다. architecture package를 갱신할 때 override와 보완 검사를 함께 재평가해야 한다.
