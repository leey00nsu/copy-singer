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
