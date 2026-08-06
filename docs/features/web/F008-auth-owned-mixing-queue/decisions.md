# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D008: auth-owned-mixing-queue 결정 (2026-08-06)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: Google 전용 Better Auth와 env 관리자 allowlist (2026-08-06)

- **Context**: 사용자별 프로필·믹싱·티켓 소유권이 필요하고 사용자는 Google OAuth만 요청했다. 관리자 화면도 필요하지만 역할 관리 제품 요구는 없다.
- **Constraints**: 기존 Next.js App Router와 Prisma PostgreSQL을 유지하고 secret/권한 판정은 서버에만 둔다.
- **Options**: 자체 OAuth, Auth.js, Better Auth를 비교하고 관리자 역할 테이블과 env email allowlist를 비교했다.
- **Decision**: Better Auth Prisma adapter와 Google social provider만 활성화한다. 관리자는 정규화 email을 `ADMIN_EMAILS`와 비교하되 모든 관리자 API에서 서버 검증한다.
- **Rationale**: 사용자 요구 기술을 그대로 사용하고 MVP 운영자를 명시적으로 제한하면서 불필요한 역할 관리 UI를 피한다.
- **Trace**:
  - **DOING 시작 시점**: Better Auth 공식 Next.js handler, Prisma adapter, Google callback과 database hook 지원을 확인했다.
  - **DONE 전 확정 시점**: Better Auth 1.6.26과 공식 Prisma adapter를 설치하고 User/Session/Account/Verification migration, Google 전용 auth handler, 로그인·로그아웃 UI를 구현했다. profile·recommendation API는 세션 user ID로 신규 row를 귀속하고 cross-user 조회를 not found로 처리한다. Google env가 없는 로컬에서는 버튼을 비활성화해 잘못된 OAuth 요청을 막는다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: T01 task commit
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `pnpm run test:auth:db`, `pnpm run build`, 로컬 HTTP `/` 307·`/login` 200·보호 API 401; https://better-auth.com/docs/integrations/next, https://better-auth.com/docs/adapters/prisma, https://better-auth.com/docs/beta/authentication/google
- **Consequences**: 관리자 변경에는 env 갱신과 서버 재시작이 필요하며 이메일 변경 시 allowlist도 갱신해야 한다.

---

## D002: Leemage를 사용자 reference와 믹싱 결과의 영구 저장소로 사용 (2026-08-06)

- **Context**: SoulX-Singer는 매 믹싱에 실제 reference 오디오가 필요하고 사용자는 프로젝트의 영구 파일 저장이 필요할 때 Leemage를 사용하도록 지정했다.
- **Constraints**: DB와 Git에는 바이너리를 저장하지 않고 reference는 사용자·관리자 UI에서 노출하지 않으며 원곡/stem은 임시 처리만 한다.
- **Options**: 매번 재업로드, 로컬 디스크, S3/R2 직접 연동, Leemage를 비교했다.
- **Decision**: 표준화 reference와 성공 결과를 Leemage의 API Key 기반 presign/upload/confirm 흐름으로 저장하고 `MediaAsset`에는 외부 ID와 메타데이터만 남긴다.
- **Rationale**: 재접속 후 합성과 결과 재생을 지원하면서 사용자가 지정한 단일 저장 API로 수명주기와 삭제를 통합한다.
- **Trace**:
  - **DOING 시작 시점**: OpenAPI에서 일반 파일의 presign, confirm, URL 응답과 delete endpoint, Bearer 인증, 429 계약을 확인했다.
  - **DONE 전 확정 시점**: `MediaAsset`과 `MediaCleanupJob` migration, Leemage API client와 analyzer reference 이전 흐름을 구현했다. 표준 WAV를 메모리의 제한된 60초 payload로 읽어 presign/PUT/confirm하고 성공 후 analyzer 임시본을 삭제한다. 프로필 삭제 또는 DB 보상 삭제에서 외부 삭제가 실패하면 asset을 `DELETE_PENDING`으로 두고 cleanup job을 생성한다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: T02 task commit
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `pnpm run test:media` 4 tests, `pnpm run db:migrate:deploy`, `pnpm run build`; https://leemage.leey00nsu.com/ko/api-docs/getting-started/introduction, https://leemage.leey00nsu.com/api/v1/openapi
- **Consequences**: Leemage와 DB 사이의 부분 실패를 보상 삭제 또는 cleanup queue로 정리해야 한다.

---

## D003: PostgreSQL 작업 테이블과 lease 기반 worker를 영속 큐로 사용 (2026-08-06)

- **Context**: 믹싱은 브라우저와 Next.js 요청 수명보다 길고 재접속·재시작 후에도 계속되어야 한다.
- **Constraints**: 로컬 Docker Compose에는 PostgreSQL만 있고 추가 Redis 운영 요청은 없다. Modal job은 외부 ID로 polling을 재개할 수 있다.
- **Options**: Next.js 메모리 큐, Redis/BullMQ, pg-boss, 도메인 `MixingJob` + PostgreSQL claim을 비교했다.
- **Decision**: `MixingJob` 자체를 queue SSOT로 두고 별도 TypeScript worker가 `FOR UPDATE SKIP LOCKED`와 lease/heartbeat로 claim한다.
- **Rationale**: 티켓·소유권·작업 상태를 한 트랜잭션에서 처리하고 현재 로컬 인프라만으로 내구성과 경쟁 제어를 제공한다.
- **Trace**:
  - **DOING 시작 시점**: 작업 상태와 결제 경계가 제품 도메인이라 범용 queue payload와 별도 상태 복제를 피하는 방향으로 계획했다.
  - **DONE 전 확정 시점**: 구현 태스크 완료 시 갱신한다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: 구현 커밋에서 갱신
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: 동시 claim·lease recovery 통합 테스트에서 갱신
- **Consequences**: worker 프로세스를 웹과 별도로 실행해야 하고 raw SQL claim 경계를 집중 테스트해야 한다.

---

## D004: 티켓은 캐시 잔액과 append-only 원장을 원자적으로 갱신 (2026-08-06)

- **Context**: 가입 지급, 믹싱 차감, 조건부 환불과 관리자 조정을 사용자가 조회할 수 있어야 한다.
- **Constraints**: 동시 요청과 네트워크 재시도에서 중복 차감·지급을 막고 잔액은 음수가 될 수 없다.
- **Options**: User balance만 저장, 원장 합계만 실시간 계산, balance와 ledger를 함께 저장하는 방식을 비교했다.
- **Decision**: `User.ticketBalance`와 append-only `TicketLedger`를 Serializable 트랜잭션에서 함께 갱신하고 행별 idempotency key와 `balanceAfter`를 기록한다.
- **Rationale**: 잔액 조회를 단순화하면서도 모든 변동의 감사·설명·복구 근거를 남긴다.
- **Trace**:
  - **DOING 시작 시점**: 가입 grant, debit과 refund 각각에 안정적인 unique key를 부여하는 것으로 계획했다.
  - **DONE 전 확정 시점**: 구현 태스크 완료 시 갱신한다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: 구현 커밋에서 갱신
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: 동시 debit·중복 request 통합 테스트에서 갱신
- **Consequences**: 모든 잔액 변경은 서비스 계층을 통과해야 하며 정합성 검증 도구가 필요하다.
