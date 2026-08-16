# Implementation Plan: admin-song-catalog-first-import

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F037
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-16
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| Framework | Next.js 16 App Router Server Component | 관리자 권한과 DB 조회를 서버 경계에 유지하면서 초기 상태를 렌더링한다. |
| Data access | Prisma 7 PostgreSQL | 기존 고정 slug 조회와 snapshot transaction import를 재사용한다. |
| Client mutation | TanStack Query + 기존 import client | 기존 파일 업로드, 오류 toast, `router.refresh()` 전환 계약을 보존한다. |
| Validation | Node test + TypeScript/source contract test | 빈 카탈로그 판별과 UI action 제한을 재현하고 기존 관리자 회귀를 함께 확인한다. |

---

## 아키텍처

`listAdminCatalog`의 API용 실패 계약은 유지하고, 관리자 페이지가 사용할 nullable 조회 경계를 추가한다. 이 경계는 고정 slug 카탈로그가 없을 때만 `null`을 반환하고, 존재하면 현재 pagination·filter 결과를 반환한다. DB 조회 실패나 권한 실패는 삼키지 않는다.

`AdminSongCatalogPage`는 nullable 결과를 기준으로 두 상태를 렌더링한다.

1. **최초 복원 상태**: 페이지 header와 안내, import 전용 `CatalogSnapshotToolbar`만 렌더링한다. 검색·곡 추가·내보내기는 제공하지 않는다.
2. **일반 관리 상태**: 현재 목록, 검색·필터, 추가·보관·공개 및 import/export 동작을 그대로 렌더링한다.

`CatalogSnapshotToolbar`는 `canExport` 입력으로 export 노출만 제어한다. import mutation은 기존 `/api/admin/catalog/import`를 호출하며, API가 transaction에서 Catalog를 upsert한 뒤 `router.refresh()`가 서버 컴포넌트를 일반 관리 상태로 전환한다. GET 페이지 요청은 카탈로그를 생성하지 않는다.

---

## 파일 구조

```
src/
├── features/manage-song-catalog/
│   ├── api/admin-service.ts                 # nullable 페이지 조회 경계
│   └── ui/catalog-snapshot-toolbar.tsx      # 초기 상태에서 export 제한
└── _pages/admin-song-catalog/ui/
    └── admin-song-catalog-page.tsx          # 최초 복원/일반 관리 상태 분기
tests/
├── admin-song-catalog.integration.ts        # 조회·import DB 계약
└── admin-song-catalog-ui.test.tsx           # 초기 상태 action/안내 회귀
```

---

## 테스트 전략

- **단위 테스트**: toolbar와 페이지 소스 계약에서 초기 상태가 import를 유지하고 export·관리 action을 제한하는지 확인한다.
- **통합 테스트**: 가능한 DB 환경에서 대상 catalog가 없을 때 nullable 조회가 `null`을 반환하고 기존 `listAdminCatalog`는 `CATALOG_NOT_FOUND` 계약을 유지하는지 확인한다. snapshot import의 카탈로그 생성은 기존 snapshot 회귀 suite를 재실행한다.
- **E2E 테스트**: 별도 브라우저 자동화는 추가하지 않고 production build와 관리자 UI/DB 통합 테스트로 서버·클라이언트 경계를 검증한다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
