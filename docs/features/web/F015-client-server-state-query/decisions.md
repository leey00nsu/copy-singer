# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D015: client-server-state-query 결정 (2026-08-09)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: Query provider와 typed API 오류 경계 (2026-08-09)

- **Context**: Client Component마다 fetch, 오류 parsing, retry와 timer를 직접 관리해 동일 API도 처리 기준이 달라진다.
- **Constraints**: Next.js 16.3 Server/Client Component 경계를 유지하고 authenticated cache를 server request 또는 browser storage 사이에 공유하지 않아야 한다. 기존 Node test runner를 유지해야 한다.
- **Options**: component마다 QueryClient 생성, module browser singleton과 server request별 instance, root에서 dehydration을 항상 사용하는 구성을 검토한다.
- **Decision**: server에서는 render별 QueryClient, browser에서는 단일 안정 instance를 사용하는 provider와 `ApiError`/Zod schema 기반 `requestJson`을 공통 기반으로 사용한다. 기본 query retry는 retryable network/429/5xx에만 최대 2회 허용한다.
- **Rationale**: 동일 browser render에서 cache를 공유하면서 SSR request 간 private data 누출을 막고, 현재 initial props에는 전역 dehydration 비용을 추가하지 않기 위해서다.
- **Trace**:
  - **DOING 시작 시점**: TanStack 공식 SSR guidance와 로컬 Next.js provider 문서를 기준으로 provider는 필요한 범위에 두고, 공통 오류는 UI에 raw response를 노출하지 않는 최소 metadata만 유지한다.
  - **DONE 전 확정 시점**: `requestJson`이 valid payload만 반환하고 4xx·contract error를 재시도하지 않으며 retryable 5xx/network만 재시도 대상으로 분류함을 5개 Node test로 확인했다. MSW postinstall은 browser worker가 필요 없는 F015 범위에서 실행하지 않도록 pnpm `allowBuilds`에 명시했다.
  - **머지 후 확인**: 로컬 통합 후 갱신 예정
- **Evidence**:
  - **Commit**: task commit 후 갱신 예정
  - **PR**: 로컬 workflow (원격 PR 없음)
  - **Test/Log**: `pnpm run test:query` PASS (5), `pnpm run typecheck` PASS, `pnpm run check:architecture` PASS, `pnpm run lint` PASS (2026-08-09)
- **Consequences**: query cache는 브라우저 메모리에만 유지되고, endpoint schema 불일치는 재시도하지 않는 contract error가 된다.
