# Feature Spec: auth-owned-mixing-queue

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F008
- **기능명**: auth-owned-mixing-queue
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-06
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

현재 Copy Singer의 프로필과 추천·합성 데이터에는 사용자 소유권이 없고 합성 진행은 추천 화면의 현재 세션에 결합되어 있다. Google OAuth로 사용자 경계를 만들고, 분석용 레퍼런스와 합성 결과를 Leemage에 영구 저장하며, 티켓으로 접수한 믹싱을 PostgreSQL 영속 큐와 별도 worker에서 처리한다. 사용자는 재접속 후에도 마이 페이지와 믹싱 히스토리에서 잔액·사용 내역·작업 결과를 확인하고, 관리자는 제한된 운영 화면에서 사용자·티켓·작업 상태를 관리한다.

### 포함 범위

- Better Auth Google OAuth 로그인과 인증 세션
- 사용자 소유 보컬 프로필·추천 실행·믹싱 작업
- Leemage 레퍼런스 및 결과 오디오 업로드·조회·삭제
- 티켓 잔액과 불변 원장, 가입 지급, 믹싱 차감과 조건부 환불
- PostgreSQL 영속 믹싱 큐와 별도 백그라운드 worker
- 믹싱 히스토리, 마이 페이지 티켓 내역, 관리자 페이지
- 관련 env 예제와 로컬 실행 문서

### 제외 범위

- 티켓 구매, 결제, 구독과 프로모션 코드
- Google 이외 OAuth 공급자와 이메일/비밀번호 로그인
- 사용자 간 파일·프로필·결과 공유
- 관리자 역할 편집 UI와 복수 역할 체계
- 원곡 및 중간 stem의 Leemage 영구 저장
- 프로덕션 배포와 worker 인프라 프로비저닝

---

## 사용자 스토리

### US-1: Google 계정으로 안전하게 사용

**As a** Copy Singer 사용자  
**I want** Google 계정으로 로그인하고 내 데이터만 사용하고 싶다  
**So that** 내 음성과 분석·합성 결과가 다른 사용자와 섞이지 않는다

**Acceptance Criteria:**

- [ ] Google OAuth 이외의 로그인 방법은 노출되거나 활성화되지 않는다.
- [ ] 비로그인 사용자가 보호 화면/API에 접근하면 로그인 안내 또는 401을 받는다.
- [ ] 로그인 사용자는 자신이 소유한 프로필·추천·믹싱·티켓만 조회할 수 있다.
- [ ] 신규 사용자는 설정된 가입 티켓을 정확히 한 번 받는다.

### US-2: 프로필 음성 재사용

**As a** 보컬 프로필을 만든 사용자  
**I want** 분석에 사용한 음성을 다시 업로드하지 않고 믹싱에 사용하고 싶다  
**So that** 나중에 돌아와서도 원하는 추천 곡을 바로 합성할 수 있다

**Acceptance Criteria:**

- [ ] 분석 성공 후 표준화된 reference 오디오가 Leemage에 저장되고 프로필에 귀속된다.
- [ ] PostgreSQL과 프로젝트 저장소에는 오디오 바이너리를 저장하지 않는다.
- [ ] 프로필 삭제는 Leemage 파일 삭제를 함께 요청하고 실패 시 재시도 상태를 남긴다.

### US-3: 티켓으로 믹싱 접수

**As a** 티켓을 보유한 사용자  
**I want** 추천 곡의 AI 믹싱을 티켓으로 접수하고 싶다  
**So that** 비용과 사용량을 예측할 수 있다

**Acceptance Criteria:**

- [ ] 접수 전에 비용과 잔액을 표시하고 믹싱 1회에 설정된 티켓 수를 차감한다.
- [ ] 큐 생성과 티켓 차감은 원자적이며 중복 요청은 추가 작업·차감을 만들지 않는다.
- [ ] Modal 접수 전 시스템 실패만 자동 환불하며 원장에 차감과 환불이 모두 남는다.
- [ ] 잔액 부족 시 작업을 생성하지 않고 필요한 티켓 수를 안내한다.

### US-4: 백그라운드 믹싱과 히스토리

**As a** 믹싱을 접수한 사용자  
**I want** 페이지를 떠나도 작업이 계속되고 나중에 결과를 찾고 싶다  
**So that** 긴 GPU 작업을 화면에서 계속 기다리지 않아도 된다

**Acceptance Criteria:**

- [ ] 별도 worker가 영속 큐에서 작업을 점유하고 Modal 진행 상태를 DB에 반영한다.
- [ ] 웹·worker 재시작 또는 브라우저 종료 후에도 작업과 티켓 상태가 보존된다.
- [ ] `/mixing-history`는 프로필·추천 화면과 독립적으로 사용자 작업을 최신순 목록과 상세 상태로 보여준다.
- [ ] 성공 결과는 Leemage 저장 완료 후 재생·다운로드 가능하며 다른 사용자는 URL API에 접근할 수 없다.

### US-5: 티켓 내역 확인

**As a** 로그인 사용자  
**I want** 내 잔액과 티켓 변동 내역을 확인하고 싶다  
**So that** 어떤 작업에서 티켓을 받거나 사용했는지 이해할 수 있다

**Acceptance Criteria:**

- [ ] 마이 페이지는 Google 프로필 정보, 현재 잔액과 최신순 원장을 표시한다.
- [ ] 각 원장은 지급·사용·환불·관리자 조정 유형, 변화량, 설명, 관련 작업과 시각을 표시한다.
- [ ] 목록은 서버 페이지네이션을 제공한다.

### US-6: 운영 상태 관리

**As a** 관리자  
**I want** 사용자, 티켓과 믹싱 작업 상태를 한 화면에서 확인하고 싶다  
**So that** 장애와 고객 지원 요청을 처리할 수 있다

**Acceptance Criteria:**

- [ ] `ADMIN_EMAILS` allowlist 사용자만 `/admin`과 관리자 API에 접근한다.
- [ ] 관리자는 사용자·믹싱 작업을 검색·필터하고 주요 상태 집계를 볼 수 있다.
- [ ] 관리자는 필수 사유와 함께 티켓을 지급 또는 회수할 수 있고 그 내역은 관리자 식별자와 함께 원장에 남는다.
- [ ] 관리자는 사용자 reference 오디오를 직접 재생하거나 다운로드하는 기능을 제공받지 않는다.

---

## 기능 요구사항

### FR-1: Better Auth Google OAuth

- Better Auth의 Prisma adapter와 Next.js App Router handler를 사용한다.
- `socialProviders.google`만 구성하고 이메일/비밀번호 로그인을 비활성화한다.
- 제품 API는 서버에서 세션을 조회하고 사용자 ID를 요청 본문이 아닌 세션에서 결정한다.
- Google OAuth callback은 `${BETTER_AUTH_URL}/api/auth/callback/google`을 사용한다.

### FR-2: 사용자 소유 데이터

- `VocalProfile`, `RecommendationRun`, `MixingJob`, `TicketLedger`에 사용자 소유 관계를 둔다.
- 곡 카탈로그 프로필은 공용 artifact로 유지하고 사용자 프로필과 구분한다.
- 기존 소유자 없는 개발 fixture는 자동 귀속하지 않으며 로그인 제품 목록에서 제외한다.

### FR-3: Leemage 저장 계약

- 서버는 `Authorization: Bearer <LEEMAGE_API_KEY>`로 `POST /api/v1/projects/{projectId}/files/presign`을 호출한다.
- 반환된 presigned URL에 파일을 업로드한 뒤 `POST /files/confirm`으로 Leemage 파일 레코드를 확정한다.
- reference는 분석 성공 후 표준 WAV를 저장하고, 결과는 Modal 성공 응답을 스트리밍하여 저장한다.
- 파일 삭제는 `DELETE /api/v1/projects/{projectId}/files/{fileId}`를 사용한다.
- 429의 `Retry-After`와 일시적 5xx를 제한된 재시도 대상으로 취급한다.
- 부분 실패는 orphan cleanup 대상 또는 upload retry 상태로 기록한다.

### FR-4: 오디오 접근과 생명주기

- 일반 사용자의 reference 오디오는 믹싱 worker만 읽을 수 있고 UI 재생·다운로드 endpoint를 제공하지 않는다.
- 결과 재생·다운로드 요청은 세션 및 `MixingJob.userId` 소유권을 검증한 뒤 제공한다.
- reference는 연결된 프로필 삭제 시, 결과는 믹싱 이력 삭제 시 Leemage에서 삭제한다.
- 관리자 페이지는 reference 파일의 메타데이터와 정리 상태만 표시한다.

### FR-5: 티켓 원장

- 가입 지급액과 믹싱 비용은 각각 `SIGNUP_TICKET_GRANT`, `MIXING_TICKET_COST` env의 0 이상 정수다.
- 가입 지급은 사용자 ID 기반 unique idempotency key로 한 번만 생성한다.
- 티켓 원장은 `SIGNUP_GRANT`, `MIXING_DEBIT`, `MIXING_REFUND`, `ADMIN_ADJUSTMENT` 유형을 지원한다.
- 관리자 회수는 잔액을 음수로 만들 수 없으며 모든 조정에 비어 있지 않은 사유가 필요하다.

### FR-6: 원자적 믹싱 접수

- 요청은 사용자, 보컬 프로필, 곡, recommendation item과 client idempotency key를 검증한다.
- 하나의 DB 트랜잭션에서 잔액을 조건부 차감하고 debit 원장과 `MixingJob(pending)`을 생성한다.
- 같은 사용자·idempotency key 재요청은 기존 작업을 반환한다.
- Modal job ID가 저장되기 전 실패한 작업은 하나의 unique refund 원장으로만 환불한다.

### FR-7: 영속 큐와 worker

- Next.js 요청 프로세스는 작업을 직접 완료할 때까지 점유하지 않고 접수 후 즉시 job ID를 반환한다.
- 별도 `pnpm worker:mixing` 프로세스가 PostgreSQL에서 처리 가능한 작업을 원자적으로 claim한다.
- 작업 상태는 `pending`, `preparing`, `submitted`, `processing`, `succeeded`, `failed`, `canceled`를 사용한다.
- lease/heartbeat와 제한된 attempt를 저장해 worker 종료 후 orphan 작업을 다시 처리한다.
- 대상 원곡과 중간 파일은 작업별 OS 임시 디렉터리에서만 사용하고 `finally`에서 삭제한다.
- Modal 접수 이후 상태 조회는 외부 job ID로 재개 가능해야 한다.

### FR-8: 믹싱 히스토리

- `/mixing-history`는 로그인 사용자의 작업을 최신순, 서버 페이지네이션으로 조회한다.
- 상태, 곡/아티스트, 사용 프로필, 티켓 비용, 생성·시작·완료 시각과 오류 요약을 제공한다.
- active 상태는 제한된 주기로 갱신하되 화면 폴링이 worker 처리의 전제조건이 되어서는 안 된다.
- 결과 오디오가 준비되면 목록 또는 상세에서 재생·다운로드할 수 있다.

### FR-9: 마이 페이지와 관리자 페이지

- `/account`는 Google 프로필, 티켓 잔액과 사용자 원장을 제공한다.
- `/admin`은 사용자 수, 작업 상태, 최근 실패, 티켓 변동 집계와 검색 가능한 사용자·작업 목록을 제공한다.
- 관리자 티켓 조정 API는 관리자 세션, 대상 사용자, signed integer amount, reason을 검증한다.
- 관리자 권한은 대소문자를 정규화한 email을 `ADMIN_EMAILS`의 comma-separated allowlist와 비교한다.

### FR-10: 설정과 로컬 실행

- `.env.example`에 secret 값 없이 필요한 키와 안전한 기본 상수를 문서화한다.
- 필수 env 누락 또는 정수 상수 오류는 서버 시작/해당 기능 진입 시 명시적인 설정 오류로 실패한다.
- 최소 env는 `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS`, `LEEMAGE_BASE_URL`, `LEEMAGE_API_KEY`, `LEEMAGE_PROJECT_ID`, `SIGNUP_TICKET_GRANT`, `MIXING_TICKET_COST`, `MIXING_WORKER_CONCURRENCY`, `MIXING_MAX_ATTEMPTS`, `MIXING_LEASE_SECONDS`다.
- 기존 Docker Compose PostgreSQL로 웹과 worker를 함께 로컬 검증할 수 있어야 한다.

(상세 설명)

---

## 비기능 요구사항

- **성능**: history·ledger·admin 목록은 서버 페이지네이션과 조회 인덱스를 사용한다. worker 동시성은 env로 제한한다.
- **내구성**: 작업 접수와 티켓 원장은 트랜잭션으로 보존하며 worker 재시작 후 lease가 만료된 작업을 복구한다.
- **보안**: OAuth, Modal, Leemage secret은 서버 전용이며 모든 사용자/관리자 API는 세션과 소유권을 검증한다.
- **개인정보**: reference 오디오는 사용자 UI 및 관리자 UI에서 재생하지 않으며 삭제 요청과 외부 삭제 실패 재시도를 지원한다.
- **관측성**: 작업 attempt, last error, 외부 job/file ID, 상태 전이 시각을 보관하되 secret과 presigned URL은 로그에 남기지 않는다.
- **품질**: Prisma validate, migration 검증, 단위·통합 테스트, TypeScript, ESLint와 production build를 통과한다.

---

## 관련 문서

- PRD: `../../prd/`
- PRD Refs: `PRD-US-010`, `PRD-US-011`, `PRD-US-012`, `PRD-US-013`, `PRD-US-014`, `PRD-FR-023`, `PRD-FR-024`, `PRD-FR-025`, `PRD-FR-026`, `PRD-FR-027`, `PRD-FR-028`, `PRD-FR-029`, `PRD-FR-030`, `PRD-FR-031`, `PRD-FR-032`, `PRD-FR-033`, `PRD-FR-034`, `PRD-FR-035`, `PRD-FR-036`, `PRD-FR-037`, `PRD-FR-038`, `PRD-DATA-008`, `PRD-DATA-009`, `PRD-DATA-010`, `PRD-NFR-009`, `PRD-NFR-010`, `PRD-NFR-011`
