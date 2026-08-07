# Tasks: auth-owned-mixing-queue

## 태스크 규칙

- **상태**: `[TODO]` → `[DOING]` → `[DONE]`
- **태스크 공유 / 확인**:
  - `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 `tasks.md`에서 상태를 함께 갱신합니다
  - `[DOING] → [DONE]`: 완료 전 결과/검증을 공유하고 같은 수정에서 `Acceptance`와 `Checklist`를 함께 갱신합니다
  - 태스크 상태 변경 전에 승인이 필요한 경우는 문서화된 review checkpoint 또는 원격/파괴적 작업 직전뿐입니다.
  - 워크플로우가 요구하지 않는 standalone `OK` 승인 단계는 만들지 않습니다.
  - 해당 태스크의 `Checklist`에 unchecked 항목이 남아 있으면 `[DONE]`으로 전환하지 않습니다.
- **PRD 매핑(권장)**: 각 태스크 라인에 `[PRD-FR-001]` 또는 `[PRD-SCOPE-V1-DESKTOP-EDITOR]` 같은 기존 PRD 요구사항 ID 태그를 추가하거나, PRD와 무관한 태스크는 `[NON-PRD]`로 표시하세요.
  - 단, `tasks.md`에서 PRD ID를 임의로 만들지 마세요. `docs/prd` 또는 상위 요구사항 문서에 먼저 정의된 ID만 참조해야 합니다.
  - 레거시 문서에 아직 PRD ID가 없다면, 먼저 원문 요구사항 문서에 ID를 backfill한 뒤 `spec.md`의 `PRD Refs`와 태스크 태그를 함께 맞추세요.
  - `[NON-PRD]`는 내부 구현 작업 전용입니다. 사용자 동작, acceptance criteria, 범위가 바뀌는 태스크라면 PRD를 먼저 backfill하고 `[PRD-...]`로 태깅하세요.

---

## 로컬 추적 정보
- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/auth-owned-mixing-queue`
- **대기 중 변경 요청**: -
  - 구현 중 새로 수용한 사용자 요청을 잠시 표시하는 sync marker입니다
  - 요청을 `tasks.md`와 관련 문서에 반영한 뒤 값을 비우세요
  - pre-PR 리뷰 handoff를 시작하면 `Running`, 리뷰 결과 기록까지 끝나면 `Done`으로 변경
  - 형식: `결정: approve|changes_requested|blocked ...` (또는 `decision: ...`)
  - PR 생성 전 최종 통과 기준은 `approve`
  - 기본 베이스라인으로 `agents/skills/create-pr.md`(`Pre-PR 기본 체크리스트`) 기준을 따르세요
- **PR 리뷰**: -
  - PR 리뷰 handoff를 시작하면 `Running`, 팀에서 별도 완료 상태를 추적할 때만 `Done`으로 변경
- **PR 리뷰 Evidence**: -
  - 리뷰 지적사항을 왜/어떻게 반영했는지 `결정: ...`(또는 `decision: ...`) 형식으로 기록

---

## 태스크 엔트리 포맷

```markdown
- [TODO][PRD-FR-001] T-{feature-ref}-01 {태스크 제목}
  - Date: YYYY-MM-DD
  - Acceptance:
    - (검증 조건)
  - Checklist:
    - [ ] (서브 태스크)
```

> 위 예시의 `PRD-FR-001`은 가능한 `PRD-*` key 중 하나일 뿐입니다. 아직 PRD 원문에 정의되지 않았다면 태스크에 먼저 넣지 마세요.
> 처음엔 탐색/내부 작업이었더라도 제품 요구사항 변경으로 이어졌다면, `NON-PRD`로 두지 말고 PRD를 먼저 갱신한 뒤 `[PRD-...]`로 재태깅하세요.

---

## 태스크 목록

> 아래에 태스크를 추가하세요. **최소 1개가 필요**합니다.
> 태스크는 하나의 순차 리스트로 유지하고, 위에서 아래 순서 자체를 실행 우선순위로 취급하세요.
> 새 태스크 append에는 `npx lee-spec-kit task add <feature-ref> --title "..." --ref NON-PRD --acceptance "..." --check "..."` 사용을 우선하세요.
> 새 태스크는 마지막 기존 태스크 아래에 완전한 태스크 블록으로 추가하세요. `PRD-FR-001`이나 `PRD-SCOPE-V1-DESKTOP-EDITOR`처럼 이미 정의된 PRD key를 사용하거나, 내부 작업이면 `[NON-PRD]`를 사용합니다.
> placeholder 상태의 `Acceptance` / `Checklist`를 그대로 두지 마세요. 구체 항목이 아니면 구현을 시작하지 않습니다.
> 수동 편집이 필요하면 현재 태스크 근처가 아니라 `태스크 목록`의 마지막 기존 태스크 block 아래에만 append 하세요.

---

- [DONE][PRD-FR-023] T-F008-auth-owned-mixing-queue-01 Better Auth 스키마·Google OAuth·사용자 소유권 기반 구축
  - Date: 2026-08-06
  - Acceptance:
    - Google OAuth만 제공되고 보호 화면/API가 서버 세션을 요구한다.
    - 신규 제품 profile·recommendation은 로그인 사용자에게 귀속되고 cross-user 접근이 차단된다.
    - 기존 소유자 없는 fixture는 migration 후에도 자동 귀속되지 않고 제품 목록에서 제외된다.
  - Checklist:
    - [x] Better Auth User/Session/Account/Verification과 사용자 relation Prisma migration을 추가한다.
    - [x] auth server/client, callback route, login/logout UI와 보호 라우트 helper를 구현한다.
    - [x] 세션·소유권·비로그인·cross-user 테스트를 추가한다.

- [DONE][PRD-FR-027] T-F008-auth-owned-mixing-queue-02 Leemage 미디어 어댑터와 사용자 reference 영구 저장
  - Date: 2026-08-06
  - Acceptance:
    - 분석 성공 reference가 Leemage presign/upload/confirm을 거쳐 사용자 profile에 연결된다.
    - 로컬 임시 오디오는 제거되고 DB에는 MediaAsset 메타데이터만 저장된다.
    - profile 삭제가 Leemage 삭제와 실패 정리 상태를 일관되게 처리한다.
  - Checklist:
    - [x] server env validation과 Leemage HTTP client, retry/error contract를 구현한다.
    - [x] MediaAsset·cleanup 모델과 profile 생성/삭제 흐름을 migration한다.
    - [x] mock Leemage 계약·부분 실패·정리·소유권 테스트를 추가한다.

- [DONE][PRD-FR-030] T-F008-auth-owned-mixing-queue-03 티켓 잔액·불변 원장·마이 페이지 구현
  - Date: 2026-08-06
  - Acceptance:
    - 신규 사용자는 env 지급량을 정확히 한 번 받고 모든 변동이 잔액과 원장에 원자적으로 반영된다.
    - 사용자는 account에서 현재 잔액과 페이지네이션된 지급·사용·환불·조정 내역을 확인한다.
    - 동시 차감과 중복 idempotency key에서도 음수 잔액·중복 원장이 발생하지 않는다.
  - Checklist:
    - [x] ticket balance/ledger schema, domain service와 signup grant 복구를 구현한다.
    - [x] account API와 UI를 구현한다.
    - [x] grant/debit/refund 동시성 및 account UI 테스트를 추가한다.

- [DONE][PRD-FR-031] T-F008-auth-owned-mixing-queue-04 PostgreSQL 영속 믹싱 큐와 백그라운드 worker 구현
  - Date: 2026-08-06
  - Acceptance:
    - 믹싱 접수와 티켓 차감이 단일 트랜잭션이며 중복 요청은 기존 job을 반환한다.
    - 별도 worker가 SKIP LOCKED와 lease로 job을 한 번만 처리하고 재시작 후 복구한다.
    - Modal 접수 전 실패만 자동 환불되고 접수 이후 실패는 환불되지 않는다.
  - Checklist:
    - [x] MixingJob 상태·lease·refund schema와 접수 API를 구현한다.
    - [x] claim/heartbeat/resume/attempt를 갖는 worker와 실행 script를 구현한다.
    - [x] 동시 claim, lease recovery, 실패 경계, temp cleanup 통합 테스트를 추가한다.

- [DONE][PRD-FR-028] T-F008-auth-owned-mixing-queue-05 Leemage 결과 저장과 독립 믹싱 히스토리 구현
  - Date: 2026-08-06
  - Acceptance:
    - Modal 성공 결과가 Leemage confirm된 뒤 job이 succeeded가 되고 소유권 검증 API로 재생·다운로드된다.
    - 사용자는 재접속 후 mixing-history에서 모든 작업 상태와 결과를 최신순으로 확인한다.
    - recommendation AI 믹싱 버튼이 새 queue job을 생성하고 현재 상태를 history와 일관되게 표시한다.
  - Checklist:
    - [x] worker 결과 업로드와 MediaAsset 연결, 결과 audio proxy를 구현한다.
    - [x] history API/page와 recommendation job handoff UI를 구현한다.
    - [x] 성공·재접속·cross-user·페이지네이션·기존 추천 회귀 테스트를 추가한다.

- [DONE][PRD-FR-026] T-F008-auth-owned-mixing-queue-06 관리자 운영 대시보드와 티켓 조정 구현
  - Date: 2026-08-06
  - Acceptance:
    - ADMIN_EMAILS 사용자만 관리자 집계·검색·티켓 조정 API와 화면에 접근한다.
    - 관리자는 사용자와 믹싱 상태를 검색·필터하고 사유가 있는 티켓 증감을 수행한다.
    - 관리자도 사용자 reference 오디오를 재생·다운로드할 수 없다.
  - Checklist:
    - [x] admin allowlist guard, overview/users/jobs API를 구현한다.
    - [x] admin dashboard와 ticket adjustment dialog를 구현한다.
    - [x] 일반 사용자 차단, 조정 원장 actor/reason, 음수 잔액 방지 테스트를 추가한다.

- [DONE][PRD-NFR-005] T-F008-auth-owned-mixing-queue-07 전체 파이프라인·보안·운영 문서 검증
  - Date: 2026-08-06
  - Acceptance:
    - 로컬 PostgreSQL, Google OAuth, 실제 Leemage와 mock Modal worker로 핵심 흐름이 검증된다.
    - secret·presigned URL이 클라이언트 응답과 로그에 노출되지 않고 모든 보호 API가 권한 검사를 통과한다.
    - 기존 profile·추천·개발 Workbench 회귀와 전체 품질 게이트가 통과한다.
  - Checklist:
    - [x] .env.example, README와 system architecture에 웹·worker·Leemage 운영법을 문서화한다.
    - [x] 실제 Leemage 업로드·삭제와 worker 종료/재시작 smoke test를 수행한다.
    - [x] Prisma validate, test, lint, TypeScript, build와 workflow audit을 통과한다.

- [DONE][PRD-FR-039] T-F008-auth-owned-mixing-queue-08 내 보컬 프로필 히스토리와 본인 reference 재생 구현
  - Date: 2026-08-07
  - Acceptance:
    - 로그인 사용자는 재접속 후 자신의 보컬 프로필 목록과 기존 분석 시각화를 최신순으로 조회한다.
    - 프로필 상세에서 제출한 reference 보컬을 재생할 수 있고 오디오 탐색을 위한 Range 요청이 동작한다.
    - 비로그인·다른 사용자·관리자 권한만으로는 reference를 조회할 수 없고 Leemage URL·secret이 클라이언트에 노출되지 않는다.
  - Checklist:
    - [x] 사용자 소유 profile 목록·상세 서비스와 reference audio Range 프록시 API를 구현한다.
    - [x] 목록·상세 페이지, 기존 시각화·audio player와 헤더/account 진입 링크를 구현한다.
    - [x] 페이지네이션·재접속·Range·비로그인·cross-user·저장소 URL 비노출 테스트와 전체 회귀 검증을 추가한다.

- [DONE][PRD-NFR-010] T-F008-auth-owned-mixing-queue-09 단일 인스턴스 웹·worker 통합 실행 명령 구현
  - Date: 2026-08-07
  - Acceptance:
    - `pnpm dev`와 `pnpm start`가 웹과 믹싱 worker를 함께 실행한다.
    - 한 자식 프로세스가 비정상 종료되면 나머지도 종료되어 인스턴스 supervisor가 전체를 재시작할 수 있다.
    - 진단을 위해 웹만 실행하는 `dev:web`과 `start:web` 명령을 제공한다.
  - Checklist:
    - [x] `concurrently` 기반 통합 script와 웹 단독 script를 추가한다.
    - [x] README의 단일 인스턴스 실행 방법과 별도 worker 설명을 갱신한다.
    - [x] script 계약과 종료 전파 동작을 검증하고 전체 정적 검사를 통과한다.

- [DONE][PRD-NFR-005] T-F008-auth-owned-mixing-queue-10 Base UI 링크 버튼 native semantics 경고 수정
  - Date: 2026-08-07
  - Acceptance:
    - Next.js Link를 render하는 Base UI Button이 native button을 요구하는 개발 경고를 출력하지 않는다.
    - 계정·보컬 프로필·믹싱 히스토리 페이지네이션과 사용자 메뉴 링크 동작을 유지한다.
    - 실제 button을 render하는 기존 Button 사용처의 native semantics는 변경하지 않는다.
  - Checklist:
    - [x] Link render를 사용하는 Button만 `nativeButton={false}`로 명시한다.
    - [x] 관련 UI 회귀 테스트와 전체 정적 검사를 통과한다.

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [x] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료
- [x] 테스트 실행 및 통과 (아래에 명령어/결과 기록)
- [x] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run db:migrate:deploy && pnpm run db:status` | `2026-08-06` | `PASS — auth·media·ticket·durable mixing queue migration 적용, schema up to date` |
| `pnpm run test:auth:db` | `2026-08-06` | `PASS — owner 1건, cross-user 0건, fixture cleanup` |
| `pnpm exec tsc --noEmit && pnpm run lint` | `2026-08-07` | `PASS` |
| `pnpm run build` | `2026-08-07` | `PASS — Base UI Link button 수정 포함 production build` |
| `로컬 HTTP auth smoke test` | `2026-08-06` | `PASS — / 307→login, /login 200, 비로그인 recommendation POST 401` |
| `pnpm run test:media` | `2026-08-07` | `PASS — 5 tests: presign/upload/confirm, 429 retry, user ownership, cleanup fallback/retry` |
| `pnpm run test:tickets` | `2026-08-06` | `PASS — UI 1 + PostgreSQL concurrency/idempotency 1` |
| `pnpm run test:mixing:db` | `2026-08-07` | `PASS — fixture job ID로 claim 격리, enqueue/lease recovery/refund + mock Modal result→Leemage→history/cross-user` |
| `pnpm run test:mixing:ui` | `2026-08-06` | `PASS — active status, persisted result playback/download` |
| `pnpm run test:recommendation` | `2026-08-06` | `PASS — 18 tests, queued mixing UI regression 포함` |
| `pnpm run test:recommendation:db` | `2026-08-06` | `PASS — 3 legacy persistence/synthesis integration tests` |
| `pnpm run test:admin` | `2026-08-06` | `PASS — allowlist, actor/reason ledger, negative guard, privacy-safe UI` |
| `pnpm run test:vocal-profile-history` | `2026-08-07` | `PASS — 목록·빈 상태 UI, user-scoped pagination/detail, Range 전달, private cache와 저장소 header 비노출` |
| `pnpm test` | `2026-08-07` | `PASS — production build와 process supervisor·profile·catalog·key fit·recommendation·auth·media·ticket·mixing·admin 전체 suite` |
| `pnpm run db:validate && pnpm run db:status` | `2026-08-06` | `PASS — Prisma schema valid, 6 migrations applied, database up to date` |
| `Google OAuth·account·admin 로컬 smoke` | `2026-08-07` | `PASS — callback 302, 로그인 세션, 신규 가입 티켓 +1 정확히 1건, 현재 사용자 allowlist admin 200` |
| `worker process restart smoke` | `2026-08-07` | `PASS — idle worker SIGINT 정상 종료 후 재시작·재종료, lease recovery 통합 테스트 PASS` |
| `pnpm run verify:feature-config -- --leemage` | `2026-08-07` | `PASS — 필수 설정 확인, 실제 Leemage 파일 upload/confirm/delete 성공` |
| `저장된 reference Range smoke` | `2026-08-07` | `PASS — 실제 READY asset에 bytes=0-1023 요청, HTTP 206·audio/wav·Content-Range 확인` |
| `pnpm run test:process-scripts` | `2026-08-07` | `PASS — dev/start 통합 계약, 자식 실패 시 sibling SIGTERM 종료` |
| `pnpm run test:base-ui` | `2026-08-07` | `PASS — Link render Button 10곳 모두 non-native semantics 명시` |

<!-- lee-spec-kit:workflow-sync 2026-08-07T06:45:01.000Z -->
