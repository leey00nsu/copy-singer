# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D013: frontend-quality-foundation 결정 (2026-08-09)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: Biome와 ESLint를 역할 분담해 병행 (2026-08-09)

- **Context**: 저장소는 ESLint 9 flat config로 Next.js Core Web Vitals, React Hooks, JSX 접근성 규칙을 검사하지만 formatter와 staged 검사, 파일명 규칙은 없다. 후속 FSD 리팩토링 전에 일관된 포맷 기준선과 빠른 커밋 검사가 필요하다.
- **Constraints**: Next.js 16.3 로컬 문서는 ESLint CLI와 Next/React 규칙을 권장한다. Biome 2.5의 Next domain은 기존 ESLint plugin 전체 규칙과 동일하지 않으므로 프레임워크 검사를 잃지 않아야 한다. 포맷 기준선 변경은 런타임 동작을 바꾸면 안 된다.
- **Options**: ESLint만 유지, Biome로 즉시 완전 대체, Biome와 ESLint 병행.
- **Decision**: Biome를 formatter/general lint/import/file-name 도구로 추가하고 기존 ESLint를 framework/a11y 보완 검사로 유지한다. React hook dependency 검사는 ESLint에 맡기고, 기존 코드에서 의도적으로 사용하는 array index key 등은 Biome 기준선에서 명시적으로 예외 처리한다.
- **Rationale**: staged 검사 속도와 formatter 일관성을 얻으면서 Next.js 전용 진단 손실 위험을 낮춘다.
- **Trace**:
  - **DOING 시작 시점**: 현재 177개 TypeScript 파일, ESLint 9 flat config, kebab-case에 이미 부합하는 작성 파일을 확인했다. Next.js 16 로컬 project structure/ESLint/TypeScript 가이드를 읽고 framework convention과 ESLint CLI 유지 필요성을 확인했다.
  - **DONE 전 확정 시점**: 142개 지원 파일을 Biome 기준으로 정규화했다. Biome, ESLint, TypeScript, Next.js production build, 전체 회귀 테스트와 Prisma 검증이 모두 통과했으며, 의도적으로 만든 camelCase fixture는 `useFilenamingConvention` 오류로 차단됐다.
  - **머지 후 확인**: 실제 결과/영향
- **Evidence**:
  - **Commit**: T-F013-01 task checkpoint에서 기록
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `pnpm run check:biome`, `pnpm run lint`, `pnpm run typecheck`, `pnpm test`, `pnpm run db:validate && pnpm run db:status` 모두 2026-08-09 PASS
- **Consequences**: 단기적으로 두 lint 도구를 유지하지만 각 도구의 책임과 실행 시점을 분리한다.
