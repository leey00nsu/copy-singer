# Implementation Plan: product-quality-hardening

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F026
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-14
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| 상태 UI | `StatePanel`/`StatusNotice` + `Skeleton` | 디자인 시스템 State language 단일 규칙, muted surface 일관 |
| FSD 린트 | `@feature-sliced/steiger-plugin` | slice 경계·forbidden-import·insignificant-slice 검증 |
| 스켈레톤 스토리 | Storybook + `@vitest/browser` + `@storybook/addon-a11y` | 뷰포트·reduced-motion·a11y 회귀 검증 |
| 데이터 페칭 | Next RSC + TanStack Query `useSuspenseQuery` + `HydrationBoundary` | Suspense 스트리밍·waterfall 제거, revision key 유지 |
| 접근성 | axe-core, 키보드 수동 체크리스트 | focus-visible·trap·seek 계약 검증 |
| 관찰성 | Sentry(선택) 또는 구조화 logger | DSN 없으면 no-op, PII 없이 jobId/errorCode 로깅 |

---

## 아키텍처

- **상태 언어**: 모든 empty/error/disabled/permission을 `StatePanel`(page 차원) / `StatusNotice`(inline)로 통일. retry 가능 error는 `reset()` + stale 유지 문구, 불가 error는 안전한 링크.
- **FSD**: `create-mixing`의 cross-import를 shared contract로 승격하거나 app 경계로 이동. insignificant-slice는 실제 소비자(App/worker)가 있으면 steiger exception으로 좁게 허용, 아니면 병합.
- **스토리북**: 각 스켈레톤을 `Shared UI/Skeletons/*` 또는 slice story로 등록. 360/768/1280 + reduced-motion 테스트 포함.
- **RSC**: `QueryClient` prefetch → `HydrationBoundary` → `useSuspenseQuery` 패턴. `loading.tsx`가 Suspense 폴백으로 동작하도록 route 구조 확인.
- **관찰성**: worker/API의 실패 경로에만 `captureException` 추가. `SENTRY_DSN` 없으면 import만 하고 no-op.

```
src/shared/ui/state-panel/      -- tone 규칙 SSOT
src/shared/ui/status-notice/    -- inline 상태 SSOT
src/shared/ui/skeleton/         -- primitive 유지
src/_pages/**/ui/*-loading.tsx  -- 스켈레톤 story 등록 대상
steiger.config.ts               -- exception 좁게 조정
src/_app/styles/globals.css     -- token 유지
src/_pages/recommendation-detail|song-detail|mixing-detail -- RSC prefetch 개선
```

---

## 파일 구조

```
src/
├── shared/ui/state-panel/state-panel.tsx
├── shared/ui/status-notice/status-notice.tsx
├── shared/ui/skeleton/skeleton.tsx
├── _pages/*/ui/*-loading.tsx (+ *.stories.tsx)
├── _pages/recommendation-detail/ui/recommendation-results.tsx
├── _pages/mixing-detail/ui/mixing-detail.tsx
├── features/create-mixing/api/mixing-queue.ts
├── entities/song-catalog/
├── features/admin-custom-mixing/
├── features/manage-song-catalog/
├── widgets/library/
└── steiger.config.ts
```

---

## 테스트 전략

- **아키텍처**: `pnpm run check:architecture` 0 error
- **타입/린트**: `pnpm run typecheck` + `pnpm run lint` 통과
- **스토리북**: `pnpm run test:storybook --run` — 스켈레톤 뷰포트·a11y·reduced-motion 포함
- **수동**: 키보드 전체 플로우 순회, 스크린리더 aria-busy/live 중복 체크, waveform seek 일관성
- **관찰성**: DSN 없으면 빌드 영향 0, 있으면 error capture 스모크

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)

