# Feature Spec: login-branding-ui

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F019
- **기능명**: login-branding-ui
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-11
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

비로그인 헤더와 로그인 화면을 단일 Google 시작 동작으로 단순화하고 제공된 헤드폰·파형 심볼을 앱 로고와 favicon으로 적용한다.

현재 비로그인 header는 동일한 `/login?callbackURL=%2Fprofile` 목적지에 `로그인`과 `무료로 시작하기`를 중복 제공한다. 로그인 화면도 header 복귀 action, 설명과 공급자 안내가 실제 단일 Google OAuth action보다 높은 정보 비용을 만든다. 기존 generic waveform icon과 favicon은 사용자가 제공한 헤드폰·파형 심볼과도 일치하지 않는다.

---

## 사용자 스토리

### US-1: 하나의 명확한 로그인 진입점

**As a** 비로그인 방문자
**I want** header와 로그인 화면에서 하나의 명확한 Google 로그인 동작을 보고 싶다.
**So that** 가입과 로그인 중 무엇을 눌러야 하는지 고민하지 않고 제품을 시작할 수 있다.

**Acceptance Criteria:**

- [ ] desktop header와 mobile navigation은 primary `로그인` action 하나만 제공하고 `무료로 시작하기`를 중복 표시하지 않는다.
- [ ] 로그인 page header는 `홈으로` action을 표시하지 않는다.
- [ ] 로그인 중심 콘텐츠는 제품 로고, 그 아래 `Copy Singer`, muted `계속하려면 로그인하세요.`, Google icon이 있는 `구글로 시작하기` button과 Google 로그인 약관 동의 안내를 표시한다.
- [ ] OAuth pending·설정 누락·실패 상태와 safe callback URL 동작은 유지한다.

### US-2: 일관된 Copy Singer 앱 마크

**As a** 방문자
**I want** header, 로그인 화면과 browser tab에서 같은 Copy Singer 심볼을 보고 싶다.
**So that** 페이지와 진입 경로가 달라도 같은 제품임을 즉시 인식할 수 있다.

**Acceptance Criteria:**

- [ ] 제공된 이미지의 짙은 헤드폰 silhouette과 pink–violet–blue 파형을 보존한 투명 로고 자산을 사용한다.
- [ ] 공통 ProductBrand와 로그인 화면은 같은 master logo를 사용하고 제품명 accessible name을 유지한다.
- [ ] favicon은 같은 master에서 파생하며 16px·32px browser 표시에서도 식별 가능하다.

---

## 기능 요구사항

### FR-1: 비로그인 header action 단일화

- desktop과 mobile 비로그인 header는 `/login?callbackURL=%2Fprofile`로 이동하는 primary `로그인`만 제공한다.
- 인증 사용자 menu와 제품 navigation의 callback URL 정책은 변경하지 않는다.

### FR-2: 최소 로그인 화면과 Google action

- login header에서는 `홈으로` link를 제거한다.
- 중심 콘텐츠에서 `Account`, `계정으로 시작하세요`, 제품 기능 설명, border section과 정적 Google-only 안내를 제거한다.
- `Copy Singer` 아래에는 muted `계속하려면 로그인하세요.`를 표시하고 Google action 아래에는 Google 계정 로그인 시 Copy Singer의 이용 약관 및 개인정보 처리방침에 동의한다는 안내를 표시한다.
- Google button은 공식 multicolor G icon과 `구글로 시작하기` label을 사용하며 pending에는 진행 상태 label, 설정 누락·실패에는 기존 조건부 상태를 유지한다.

### FR-3: 공통 app mark와 favicon

- Image 2를 edit target으로 사용해 불필요한 흰 배경과 과도한 여백을 제거한 투명 square master PNG를 만든다.
- master는 헤드폰과 다섯 파형 bar의 구성·dark/pink/violet/blue 관계를 보존하고 text·shadow·추가 장식을 포함하지 않는다.
- 공통 ProductBrand, login hero와 metadata favicon이 같은 asset family를 사용한다.

### 제외 범위

- Google OAuth provider/API, session, callback validation 변경
- Landing hero의 `무료로 시작하기` CTA 문구 변경
- 새로운 wordmark font 제작 또는 다른 화면의 아이콘 전면 교체
- OG image 재디자인

---

## 비기능 요구사항

- **성능**: header logo는 작은 고정 크기와 적절한 intrinsic size로 layout shift를 만들지 않는다. favicon과 master asset을 필요한 크기로 분리한다.
- **보안**: `safeCallbackURL`, Google OAuth provider와 error 처리 계약을 보존한다.
- **접근성**: Google icon과 logo mark는 장식으로 숨기고 button/link의 text로 accessible name을 제공한다. disabled·pending·error 상태를 색상만으로 전달하지 않는다.
- **시각 품질**: 투명 corner, alpha edge, 16px·24px·32px 축소 식별성과 light background 대비를 검수한다.

---

## 관련 문서

- PRD: `../../prd/`
- PRD Refs: `PRD-US-010`, `PRD-US-019`, `PRD-US-024`, `PRD-FR-045`, `PRD-FR-046`, `PRD-FR-051`, `PRD-FR-052`
  - 이미 원문 요구사항 문서에 정의된 ID만 적으세요. `spec.md`나 `tasks.md`에서 임의로 PRD ID를 만들지 않습니다.
  - 레거시 요구사항 문서에 아직 PRD ID가 없다면, 먼저 원문에 ID를 backfill한 뒤 이 필드와 `tasks.md` 태스크 태그를 함께 갱신하세요.
  - 요구사항/스코프 변경 시 PRD 문서 + 이 필드 + `tasks.md` 태스크 태그를 함께 갱신하세요.
  - 구현 중 더 나은 사용자 동작이 발견되어 최종 요구사항이 바뀌었다면, 이를 영구적인 `[NON-PRD]` 예외로 두지 말고 PRD 업데이트로 취급하세요.
