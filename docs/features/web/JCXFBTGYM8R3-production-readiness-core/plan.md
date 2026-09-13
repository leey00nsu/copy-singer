# Implementation Plan: production-readiness-core

## 개요

- **기능 ID**: JCXFBTGYM8R3
- **대상 레포**: copy-singer-web
- **작성일**: 2026-09-13
- **상태**: Approved
- **Plan 검수**: Pending
- **Plan 검수 Evidence**: -
- **Plan 검수 Decision**: -
- **Plan 검수 Round**: -
- **Plan 검수 Spec Hash**: -
- **Plan 검수 Plan Hash**: -

## 기술 스택

기존 Next.js/TypeScript, PostgreSQL/Prisma, Python/Modal을 유지한다. Redis와 별도 queue 제품은 추가하지 않는다.

## 아키텍처와 구현 순서

1. 공통 시간 예산과 DB pool, worker lease/deadline 데이터, 업로드 intent 및 가입 지급 intent를 additive migration으로 추가한다. 기존 job은 기존 상태/관계를 유지한다.
2. 세션에서 가입 지급을 제거한다. 신규 가입은 양쪽 지급량을 하나의 transaction으로 snapshot하고, 종류별 기존 가입 idempotency key로 지급한다. 운영 CLI는 user/kind/amount/reason/operator 필수, 기본 dry-run, --apply만 쓰기. 기존 ledger를 수정하지 않는다.
3. 외부 업로드 전에 intent를 생성하고 presign identity를 PUT 전에 저장한다. 성공 asset 연결과 intent 완료는 동일 transaction에 둔다. cleanup은 외부 호출 전 DB에 기록하며 사용자 asset/catalog target을 모두 지원한다. 프로필 삭제와 믹싱 접수는 같은 profile row lock으로 직렬화한다. 외부 파일 삭제는 참조가 제거되고 intent가 확정된 뒤 수행한다.
4. 세 worker에 주기 heartbeat, transaction 내부 lease fencing, 마지막 시도 만료 회수를 적용한다. 오래된 worker는 결과/오류/환불을 확정할 수 없다. 확정된 FAILED 뒤 재활성화하지 않는다. 외부 제출 직전 상태를 영속하고 request ID와 입력 fingerprint를 전송한다. Modal은 조건부 claim 뒤 한 번 spawn하며 claim 뒤 crash는 재-spawn하지 않고 불명 상태로 유지한다. 새 사용자 key는 새 job/request ID다.
5. 인증 사용자 기준 비용별 token bucket과 body 전 upload slot, DB advisory lock 아래 per-user/global queue cap을 적용한다. 정상 응답 payload와 polling 주기를 유지한다. 제한은 429 + Retry-After, 전역 수용량은 503 + Retry-After다.
6. 격리 DB/fake dependency의 경쟁·crash·정상 회귀 검증, 실행 가능한 k6 시나리오와 운영 절차를 완성한다.

## 시간과 수용량 기본값

- DB pool 프로세스당 5, connection timeout 5초, statement/query timeout 30초, idle transaction timeout 30초. 웹+3 worker 기본 최대 20개이며 운영 DB 한도에서 여유를 둔다.
- metadata HTTP 15초/시도, 파일 전송 120초, FFmpeg 120초. Leemage 전체 업로드 180초. 멱등 DELETE/조회만 최대 3회 backoff; 확인되지 않은 presign/confirm 자동 재시도 금지.
- 보컬 전체 처리 15분, 믹싱/곡 분석 75분. 외부 제출 불명은 3회/5분 이내 자동 확인 후 종료한다. deadline은 DB에 영속해 재시작으로 늘어나지 않는다.
- lease heartbeat는 lease의 1/3 이하(최대 30초). 영속 갱신 실패/소유권 유실은 외부 작업 signal을 중단하고 상태 쓰기를 차단한다. runner transient 오류 backoff 1~30초; 종료 신호 후 claim 중단, 진행 작업은 예산 내 정리 후 disconnect.
- 기본 큐 cap: 보컬 사용자 1/전체 20, 믹싱 사용자 3/전체 20, 곡 분석 전체 50. DB 직렬화 구간에서 idempotency 재검사 후 cap/차감/생성한다.
- token bucket: 접수 6회/분 burst 3, 추천 30회/분 burst 10, 일반 조회 180회/분 burst 60, 오디오 240회/분 burst 60, 관리자 고비용 10회/분 burst 3. 분석 polling과 믹싱/알림 polling을 합쳐도 일반 정상 흐름을 수용한다. 슬롯 기본 2개/프로세스, 사용자 1개, 업로드 request 예산 180초.
- 환경값으로 조정 가능하되 잘못된 0/음수/과대값을 시작 때 거부한다. 사용자 제한은 IP와 독립적이다. 명시적으로 trusted ingress가 지정한 단일 client IP 헤더만 보조 IP 제한에 사용한다. 기본은 forwarded header를 신뢰하지 않는다. local limiter는 프로세스별이며 다중 웹 인스턴스 운영 시 shared limiter가 필요하다.

## Provider 계약 근거와 한계

- Modal 공식 Dict reference: https://modal.com/docs/sdk/py/latest/Dict — put(skip_if_exists=True)는 존재 시 False를 반환한다. 공식 guide https://modal.com/docs/guide/dicts 에서 7일 미접근 만료를 명시한다. 자동 재전송 예산은 5분 이내이고 terminal job을 다시 제출하지 않으므로 이를 무기한 idempotency 저장소로 주장하지 않는다. spawn과 Dict의 분산 transaction은 없으며 claim 후 spawn 응답 유실은 불명 처리한다.
- Leemage 근거: src/shared/media/client.ts의 presign → PUT → confirm 및 DELETE 계약. 2026-09-13 공개 /api/v1/openapi.json GET은 404였고 workspace에 provider backend가 없다. client identity/예약 조회/미확정 object TTL/confirm 반복 의미는 **확인 불가**. presign과 confirm은 자동 재요청하지 않는다. 알려진 identity DELETE 404는 호출자 관점에서 이미 없는 파일로 처리한다; identity 없는 예약 만료를 추정하지 않는다.
- identity 없는 intent는 UNRESOLVED로 남겨 운영 CLI에서 목록/해결 근거를 기록한다. 알려진 identity는 cleanup 재시도 대상이다. 예약 identity DELETE가 provider에서 지원되는지는 확인 불가이므로 실패 상태와 운영자 확인을 보존한다.

## 파일 구조

- src/shared/db, src/shared/config, prisma/schema.prisma 및 migration: pool·durable 상태.
- src/shared/lib 또는 shared runtime slice: deadline/lease/limiter 공통 도구.
- src/entities/ticket, src/features/authentication, scripts: 가입 snapshot/운영 복구.
- src/shared/media, catalog asset 서비스, 프로필·믹싱 삭제: intent/cleanup.
- src/_app/background-jobs, features enqueue, services/*/modal_app.py: queue fencing/제출 계약.
- src/_app/api-routes: 인증 후 body 전 admission wrapper.
- tests, scripts, .env.example, Feature 문서: 회귀·부하 시나리오·운영 계약.

## 배포 및 rollback

기존 데이터가 있는 복제 fixture에 additive migration → Prisma generate → Modal 새 계약 배포 → 새 웹/worker를 적용한다. 실제 서비스에서는 구 worker를 drain/정지한 뒤 신 worker를 시작한다. 구 Modal은 신 제출 dedupe를 보장하지 않으므로 배포 전환 검증 없이 운영 완료라 하지 않는다. 구 앱 rollback 시 새 보호 기능은 사라지므로 먼저 신규 접수를 막고 worker를 drain한다. 추가 column/table은 즉시 drop하지 않는다. migration 실패 시 트래픽을 열지 않고 상태를 확인한다. 실제 원격 배포와 실제 사용자 데이터 복구는 이번 로컬 검증에 포함하지 않는다.

## Curated Documentation Impact

- **Schema**: 2
- **Assessment**: Complete
- **Product requirements**: UPDATE
- **System architecture**: UPDATE
- **Onboarding entrypoint**: NONE
- **Operational/runtime contract**: UPDATE
- **Reason**: 승인한 운영 안정성 요구와 신규 intent/timeout/admission/복구·배포 계약을 상위 문서에 반영한다.
- **Targets**: docs:prd/copy-singer-prd.md, docs:prd/system-architecture.md, project:.env.example, project:tests/e2e/TESTING.md

## Additional Curated Impacts

- **Assessment**: Complete
- **Decision**: NONE


사용자 요청에 따라 루트 README는 변경하지 않는다. E2E 실행 문서만 추가한다. 별도 정책·디자인·보안 문서의 변경은 범위에 없으며 이번 운영 변경은 위 architecture/env 및 Feature 문서에 포함한다. 확인한 constitution/custom 원칙은 유지한다.

## Verification Contract

### 변경 분류

- **유형**: HIGH_RISK
- **위험도**: HIGH

### 관찰 가능한 계약

- **지원해야 하는 동작**: 기존 로그인·분석·추천·믹싱·알림·오디오·티켓 정상 흐름과 소유권 검증.
- **전제조건**: 격리 PostgreSQL, 합성 fixture, 외부 HTTP/Modal fake. 실제 GPU/스토리지 호출 없이 실패를 주입한다.
- **성공 후 보장**: 한 접수 한 차감, 새 가입 snapshot 한 번 지급, 현 lease만 상태 확정, 사용 중 파일 보존.
- **중요한 실패 후 보장**: 제한 시간 내 활성 슬롯 반환, spec 환불 표 유지, cleanup/불명 intent 추적, 취소 후 자원 반환.
- **의도적으로 지원하지 않는 사례**: 식별 불가 provider object의 자동 삭제 보장, 다중 웹 프로세스 공유 rate limit, 무제한 업로드/실제 RPS 보장.

### 테스트 결정

| 계약 / 요구사항 | 결정 | 테스트 수준 | 보호할 현실적인 회귀 | 독립적인 Oracle |
| --- | --- | --- | --- | --- |
| AC01–03/16 | ADD | 격리 DB 통합·Python 단위 | 마지막 lease crash, 오래된 worker 확정, spawn 응답 유실 | 영속 상태/원장/외부 spawn 횟수 |
| AC04–05 | ADD | 단위·통합 | 무응답 HTTP/DB/subprocess, runner 종료 | 기한 내 취소/lease 및 자원 해제 |
| AC06–09 | ADD | 단위·격리 DB 통합 | body 전 거절, 동시 cap 초과, XFF 우회 | body 읽기 횟수/최종 job 수/429 헤더 |
| AC10–12/17 | UPDATE | 격리 DB 통합 | 삭제 경쟁, DB 실패, presign 유실 | 참조 asset 보존/intent/삭제 호출 |
| AC13–15/18 | UPDATE | 격리 DB 통합 | 정책 변경 로그인, 부분 지급 동시 복구 | 불변 ledger와 명시 amount |
| 정상 흐름/권한 | UPDATE | 기존 단위·통합 | 응답 형태/소유권/환불/알림 변경 | 기존 assertions |
| 부하 시나리오 | ADD | 비테스트 스크립트 | 실데이터/유료 AI 오접수 | localhost opt-in, 조회 위주 10/50/100 RPS·500 burst |

### 의도적으로 제외하는 테스트

실사용 endpoint 부하와 GPU paid test, provider 미지원 API fake, CSS snapshot 및 framework 자체 동작 테스트는 추가하지 않는다.

### 검증 실행

- **구현 중**: 각 task의 격리 DB integration 및 단위 테스트, prisma validate/generate, Python compile/unit.
- **태스크 완료 전**: 변경 관련 tests + typecheck, diff/secret 검토. schema는 빈 DB migration과 이전 schema fixture 업그레이드 검사.
- **Feature 완료 전**: 설정된 pnpm test(build 포함), pnpm run lint, pnpm exec tsc --noEmit. 신규 backend/Python 검사는 package test 경로에 포함한다. pnpm run check로 구조/format도 확인한다.
- **수동/UI 검증**: API 정상 응답/poll/Range 회귀를 기존 tests로 확인. 실제 외부 AI 사용자 흐름은 미실행 사실을 기록한다.
- **전체 테스트 필요 여부**: Yes — 인증·티켓·자산·큐 공통 경로 변경. build는 pnpm test에 포함되어 별도 반복하지 않는다.

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)


## 사용자 요청 추가: 동일 E2E의 변경 전후 비교

- 기존 승인된 Feature의 검증을 확장하는 T07로 관리한다. production 기능 변경을 목적으로 하지 않으며 E2E에서 회귀를 발견하면 근거와 함께 범위 내 수정한다.
- Playwright Chromium, 실제 Next production server 및 worker, 전용 임시 DB, 로컬 HTTP provider를 사용한다. 기존 playwright 패키지를 활용하고 앱 API route mocking은 금지한다.
- b333d64의 source snapshot과 현재 Feature를 같은 테스트/fixture로 순차 실행한다. 변경 전 앱 코드를 테스트 통과용으로 수정하지 않는다. baseline과 candidate 결과를 구분하고 기존 결함을 동일성 기준으로 고착하지 않는다.
- 초기 세션만 DB fixture 및 서명 cookie로 준비하고 이후 auth/session/로그아웃은 실제 구현을 거친다. Google OAuth, 실제 GPU/스토리지 신뢰성은 이 E2E로 검증했다고 기록하지 않는다.
- localhost 전용 테스트 DB/HTTP, 별도 포트, 프로세스 정리, 실패 trace/screenshot/report를 제공한다. artifact에 fixture 정보만 포함한다.
- CI는 PR마다 핵심 E2E를 실행한다. 새 테스트/fixture/CI/실행 도구에 대한 정적 검사와 양쪽 실행 결과를 검증한다. 운영 안내는 tests/e2e 문서로 두고 README는 유지한다.

## T08 검증 확장 (사용자 요청)

- Decision: UPDATE — 기존 E2E suite/seed/provider를 보강한다. 앱 코드는 우선 유지한다.
- 별도 계정과 제어 가능한 provider 진행 상태를 사용한다. 실제 HTTP 응답, 화면, 잔액 및 provider 호출 수를 oracle로 삼는다. 관리자 주요 동작은 사용자 조회와 티켓 조정으로 한정한다.
- 동일 suite를 b333d64와 candidate에서 실행한다. 기존 결함은 실패로 기록하고 새 코드의 의도적 변경과 구분한다. 정적 검사와 production build는 비교 runner에 포함하며 앱 수정이 없으면 이미 통과한 전체 단위 suite를 반복하지 않는다.
