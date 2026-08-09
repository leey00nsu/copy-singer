# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D014: fsd-architecture-migration 결정 (2026-08-09)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: Next.js adapter와 prefixed FSD layer 분리 (2026-08-09)

- **Context**: Next.js `app` special folder와 FSD App/Pages layer 이름이 충돌하며 현재 root `app`, `components`, `lib`에 framework·UI·server 책임이 혼재한다.
- **Constraints**: 기존 10개 page, 24개 Route Handler, worker entrypoint와 Coolify 실행 방식을 유지하면서 Steiger recommended rules를 통과해야 한다.
- **Options**: root `app`을 유지하고 `src/_app`·`src/_pages`를 두는 방식, Next router를 `src/app`으로 옮기는 방식, FSD layer 이름을 임의 변경하는 방식을 검토한다.
- **Decision**: 공식 Next.js용 FSD 가이드와 Steiger prefix 인식을 따라 root `app` adapter + `src/_app`·`src/_pages` 구조를 사용한다. FSD source의 첫 기반은 `src/shared`에 두고, browser-safe public API는 `index.ts`, server 전용 public API는 `index.server.ts`로 분리한다.
- **Rationale**: Next.js route inventory를 그대로 보존하면서 framework adapter와 FSD source를 물리적으로 분리하고 공식 linter의 표준 layer 규칙을 사용할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 2026-08-09 공식 FSD Next.js 가이드, Steiger prefixed layer test와 설치된 Next.js 16.3 project structure 문서를 확인했다. 첫 태스크에서는 `src/shared`와 Steiger를 먼저 구성해 prefix/import/public API 가설을 실제 검사로 검증한다.
  - **DONE 전 확정 시점**: `src/shared`의 UI primitive, cn, audio, config와 DB 모듈을 public API 구조로 이전했다. Steiger recommended rules 오류 0건, 통합 정적 검사, Next.js production build와 Shared/audio 관련 13개 테스트 통과로 alias·public API·server-only 경계를 검증했다. `steiger@0.6.0`과 plugin `0.7.0`은 현재 package dependency 관계에 맞춰 exact pin했다.
  - **머지 후 확인**: 실제 결과/영향
- **Evidence**:
  - **Commit**: T-F014-01 task checkpoint에서 기록
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `pnpm run check:architecture`, `pnpm run check`, `pnpm run build`, Shared/audio 관련 13개 테스트 모두 2026-08-09 PASS
- **Consequences**: migration 중에는 `@/*`가 `src/*`를 우선하고 root를 fallback으로 찾는다. 최종 태스크에서 root fallback과 legacy `components`/`lib`를 제거한다.

## D002: 도메인 자체 책임과 교차 도메인 use case 분리 (2026-08-09)

- **Context**: 기존 vocal-profile, auth, tickets, Leemage 모듈은 계약·UI·persistence·queue·worker와 가입 티켓 지급 같은 교차 도메인 흐름을 디렉터리 하나에 함께 둔다.
- **Constraints**: FSD Entity slice는 같은 레이어의 다른 Entity를 직접 import할 수 없고, Client Component는 DB·secret·Node.js 전용 구현에 도달하면 안 된다. 기존 API, worker와 DB 동작은 유지해야 한다.
- **Options**: 기존 domain 폴더를 그대로 Entity로 이동, 모든 server 코드를 Shared로 이동, 자체 계약/persistence는 Entity에 두고 교차 도메인 흐름을 Feature/App으로 올리는 방식을 검토한다.
- **Decision**: vocal-profile과 ticket의 자체 계약·표현·persistence를 Entity에 두고 analysis queue와 authentication, ticket 관리 흐름은 Feature로, analysis worker와 HTTP handler 조립은 App으로 올린다. Leemage 저장·프록시·정리는 Shared media adapter로 유지한다. browser-safe `index.ts`, 통합 server `index.server.ts`와 분석기·프록시처럼 DB 초기화 없이 독립 검증해야 하는 좁은 server public API를 분리한다.
- **Rationale**: business code를 Shared에 숨기지 않으면서 Entity 간 직접 결합과 client/server public API 혼합을 동시에 방지할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 2026-08-09 vocal-profile 15개 module, auth 8개 module, ticket service와 media adapter의 현재 import 관계를 기준으로 경계 분리를 시작한다.
  - **DONE 전 확정 시점**: 기존 모듈을 Entity/Feature/App/Shared 경계로 이전하고 root app, component, route, script, worker와 test import를 public API 기준으로 갱신했다. 서버 barrel의 불필요한 eager dependency는 인증의 Next request-context dynamic import와 analyzer/media의 좁은 server public API로 분리해 단위 테스트 격리를 유지했다. Client Component의 server-only import가 없고 관련 55개 테스트, 정적 검사, Steiger와 production build가 통과했다.
  - **머지 후 확인**: 실제 결과/영향
- **Evidence**:
  - **Commit**: T-F014-02 task checkpoint에서 기록
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: F014 tasks.md의 auth, ticket, admin, media, vocal-profile 관련 55개 테스트와 `pnpm run check`, `pnpm run build` 2026-08-09 PASS
- **Consequences**: App·Page 이전 전에도 도메인 경계가 명확해졌고 client/server module graph가 분리됐다. 통합 server barrel은 실제 조립 코드에서 사용하고 환경 의존성을 격리해야 하는 단위 테스트는 capability별 server public API를 사용한다.

## D003: 증분 이전 중 Steiger false positive의 범위 제한 (2026-08-09)

- **Context**: Steiger 실행 root를 `./src`로 고정했기 때문에 아직 root `app`에 남은 실제 소비 import를 `insignificant-slice`가 집계하지 못한다. 또한 설치된 `@feature-sliced/filesystem@3.1.0`은 layer 탐색에서는 `_app` prefix를 제거하지만 일부 규칙은 물리 폴더명 `_app`을 다시 검사한다.
- **Constraints**: recommended rules 전체를 유지하면서 F014의 각 증분 태스크에서도 구조 검사가 통과해야 하고, 실제 layer/import/public API 위반을 숨겨서는 안 된다.
- **Options**: Steiger를 repository root에서 실행, F014 완료까지 architecture 검사를 생략, 확인된 진단 경로와 규칙만 끄는 방식을 검토했다.
- **Decision**: `_app` 경로에는 prefix 처리 불일치가 있는 `no-segmentless-slices`와 `typo-in-layer-name`만 끄고, 아직 root adapter가 주 소비자인 T02 신규 slice에는 `insignificant-slice`만 한시적으로 끈다. 다른 recommended rule은 모두 유지한다.
- **Rationale**: repository root 실행은 `src` 아래 FSD layer를 발견하지 못하고 검사 생략은 실제 위반을 놓친다. 진단별 최소 override는 검사의 유효 범위를 가장 크게 유지한다.
- **Trace**:
  - **DOING 시작 시점**: T02 첫 Steiger 실행에서 8개 오류를 확인하고 설치된 plugin과 filesystem 구현 및 실제 소비 import를 대조했다.
  - **DONE 전 확정 시점**: 특정 경로·규칙 override 후 Steiger recommended rules 오류 0건을 확인했으며 client-to-server import와 legacy import도 별도 검색으로 0건임을 검증했다.
  - **머지 후 확인**: 실제 결과/영향
- **Evidence**:
  - **Commit**: T-F014-02 task checkpoint에서 기록
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `pnpm run check:architecture`, `pnpm run check` 2026-08-09 PASS
- **Consequences**: T04·T05에서 root adapter 소비자가 `_pages`·`_app`으로 이동할 때 `insignificant-slice` override를 다시 평가해 제거 가능한 항목을 제거한다. `_app` prefix 관련 두 override는 plugin이 물리 이름까지 일관되게 정규화할 때 제거한다.
