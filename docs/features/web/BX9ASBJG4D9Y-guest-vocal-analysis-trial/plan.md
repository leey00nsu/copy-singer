# Implementation Plan: 비로그인 보컬 분석 1회 체험

## 개요

- **기능 ID**: BX9ASBJG4D9Y
- **대상 레포**: copy-singer-web
- **작성일**: 2026-10-29
- **상태**: Approved
- **Plan 검수**: Pending
- **Plan 검수 Evidence**: -
- **Plan 검수 Decision**: -
- **Plan 검수 Round**: -
- **Plan 검수 Spec Hash**: -
- **Plan 검수 Plan Hash**: -

## 기술 스택

기존 Next.js App Router·PostgreSQL/Prisma·Better Auth Google 인증·TanStack Query·Leemage·분석 worker를 사용한다. Redis·새 인증 공급자·봇 검증 서비스는 추가하지 않는다. Next.js의 설치된 cookies 및 Route Handler 가이드를 확인했다.

## 아키텍처

### 체험 자격과 쿠키

Better Auth의 정식 회원 세션과 별도로 HttpOnly·SameSite=Lax·운영 Secure·Path=/ 체험 쿠키를 사용한다. 임의 256-bit token의 SHA-256만 DB에 저장하고 원문은 브라우저 cookie로만 전달한다. 기존 회원용 getRequestSession/requireApiSession/requirePageSession과 회원용 admission 기본 동작을 유지한다. 새 analysis actor helper가 명시적으로 허용된 분석·결과 경로에서만 회원 또는 guest를 해석한다.

User에 isGuest(기본 false), GuestAnalysisTrial에 tokenHash(unique), guest userId(unique), 마지막 jobId(unique optional), consumedAt, expiresAt, claimedByUserId, claimedAt을 추가한다. guest User는 서버가 직접 생성하여 Better Auth 가입 지급 훅을 실행하지 않는다. 체험 쿠키는 1년 보유하며 사용 이력은 쿠키와 대응하는 DB row로 유지한다. 쿠키 삭제 우회는 승인된 제외 범위다.

회원 세션이 존재하면 항상 회원 권한이 우선한다. 익명 cookie만으로 회원 세션을 발급하거나 회원 API를 통과시키지 않는다. 체험 생성·이전 POST는 요청 Origin과 same-origin 여부를 서버에서 검증한다. 요청 제한은 신뢰 프록시 IP 또는 보수적인 공용 fallback bucket을 사용한다.

### 총량과 큐

공용 admission library에 process singleton 일일 예약 카운터를 추가한다. Asia/Seoul 날짜를 계산하고 날짜별 generation에 예약을 귀속시킨다. limit 기본 10, 0은 중지이며 서버 응답은 체험 가능 상태만 노출한다. body·외부 업로드 전에 예약하고 finally에서 미접수 예약만 반환한다. job 생성 또는 동일 idempotency job 확인 결과로 실제 생성 여부를 구분한다.

GuestAnalysisTrial row lock 아래 개인 사용 이력·활성 job을 확인하고 기존 queue transaction에 guest job 연결을 포함한다. guest ticketCost=0이며 wallet 차감 경로를 실행하지 않는다. 내부 API가 실수로 guest를 회원 티켓 경로로 enqueue하지 않도록 DB 기반 guest 검사를 유지한다. worker의 성공 transaction에서 consumedAt과 terminal+24h expiresAt을 기록한다. 실패는 consumedAt을 기록하지 않고 expiresAt만 갱신한다. guest 알림은 생성하지 않는다.

### 로그인 후 저장

결과의 CTA는 Google 로그인 callback을 /profile/save-trial로 지정한다. 로그인 후 client가 회원 세션과 기존 HttpOnly 체험 cookie로 POST /api/guest-analysis/claim을 호출하고 성공한 profile ID로 이동한다. 이전은 trial row lock 아래 단일 DB transaction으로 profile·성공 job·관련 source/synthesis asset·연결된 media operation owner를 갱신하고 회원 nextVocalProfileNumber를 원자적으로 증가시킨다. job idempotency key는 이전 전용 namespace로 바꿔 기존 회원 요청과 충돌하지 않는다.

claimedByUserId+claimedAt을 저장하여 같은 계정의 중복 요청은 같은 profile을 반환하고 다른 계정의 재사용은 거부한다. 새 계정은 기존 가입 훅에서만 혜택을 받고 기존 계정은 재지급하지 않는다. 활성 job은 이전하지 않고 안내하며 실패 시 transaction rollback으로 원본을 보존한다. 직접 결과 URL을 방문한 정식 회원이 cookie의 미이전 체험을 보유해도 자동 이전하지 않고 저장 화면으로 연결한다.

### 만료와 삭제

guest 조회·오디오·삭제는 trial의 미이전·소유권·만료 상태를 검사한다. 만료는 정리 worker가 지연되더라도 즉시 조회를 차단한다. 분석 worker runner의 주기적 유지보수에서 expired trial을 row lock으로 재확인하고 profile·recording 참조를 제거한 후 기존 durable media deletion을 예약한다. terminal job의 source 연결을 정리하며 성공 소비 이력은 남긴다. 회원 이전과 정리의 경쟁은 같은 trial lock으로 직렬화한다.

### UI

/profile은 공개 진입을 허용하고 정식 회원 세션이 없는 제품 화면에도 기존 ProductShell의 로그인 header/footer를 제공한다. 공개 policy GET에서 used/full/available 및 진행 중 job을 알려 녹음 전에 차단 상태를 표시한다. 실제 분석 제출 시에만 체험 POST로 cookie를 만들며 단순 랜딩/화면 렌더에서 guest row를 만들지 않는다. 기존 회원 API 응답은 유지하고 분석 job list의 optional guest policy를 확장한다.

VoiceScanInput은 guest일 때 무료 분석 1회·24시간 임시 보관·약관/개인정보 안내 및 무료로 분석하기를 표시한다. 결과 본문/차트/오디오는 재사용하고 회원용 rename·추천·mixing count·library 링크 대신 저장 CTA와 체험 삭제를 제공한다. 회원 저장 후 기존 결과 화면으로 복귀한다. 오류·한도 변경·로그인 취소·저장 재시도에서 준비한 결과를 유지한다.

## 파일 구조

- prisma/schema.prisma 및 새 migration: User guest flag와 GuestAnalysisTrial.
- src/entities/guest-analysis/: token·소유권·정책·terminal·이전·정리 서버 서비스와 runtime-neutral 계약.
- src/features/authentication/: 분석 actor helper만 추가, 정식 회원 세션의 기존 경계 유지.
- src/shared/lib/admission/: 단일 프로세스 일일 예약 카운터.
- src/_app/api-routes/guest-analysis/, app/api/guest-analysis/: 체험 시작과 결과 이전.
- 분석 queue·worker·runner 및 명시적인 분석/결과/오디오 route: guest 허용과 보관 정책.
- src/_pages/profile/, src/_pages/vocal-profile-detail/, src/_pages/home/, src/widgets/product-shell/: 기존 UI의 체험 모드.
- src/_pages/legal/: 실제 guest 처리와 보관 안내 동기화.
- tests/guest-analysis*.test.ts, tests/guest-analysis*.integration.ts: 승인된 관찰 계약 보호.

## Curated Documentation Impact

- **Schema**: 2
- **Assessment**: Complete
- **Product requirements**: UPDATE
- **System architecture**: UPDATE
- **Onboarding entrypoint**: NONE
- **Operational/runtime contract**: UPDATE
- **Reason**: 익명 분석 예외·일일 한도·소유권 이전·보관 계약을 PRD와 아키텍처에 반영한다. 운영 설정은 .env.example에 추가한다. README는 사용자 수정 요청이 없어 보호하며 기존 문서 정책 위반은 decisions.md의 기록에 따라 보류한다.
- **Targets**: docs:prd/copy-singer-prd.md, docs:prd/system-architecture.md, project:.env.example

## Additional Curated Impacts

- **Assessment**: Complete
- **Decision**: DECLARED

| Kind | Decision | Target | Reason |
| ---- | -------- | ------ | ------ |
| security-privacy | UPDATE | project:src/_pages/legal/ui/privacy-page.tsx | 체험 cookie·임시 보관·계정 저장의 실제 처리 안내 |
| security-privacy | UPDATE | project:src/_pages/legal/ui/terms-page.tsx | Google 로그인 전 체험 제공 범위와 보관 안내 |
| other-curated | UPDATE | docs:designs/design-system.md | 기존 감사 실패를 만드는 Feature 이력 참조만 제거, 디자인 규칙·UI 변경 없음 |
| other-curated | UPDATE | docs:designs/page-redesign-analysis.md | 문서 kind와 과거 Feature 참조 정규화 |
| other-curated | UPDATE | docs:designs/product-ui-redesign.md | 과거 Feature 참조만 정규화 |
| other-curated | UPDATE | docs:designs/generated/page-redesigns/v2-style-lock.md | 현재 감사에서 요구하는 문서 kind 선언 |

PRD의 기존 F032 참조도 과거 작업 ID 대신 유지해야 할 시각 요구사항 표현으로 정규화한다. docs/designs/README.md는 보호된 기존 README이므로 미수정 사유를 decisions.md에 남긴다. OpenWiki 생성물은 수정하지 않는다. 명시된 디자인 문서 변경은 metadata·작업 추적 제거이며 디자인 정책 재설계가 아니다.

## Verification Contract

### 변경 분류

- **유형**: HIGH_RISK
- **위험도**: HIGH

### 관찰 가능한 계약

- **지원해야 하는 동작**: 로그인 없는 최초 분석, 최대 10건 접수, 본인 결과/오디오 열람, 기존·신규 회원의 멱등적 저장, 만료 정리.
- **전제조건**: migration 적용, 단일 웹 프로세스, 기존 DB/Leemage/Modal·worker 설정.
- **성공 후 보장**: 성공한 guest는 재체험할 수 없고 회원 자료는 기존 정책으로 접근한다. 기존 회원 ticket 원장은 보존한다.
- **중요한 실패 후 보장**: 미접수 시 수량 반환, terminal failure 시 개인 기회 복구, 저장/정리 실패 시 자료 상태·삭제 의도 복구 가능.
- **의도적으로 지원하지 않는 사례**: 쿠키 삭제/다른 기기 동일인 검출, 분산 한도, 실제 OAuth 제공자·유료 Modal에 대한 자동 end-to-end 실행.

### 테스트 결정

| 계약 / 요구사항 | 결정 | 테스트 수준 | 보호할 현실적인 회귀 | 독립적인 Oracle |
| --- | --- | --- | --- | --- |
| FR-1/FR-2 quota | ADD | 단위 | 마지막 자리 동시 예약·KST 자정·이전 generation release·0·서버 재시작 | 정해진 시각과 허용 개수, 새 counter 인스턴스 |
| FR-1/FR-3 권한 | ADD | 통합 | guest로 회원 경로 통과·다른 guest 조회·signup grant 오지급 | 실제 Request/cookie·DB owner·기존 회원 경로 응답 |
| FR-1/FR-2 queue | ADD | 통합 | 별도 key 동시 분석·재전송 이중 차감·실패 후 재시도 | 실제 DB job 수·ticket ledger·guest consumedAt |
| FR-4 저장 | ADD | 통합 | 기존 번호/자료 덮어쓰기·중복 이전·잘못된 사용자 이전·원장 변조 | 두 회원 fixture의 profile ID·소유권·번호·원장 snapshot |
| FR-5 만료 | ADD | 통합 | 정리 전 expired 음성 공개·claim/cleanup 경쟁·삭제 후 재체험 | 고정 expiresAt·원본 참조/삭제 operation·소비 이력 |
| US-1/US-2/US-3 UI | ADD | UI/SSR | 무료 체험의 ticket 요구·결과 가림·마감 후 녹음 제공 | 렌더된 accessible action/카피와 서버 policy |
| 기존 route/query/worker | UPDATE | 통합/단위 | 회원 동작과 schema·폴링·알림 회귀 | 기존 fixture와 명시적 기존 기대값 |

### 의도적으로 제외하는 테스트

- private 함수 호출순서·구현 복제, 세부 CSS snapshot, 실제 Google 계정/비용이 드는 Modal 호출.
- 디자인 metadata 정규화에는 제품 테스트를 추가하지 않고 docs audit와 diff 검사로 검증한다.

### 검증 실행

- **구현 중**: pnpm exec prisma validate/generate, 해당 quota/guest/API/worker/UI 테스트 및 tsc/architecture.
- **태스크 완료 전**: 각 task의 독립 observable 계약 검사, git diff --check, commit-audit와 workflow-audit.
- **Feature 완료 전**: 설정된 pnpm test, pnpm run lint, pnpm exec tsc --noEmit. pnpm test가 build·DB 통합·Storybook을 포함하므로 성공한 build를 별도로 반복하지 않는다.
- **수동/UI 검증**: Storybook/SSR로 available·used·full·결과 저장 상태를 검증하고, 가능한 로컬 preview에서 공개 profile 접근과 정식 회원 gate를 확인한다. 실제 OAuth 제공자 검증 여부를 결과에 명확하게 기록한다.
- **전체 테스트 필요 여부**: Yes — 인증/queue/worker/오디오와 공용 shell 경계가 함께 바뀐다.

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
