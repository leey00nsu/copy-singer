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
  - **운영 검증 시점**: 실제 Google OAuth callback이 로컬 앱으로 302 복귀하고 세션 사용자 생성, 가입 티켓 1건 지급, 현재 사용자 admin allowlist 접근을 확인했다.
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
  - **운영 검증 시점**: 실제 Leemage 프로젝트에서 smoke 파일의 presign/upload/confirm/delete를 완료하고 cleanup 재시도 테스트를 통과했다.
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
  - **DONE 전 확정 시점**: `MixingJob` migration과 원자적 enqueue API, `FOR UPDATE SKIP LOCKED` claim, lease/heartbeat, Modal submit/poll resume을 구현했다. 웹 요청은 PENDING job 생성 후 즉시 끝나며 `pnpm worker:mixing`의 설정 가능한 lane이 처리한다. pre-submit failure는 `refundState=REQUIRED`를 거쳐 idempotent refund하고, submitted job 실패는 환불하지 않는다. reference와 target은 기존 원격 서비스에서 메모리로 전달해 worker 로컬 파일을 생성하지 않으며 target analyzer의 기존 임시 디렉터리 cleanup 계약을 유지한다.
  - **운영 검증 시점**: 별도 worker 프로세스를 SIGINT로 정상 종료한 뒤 재시작·재종료했고, crash 후 lease 회수와 중복 방지 통합 테스트를 다시 통과했다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: T04 task commit
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `pnpm run test:mixing:db` — duplicate enqueue, 동시 claim 1건, simulated crash lease recovery, pre-submit refund, post-submit no-refund
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
  - **DONE 전 확정 시점**: `User.ticketBalance`와 `TicketLedger` migration, Serializable transaction 기반 `applyTicketChange`, Better Auth create hook과 session 복구 grant를 구현했다. 동시 transaction의 PostgreSQL serialization conflict는 최대 3회 재시도하고 idempotency unique 충돌은 기존 원장을 반환한다. account 화면은 서버 페이지네이션된 원장과 현재 잔액을 표시한다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: T03 task commit
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `pnpm run test:tickets` — 동시 가입 grant 1건, 동시 duplicate debit 1건, 음수 잔액 차단, ledger UI
- **Consequences**: 모든 잔액 변경은 서비스 계층을 통과해야 하며 정합성 검증 도구가 필요하다.

## D005: 믹싱 완료는 Leemage 결과 확정 이후로 정의 (2026-08-06)

- **Context**: Modal succeeded 직후 결과를 외부 job TTL에만 의존하면 장기 히스토리에서 재생할 수 없고 추천 item에 상태를 두면 추천 삭제와 함께 이력이 사라진다.
- **Constraints**: Modal 결과 TTL과 무관하게 결과를 유지하고 DB에 바이너리를 저장하지 않으며, 다른 사용자에게 저장소 URL을 노출하지 않아야 한다.
- **Options**: Modal URL을 그대로 장기 보관, 추천 item에 Leemage 참조 추가, 독립 MixingJob에 결과 asset 연결을 비교했다.
- **Decision**: Modal 결과 WAV를 Leemage에 confirm하고 MediaAsset과 MixingJob.resultAssetId를 연결한 뒤에만 SUCCEEDED로 전환한다. 추천 UI는 MixingJob 최신 상태를 투영하고 믹싱 히스토리는 사용자 소유 job을 직접 조회한다.
- **Rationale**: 외부 GPU 작업과 영구 결과 저장의 부분 성공을 구분하고 프로필·추천 화면과 무관한 장기 작업 이력을 보존한다.
- **Trace**:
  - **DOING 시작 시점**: Modal 성공 이후 영구 저장 실패를 별도 실패로 표현하고 추천 삭제와 믹싱 이력을 분리하는 것으로 결정했다.
  - **DONE 전 확정 시점**: worker가 Modal result audio를 Leemage에 presign/PUT/confirm한 뒤 MediaAsset과 job을 연결하도록 구현했다. history API/page는 사용자 job을 최신순 페이지네이션하고 active job을 5초 간격으로 갱신한다. 결과 audio endpoint는 세션 소유권을 확인하고 외부 URL을 숨긴 채 Range 응답을 프록시한다. 추천 UI는 새 queue endpoint만 사용하며 구 synthesis 시작 endpoint는 410으로 막았다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: T05 task commit
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: pnpm run test:mixing:db; pnpm run test:mixing:ui; pnpm run test:recommendation
- **Consequences**: Modal 성공 후 Leemage 저장이 실패하면 job은 실패로 표시되지만 이미 GPU 비용이 발생했으므로 티켓은 환불하지 않는다.

## D006: 관리자는 env email allowlist와 서버 guard로 제한 (2026-08-06)

- **Context**: MVP 관리자 페이지가 필요하지만 역할 편집·권한 위임 제품 요구는 없고 reference 음성에는 관리자도 접근하면 안 된다.
- **Constraints**: 일반 사용자는 관리자 API를 호출할 수 없어야 하고 관리자도 reference audio URL·재생 기능을 받아서는 안 된다.
- **Options**: User role column, 별도 Admin 테이블, env email allowlist를 비교했다.
- **Decision**: ADMIN_EMAILS의 정규화 email allowlist를 모든 admin page/API에서 서버 검증하고, 관리자는 운영 집계·검색과 사유가 있는 티켓 조정만 수행한다.
- **Rationale**: 별도 역할 관리 복잡도 없이 운영자를 명시적으로 제한하고 UI 숨김에 의존하지 않는 권한 경계를 만든다.
- **Trace**:
  - **DOING 시작 시점**: 역할 관리가 별도 제품 범위가 아니므로 배포 설정으로 운영자를 제한하는 것으로 결정했다.
  - **DONE 전 확정 시점**: `requireAdminPage`와 `requireAdminApi`가 매 요청 세션 email을 정규화 allowlist와 비교한다. admin dashboard에는 사용자·job 집계/검색과 티켓 조정만 제공하고 reference asset을 select하지 않는다. 티켓 조정은 3자 이상 사유, actor user ID와 idempotency key를 원장에 저장하고 잔액 초과 회수를 거부한다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: T06 task commit
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: pnpm run test:admin; pnpm run build
- **Consequences**: 관리자 추가·삭제에는 `ADMIN_EMAILS` 변경과 서버 재시작이 필요하다.

## D007: reference 재생은 소유자 전용 웹 프록시로 제공 (2026-08-07)

- **Context**: 사용자는 재접속 후 저장된 보컬 프로필 분석과 분석에 제출한 보컬을 다시 확인하고 싶다.
- **Constraints**: Leemage API key·외부 URL은 브라우저에 노출하지 않고 관리자도 사용자 reference에 접근할 수 없어야 하며 오디오 탐색을 위해 Range 응답이 필요하다.
- **Options**: Leemage URL 직접 제공, 단기 presigned URL 제공, Next.js 소유권 검증 프록시를 비교한다.
- **Decision**: 프로필 목록·상세는 세션 user ID로 조회하고 reference는 프로필·asset의 이중 소유권을 확인하는 Next.js Range 프록시를 통해 본인에게만 제공한다.
- **Rationale**: 결과 오디오와 같은 서버 권한 경계를 유지하고 저장소 구현과 URL을 클라이언트에서 숨기면서 브라우저 audio element의 탐색을 지원한다.
- **Trace**:
  - **DOING 시작 시점**: 완료된 T07은 수정하지 않고 사용자 변경 요청을 T08로 추가했다. 기존 “worker만 reference 접근” 결정을 “worker와 소유자만 접근”으로 좁게 확장한다.
  - **DONE 전 확정 시점**: `/vocal-profiles` 목록과 사용자 소유 상세 페이지에 기존 분석 시각화와 제출 보컬 player를 연결했다. 오디오 API는 세션 user ID로 profile을 조회한 뒤 MediaAsset의 user ID·REFERENCE kind·READY 상태를 다시 검증하고 Range를 Leemage로 전달한다. 응답에는 재생에 필요한 content header와 `private, no-store`만 남겨 외부 URL·저장소 header를 노출하지 않는다. 전체 회귀 중 통합 테스트 worker가 실제 PENDING job을 claim할 수 있던 문제를 발견해 `claimNextMixingJob`에 테스트 candidate ID 제한을 추가했고, 영향받은 실제 job은 Modal 제출 전 원래 PENDING 상태로 복구했다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: T08 task commit
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `pnpm run test:vocal-profile-history`; `pnpm run test:mixing:db`; `pnpm test`; 실제 READY reference에 Range smoke HTTP 206
- **Consequences**: reference 트래픽이 웹 서버를 통과하므로 Range와 streaming을 보존하고 cache·로그에 외부 URL이 남지 않도록 해야 한다.

## D008: 단일 인스턴스 기본 명령에서 웹과 worker를 함께 관리 (2026-08-07)

- **Context**: 웹 서버만 실행된 상태에서 믹싱 요청이 정상 접수·차감됐지만 worker가 없어 Modal 요청 전 `PENDING`에 머물렀다.
- **Constraints**: 현재 운영 대상은 단일 인스턴스이고, Ctrl-C와 자식 프로세스 실패 시 웹·worker가 서로 고아 프로세스로 남지 않아야 한다.
- **Options**: 계속 별도 터미널에서 실행, shell background process, `concurrently`로 두 장기 프로세스를 관리하는 방식을 비교한다.
- **Decision**: 기본 `dev`·`start`는 `concurrently --kill-others-on-fail`로 웹과 worker를 함께 실행하고, 웹 단독 명령은 `dev:web`·`start:web`으로 분리한다.
- **Rationale**: 단일 명령 실행 누락으로 큐가 정지하는 운영 실수를 막으면서 각 프로세스의 구현과 로그 채널은 분리해 유지한다.
- **Trace**:
  - **DOING 시작 시점**: 실제 최신 job이 `PENDING`, attempts 0, modalJobId·lease 없음이고 worker 프로세스도 없음을 확인해 시작 누락을 원인으로 확정했다.
  - **DONE 전 확정 시점**: `concurrently` 10.0.4를 추가하고 기본 `dev`·`start`가 각각 웹 전용 script와 `worker:mixing`을 함께 실행하도록 변경했다. `--kill-others-on-fail` 계약을 더미 장기 프로세스와 exit 7 프로세스로 검증해 sibling이 SIGTERM으로 정리됨을 확인했다. 전체 테스트 동안 실제 사용자 PENDING job은 attempts 0·lease 없음으로 유지해 검증이 Modal 요청을 만들지 않도록 했다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: T09 task commit
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `pnpm run test:process-scripts`; `pnpm exec tsc --noEmit`; `pnpm run lint`; `pnpm test`
- **Consequences**: 단일 인스턴스에서는 한 프로세스 실패 시 전체 인스턴스를 재시작한다. 추후 수평 확장하면 웹과 worker를 별도 프로세스 타입으로 다시 분리한다.
