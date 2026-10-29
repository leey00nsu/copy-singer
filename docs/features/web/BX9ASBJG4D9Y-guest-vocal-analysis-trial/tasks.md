# Tasks: guest-vocal-analysis-trial

## 태스크 규칙

- **상태**: 기본은 `[TODO]` → `[DOING]` → `[DONE]`; `workflow.agentReview.task.enabled=true`이면 `[DOING]` → `[REVIEW]` → `[DONE]`
- **구현 위임**: `workflow.agentExecution.task.enabled=true`이면 설정된 worker가 반환된 `workerContract`를 따르고 `workflow-stage` 재호출이나 재위임 없이 직접 실행하며, 프로젝트 코드와 태스크 범위 검사만 담당합니다. 메인 에이전트가 이 문서, 태스크 상태, 커밋, 승인, 원격 작업을 유지합니다.
- **태스크 공유 / 확인**:
  - `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 `tasks.md`에서 상태를 함께 갱신합니다
  - `[DOING] → [REVIEW]/[DONE]`: 완료 전 결과/검증을 공유하고 같은 수정에서 `Acceptance`와 `Checklist`를 함께 갱신합니다
  - `[REVIEW] → [DONE]`: 완료 전에 반환된 리뷰 Round와 fresh 태스크 리뷰 Evidence, Decision, Reviewed Head, Reviewed Tree를 기록합니다
  - 태스크 상태 변경 전에 승인이 필요한 경우는 문서화된 review checkpoint 또는 원격/파괴적 작업 직전뿐입니다.
  - 워크플로우가 요구하지 않는 standalone `OK` 승인 단계는 만들지 않습니다.
  - 해당 태스크의 `Checklist`에 unchecked 항목이 남아 있으면 `[DONE]`으로 전환하지 않습니다.
  - `workflow.agentReview.maxRounds`는 fresh 리뷰의 최대 실행 횟수입니다. 마지막 허용 Round가 `changes_requested`이면 지적을 한 번 반영하고 남은 finding과 그 결과의 target 변경을 잔여 위험으로 보존한 뒤, 추가 리뷰나 사용자 승인 없이 리뷰 게이트를 자동 완료합니다. `maxRounds=1`이면 Round 2는 없습니다. `blocked`는 자동 완료하지 않습니다.
- **PRD 매핑(권장)**: 각 태스크 라인에 `[PRD-FR-001]` 또는 `[PRD-SCOPE-V1-DESKTOP-EDITOR]` 같은 기존 PRD 요구사항 ID 태그를 추가하거나, PRD와 무관한 태스크는 `[NON-PRD]`로 표시하세요.
  - 단, `tasks.md`에서 PRD ID를 임의로 만들지 마세요. `docs/prd` 또는 상위 요구사항 문서에 먼저 정의된 ID만 참조해야 합니다.
  - 레거시 문서에 아직 PRD ID가 없다면, 먼저 원문 요구사항 문서에 ID를 backfill한 뒤 `spec.md`의 `PRD Refs`와 태스크 태그를 함께 맞추세요.
  - `[NON-PRD]`는 내부 구현 작업 전용입니다. 사용자 동작, acceptance criteria, 범위가 바뀌는 태스크라면 PRD를 먼저 backfill하고 `[PRD-...]`로 태깅하세요.
- **디자인 시스템 동기화(조건부)**: `docs/designs/design-system.md`를 변경하는 태스크는 영향 받는 디자인 문서, token/theme, 공통 UI, Storybook/workbench와 검증을 같은 task의 `Checklist`에서 추적하세요. 영향이 없는 영역은 변경하지 말고 영향 여부만 확인합니다.

---

## 로컬 추적 정보
- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/BX9ASBJG4D9Y-guest-vocal-analysis-trial`
- **대기 중 변경 요청**: -
  - 구현 중 새로 수용한 사용자 요청을 잠시 표시하는 sync marker입니다
  - 요청을 `tasks.md`와 관련 문서에 반영한 뒤 값을 비우세요
- **Feature 리뷰**: -
  - Feature 리뷰 handoff를 시작하면 `Running`, 리뷰 결과 기록까지 끝나면 `Done`으로 변경
- **Feature 리뷰 Evidence**: -
- **Feature 리뷰 Decision**: -
  - 형식: `결정: approve|changes_requested|blocked ...` (또는 `decision: ...`)
- **Feature 리뷰 Round**: -
  - `workflow-stage --json`이 반환한 양의 정수이며 첫 리뷰는 `1`
- **Feature 리뷰 Head**: -
  - Feature 리뷰가 확인한 project code commit SHA
- **Feature 리뷰 Tree**: -
  - Feature 리뷰가 확인한 project code tree SHA

---

## 태스크 엔트리 포맷

```markdown
- [TODO][PRD-FR-001] T-{feature-ref}-01 {태스크 제목}
  - Date: YYYY-MM-DD
  - Acceptance:
    - (검증 조건)
  - Checklist:
    - [ ] (서브 태스크)
  - Docs:
    - (docs 디렉터리 기준 `docs:<path>` 또는 프로젝트 루트 기준 `project:<path>` 대상을 사용하거나 이 섹션을 생략)
  - Review Evidence: -
  - Review Decision: -
  - Review Round: -
  - Reviewed Head: -
  - Reviewed Tree: -
```

> 위 예시의 `PRD-FR-001`은 가능한 `PRD-*` key 중 하나일 뿐입니다. 아직 PRD 원문에 정의되지 않았다면 태스크에 먼저 넣지 마세요.
> 처음엔 탐색/내부 작업이었더라도 제품 요구사항 변경으로 이어졌다면, `NON-PRD`로 두지 말고 PRD를 먼저 갱신한 뒤 `[PRD-...]`로 재태깅하세요.

---

## 태스크 목록

> 아래에 태스크를 추가하세요. **최소 1개가 필요**합니다.
> 태스크는 하나의 순차 리스트로 유지하고, 위에서 아래 순서 자체를 실행 우선순위로 취급하세요.
> 새 태스크 append에는 `npx lee-spec-kit task add <feature-ref> --title "..." --ref NON-PRD --acceptance "..." --check "..." --doc "docs:prd/system-architecture.md"` 사용을 우선하세요.
> 새 태스크는 마지막 기존 태스크 아래에 완전한 태스크 블록으로 추가하세요. `PRD-FR-001`이나 `PRD-SCOPE-V1-DESKTOP-EDITOR`처럼 이미 정의된 PRD key를 사용하거나, 내부 작업이면 `[NON-PRD]`를 사용합니다.
> placeholder 상태의 `Acceptance` / `Checklist`를 그대로 두지 마세요. 구체 항목이 아니면 구현을 시작하지 않습니다.
> 수동 편집이 필요하면 현재 태스크 근처가 아니라 `태스크 목록`의 마지막 기존 태스크 block 아래에만 append 하세요.

---

- [DONE][PRD-FR-GUEST-DAILY-LIMIT] T-BX9ASBJG4D9Y-guest-vocal-analysis-trial-01 체험 소유권·쿠키·일일 예약 기반 추가
  - Date: 2026-10-29
  - Acceptance:
    - guest 자격 생성은 회원 세션·가입 지급과 분리되고 회원 API를 열지 않는다.
    - 10건·0건·동시 예약·KST 자정·이전 날짜 해제·새 프로세스 초기화를 검증한다.
  - Checklist:
    - [x] Prisma migration과 guest token/actor/start API를 추가한다.
    - [x] 일일 quota 단위 및 guest cookie/권한 통합 검사를 수행한다.
  - Docs:
    - docs:prd/copy-singer-prd.md
    - project:.env.example
  - Review Evidence: -
  - Review Decision: -
  - Review Round: -
  - Reviewed Head: -
  - Reviewed Tree: -

- [DONE][PRD-FR-GUEST-ANALYSIS-TRIAL] T-BX9ASBJG4D9Y-guest-vocal-analysis-trial-02 분석 큐·성공 기록·계정 저장·만료 정리 연결
  - Date: 2026-10-29
  - Acceptance:
    - guest 분석은 이용권 없이 한 번 성공하며 실패하면 개인 기회를 복구한다.
    - 다른 사용자 접근·만료 결과 접근을 거부하고 기존 회원 저장은 번호와 원장을 보존하며 멱등적이다.
  - Checklist:
    - [x] queue/worker와 제한된 결과·오디오 route 및 claim API를 연결한다.
    - [x] guest pipeline·이전·삭제·만료 및 기존 queue/소유권 회귀를 검사한다.
  - Docs:
    - docs:prd/system-architecture.md
  - Review Evidence: -
  - Review Decision: -
  - Review Round: -
  - Reviewed Head: -
  - Reviewed Tree: -

- [DONE][PRD-FR-GUEST-ACCOUNT-LINK] T-BX9ASBJG4D9Y-guest-vocal-analysis-trial-03 체험 입력·결과·로그인 저장 화면 제공
  - Date: 2026-10-29
  - Acceptance:
    - 녹음 전에 available/full/used 상태를 표시하고 분석 결과 전체를 로그인 없이 제공한다.
    - 기존·신규 Google 로그인 후 저장 화면에서 같은 결과로 복귀하며 실패 시 재시도할 수 있다.
  - Checklist:
    - [x] 랜딩/입력/결과/shell/저장 UI와 guest policy query를 연결한다.
    - [x] 약관·개인정보 안내와 guest UI/Storybook·SSR 검증을 동기화한다.
  - Docs:
    - project:src/_pages/legal/ui/privacy-page.tsx
    - project:src/_pages/legal/ui/terms-page.tsx
  - Review Evidence: -
  - Review Decision: -
  - Review Round: -
  - Reviewed Head: -
  - Reviewed Tree: -

- [DONE][PRD-FR-GUEST-RETENTION] T-BX9ASBJG4D9Y-guest-vocal-analysis-trial-04 문서 감사 정규화 및 전체 회귀 검증
  - Date: 2026-10-29
  - Acceptance:
    - 보호된 README를 제외한 기존 감사 위반을 정규화하고 전체 회귀 결과와 실제 검증 한계를 기록한다.
    - Feature 문서와 runtime 동작을 동기화하고 현재 코드 fingerprint marker를 한 개만 기록한다.
  - Checklist:
    - [x] 지정된 공용 문서의 작업 추적 참조·kind metadata만 정리하고 README 보류 근거를 남긴다.
    - [x] pnpm test·lint·tsc 및 workflow/feature/commit audit를 실행한다.
  - Docs:
    - docs:prd/copy-singer-prd.md
    - docs:prd/system-architecture.md
    - docs:designs/design-system.md
    - docs:designs/page-redesign-analysis.md
    - docs:designs/product-ui-redesign.md
    - docs:designs/generated/page-redesigns/v2-style-lock.md
  - Review Evidence: -
  - Review Decision: -
  - Review Round: -
  - Reviewed Head: -
  - Reviewed Tree: -

- [DONE][PRD-FR-GUEST-RECOMMENDATIONS] T-BX9ASBJG4D9Y-guest-vocal-analysis-trial-05 체험 추천과 곡 상세 열람 및 로그인 후 선택곡 복귀
  - Date: 2026-10-29
  - Acceptance:
    - 본인 미만료 체험의 전체 추천·검색·정렬·곡별 상세를 외부 AI 호출·추가 차감 없이 제공하고 타인·만료·무쿠키 접근을 거부한다.
    - 믹싱 CTA는 로그인·프로필 저장 후 선택 곡으로 복귀하며 외부·다른 프로필 복귀는 거부하고 자동 믹싱을 실행하지 않는다.
  - Checklist:
    - [x] 추천 route/page 권한과 guest UI 및 안전한 저장 복귀 helper를 연결한다.
    - [x] 권한·만료·부작용·복귀 URL·guest/회원 UI 회귀와 전체 test/lint/tsc를 검증하고 문서를 동기화한다.
  - Docs:
    - docs:prd/copy-singer-prd.md
    - docs:prd/system-architecture.md
    - project:src/_pages/legal/ui/terms-page.tsx
  - Review Evidence: -
  - Review Decision: -
  - Review Round: -
  - Reviewed Head: -
  - Reviewed Tree: -

- [DONE][PRD-NFR-GPU-FALLBACK] T-BX9ASBJG4D9Y-guest-vocal-analysis-trial-06 합성 GPU의 L4 우선·A10 대체 설정 추가
  - Date: 2026-10-29
  - Acceptance:
    - 기본 및 명시 L4는 L4→A10만 요청하고 기존 다른 단일 GPU 지정과 최대 컨테이너 수를 보존한다.
    - Python compile·기존 unit·제출 계약과 실제 SDK 로컬 함수 정의를 검증하고 원격 배포 전 승인 경계를 유지한다.
  - Checklist:
    - [x] SoulXModel의 GPU preference 목록에 A10만 추가하고 PRD·아키텍처·Feature 문서를 동기화한다.
    - [x] 추가 영구 테스트 없이 계획된 Python/SDK 검사를 수행하고 결과·배포 한계를 기록한다.
  - Docs:
    - docs:prd/copy-singer-prd.md
    - docs:prd/system-architecture.md
  - Review Evidence: -
  - Review Decision: -
  - Review Round: -
  - Reviewed Head: -
  - Reviewed Tree: -

- [DONE][PRD-FR-ADMIN-WORKSPACE] T-BX9ASBJG4D9Y-guest-vocal-analysis-trial-07 관리자 회원·체험 조회와 집계 분리
  - Date: 2026-10-29
  - Acceptance:
    - 정식 회원만 회원 목록과 회원 수에 포함하고 체험은 저장 회원·만료 상태·검색/필터/페이지로 안전하게 조회한다.
    - guest 대상 티켓 조정을 서버에서도 거부하고 기존 회원 원장·권한·알림 계약을 보존한다.
  - Checklist:
    - [x] 관리자 조회/집계와 bounded pagination 및 guest ticket target 경계를 구현한다.
    - [x] DB 통합에서 구분·관계·필터·페이지·민감 필드 비노출·기존 티켓 회귀를 검증한다.
  - Docs:
    - docs:prd/copy-singer-prd.md
    - docs:prd/system-architecture.md
  - Review Evidence: -
  - Review Decision: -
  - Review Round: -
  - Reviewed Head: -
  - Reviewed Tree: -

- [DONE][PRD-FR-ADMIN-WORKSPACE] T-BX9ASBJG4D9Y-guest-vocal-analysis-trial-08 관리자 공통 메뉴와 단일 목록 및 회원 티켓 Sheet 적용
  - Date: 2026-10-29
  - Acceptance:
    - 승인 시안의 네 메뉴·회원/체험 Tabs·독립 검색/페이지와 단일 테이블을 제공하고 운영 설명은 기존 문구를 정확히 유지한다.
    - 티켓 Sheet의 고정 대상·확인·안전한 retry와 기존 음원/custom 기능·권한·모바일/접근성을 보존한다.
  - Checklist:
    - [x] 공통 navigation과 관리자 page/loading·테이블·상세/티켓 Sheet를 기존 primitive로 구현한다.
    - [x] URL/UI/Storybook·관리/티켓/카탈로그 및 전체 회귀와 정적 검사·문서 감사를 완료한다.
  - Docs:
    - docs:prd/copy-singer-prd.md
    - docs:prd/system-architecture.md
    - docs:designs/admin-navigation.md
    - docs:designs/references/copy-singer/admin-navigation-proposal.png
  - Review Evidence: -
  - Review Decision: -
  - Review Round: -
  - Reviewed Head: -
  - Reviewed Tree: -

- [DONE][PRD-FR-ADMIN-WORKSPACE] T-BX9ASBJG4D9Y-guest-vocal-analysis-trial-09 관리자 하위 화면 스켈레톤을 공통 메뉴 구조에 정렬
  - Date: 2026-10-29
  - Acceptance:
    - 운영·음원·커스텀 로딩 화면에 동일한 네 메뉴 자리와 현재 페이지의 본문 구조를 제공하고 제거한 뒤로가기 자리를 표시하지 않는다.
  - Checklist:
    - [x] 세 loading 어댑터와 최종 UI를 대조하고 공유 메뉴 스켈레톤 및 하위 화면 간격을 조정한다.
    - [x] 새 영구 테스트 없이 SSR 렌더·타입·lint·아키텍처·문서 감사를 확인한다.
  - Review Evidence: -
  - Review Decision: -
  - Review Round: -
  - Reviewed Head: -
  - Reviewed Tree: -

## Repository Knowledge (완료 비차단)

- **Policy**: `.lee-spec-kit.json`의 `experimental.openwiki`에서 파생
- **Lifecycle**: Feature 완료는 OpenWiki를 기다리지 않습니다. `knowledge ci`가 만든 예약/수동 CI가 통합된 project revision에서 저장소 단위 Knowledge를 갱신하며, 상태는 해당 workflow 실행과 PR에서 별도 확인합니다.
- **Output**: 생성 Wiki와 OpenWiki 실행 metadata는 Feature 커밋·리뷰에 넣지 않습니다.

---

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [x] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료 <!-- lee-spec-kit:completion:all-tasks -->
- [x] 테스트 실행 및 통과 (아래에 명령어/결과 기록) <!-- lee-spec-kit:completion:tests -->
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함 <!-- lee-spec-kit:completion:final-outcome -->

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어                   | 마지막 실행(로컬, YYYY-MM-DD) | 결과               |
| ------------------------ | ----------------------------- | ------------------ |
| `pnpm exec prisma validate / generate / migrate deploy` | `2026-10-29` | PASS: localhost migration 적용 |
| `pnpm run test:guest-analysis` | `2026-10-29` | PASS: quota/navigation/UI 9 + guest pipeline/API 9 |
| `pnpm run test:vocal-profile-analysis-queue` | `2026-10-29` | PASS: member regression 8 |
| `focused Storybook: 추천/곡상세/저장/믹싱/프로필` | `2026-10-29` | PASS: 28 |
| `focused Storybook: profile/detail/landing` | `2026-10-29` | PASS: 25 |
| `pnpm run lint` | `2026-10-29` | PASS |
| `pnpm test` (dotenv로 `.env.local` 선로드) | `2026-10-29` | PASS: 관리자 변경 후 build, 모든 unit/DB/API suite, Storybook 197, guest 18, readiness 13 + Python 4 (exit 0, /tmp/copy-singer-admin-complete-test.log) |
| `pnpm test` (환경 선로드 없이 최초 실행) | `2026-10-29` | FAIL: 기존 leemage-client test의 DATABASE_URL 초기화 누락. 전체 출력 /tmp/copy-singer-guest-full-test.log 보존 |
| `npx lee-spec-kit workflow-audit --json` | `2026-10-29` | PASS: WORKFLOW_IN_SYNC |
| `npx lee-spec-kit feature-audit --json --enforce` | `2026-10-29` | PASS |
| `npx lee-spec-kit docs-audit --json --enforce` | `2026-10-29` | 기존 보호 README 1건 잔존. decisions.md에 보류 근거 기록 |
| `pnpm run test:architecture-boundaries` | `2026-10-29` | PASS: 4 |
| `pnpm exec tsc --noEmit` | `2026-10-29` | PASS |
| `python3 -m py_compile services/soulx-singer-svc/modal_app.py` | `2026-10-29` | PASS: pycache는 /tmp에 저장 |
| `python3 -m unittest discover -s services/soulx-singer-svc/tests` | `2026-10-29` | PASS: 2 |
| `python3 tests/modal-submission-contract.py` | `2026-10-29` | PASS: 4 |
| `Modal SDK 로컬 정의 검사 (1.5.3 / 1.2.4, 일회성 Python)` | `2026-10-29` | PASS: 각 4개 GPU 설정 case, 기존 단일 지정·동시성 보존. build/RPC 없음 |
| `Modal deploy / app history / GPU Details / GET health` | `2026-10-29` | PASS: 사용자 승인 후 v7(4a9536e) 배포, 실제 L4 or A10G·최대 1개 확인, HTTP 200. 실제 합성은 사용자 테스트 대기 |

완료 기록에는 테스트뿐 아니라 build·typecheck·lint 등 Plan에서 정한 검증과 수동 검증 증거를 포함합니다. 자동 검사의 기준은 실제 `workflow.featureChecks`이며, 검사 생략은 통과로 기록하지 않고 명시적인 사유를 남깁니다.

<!-- lee-spec-kit:workflow-sync sha256:dc96c9a833f21bcb7d55bc7cf3f40b512a0c335b54c550760f7b2f21701c4f32 -->

관리자 task 07 검증: `node --conditions react-server --import tsx --test tests/admin-operations.integration.ts` 2개 통과. 기존 회원 조정/원장/알림과 신규 guest 분리/저장 관계/만료 필터/페이지 상한/민감 필드 제외/guest 조정 차단을 확인했다. tsc와 변경 파일 ESLint도 통과했다.

관리자 task 08 검증: 운영 설명 원문 유지, 네 공통 메뉴·회원/체험 Tabs·선택 목록 하나·독립 URL 상태·고정 회원 티켓 Sheet를 구현했다. URL/SSR 8개·신규 Storybook 8개, 전체 Storybook 197개와 pnpm test exit 0을 확인했다. tsc·lint·Steiger/FSD 4개·diff 검사 통과. 390px 브라우저에서 페이지/Sheet의 가로 넘침 없음·키보드 닫기와 실제 컴포넌트의 목록/문구를 확인했다. 비인증 로컬 /admin은 관리자 권한 검사에서 404로 차단됨을 확인했다. 실제 OAuth/유료 GPU 호출은 실행하지 않았다.

관리자 task 09 검증: 세 loading adapter의 실제 연결과 화면 구조를 대조했다. 메인은 이미 단일 목록이었고 음원·커스텀의 공통 메뉴 누락과 커스텀 뒤로가기 자리를 보완했다. 공유 메뉴 skeleton 4개·세 SSR의 aria-busy/status/공통 컨테이너·비활성 placeholder를 확인했고 기존 관리자 UI/URL 8개, tsc·변경 파일 ESLint/Biome·Steiger/FSD 4개·diff 검사와 문서 감사가 통과했다. 직전 40bf0df의 전체 pnpm test 성공 이후 정적 skeleton만 변경하여 전체 suite는 반복하지 않았다.
