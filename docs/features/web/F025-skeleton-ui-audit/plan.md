# Implementation Plan: skeleton-ui-audit

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F025
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-14
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| 스켈레톤 primitive | `src/shared/ui/skeleton` (`bg-muted animate-pulse`) | 기존 token 재사용, accent/gradient 없이 muted surface 규칙 유지 |
| 페이지 스켈레톤 | `src/shared/ui/page-skeleton` fallback + `src/_pages/**/ui/*-loading.tsx` 전용 | generic fallback 남용 방지, route별 레이아웃 정합 |
| Route 경계 | `app/**/loading.tsx` 얇은 re-export | FSD 경계 준수, `_pages`가 실제 UI 소유 |
| 스타일 | Tailwind 4 + `globals.css` token | 기존 spacing/gutter/max-width(72rem) 계약 유지 |
| 검증 | Storybook + `pnpm run check` + `pnpm run test:storybook` | visual regression 없이 정적 스켈레톤 검증 |

---

## 아키텍처

- 제품 route의 `loading.tsx`는 서버에서 즉시 스트리밍되는 정적 스켈레톤이어야 하므로 client hook/useEffect 없이 정적 div + Skeleton만 사용한다.
- `CreationFunnelShell`을 사용하는 funnel 페이지(Profile/Recommendation)는 스켈레톤에서도 실제 shell의 max-width·stepper 자리·gutter를 복제해 CLS를 방지한다.
- Recommendation/SongDetail의 기존 중앙 스피너는 레이아웃 보존형 스켈레톤으로 교체한다. 스피너 단독 폴백은 제거한다.
- Admin 계열은 실제 페이지의 metric band(4 tile)·filter/search·테이블 구조를 그대로 스켈레톤으로 근사한다.
- `AudioWaveformPlayer` 내부 72px veil은 페이지 스켈레톤 범위에서 제외한다.

컴포넌트 배치:

```
src/shared/ui/skeleton/skeleton.tsx        -- primitive 유지
src/shared/ui/page-skeleton/               -- generic fallback 유지
src/_app/layout/product-route-loading.tsx  -- unknown route fallback 유지
src/_pages/profile/ui/profile-loading.tsx                  -- 신규
src/_pages/account/ui/account-loading.tsx                  -- 신규
src/_pages/notifications/ui/notifications-loading.tsx      -- 신규
src/_pages/vocal-profile-detail/ui/vocal-profile-detail-loading.tsx -- 신규
src/_pages/admin/ui/admin-loading.tsx                     -- 신규
src/_pages/admin-song-catalog/ui/admin-song-catalog-loading.tsx -- 신규
src/_pages/admin-custom-mixing/ui/admin-custom-mixing-loading.tsx -- 신규
src/_pages/recommendation-detail/ui/recommendation-loading.tsx -- 교체(스켈레톤)
src/_pages/song-detail/ui/song-detail-loading.tsx         -- 교체(스켈레톤)
src/_pages/library/ui/library-loading.tsx                 -- 미세 보정
src/_pages/mixing-detail/ui/mixing-detail-loading.tsx     -- 미세 보정
app/(product)/profile/loading.tsx etc.     -- 얇은 adapter 신규 7개
```

---

## 파일 구조

```
src/
├── shared/ui/skeleton/skeleton.tsx
├── shared/ui/page-skeleton/page-skeleton.tsx
├── _app/layout/product-route-loading.tsx
├── _pages/
│   ├── profile/ui/profile-loading.tsx
│   ├── account/ui/account-loading.tsx
│   ├── notifications/ui/notifications-loading.tsx
│   ├── vocal-profile-detail/ui/vocal-profile-detail-loading.tsx
│   ├── admin/ui/admin-loading.tsx
│   ├── admin-song-catalog/ui/admin-song-catalog-loading.tsx
│   ├── admin-custom-mixing/ui/admin-custom-mixing-loading.tsx
│   ├── recommendation-detail/ui/recommendation-loading.tsx
│   ├── song-detail/ui/song-detail-loading.tsx
│   ├── library/ui/library-loading.tsx
│   └── mixing-detail/ui/mixing-detail-loading.tsx
└── app/
    ├── (product)/profile/loading.tsx
    ├── (product)/account/loading.tsx
    ├── (product)/notifications/loading.tsx
    ├── (product)/vocal-profiles/[id]/loading.tsx
    ├── admin/loading.tsx
    ├── admin/songs/loading.tsx
    └── admin/custom-mixing/loading.tsx
```

---

## 테스트 전략

- **단위/아키텍처**: `pnpm run check:architecture`에서 `_pages` 스켈레톤이 `shared/ui/skeleton`만 import하는지 확인. `pnpm run typecheck`에서 loading adapter export 일관성 확인.
- **Storybook**: 각 전용 스켈레톤을 360×800/768×1024/1280×800에서 overflow 0, skeleton 가시성, reduced-motion(animate-none) 검증.
- **수동**: Next dev에서 각 route의 Suspense 폴백이 실제 페이지와 같은 max-width/gutter/section 간격으로 보이는지 확인.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
