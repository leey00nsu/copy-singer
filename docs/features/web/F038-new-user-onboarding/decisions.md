# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D038: new-user-onboarding 결정 (2026-08-17)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: new-user-onboarding 결정 (2026-08-17)

- **Context**: 최초 인증 진입에서만 온보딩을 보여 주고 확인한 사용자는 기기·세션과 무관하게 다시 보지 않아야 한다. 기존 인증 session helper는 로그인 요청마다 가입 티켓 지급을 먼저 보장한다.
- **Constraints**: 기존 사용자는 배포 후 새 모달을 보지 않아야 하고, 신규 계정은 Better Auth가 직접 생성한다. 완료 mutation은 다른 사용자 식별자를 신뢰할 수 없으며 React client prop은 serializable해야 한다.
- **Options**: `localStorage`/cookie, 별도 onboarding event table, `User` nullable timestamp를 검토한다. 초기 payload는 client GET waterfall과 ProductLayout server snapshot을 비교한다.
- **Decision**: `User.onboardingCompletedAt` nullable timestamp를 계정 단위 SSOT로 사용한다. 기존 row는 migration 실행 시 backfill하고 신규 row는 `null`로 둔다. 미완료 snapshot은 기존 ticket service의 두 wallet을 반환하며 완료는 session 사용자만 POST Route Handler에서 조건부 update한다.
- **Rationale**: 별도 event table 없이 재로그인·다른 기기를 지원하고 완료 시각도 보존한다. column default 없이 기존 row만 명시적으로 backfill해야 migration 이후 신규 계정을 정확히 구분할 수 있다. 조건부 update와 최종 row 조회 조합은 동시 요청도 같은 저장 결과로 수렴시킨다.
- **Trace**:
  - **DOING 시작 시점**: Next.js 16.3.0 내장 문서에서 layout/page는 기본 Server Component이고 interactive leaf만 Client Component로 두며 전달 props가 serializable해야 함을 확인했다. Route Handler의 POST는 기본 비캐시이며 Web Request/Response API를 사용한다.
  - **DONE 전 확정 시점**: 실제 PostgreSQL migration을 적용하고 신규 사용자 두 명으로 미완료 snapshot, 현재 분석 5장·믹싱 1장, 동시 완료, 다른 사용자 미변경과 완료 후 `required: false`를 검증했다.
  - **머지 후 확인**: 대기 중
- **Evidence**:
  - **Test/Log**: `pnpm run test:onboarding` PASS (2 tests), `pnpm exec tsc --noEmit` PASS, `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`, `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- **Consequences**: 서버 전용 DB 모듈은 `server-only`로 보호하고 client에는 plain object/number/string/null만 전달한다. 향후 온보딩 버전별 재노출이 필요하면 별도 version 정책을 새 Feature로 추가해야 한다.
