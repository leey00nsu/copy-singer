# Implementation Plan: notification-brand-color

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F027
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-14
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| 토큰 | `globals.css` `data-accent`/`success`/`destructive` + `accent`/`muted` | 기존 oklch 토큰 재사용, 다크모드 대응 |
| 컴포넌트 | `NotificationItemContent`, `DropdownMenuItem`, `Badge` | 상태 아이콘·호버·칩의 직접 소유 |
| 검증 | Storybook + browser test + `pnpm run check` | 시각·a11y 회귀 검증 |

---

## 아키텍처

- `NotificationItemContent`에 타입→스타일 맵(`Record<NotificationType, string>`)을 추가해 배지 `bg-*`/`text-*`를 분기한다. 아이콘 매핑은 기존 `icons` 객체와 병렬.
- `NotificationBell`의 `DropdownMenuItem`은 `focus:bg-accent`≈`bg-muted` 중복을 해소한다. 배지가 컬러이므로 호버 배경은 진한 neutral과 구분하되 배지 컬러는 유지.
- 작업 lifecycle 상태는 shared `lifecycleStatusClassNames`를 SSOT로 사용한다: active/current=brand tint, completed intermediate=foreground solid, terminal success=brand solid, failed=destructive, upcoming/canceled=neutral. 선택 상태 accent와 `primary` 버튼 검정은 기존 규칙을 유지한다.

```
src/entities/notification/ui/notification-item-content.tsx  -- FR-1
src/features/manage-notifications/ui/notification-bell.tsx  -- FR-2
src/shared/lib/lifecycle-status-colors.ts + 상태 UI 호출부       -- FR-3
src/_app/styles/globals.css                          -- 토큰 참조만
```

---

## 파일 구조

```
src/
├── entities/notification/ui/notification-item-content.tsx
├── features/manage-notifications/ui/notification-bell.tsx
└── shared/ui/badge/badge.tsx
```

---

## 테스트 전략

- **시각**: Storybook에서 bell dropdown(열림 상태)과 칩 상태를 360/768/1280에서 확인.
- **아키텍처/타입**: `pnpm run check` (steiger + lint + typecheck) 통과.
- **스토리북**: `pnpm run test:storybook --run` 관련 스토리 통과.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)

