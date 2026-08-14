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
- **구현 승인**: -
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

---

## 완료 조건

- [x] 모든 태스크가 `[DONE]`이며 Acceptance/Checklist가 완료됨
- [x] 테스트 실행 및 통과 기록 완료
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run test:auth-navigation` | `2026-08-14` | `PASS — 8/8` |
| targeted Storybook: landing/login | `2026-08-14` | `PASS — 2 files, 6/6` |
| `pnpm run test:vocal-profile-presentation` | `2026-08-14` | `PASS — 12/12` |
| `pnpm run test:mixing:ui` | `2026-08-14` | `PASS — 8/8` |
| `pnpm run test:recommendation` | `2026-08-14` | `PASS — ranking 10/10 + UI/presentation/synthesis 20/20` |
| `pnpm run test:admin` | `2026-08-14` | `PASS — UI 4/4 + integration 1/1` |
| `pnpm run test:storybook --run` | `2026-08-14` | `PASS — 52 files passed, 2 skipped; 154/154 tests` |
| `pnpm test` | `2026-08-14` | `PASS — build + unit/integration + Storybook` |
| `pnpm run lint` | `2026-08-14` | `PASS` |
| `pnpm exec tsc --noEmit` | `2026-08-14` | `PASS` |

<!-- lee-spec-kit:workflow-sync 2026-08-14T12:39:20.000Z -->
