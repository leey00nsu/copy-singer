# Tasks: skeleton-ui-audit

## 태스크 규칙

- **상태**: `[TODO]` → `[DOING]` → `[TODO]`
- **태스크 공유 / 확인**:
  - `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 `tasks.md`에서 상태를 함께 갱신합니다
  - `[DOING] → [TODO]`: 완료 전 결과/검증을 공유하고 같은 수정에서 `Acceptance`와 `Checklist`를 함께 갱신합니다
  - 태스크 상태 변경 전에 승인이 필요한 경우는 문서화된 review checkpoint 또는 원격/파괴적 작업 직전뿐입니다.
  - 워크플로우가 요구하지 않는 standalone `OK` 승인 단계는 만들지 않습니다.
  - 해당 태스크의 `Checklist`에 unchecked 항목이 남아 있으면 `[TODO]`으로 전환하지 않습니다.
- **PRD 매핑(권장)**: 각 태스크 라인에 `[PRD-FR-001]` 또는 `[PRD-SCOPE-V1-DESKTOP-EDITOR]` 같은 기존 PRD 요구사항 ID 태그를 추가하거나, PRD와 무관한 태스크는 `[NON-PRD]`로 표시하세요.
  - 단, `tasks.md`에서 PRD ID를 임의로 만들지 마세요. `docs/prd` 또는 상위 요구사항 문서에 먼저 정의된 ID만 참조해야 합니다.
  - 레거시 문서에 아직 PRD ID가 없다면, 먼저 원문 요구사항 문서에 ID를 backfill한 뒤 `spec.md`의 `PRD Refs`와 태스크 태그를 함께 맞추세요.
  - `[NON-PRD]`는 내부 구현 작업 전용입니다. 사용자 동작, acceptance criteria, 범위가 바뀌는 태스크라면 PRD를 먼저 backfill하고 `[PRD-...]`로 태깅하세요.

---

## 로컬 추적 정보
- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/skeleton-ui-audit`
- **대기 중 변경 요청**: -
  - 구현 중 새로 수용한 사용자 요청을 잠시 표시하는 sync marker입니다
  - 요청을 `tasks.md`와 관련 문서에 반영한 뒤 값을 비우세요
  - pre-PR 리뷰 handoff를 시작하면 `Running`, 리뷰 결과 기록까지 끝나면 `Done`으로 변경
  - 형식: `결정: approve|changes_requested|blocked ...` (또는 `decision: ...`)
  - PR 생성 전 최종 통과 기준은 `approve`
  - 기본 베이스라인으로 `agents/skills/create-pr.md`(`Pre-PR 기본 체크리스트`) 기준을 따르세요
- **PR 리뷰**: -
  - PR 리뷰 handoff를 시작하면 `Running`, 팀에서 별도 완료 상태를 추적할 때만 `Done`으로 변경
- **PR 리뷰 Evidence**: -
  - 리뷰 지적사항을 왜/어떻게 반영했는지 `결정: ...`(또는 `decision: ...`) 형식으로 기록

---

## 태스크 엔트리 포맷

```markdown
- [TODO][PRD-FR-001] T-{feature-ref}-01 {태스크 제목}
  - Date: YYYY-MM-DD
  - Acceptance:
    - (검증 조건)
  - Checklist:
    - [ ] (서브 태스크)
```

> 위 예시의 `PRD-FR-001`은 가능한 `PRD-*` key 중 하나일 뿐입니다. 아직 PRD 원문에 정의되지 않았다면 태스크에 먼저 넣지 마세요.
> 처음엔 탐색/내부 작업이었더라도 제품 요구사항 변경으로 이어졌다면, `NON-PRD`로 두지 말고 PRD를 먼저 갱신한 뒤 `[PRD-...]`로 재태깅하세요.

---

## 태스크 목록

- [DONE][PRD-FR-051] T-F025-skeleton-ui-audit-01 스피너 기반 Recommendation/SongDetail 로딩을 레이아웃 보존형 스켈레톤으로 교체
  - Date: 2026-08-14
  - Acceptance:
    - recommendation-detail 스피너가 제거되고 CreationFunnelShell + ProductPageIntro + filter bar + 5–6행 테이블 스켈레톤으로 교체된다
    - song-detail 스피너가 제거되고 back link + score 3-tile + 차트 slot + reason 리스트 + aside card 스켈레톤으로 교체된다
    - 두 스켈레톤이 실제 페이지와 같은 max-width(72rem)·gutter·section spacing을 사용한다
  - Checklist:
    - [x] `src/_pages/recommendation-detail/ui/recommendation-loading.tsx` 교체
    - [x] `src/_pages/song-detail/ui/song-detail-loading.tsx` 교체
    - [x] `src/_pages/recommendation-detail/index.server.ts` / `src/_pages/song-detail/index.server.ts` export 일관성 확인
    - [x] Storybook/a11y(reduced-motion, aria-busy/role) 확인

- [DONE][PRD-FR-051] T-F025-skeleton-ui-audit-02 Profile/Account/Notifications 전용 스켈레톤과 loading 경계 추가
  - Date: 2026-08-14
  - Acceptance:
    - `/profile`, `/account`, `/notifications`가 전용 스켈레톤과 `app/**/loading.tsx` 얇은 adapter를 가진다
    - 각 스켈레톤이 실제 페이지의 shell·intro·section 구조를 근사하고 Skeleton primitive와 a11y 규칙을 따른다
    - 360/768/1280에서 overflow 0과 CLS 최소화를 수동 확인한다
  - Checklist:
    - [x] `src/_pages/profile/ui/profile-loading.tsx` 신규
    - [x] `src/_pages/account/ui/account-loading.tsx` 신규
    - [x] `src/_pages/notifications/ui/notifications-loading.tsx` 신규
    - [x] `src/_pages/profile/index.server.ts` 등 export 추가
    - [x] `app/(product)/profile/loading.tsx` 등 adapter 3개 추가
    - [x] Storybook/a11y 확인

- [DONE][PRD-FR-051] T-F025-skeleton-ui-audit-03 VocalProfileDetail/Admin 계열 전용 스켈레톤과 loading 경계 추가
  - Date: 2026-08-14
  - Acceptance:
    - `/vocal-profiles/[id]`, `/admin`, `/admin/songs`, `/admin/custom-mixing`이 전용 스켈레톤과 `app/**/loading.tsx` adapter를 가진다
    - Admin 스켈레톤은 metric band·filter·테이블 구조를 근사한다
    - 실제 페이지와 같은 gutter와 spacing을 사용한다
  - Checklist:
    - [x] `src/_pages/vocal-profile-detail/ui/vocal-profile-detail-loading.tsx` 신규
    - [x] `src/_pages/admin/ui/admin-loading.tsx` 신규
    - [x] `src/_pages/admin-song-catalog/ui/admin-song-catalog-loading.tsx` 신규
    - [x] `src/_pages/admin-custom-mixing/ui/admin-custom-mixing-loading.tsx` 신규
    - [x] `app/(product)/vocal-profiles/[id]/loading.tsx` 등 adapter 추가
    - [x] 각 index.server.ts export 확인
    - [x] Storybook/a11y 확인

- [DONE][PRD-FR-045] T-F025-skeleton-ui-audit-04 Library/MixingDetail 스켈레톤 정합 및 공통 폴백 정리
  - Date: 2026-08-14
  - Acceptance:
    - `LibraryLoading`과 `MixingDetailLoading`이 실제 페이지의 ProductPageIntro·metric band·waveform slot 간격과 radius를 재점검해 보정된다
    - `PageSkeleton`과 `ProductRouteLoading`은 unknown route 폴백으로 유지되고 제품 route에서 남용되지 않는다
    - 모든 스켈레톤이 `animate-pulse bg-muted motion-reduce:animate-none`와 a11y 레이블을 유지한다
  - Checklist:
    - [x] `src/_pages/library/ui/library-loading.tsx` 보정(필요 시)
    - [x] `src/_pages/mixing-detail/ui/mixing-detail-loading.tsx` 보정(필요 시)
    - [x] `src/shared/ui/page-skeleton` / `src/_app/layout/product-route-loading.tsx` 재사용 규칙 확인
    - [x] 전체 360/768/1280 수동 점검

- [TODO][NON-PRD] T-F025-skeleton-ui-audit-05 Storybook·품질 게이트·문서 동기화
  - Date: 2026-08-14
  - Acceptance:
    - 신규/교체 스켈레톤의 Storybook을 360×800/768×1024/1280×800에서 확인하고 overflow 0을 기록한다
    - `pnpm run check`(biome/lint/typecheck/steiger)와 관련 `pnpm run test:storybook --run`이 통과한다
    - `decisions.md`에 감사 결과와 선택 근거를 기록한다
  - Checklist:
    - [ ] Storybook story 추가 또는 기존 story 보강
    - [ ] `pnpm run check` 실행 및 수정
    - [ ] `pnpm run test:storybook --run` 관련 스토리 통과
    - [ ] `decisions.md` ADR 추가
    - [ ] workflow-audit 마킹

---

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [ ] 모든 태스크가 `[TODO]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료
- [ ] 테스트 실행 및 통과 (아래에 명령어/결과 기록)
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run check` | `-` | `-` |
| `pnpm run test:storybook --run src/shared/ui/page-skeleton/page-skeleton.stories.tsx ...` | `-` | `-` |






















