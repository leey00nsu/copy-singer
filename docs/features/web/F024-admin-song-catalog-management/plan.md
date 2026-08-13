# Implementation Plan: admin-song-catalog-management

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F024
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-13
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| 런타임 SSOT | PostgreSQL + Prisma | 관리자 변경을 재배포 없이 즉시 반영하고 transaction·revision 이력을 보존 |
| 초기 데이터 | 기존 JSON을 읽는 idempotent bootstrap | 분석이 완료된 100곡을 손실 없이 새 DB 모델로 이전하되 runtime import와 분리 |
| 분석 실행 | durable `SongAnalysisJob` worker | 장시간 외부 분석을 HTTP 요청 생명주기와 분리하고 재시작·재시도 지원 |
| 관리자 UI | 기존 `/admin` 내 Catalog section | 기존 allowlist, shell과 운영 패턴 재사용 |
| target audio | 관리자 multipart upload + 기존 외부 저장 client | local-only CLI 의존을 제거하고 저장 bytes/MIME/SHA-256 계약 재사용 |

---

## 아키텍처

```text
Admin form
  -> admin-only route
  -> Song + SongSource revision + SongAnalysisJob(PENDING)
  -> worker -> analyzer -> SongAnalysis(READY|FAILED)
  -> target upload -> CatalogTargetAsset(READY, sourceId)
  -> publish transaction
       Song.activeSourceId
       Song.currentAnalysisId
       Song.targetAssetId
       CatalogEntry.status=PUBLISHED

Recommendation request
  -> published CatalogEntry + Song + current SongAnalysis
  -> KeyFitProfile adapter
  -> deterministic ranking
  -> RecommendationItem.songAnalysisId snapshot
```

핵심 모델:

- `Song`: 곡 identity와 운영 상태만 소유한다.
- `SongSource`: 정규화된 YouTube URL/video ID의 immutable revision이다.
- `SongAnalysis`: source revision과 pipeline contract에 묶인 immutable 결과다.
- `SongAnalysisJob`: 분석 queue 상태·attempt·lease를 소유한다.
- `Catalog`/`CatalogEntry`: 곡 identity와 TJ 차트 position·공개 상태를 분리한다.
- `CatalogTargetAsset`: source revision을 참조하며 새 asset 활성화 전 기존 asset을 유지한다.

Breaking migration은 기존 개발 DB reset 후 bootstrap을 기준으로 한다. 과거 JSON과 신규 DB dual-read fallback은 두지 않고 비교 검증 명령만 제공한다.

---

## 파일 구조

```
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
scripts/
├── bootstrap-song-catalog.ts
└── export-song-catalog.ts
src/
├── entities/song-catalog/
│   ├── model/
│   ├── api/
│   └── lib/
├── features/manage-song-catalog/
│   ├── api/
│   ├── model/
│   └── ui/
├── features/create-recommendation/
│   ├── api/
│   └── lib/
├── _app/api-routes/admin/catalog/
└── _pages/admin/ui/
tests/
├── song-catalog-db.integration.ts
├── admin-song-catalog.integration.ts
├── song-analysis-queue.integration.ts
└── admin-song-catalog-ui.test.tsx
```

---

## 테스트 전략

- **단위 테스트**: YouTube URL 정규화, source/profile adapter, 공개 readiness, 동적 catalog ranking.
- **통합 테스트**: bootstrap idempotency, 관리자 권한·CRUD, source revision 교체, durable analysis claim/retry, publish transaction, target 교체와 과거 asset 보존.
- **UI/Storybook 테스트**: 목록·추가 form, 분석 상태, 오류·재시도, 공개 confirmation과 모바일 layout.
- **회귀 테스트**: recommendation, mixing, admin, catalog target, Prisma validation, TypeScript, lint, production build와 전체 `pnpm test`.
- **운영 데이터 검증**: 4개 신규 m4a의 video ID·MIME·크기·hash를 확인하고 신규 분석/target/publish 후 기존 잘못된 로컬 파일 4개가 사라졌는지 검사한다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
