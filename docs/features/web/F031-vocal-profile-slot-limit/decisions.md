# Decisions: vocal-profile-slot-limit

## D001: 프로필 슬롯과 분석 사용권을 분리한다 (2026-08-15)

- **Context**: 보유 프로필 최대치만 두면 사용자가 `생성 → 삭제 → 생성`을 반복해 분석 작업은 무제한으로 사용할 수 있다.
- **Constraints**: 프로필 정리 정책과 분석 비용 정책을 같은 숫자로 섞지 않고, 사용자가 삭제 효과를 예측할 수 있어야 한다.
- **Options**: 보유 슬롯만 제한, 누적 분석 카운터 추가, 기존 티켓 개념을 분석/믹싱 종류로 확장하는 방식을 비교한다.
- **Decision**: `보컬 프로필 슬롯`과 `분석 티켓`을 분리한다. 슬롯은 삭제 시 복구되고, 성공적으로 접수된 분석에 사용한 티켓은 프로필을 삭제해도 복구하지 않는다.
- **Rationale**: 슬롯은 현재 저장 상태, 티켓은 기능 사용권이라는 서로 다른 개념이다. 둘을 분리하면 제한 이유와 다음 행동을 UI에서 명확히 설명할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 분석 queue의 admission policy와 분석 입력 UI를 슬롯/티켓 두 상태로 분리했다.
  - **DONE 전 확정 시점**: 서버는 `profileQuota`와 `analysisTickets`를 함께 계산하고, UI는 두 값을 별도 표시하며 삭제는 슬롯만 복구하는 계약을 유지한다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: `69c51de` (`feat(F031): 회귀 검증과 문서 동기화`)
  - **PR**: -
  - **Test/Log**: vocal analysis queue 8/8 PASS; targeted profile Storybook 포함 최종 전체 Storybook 156/156 PASS.
- **Consequences**: 분석 화면은 슬롯 사용량과 분석 티켓 잔액을 함께 보여줘야 한다.

## D002: 기존 단일 티켓을 `VOCAL_ANALYSIS` / `AI_MIXING` 종류 기반 지갑으로 일반화한다 (2026-08-15)

- **Context**: 현재 `User.ticketBalance`는 사실상 AI 믹싱에만 사용된다. 별도 분석 횟수 카운터를 만들면 사용권 시스템이 두 개로 갈라지고, 향후 새 유료 기능마다 별도 balance 컬럼이나 카운터가 늘어난다.
- **Constraints**: 기존 믹싱 잔액과 원장 이력을 보존하고, 분석과 믹싱 잔액이 서로 차감되지 않아야 한다.
- **Options**: `analysisTicketBalance`/`mixingTicketBalance` 컬럼 추가, 별도 분석 횟수 테이블, `(userId, kind)` 종류 기반 `TicketWallet`을 비교한다.
- **Decision**: `TicketKind = VOCAL_ANALYSIS | AI_MIXING`과 종류별 `TicketWallet`을 도입한다. 원장 이벤트는 기능명과 분리해 `SIGNUP_GRANT`, `USAGE_DEBIT`, `USAGE_REFUND`, `ADMIN_ADJUSTMENT`로 일반화한다.
- **Rationale**: 잔액 저장 구조가 기능 수에 따라 사용자 컬럼을 계속 늘리지 않으며, 새 ticket kind를 같은 서비스/원장/관리자 UX에 연결할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: Prisma schema, ticket service, signup grant와 account API를 kind 기반으로 전환했다.
  - **DONE 전 확정 시점**: `TicketWallet(userId, kind)`가 잔액 SSOT가 되고 모든 debit/refund/admin adjustment가 동일 서비스에서 kind를 명시하도록 정리했다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: `69c51de` (`feat(F031): 회귀 검증과 문서 동기화`)
  - **PR**: -
  - **Test/Log**: ticket wallet integration 1/1 PASS; API/query/account targeted 24/24 PASS; FSD 4/4 PASS.
- **Consequences**: Prisma migration과 기존 ticket API/UI 전반의 additive/breaking internal contract 변경이 필요하다.

## D003: 기존 단일 티켓 잔액과 원장은 `AI_MIXING`으로 보존한다 (2026-08-15)

- **Context**: 기존 단일 티켓은 믹싱 접수와 환불에서 사용됐고 계정/관리자 UI에서도 단일 잔액으로 표시된다.
- **Constraints**: 마이그레이션으로 사용자가 이미 가진 티켓을 잃거나 이중 지급받지 않아야 한다.
- **Options**: 기존 잔액을 두 종류에 복제, 전부 초기화 후 재지급, 기존 의미 그대로 AI_MIXING에 이전하는 방식을 비교한다.
- **Decision**: `User.ticketBalance`를 기존 사용자 `AI_MIXING` wallet에 그대로 이전하고 모든 기존 ledger row를 `kind=AI_MIXING`으로 backfill한다. 기존 mixing debit/refund 타입은 generic usage debit/refund로 전환한다.
- **Rationale**: 기존 티켓의 실제 소비처와 가장 일치하며 금액을 복제하거나 잃지 않는다.
- **Trace**:
  - **DOING 시작 시점**: migration에서 legacy balance/ledger를 먼저 AI_MIXING으로 복사·backfill한 뒤 단일 balance 컬럼을 제거하도록 구성했다.
  - **DONE 전 확정 시점**: 기존 AI_MIXING `SIGNUP_GRANT`가 있으면 새 mixing 가입 지급을 재생성하지 않고, 새 VOCAL_ANALYSIS 지급만 독립적으로 보장하도록 ensure 로직을 고정했다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: `69c51de` (`feat(F031): 회귀 검증과 문서 동기화`)
  - **PR**: -
  - **Test/Log**: `pnpm run db:migrate:deploy` PASS; ticket wallet signup/idempotency integration 1/1 PASS.
- **Consequences**: 기존 사용자에게 새 분석 티켓은 별도 가입 지급 정책으로 최초 1회 생성해야 한다.

## D004: 가입 지급과 비용·슬롯 정책은 서버 환경변수로 관리한다 (2026-08-15)

- **Context**: 프로필 슬롯과 기능별 티켓 정책은 운영 단계에서 조정될 가능성이 높다.
- **Constraints**: 브라우저 환경변수에 정책을 복제하지 않고 서버가 단일 정책 SSOT가 되어야 한다. 기존 `integerEnv()`의 fail-fast 규칙과 일치해야 한다.
- **Options**: 코드 상수, DB 관리자 설정, 서버 환경변수를 비교한다.
- **Decision**: `VOCAL_PROFILE_MAX_USER_PROFILES`(default 3), `SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT`(default 5), `SIGNUP_MIXING_TICKET_GRANT`(default 1), `VOCAL_PROFILE_ANALYSIS_TICKET_COST`(default 1), 기존 `MIXING_TICKET_COST`를 사용한다.
- **Rationale**: 현재 설정 시스템과 일관되고 배포 설정만으로 정책을 조정할 수 있다. 클라이언트는 서버 응답만 소비해 정책 불일치를 피한다.
- **Trace**:
  - **DOING 시작 시점**: 기존 `integerEnv()`를 재사용한 server-only accessor와 `.env.example` 항목을 추가했다.
  - **DONE 전 확정 시점**: 브라우저는 최대치/비용을 하드코딩하지 않고 analysis API가 반환하는 `profileQuota`와 `analysisTickets`만 소비한다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: `69c51de` (`feat(F031): 회귀 검증과 문서 동기화`)
  - **PR**: -
  - **Test/Log**: ESLint PASS; `tsc --noEmit` PASS; 최종 `pnpm test` PASS.
- **Consequences**: `.env.example`과 운영 환경 설정 변경이 필요하다.

## D005: 분석 티켓은 job 접수 시 차감하고 terminal failure에서 환불한다 (2026-08-15)

- **Context**: 성공할 때만 티켓을 차감하면 worker 비용을 사용한 실패 분석이 무제한이 되고, 접수 시 영구 차감하면 시스템 실패로 사용자가 티켓을 잃는다.
- **Constraints**: retry 중 중복 차감·환불을 막고, 현재 믹싱의 ticketCost/refund 패턴과 최대한 일치시켜야 한다.
- **Options**: 성공 시 차감, 접수 시 차감 후 환불 없음, 접수 시 차감 후 terminal failure 환불을 비교한다.
- **Decision**: 정상 analysis job 접수 시 `VOCAL_ANALYSIS` 티켓을 차감한다. job은 당시 `ticketCost`와 `refundState`를 저장하고, 최종 `FAILED`에서 정확히 한 번 환불한다. retry 중에는 추가 차감/환불하지 않는다.
- **Rationale**: 사용권은 실제 작업 접수와 연결되면서도 완료 결과를 제공하지 못한 terminal failure에서 사용자를 보호한다. 기존 믹싱 refund 모델을 재사용할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: analysis job 생성과 debit을 serializable transaction으로 묶고 terminal failure에 refund state를 추가했다.
  - **DONE 전 확정 시점**: `ticketCost` snapshot, idempotent refund key, REQUIRED reconciliation을 적용해 retry 중 미환불·terminal failure 1회 환불을 보장했다. 동일 idempotency 경합 시 중복 source asset도 정리한다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: `69c51de` (`feat(F031): 회귀 검증과 문서 동기화`)
  - **PR**: -
  - **Test/Log**: vocal analysis queue/refund/idempotency 8/8 PASS; mixing debit/refund integration 1/1 PASS.
- **Consequences**: analysis worker에 refund reconciliation과 ticket ledger relation이 추가된다.

## D006: 분석 화면은 `티켓 부족 > 슬롯 만석 > 정상` 순으로 상태를 설명한다 (2026-08-15)

- **Context**: 슬롯과 티켓이 동시에 제한될 수 있다. 슬롯 만석만 강조하면 사용자가 프로필을 삭제한 뒤에도 티켓 부족으로 분석할 수 없어 불필요한 삭제를 유도할 수 있다.
- **Constraints**: 제한 상태를 disabled 버튼만으로 전달하지 않고 다음 행동을 정확히 설명해야 한다.
- **Options**: 두 오류를 동시에 동일 위계로 표시, 슬롯 우선, 티켓 부족 우선을 비교한다.
- **Decision**: 분석 티켓 부족을 가장 강한 제한으로 안내하고, 그 다음 슬롯 만석을 안내한다. 정상 상태에서는 `보컬 프로필 used/limit`과 `분석 티켓 balance`를 작게 상시 표시한다.
- **Rationale**: 티켓 부족은 프로필 삭제로 해결되지 않는 조건이므로 먼저 알려야 오해와 불필요한 삭제를 막을 수 있다.
- **Trace**:
  - **DOING 시작 시점**: VoiceScanInput에 서버 policy를 전달하고 제한 상태에서 녹음/업로드 입력 대신 명시적 상태 안내를 렌더링했다.
  - **DONE 전 확정 시점**: 티켓 0장은 분석 티켓 필요 안내만 보여주고, 슬롯 만석은 `/library?tab=profiles`의 `보컬 프로필 관리` action을 제공한다. 계정/메뉴/관리자도 분석·믹싱 티켓을 구분한다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: `69c51de` (`feat(F031): 회귀 검증과 문서 동기화`)
  - **PR**: -
  - **Test/Log**: targeted Storybook 26/26 PASS; admin UI/integration 4/4 + 1/1 PASS; 최종 Storybook 156/156 PASS.
- **Consequences**: profile workbench가 두 정책 상태를 한 API 응답에서 함께 소비한다.

## D007: 보컬 프로필 보유 상한을 제거하고 분석 티켓만 사용량 제한으로 유지한다 (2026-08-15)

- **Context**: `VOCAL_ANALYSIS` 티켓이 분석 작업 횟수를 직접 제어하므로, 별도의 보컬 프로필 슬롯 상한까지 유지하면 동일한 사용자 행동을 두 정책으로 중복 제한하게 된다.
- **Constraints**: 분석 비용·환불·active analysis 1개 제한은 유지하고, 기존 프로필 삭제·추천·믹싱 연결 계약도 깨지지 않아야 한다.
- **Options**: 기존 슬롯+티켓 이중 제한 유지, 슬롯을 매우 큰 값으로 완화, 슬롯 정책 자체 제거를 비교한다.
- **Decision**: `USER` 보컬 프로필 최대 보유 개수 제한을 제거한다. 새 분석 admission은 보유 프로필 수를 보지 않고 `VOCAL_ANALYSIS` 티켓, active analysis 충돌, 오디오 유효성만 검사한다. `VOCAL_PROFILE_MAX_USER_PROFILES`, `profileQuota`, `PROFILE_LIMIT_REACHED`도 제거한다.
- **Rationale**: 분석 티켓이 실제 비용이 발생하는 분석 사용량을 이미 정확히 제한한다. 프로필은 성공 결과의 저장 단위이므로 보유 개수 제한 없이 사용자가 필요에 따라 유지·삭제하도록 두는 편이 정책과 UX가 단순하다.
- **Trace**:
  - **DOING 시작 시점**: 사용자 구현 변경 요청을 implementation approval의 request-changes로 기록하고 T06을 추가했다.
  - **DONE 전 확정 시점**: analysis queue와 API/contract에서 프로필 개수 검사를 제거하고, UI에는 분석 티켓 잔액/비용만 남겼다. 기존 프로필 5개 보유 상태에서도 새 분석 접수와 티켓 1장 차감이 정상 동작하도록 integration으로 고정했다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: Pending T06 implementation commit
  - **PR**: -
  - **Test/Log**: vocal analysis queue 8/8 PASS; profile Storybook 11/11 PASS; lint/typecheck PASS; 최종 `pnpm test` PASS (Storybook 155/155).
- **Consequences**: D001의 슬롯 정책, D004의 슬롯 환경변수, D006의 슬롯 만석 UX는 더 이상 활성 정책이 아니다. 분석 화면에는 분석 티켓 잔액/비용만 남는다.
