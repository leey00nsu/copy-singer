# Tasks: vocal-profile-slot-limit

## 태스크 규칙

- **상태**: `[TODO]` → `[DOING]` → `[DONE]`
- `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 상태를 갱신합니다.
- `[DOING] → [DONE]`: Acceptance와 Checklist를 실제 검증 후 함께 완료합니다.
- 한 번에 하나의 태스크만 진행합니다.
- 문서화된 review checkpoint와 원격/파괴적 작업 외에는 별도 승인 단계를 추가하지 않습니다.

---

## 로컬 추적 정보

- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/vocal-profile-slot-limit`
- **대기 중 변경 요청**: 없음
- **스펙 승인**: 2026-08-15 사용자 응답 `자동진행`을 workflow 승인 옵션 `A`로 기록
- **구현 승인**: 2026-08-15 사용자 응답 `완료처리해줘`를 최신 구현에 대한 workflow 승인 옵션 `A`로 기록
- **로컬 머지 승인**: -
- **PR 전 리뷰**: Pending
- **PR 전 리뷰 Evidence**: -
- **PR 전 리뷰 Decision**: -
- **PR 리뷰**: -
- **PR 리뷰 Evidence**: -
- **PR 리뷰 Decision**: -

---

## 태스크 목록

- [DONE][PRD-FR-063] T-F031-vocal-profile-slot-limit-01 종류별 티켓 지갑과 기존 데이터 마이그레이션
  - Date: 2026-08-15
  - Acceptance:
    - 티켓 잔액이 `VOCAL_ANALYSIS`, `AI_MIXING` 종류별 지갑으로 분리된다.
    - 기존 `User.ticketBalance`는 AI_MIXING 지갑으로 손실 없이 이전된다.
    - 기존 원장은 AI_MIXING kind로 backfill되고 debit/refund 이벤트는 generic usage 이벤트로 전환된다.
    - 가입 지급은 분석/믹싱 종류별로 한 번만 적용되고 기존 사용자의 믹싱 지급이 중복되지 않는다.
  - Checklist:
    - [x] Prisma에 `TicketKind`, `TicketWallet`, ledger kind와 analysis job 연결 필드를 추가했다.
    - [x] migration에서 기존 balance/ledger를 AI_MIXING으로 보존하고 로컬 deploy를 통과했다.
    - [x] `applyTicketChange`, balance/account API 계약을 kind 기반으로 일반화했다.
    - [x] `SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT`, `SIGNUP_MIXING_TICKET_GRANT` env와 idempotent signup ensure를 추가했다.
    - [x] wallet/ticket ledger integration 테스트를 갱신해 1/1 PASS를 확인했다.

- [DONE][PRD-FR-063] T-F031-vocal-profile-slot-limit-02 보컬 프로필 슬롯과 분석 티켓 차감·환불
  - Date: 2026-08-15
  - Acceptance:
    - 사용자 USER 보컬 프로필 최대치는 `VOCAL_PROFILE_MAX_USER_PROFILES`를 따른다.
    - 새 분석 접수 시 `VOCAL_PROFILE_ANALYSIS_TICKET_COST`만큼 VOCAL_ANALYSIS 티켓을 한 번 차감한다.
    - 슬롯 초과·분석 티켓 부족·잘못된 요청은 새 job을 만들거나 티켓을 차감하지 않는다.
    - terminal FAILED 분석은 접수 당시 ticketCost를 정확히 한 번 환불한다.
    - 성공한 프로필 삭제는 분석 티켓을 복구하지 않는다.
  - Checklist:
    - [x] 슬롯/분석 비용 server-env accessor와 `.env.example`을 추가했다.
    - [x] analysis queue에 slot + VOCAL_ANALYSIS wallet 검증 및 debit을 추가했다.
    - [x] analysis job에 `ticketCost`, `refundState`를 저장하고 ledger와 연결했다.
    - [x] worker terminal failure에 idempotent 분석 티켓 refund와 reconciliation을 추가했다.
    - [x] analysis GET에 profileQuota + analysisTickets 정책 응답을 추가했다.
    - [x] queue/refund/idempotency integration 테스트를 확장해 8/8 PASS를 확인했다.

- [DONE][PRD-FR-063] T-F031-vocal-profile-slot-limit-03 기존 AI 믹싱 경로를 믹싱 티켓으로 이전
  - Date: 2026-08-15
  - Acceptance:
    - AI 믹싱은 AI_MIXING 지갑만 차감한다.
    - 기존 `MIXING_TICKET_COST`, job ticketCost, 실패 환불 의미가 유지된다.
    - VOCAL_ANALYSIS 잔액은 믹싱 접수·환불에 영향을 받지 않는다.
  - Checklist:
    - [x] mixing queue debit을 `kind: AI_MIXING` 기반 공용 ticket service로 전환했다.
    - [x] mixing refund를 `USAGE_REFUND + AI_MIXING`으로 전환했다.
    - [x] insufficient ticket 오류가 kind를 포함하도록 API 계약을 갱신했다.
    - [x] 기존 mixing queue/refund integration 테스트를 갱신해 1/1 PASS를 확인했다.

- [DONE][PRD-FR-063] T-F031-vocal-profile-slot-limit-04 분석·계정·관리자 티켓 UX
  - Date: 2026-08-15
  - Acceptance:
    - 분석 화면은 `보컬 프로필 used/limit`과 `분석 티켓 balance`를 분리해 보여준다.
    - 분석 티켓 부족이 프로필 슬롯 만석보다 우선 안내된다.
    - 계정 메뉴와 계정 화면은 분석/믹싱 티켓 잔액을 구분한다.
    - 티켓 변경 내역과 관리자 조정은 티켓 종류를 명확히 식별한다.
    - 양수 관리자 조정 알림은 지급된 티켓 종류를 포함한다.
  - Checklist:
    - [x] profile workbench/voice input에 슬롯+분석 티켓 상태와 cost 안내를 추가했다.
    - [x] 슬롯 만석 상태에 `/library?tab=profiles` 관리 action을 제공했다.
    - [x] user menu와 account overview를 두 종류 지갑 UI로 갱신했다.
    - [x] ticket ledger UI에 kind를 표시했다.
    - [x] admin ticket adjustment에 kind 선택을 추가했다.
    - [x] ticket credit notification 카피를 종류별로 갱신했다.
    - [x] 관련 Storybook/UI 테스트를 갱신해 targeted Storybook 26/26, 정적 UI/계약 24/24 PASS를 확인했다.

- [DONE][PRD-FR-063] T-F031-vocal-profile-slot-limit-05 회귀 검증과 문서 동기화
  - Date: 2026-08-15
  - Acceptance:
    - 기존 사용자 티켓 잔액, 분석/믹싱 idempotency, 환불, 프로필 삭제·추천 계약이 유지된다.
    - lint/typecheck 및 관련 unit/integration/Storybook 테스트가 통과한다.
    - active docs와 PRD가 실제 구현·환경변수와 일치한다.
  - Checklist:
    - [x] ticket/wallet/migration targeted 테스트를 실행했다.
    - [x] vocal analysis queue/worker targeted 테스트를 실행했다.
    - [x] mixing/ticket/admin/account 관련 targeted 테스트를 실행했다.
    - [x] 관련 Storybook을 실행했다. 비결정적 기존 Storybook 대기 조건도 안정화해 최종 156/156 PASS를 확인했다.
    - [x] `pnpm run lint`와 `pnpm exec tsc --noEmit`을 실행했다.
    - [x] 최종 `pnpm test`를 실행하고 전체 PASS를 확인했다.
    - [x] decisions/tasks 구현·검증 Evidence를 구현 커밋 `69c51de`와 동기화했다.

- [DONE][PRD-FR-063] T-F031-vocal-profile-slot-limit-06 보컬 프로필 상한 제거
  - Date: 2026-08-15
  - Acceptance:
    - `USER` 보컬 프로필 보유 개수는 새 분석 admission을 제한하지 않는다.
    - 분석 사용량은 `VOCAL_ANALYSIS` 티켓 잔액과 기존 active-analysis 1개 제한으로만 제어한다.
    - `VOCAL_PROFILE_MAX_USER_PROFILES`, `profileQuota`, `PROFILE_LIMIT_REACHED` 계약을 런타임과 문서에서 제거한다.
    - 분석 화면은 슬롯/보유 개수 제한 상태를 노출하지 않고 분석 티켓 잔액과 비용만 안내한다.
    - 프로필 삭제는 기존 삭제·믹싱 연결 규칙을 유지하며 분석 티켓을 복구하지 않는다.
  - Checklist:
    - [x] server env와 analysis queue에서 프로필 최대치 검사를 제거했다.
    - [x] analysis API/contract에서 `profileQuota`와 `PROFILE_LIMIT_REACHED`를 제거했다.
    - [x] profile UI/Storybook에서 슬롯 카운터·만석 상태·관리 action을 제거했다.
    - [x] 슬롯 제한 integration 테스트를 제거하고 기존 프로필 5개 보유 상태에서도 분석 접수가 가능한 회귀 테스트를 추가했다.
    - [x] PRD/spec/plan/decisions를 분석 티켓 단일 제한 정책으로 동기화했다.
    - [x] targeted tests, lint, typecheck, 최종 `pnpm test`를 통과했다.

- [DONE][PRD-FR-063] T-F031-vocal-profile-slot-limit-07 티켓 소모 확인 모달
  - Date: 2026-08-15
  - Acceptance:
    - 분석 티켓이 소모되는 보컬 분석은 확인 모달의 명시적 승인 뒤에만 mutation을 실행한다.
    - 믹싱 티켓이 소모되는 AI 믹싱 최초 시작과 재시도는 확인 모달의 명시적 승인 뒤에만 mutation을 실행한다.
    - 모달은 티켓 종류, 실제 비용, 확인 직후 작업이 시작된다는 의미를 명확히 보여준다.
    - 취소/닫기에서는 mutation을 실행하지 않고, 비용이 0이면 불필요한 확인 모달을 띄우지 않는다.
    - 서버의 기존 debit/refund/idempotency 계약은 변경하지 않는다.
  - Checklist:
    - [x] `entities/ticket`에 재사용 가능한 `TicketConsumptionConfirmDialog`를 추가했다.
    - [x] 보컬 분석 버튼을 확인 dialog 뒤에 연결하고 취소 0회·확인 1회 Storybook interaction을 추가했다.
    - [x] AI 믹싱 최초 시작과 retry를 확인 dialog 뒤에 연결하고 모든 호출부에 실제 `ticketCost`를 전달했다.
    - [x] 분석/믹싱 Storybook에서 취소 0회·확인 1회와 `ticketCost=0` 즉시 실행을 검증했다. targeted Storybook 26/26 PASS를 확인했다.
    - [x] 관련 정적 UI/API 테스트 35/35, FSD 4/4, lint/typecheck, 최종 `pnpm test`를 통과했다.

- [DONE][NON-PRD] T-F031-vocal-profile-slot-limit-08 공용 모달 viewport overflow 방어
  - Date: 2026-08-15
  - Acceptance:
    - 긴 파일명·URL·ID 같은 긴 문자열이 들어가도 `Dialog`가 viewport 가로 폭을 넘지 않는다.
    - 긴 콘텐츠가 dialog grid의 intrinsic width를 키워 footer까지 바깥으로 밀어내지 않는다.
    - `Dialog`는 작은 viewport에서 세로로도 화면을 벗어나지 않고 내부 스크롤로 접근할 수 있다.
    - `Sheet`도 긴 문자열이 가로로 화면 밖으로 새지 않으며 bottom/top sheet의 긴 내용은 viewport 안에서 스크롤할 수 있다.
    - 기존 확인·삭제·이름변경·카탈로그·필터·모바일 메뉴 modal/sheet 동작은 유지한다.
  - Checklist:
    - [x] 공용 `DialogContent`의 grid를 `minmax(0,1fr)`로 제한하고 viewport 최대 높이·내부 스크롤·가로 overflow 방어를 추가했다.
    - [x] `DialogHeader/Footer/Title/Description`에 축소 가능한 최소폭과 긴 문자열 wrapping을 적용했다.
    - [x] 공용 `SheetContent/Header/Footer/Title/Description`에도 가로 overflow 방어와 top/bottom viewport 최대 높이를 적용했다.
    - [x] 실제 재현 경로인 `LongAudioDialog`에 긴 파일명 ellipsis/title과 viewport bounding 회귀 Storybook을 추가했다.
    - [x] 공용 Dialog/Sheet에 긴 무공백 토큰·긴 세로 콘텐츠 회귀 story를 추가해 content/footer가 viewport 안에 남는지 검증했다.
    - [x] 전체 Dialog/Sheet Storybook 사용처를 감사해 6 files / 26 tests PASS, 공용 재현 3 files / 8 tests PASS, lint/typecheck 및 최종 `pnpm test` PASS를 확인했다.

---

## 완료 조건

- [x] 모든 태스크가 `[DONE]`이며 Acceptance/Checklist가 완료됨
- [x] 테스트 실행 및 통과 기록 완료
- [x] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

- 2026-08-15 최신 구현 승인: T08 결과 공유 후 사용자 응답 `완료처리해줘`를 현재 구현 전체에 대한 workflow 승인 옵션 `A`로 기록했다.

### 테스트 실행 기록

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run db:migrate:deploy` + ticket wallet integration | `2026-08-15` | `PASS — migration applied + wallet 1/1` |
| `pnpm run test:vocal-profile-analysis-queue` | `2026-08-15` | `PASS — 8/8, 기존 프로필 5개 상태 신규 분석 허용 포함` |
| `pnpm run test:mixing:db` | `2026-08-15` | `PASS — 1/1` |
| `pnpm run test:admin` | `2026-08-15` | `PASS — UI 4/4 + integration 1/1` |
| account/API/query targeted tests | `2026-08-15` | `PASS — 24/24` |
| targeted Storybook: ticket confirmation/profile/recommendation/song detail | `2026-08-15` | `PASS — 4 files, 26/26` |
| modal overflow regression: Dialog/Sheet/LongAudioDialog | `2026-08-15` | `PASS — 3 files, 8/8` |
| all Dialog/Sheet usage stories | `2026-08-15` | `PASS — 6 files, 26/26` |
| targeted UI/API/query tests | `2026-08-15` | `PASS — 35/35` |
| FSD architecture boundaries | `2026-08-15` | `PASS — 4/4` |
| `pnpm run lint` | `2026-08-15` | `PASS` |
| `pnpm exec tsc --noEmit` | `2026-08-15` | `PASS` |
| `pnpm test` | `2026-08-15` | `PASS — build + unit/integration + Storybook 162/162` |

- **구현 커밋**: `69c51de` (`feat(F031): 회귀 검증과 문서 동기화`), `096b43e` (`feat(F031): 보컬 프로필 상한 제거`), `65a03df` (`feat(F031): 티켓 소모 확인 모달`), `3fddaa9` (`feat(F031): 공용 모달 viewport overflow 방어`)

<!-- lee-spec-kit:workflow-sync 2026-08-15T09:26:46.000Z -->
