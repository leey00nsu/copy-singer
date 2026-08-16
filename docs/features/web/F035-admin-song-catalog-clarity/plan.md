# Implementation Plan: admin-song-catalog-clarity

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F035
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-16
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| UI 구조 | 곡 중심 목록 + 집중형 추가/교체 Dialog + 접힌 이전 버전 이력 | 파일 입력과 revision action을 한 화면에 반복 노출하지 않고 현재 상태와 다음 행동을 먼저 보여준다. |
| 사용자 용어 | `YouTube 미리듣기 영상`, `원곡 음원 파일`, `보관됨` | 내부 `target`·raw status를 숨기고 영상, 완성 원곡 파일과 추천 노출 상태를 구분한다. |
| 등록·교체 계약 | 기존 multipart route 유지 | 신규와 교체 모두 URL과 원곡 파일 하나를 이미 함께 받으므로 API 재설계 없이 UI 중복을 제거할 수 있다. |
| 파일 복구 | `targetReady === false`인 revision에만 기존 target upload route 노출 | source 생성 후 외부 파일 업로드가 실패한 부분 성공 상태를 복구하되 정상 상태에는 두 번째 파일 입력을 보이지 않는다. |
| 보관·복원 | 기존 archive service와 publish transaction 재사용 | 보관은 active pointer와 자료를 유지하고, 준비 완료된 기존 revision 공개는 이미 원자적 readiness 검증과 revision idempotency를 제공한다. |
| 상태 표현 | presentation helper에서 한국어 label·설명·가능 action 파생 | DB enum과 오류 코드를 UI에 직접 노출하지 않고 테스트 가능한 단일 projection을 유지한다. |
| 확인 UI | Base UI 기반 공용 `Dialog` | `window.confirm`을 제거하고 보관의 추천 제외·데이터 유지 효과와 접근 가능한 focus/keyboard 동작을 제공한다. |

---

## 아키텍처

```text
/admin/songs
  -> AdminSongCatalogPage: query/filter/pagination + server view projection
  -> CatalogManager
       -> 곡 요약: 제목/아티스트/추천 노출 상태/현재 버전/교체 준비 상태
       -> AddSongDialog
            YouTube 미리듣기 영상 + 원곡 음원 파일 1개
            -> existing POST /api/admin/catalog multipart
       -> ReplaceSongDialog
            새 YouTube 미리듣기 영상 + 새 원곡 음원 파일 1개
            -> existing POST /api/admin/catalog/{songId}/sources multipart
       -> CurrentVersionPanel / PendingVersionPanel
            분석·원곡 파일 readiness -> 한국어 상태와 다음 action
            target missing only -> 기존 target upload route를 `원곡 파일 다시 업로드`로 노출
       -> VersionHistoryDisclosure
            superseded/older revision은 읽기 중심으로 축소
       -> CatalogVisibilityActions
            ACTIVE -> `추천에서 제외` 확인 Dialog -> existing archive route
            ARCHIVED + active revision ready -> `추천에 다시 공개`
              -> existing publish route(activeSourceId)
```

신규 등록과 교체 route는 현재도 원곡 파일 하나를 `CatalogTargetAsset`으로 저장한 뒤 동일 bytes를 song-analysis worker가 Modal CPU analyzer에 전달한다. analyzer는 전체 mix에서 원키를 추정하고 Demucs 보컬 stem으로 음역을 분석한다. AI 믹싱 worker는 같은 저장 원본을 SoulX target으로 전달하고 SoulX가 다시 보컬·반주를 분리해 변환 보컬과 반주를 합친다. 따라서 UI는 보컬 단독 파일을 요구하지 않고 `보컬과 반주가 함께 있는 원곡 파일`이라는 helper copy를 유지한다.

보관은 기존처럼 `Song.lifecycleStatus=ARCHIVED`, `CatalogEntry.status=ARCHIVED`로 바꾸고 공개 집합이 달라진 catalog의 revision만 증가시킨다. active source, analysis, target asset과 과거 `MixingJob`은 유지한다. 복원은 보관 전 active source를 기존 publish transaction에 전달해 readiness를 다시 검증하고 `ACTIVE`/`PUBLISHED`로 전환한다. 곡 aggregate 영구 삭제 route와 UI는 추가하지 않는다.

---

## 파일 구조

```
src/
├── _pages/admin-song-catalog/ui/
│   └── admin-song-catalog-page.tsx
└── features/manage-song-catalog/
    ├── api/
    │   ├── admin-service.ts
    │   └── client.ts
    ├── model/
    │   ├── presentation.ts
    │   └── view.ts
    └── ui/
        ├── catalog-manager.tsx
        ├── catalog-manager.stories.tsx
        └── 필요 시 곡/버전/Dialog 단위 하위 컴포넌트

tests/
├── admin-song-catalog-ui.test.tsx
└── admin-song-catalog.integration.ts
```

- `presentation.ts`는 lifecycle/source/analysis 상태의 한국어 label, 현재·교체·이전 버전 구분, 공개 불가 이유를 순수 함수로 제공한다.
- `catalog-manager.tsx`가 과도하게 커지면 public feature 경계를 유지한 채 같은 `ui/` slice 안에서 Dialog와 version panel을 분리한다.
- `catalog-snapshot-toolbar.tsx`의 사용자-facing `target` 문구도 `원곡 파일`로 통일하되 snapshot schema와 내부 field name은 호환성을 위해 변경하지 않는다.
- Prisma schema, migration, snapshot wire schema와 background worker의 내부 `target` 명칭은 이번 UI 명료화 범위에서 변경하지 않는다.

---

## 테스트 전략

- **단위 테스트**: lifecycle/source/analysis enum을 한국어 상태와 다음 action으로 투영하고, active/latest/older source를 현재·교체 준비·이전 버전으로 결정하는 helper를 검증한다. target이 준비된 정상 상태에는 두 번째 파일 입력이 없고 target 누락 상태에서만 재업로드가 노출되는 정적/UI 계약을 검증한다.
- **통합 테스트**: 보관이 추천 entry를 제외하고 catalog revision을 한 번만 증가시키며 active source·analysis·target을 유지하는지 확인한다. 보관된 곡의 준비 완료 active source를 다시 공개하면 복원되고 반복 공개가 revision을 중복 증가시키지 않는지 검증한다.
- **Storybook/UI 테스트**: 기본 공개 곡, 신규 등록 Dialog, 교체 준비 중, 원곡 파일 누락 복구, 분석 실패/재시도, 보관됨/복원, 빈 목록, loading/disabled, 360px mobile 상태를 렌더링하고 접근 가능한 label·Dialog·action을 검증한다.
- **정적 회귀**: 관리자 UI와 snapshot toolbar의 사용자-facing `target`, `revision`, raw enum 노출을 검색하고, 관리자 권한 및 기존 multipart 필드 계약이 유지되는지 확인한다.
- **품질 게이트**: 관련 Node/Storybook 테스트, ESLint, TypeScript, architecture boundary, production build와 전체 `pnpm test`를 실행한다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
