# Feature Spec: notification-brand-color

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F027
- **기능명**: notification-brand-color
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-14
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

아이콘·버튼·칩의 검정 일색(`bg-primary`/`text-foreground`/`bg-muted`)을 브랜드 컬러로 선택적 교체한다. 알림 모달은 그 대표 사례다: 아이콘 배지가 모두 `bg-muted text-foreground`로 같고 호버(`focus:bg-accent`≈`muted`)와 구분이 안 돼 종류 구분과 인터랙션 피드백이 약하다. 이 feature는 디자인 시스템 "Brand gradient는 연속 데이터와 active signal에만, primary 버튼/보더/포커스 링에는 단색 유지" 규칙을 지키면서, 상태성 있는 아이콘·칩만 `data-accent`/`success`/`destructive`로 선택적 교체하고 알림 모달 호버 대비를 확보한다.

---

## 사용자 스토리

### US-1: 알림 종류를 한눈에 구분하는 사용자

**As a** 알림 모달과 알림 목록을 보는 사용자
**I want** 아이콘 배지 색만으로 티켓 지급·분석 성공/실패·믹싱 성공/실패를 구분하고
**So that** 글을 읽기 전에 어떤 알림인지 즉시 알 수 있다.

**Acceptance Criteria:**

- [ ] `NotificationItemContent`의 아이콘 배지가 타입별 컬러로 구분된다: `ticket_credit`→`success`, `vocal_profile_succeeded`/`mixing_succeeded`→`data-accent`, `vocal_profile_failed`/`mixing_failed`→`destructive`
- [ ] 배지는 `oklch` 대비 기준을 만족하고 다크모드에서도 구분된다
- [ ] Bell 배지(`bg-data-accent`)와 체계가 일관된다

### US-2: 호버 피드백을 명확히 받는 사용자

**As a** 알림 모달에서 항목에 마우스를 올린 사용자
**I want** 호버된 항목과 아이콘 배지가 배경과 명확히 구분되고
**So that** 어느 항목을 클릭할지 확신할 수 있다.

**Acceptance Criteria:**

- [ ] `DropdownMenuItem` 호버 시 항목 배경과 아이콘 배지 배경의 대비가 확보된다 (muted≈accent 중복 해소)
- [ ] 아이콘 배지는 호버 시에도 타입 컬러를 유지하거나 더 진해지며 배경과 겹치지 않는다
- [ ] 키보드 focus(`focus-visible`)에서도 같은 대비가 유지된다

### US-3: 상태 칩의 의미를 컬러로 즉시 아는 사용자

**As a** 추천·라이브러리·믹싱 상태를 보는 사용자
**I want** 활성/선택 상태의 칩이 브랜드 컬러로 강조되고 비활성은 neutral로 남아
**So that** 현재 상태와 선택을 즉시 알 수 있다.

**Acceptance Criteria:**

- [ ] 선택·활성 상태의 칩/`Badge`(예: 필터 선택, 활성 analysis job, 선택된 추천 카드 표시)만 `data-accent` 계열로 강조한다
- [ ] 비활성·empty·disabled 칩은 `secondary`/`outline` neutral을 유지한다
- [ ] "한 화면에 하나의 primary action"과 "넓은 배경은 neutral 유지" 원칙을 깨지 않는다 (primary 버튼은 검정 유지)

---

## 기능 요구사항

### FR-1: 알림 아이콘 타입별 컬러

- `src/entities/notification/ui/notification-item-content.tsx`의 `bg-muted text-foreground` 통일을 타입별 맵으로 교체한다.
  - `ticket_credit` → `bg-success text-success-foreground` (초록, Bell 배지와 다른 계열로 구분)
  - `vocal_profile_succeeded`, `mixing_succeeded` → `bg-data-accent text-white` 또는 `bg-data-accent/15 text-data-accent-foreground` 중 대비 검증 후 선택 (Bell 배지와 일관)
  - `vocal_profile_failed`, `mixing_failed` → `bg-destructive/10 text-destructive` (기존 destructive 규칙 유지)
- 아이콘 자체는 `size-4` 유지, 배지는 `size-9 rounded-full` 유지.

### FR-2: 알림 모달 호버 대비 확보

- `src/features/manage-notifications/ui/notification-bell.tsx`의 `DropdownMenuItem` 호버(`focus:bg-accent`≈`muted`) 대비를 확보한다.
- 옵선: (a) 아이콘 배지가 컬러이므로 호버 배경을 `bg-muted`보다 진한 `bg-accent`가 아닌 `bg-foreground/5` 등으로 분리, 또는 (b) 배지는 `group-focus` 시 더 진해지도록. 두 중 시각 검증 후 선택하되, 아이콘 컬러 유지가 우선.
- 전체 알림 보기(`/notifications`)의 `hover:bg-muted/60`와도 톤을 맞춘다.

### FR-3: 상태 칩 선택적 브랜드 컬러

- `Badge`/`badgeVariants`와 `Button` secondary/ghost 중 상태성인 것만 선택적 교체한다. 예: Library filter 활성 칩, recommendation filter 선택, mixing status의 succeeded/active.
- 비활성·disabled·empty는 neutral 유지. `primary` 버튼(검정)은 변경하지 않는다.
- 변경 대상은 코드 grep으로 상태성 칩을 식별하고, 디자인 시스템 "한 surface에 accent 2개 이상 혼용 금지"를 지킨다.

### FR-4: 검증

- Storybook에서 알림 모달(bell dropdown)과 칩 상태를 360/768/1280에서 확인한다.
- `pnpm run check:architecture` / `pnpm run lint` / `pnpm run typecheck` / `pnpm run test:storybook --run` 관련 스토리를 통과한다.

---

## 비기능 요구사항

- **접근성**: 배지 컬러는 `oklch` 대비로 AA 이상, `aria-label`/`sr-only`는 유지한다.
- **성능**: CSS 토큰만 사용, 추가 JS 없음.

---

## 관련 문서

- PRD: `../../prd/copy-singer-prd.md`
- PRD Refs: `PRD-FR-045`, `PRD-FR-051`
- Design: `../../designs/design-system.md` (Color, Accent 사용 규칙, Brand signal)
- Audit 대상: `src/entities/notification/ui/notification-item-content.tsx`, `src/features/manage-notifications/ui/notification-bell.tsx`, `src/shared/ui/badge/badge.tsx`, `src/shared/ui/button/button.tsx`, `src/_app/styles/globals.css`

