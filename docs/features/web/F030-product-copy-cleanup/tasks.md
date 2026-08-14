# Tasks: product-copy-cleanup

## 태스크 규칙

- **상태**: `[TODO]` → `[DOING]` → `[DONE]`
- `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 상태를 갱신합니다.
- `[DOING] → [DONE]`: Acceptance와 Checklist를 실제 검증 후 함께 완료합니다.
- 한 번에 하나의 태스크만 진행합니다.
- 문서화된 review checkpoint와 원격/파괴적 작업 외에는 별도 승인 단계를 추가하지 않습니다.
- 카피를 맞추기 위해 기능 동작/API/데이터 모델을 변경하지 않습니다.

---

## 로컬 추적 정보

- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/product-copy-cleanup`
- **대기 중 변경 요청**: -
- **스펙 승인**: 2026-08-14 사용자 응답 `자동진행해봐.`를 workflow 승인 옵션 `A`로 기록
- **구현 승인**: 2026-08-14 사용자 응답 `계속진행`을 최신 구현에 대한 workflow 승인 옵션 `A`로 기록
- **로컬 머지 승인**: -
- **PR 전 리뷰**: Pending
- **PR 전 리뷰 Evidence**: -
- **PR 전 리뷰 Decision**: -
- **PR 리뷰**: -
- **PR 리뷰 Evidence**: -
- **PR 리뷰 Decision**: -

---

## 태스크 목록

- [DONE][PRD-FR-062] T-F030-product-copy-cleanup-01 공통 진입·탐색 카피 정리
  - Date: 2026-08-14
  - Acceptance:
    - 랜딩/로그인/공통 product shell/알림 등 진입·탐색 화면의 문장형 카피가 자연스러운 `~요` 톤을 사용한다.
    - 제목·내비게이션이 이미 전달하는 내용을 반복하는 설명과 추상적인 홍보 문구가 제거되거나 짧아진다.
    - 버튼·메뉴·탭·badge·짧은 label은 억지 존댓말 없이 간결한 UI 문법을 유지한다.
    - 접근성 레이블과 법적 동의에 필요한 의미는 보존한다.
  - Checklist:
    - [x] `app/(public)`과 `src/widgets/product-shell`의 실제 사용자-facing 문자열을 맥락별로 검토했다.
    - [x] `authentication`, `manage-notifications`의 상태/오류 문구에서 `~습니다` 혼용, OAuth 내부 용어, 중복 설명을 정리했다.
    - [x] 변경 문자열을 직접 검증하는 auth/navigation·Storybook 기대값을 갱신했다.

- [DONE][PRD-FR-062] T-F030-product-copy-cleanup-02 프로필·추천·믹싱 핵심 플로우 카피 정리
  - Date: 2026-08-14
  - Acceptance:
    - 보컬 분석·프로필·추천·AI 믹싱·라이브러리 화면의 사용자-facing 문구가 현재 구현과 일치한다.
    - `최대 720포인트`, polling/retry 내부 상태, reference 생성 규칙처럼 다음 행동에 필요하지 않은 구현 세부는 제거하거나 사용자 관점으로 바뀐다.
    - empty/error/status 문구는 같은 내용을 제목과 본문에서 반복하지 않고 상태와 필요한 다음 행동만 전달한다.
    - `목소리 분석`, `보컬 프로필`, `노래 추천`, `AI 믹싱`, `라이브러리`, `티켓` 용어를 불필요하게 변형하지 않는다.
  - Checklist:
    - [x] `vocal-profile`, `creation-funnel`, `library` 카피를 실제 분석/저장 계약과 대조해 정리했다.
    - [x] `recommendation`, `mixing-job`, `create-mixing`, `ticket` 카피를 실제 제공 기능과 대조해 정리했다.
    - [x] `720포인트`, GPU, 카탈로그 revision, 백그라운드/대기열/서버 설정 등 기술적 내부 표현과 추상적 AI 슬롭 표현을 제거하거나 사용자 상태 중심으로 바꿨다.
    - [x] 관련 profile/recommendation/mixing 테스트의 문자열 기대값을 새 카피에 맞춰 갱신했다.

- [DONE][PRD-FR-062] T-F030-product-copy-cleanup-03 프로젝트 잔여 카피 감사와 회귀 검증
  - Date: 2026-08-14
  - Acceptance:
    - 실제 제품에 노출되는 TSX/TS 문자열을 다시 검색해 명백한 `~습니다` 톤 혼용, 구현 불일치, 과도한 장문/내부 세부가 남지 않는다.
    - 관리자 화면은 전문 용어를 임의로 일반화하지 않되 명백한 구현 불일치와 사용자-facing 톤 불일치는 정리한다.
    - 약관/개인정보 처리방침은 법적 의미를 바꾸지 않으며 일반 제품 카피 톤 강제 대상에서 제외한다.
    - lint/typecheck 및 관련 테스트가 통과한다.
  - Checklist:
    - [x] `app`/`src` 전체에서 실제 제품 카피를 재검색하고 예외를 맥락별로 확인했다. 일반 UI의 formal tone 검색 결과는 로그인 법적 동의 문장 1건만 의도적으로 남겼다.
    - [x] 관리자/공통 UI의 명백한 구현 불일치 또는 톤 회귀와 사용자에게 그대로 전달되는 API/알림 문구를 정리했다.
    - [x] `pnpm run test:auth-navigation`, `pnpm run test:vocal-profile-presentation`, `pnpm run test:mixing:ui`, `pnpm run test:recommendation`을 실행했다.
    - [x] 관리자 문자열 변경 후 `pnpm run test:admin`을 실행했다.
    - [x] 전체 `pnpm test`, `pnpm run lint`, `pnpm exec tsc --noEmit`을 통과했다.

- [DONE][PRD-FR-062] T-F030-product-copy-cleanup-04 구현 승인 피드백 반영
  - Date: 2026-08-14
  - Acceptance:
    - 랜딩 핵심 헤드라인은 `내 목소리를 분석하고, 가장 잘 어울리는 노래를 만나보세요` 문구를 그대로 전달한다.
    - `한 소절로, 내 보컬 프로필을 만들어 보세요.`와 `계속하려면 로그인해 주세요.` 헤드라인이 작은 화면에서 한글 단어 중간이 어색하게 잘리지 않는다.
    - 카탈로그 음원 수를 고정값 `100곡`으로 약속하는 제품 문구가 없고, 개수가 필요한 실제 결과 UI는 런타임 데이터에서 계산한다.
  - Checklist:
    - [x] 랜딩 hero의 시각 텍스트와 accessible name을 지정 문구에 맞췄다.
    - [x] 프로필·로그인 헤드라인에 `break-keep`과 모바일 `2rem` 기준의 제한적인 반응형 글자 크기를 적용했다.
    - [x] 추천 페이지 메타 설명의 정적 `100곡`을 제거했고, 결과 화면의 곡 수 표시는 기존 `run.items.length` 기반 동적 카운트를 유지했다.
    - [x] auth/voice-scan/recommendation 타깃 테스트, landing/login Storybook, lint/typecheck와 전체 `pnpm test`를 통과했다.

- [DONE][PRD-FR-062] T-F030-product-copy-cleanup-05 브랜드·분석·랜딩 카피 피드백 반영
  - Date: 2026-08-14
  - Acceptance:
    - 로그인 본문 브랜드 영역은 공용 `ProductBrand`를 사용해 실제 로고 마크와 브랜드 폰트 로고텍스트를 함께 보여준다.
    - 목소리 분석 화면의 왼쪽 소개, HOW TO RECORD, 오른쪽 VOICE INPUT 카피가 사용자 지정 문구와 의미를 따른다.
    - 목소리 분석의 긴 제목은 로그인 화면과 같은 방식으로 작은 화면에서 읽기 좋은 크기와 한글 줄바꿈을 유지한다.
    - 랜딩 Hero는 `나에게 맞는 노래를 찾고` / `내 목소리로 완성하세요.` 구조를 사용하고 `내 목소리로`에 브랜드 포인트를 둔다.
    - 랜딩의 Primary/Secondary CTA, 하단 안내, 3단계 소개, 지표, 가이드 카드가 사용자 제안 문구로 정리된다.
    - 랜딩 핵심 제품 용어는 `목소리 분석`, `노래 · 키 추천`, `AI 믹싱`으로 통일한다.
  - Checklist:
    - [x] 로그인 본문 `Copysinger` 텍스트를 공용 `ProductBrand`로 교체하고 Storybook에서 실제 SVG 마크+브랜드 폰트 텍스트를 확인했다.
    - [x] `vocal-profile-workbench`, `voice-scan-input`, recorder의 초기 안내/버튼 카피를 사용자 지정 문구로 수정하고 5초 최소·60초 제한은 상세 제약으로 유지했다.
    - [x] landing Hero/product story/3단계/metrics/voice notes 카피를 수정하고 핵심 단계명을 `목소리 분석` / `노래 · 키 추천` / `AI 믹싱`으로 정리했다.
    - [x] auth 8/8, voice-scan 4/4, landing/login/voice-input Storybook 16/16, lint/typecheck를 통과했고 최종 `pnpm test` 전체 실행도 PASS했다.

- [DONE][PRD-FR-062] T-F030-product-copy-cleanup-06 내 계정 Google 연결 상태 chip 제거
  - Date: 2026-08-14
  - Acceptance:
    - 내 계정의 계정 정보 카드에 `Google 연결됨` 또는 `Google 연결 정보 없음` 상태 chip이 표시되지 않는다.
    - 이름, 이메일, 로그인 방식과 Google 연결일 등 기존 계정 상세 정보는 유지한다.
    - 계정/티켓 동작과 데이터 계약은 변경하지 않는다.
  - Checklist:
    - [x] `AccountOverview`에서 Google 연결 상태 Badge를 제거하고 불필요 import를 정리했다.
    - [x] account 단위 테스트와 Storybook 기대값을 새 UI에 맞췄다.
    - [x] account 단위 테스트 2/2, account Storybook 3/3, ESLint, TypeScript를 통과했다. 전체 `pnpm test`에서 이번 변경과 무관한 기존 타이밍성 Storybook 2건과 Leemage cleanup 통합 테스트 1건이 각각 일시 실패했지만, 해당 실패들은 단독 재실행 13/13 및 3/3으로 모두 통과했다.

- [DONE][NON-PRD] T-F030-product-copy-cleanup-07 계정 정보 필드 아이콘 정렬
  - Date: 2026-08-14
  - Acceptance:
    - 계정 정보의 `이름`, `이메일`, `로그인 방식` 라벨이 같은 시각적 위계로 아이콘을 함께 표시한다.
    - 기존 이름 아이콘은 유지하고 이메일은 `Mail`, 로그인 방식은 `LogIn` 아이콘을 사용한다.
    - 계정 정보 내용과 인증/티켓 동작은 변경하지 않는다.
  - Checklist:
    - [x] `AccountOverview`의 세 필드 라벨 구조와 아이콘을 `UserRound` / `Mail` / `LogIn`으로 통일했다.
    - [x] account 단위 테스트와 Storybook에서 세 라벨에 아이콘이 렌더링되는 것을 확인했다.
    - [x] account unit 2/2, account Storybook 3/3, ESLint, TypeScript를 통과했다.

---

## 완료 조건

- [x] 모든 태스크가 `[DONE]`이며 Acceptance/Checklist가 완료됨
- [x] 테스트 실행 및 통과 기록 완료
- [x] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

- 2026-08-14 기존 구현 승인: 사용자가 당시 최종 결과를 공유받은 뒤 응답 `마무리해줘`로 완료 흐름 진행을 승인했으나, 이후 T06/T07 후속 변경 요청이 추가되었다.
- 2026-08-14 최신 구현 승인: T07 결과 공유 후 사용자 응답 `계속진행`을 현재 구현 전체에 대한 workflow 승인 옵션 `A`로 기록했다.

### 테스트 실행 기록

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run test:auth-navigation` | `2026-08-14` | `PASS — 8/8` |
| targeted Storybook: landing/login/voice-input | `2026-08-14` | `PASS — 3 files, 16/16` |
| `pnpm run test:vocal-profile-presentation` | `2026-08-14` | `PASS — 12/12` |
| `pnpm run test:mixing:ui` | `2026-08-14` | `PASS — 8/8` |
| `pnpm run test:recommendation` | `2026-08-14` | `PASS — ranking 10/10 + UI/presentation/synthesis 20/20` |
| `pnpm run test:admin` | `2026-08-14` | `PASS — UI 4/4 + integration 1/1` |
| `pnpm run test:storybook --run` | `2026-08-14` | `PASS — 52 files passed, 2 skipped; 154/154 tests` |
| `pnpm test` | `2026-08-14` | `PASS — build + unit/integration + Storybook` |
| `pnpm run lint` | `2026-08-14` | `PASS` |
| `pnpm exec tsc --noEmit` | `2026-08-14` | `PASS` |
| targeted account: `tests/account-ui.test.tsx` + account Storybook | `2026-08-14` | `PASS — 2/2 + 3/3; T07 세 필드 아이콘 확인` |
| flaky reruns: voice-scan/admin custom mixing Storybook + Leemage cleanup | `2026-08-14` | `PASS — 13/13 + 3/3` |
| latest `pnpm test` | `2026-08-14` | `PARTIAL — 변경 무관 flaky 1건(Leemage cleanup)에서 중단; 해당 파일 단독 3/3 PASS` |

<!-- lee-spec-kit:workflow-sync 2026-08-14T13:17:49.000Z -->
