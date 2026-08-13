# Feature Spec: skeleton-ui-audit

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F025
- **기능명**: skeleton-ui-audit
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-14
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

현재 UI에 존재하는 스켈레톤이 적절한지 감사하고, 부적절한 스켈레톤을 실제 페이지 레이아웃과 디자인 시스템에 맞게 교정한다.

감사 결과 아래 불일치가 확인됐다:

- `PageSkeleton`은 헤더 + `divide-y` 리스트 1종만 제공해 모든 route의 폴백으로 재사용되지만, 실제 페이지는 intro + tabs/metric/timeline/표/카드 등 서로 다른 레이아웃을 가진다. `app/(product)/loading.tsx` 폴백이 많은 하위 route에 그대로 노출된다.
- `/recommendations/[id]`, `/recommendations/[id]/songs/[itemId]`는 스켈레톤 대신 중앙 `LoaderCircle` 스피너 텍스트만 사용한다. 레이아웃을 보존하지 못하고 CLS와 체감 성능이 떨어진다.
- `/profile`, `/account`, `/notifications`, `/vocal-profiles/[id]`, `/admin`, `/admin/songs`, `/admin/custom-mixing`에 `loading.tsx`가 없어 부모 폴백에 의존한다. 각 페이지의 실제 max-width(72rem)·gutter·section 간격과 맞지 않는다.
- `MixingDetailLoading`과 `LibraryLoading`은 비교적 충실하지만 실제 detail의 `ProductPageIntro` 타이포그래피 위계·metric band·waveform slot과 pixel 매칭이 느슨하다.

이 기능은 route별 스켈레톤 적정성 기준을 정의하고, 부족한 스켈레톤을 추가·교체해 모든 제품 route에서 레이아웃 시프트가 최소화된 일관된 로딩 경험을 제공한다. `AudioWaveformPlayer` 내부 skeleton(72px veil)은 본 feature 범위에 포함하지 않고 페이지 레벨 스켈레톤만 다룬다.

---

## 사용자 스토리

### US-1: 레이아웃을 유지한 로딩을 보는 사용자

**As a** 제품을 탐색하는 로그인 사용자
**I want** 페이지 이동 중 실제 페이지와 같은 폭·간격·위계를 가진 스켈레톤을 보고
**So that** 깜빡임이나 큰 레이아웃 이동 없이 다음 화면이 곧 나타날 것임을 예측할 수 있다.

**Acceptance Criteria:**

- [ ] 모든 제품 route(`/profile`, `/library`, `/library/mixes/[id]`, `/recommendations/[id]`, `/recommendations/[id]/songs/[itemId]`, `/account`, `/notifications`, `/vocal-profiles/[id]`, `/admin`, `/admin/songs`)는 해당 페이지 레이아웃을 근사하는 전용 `loading.tsx`를 가진다.
- [ ] 스켈레톤은 실제 페이지의 max-width(72rem), gutter(px-5/sm:px-7/lg:px-8), section spacing과 skeleton block 크기·개수를 맞춘다. 중앙 스피너만으로 대체하지 않는다.
- [ ] `/recommendations/[id]`와 `/recommendations/[id]/songs/[itemId]`의 스피너 로딩을 레이아웃 보존형 스켈레톤으로 교체한다.
- [ ] 360px·768px·1280px에서 horizontal overflow가 없고, skeleton → 실제 콘텐츠 전환 시 눈에 띄는 CLS가 없다.

### US-2: 일관된 로딩 언어를 유지하는 디자이너/개발자

**As a** 디자인 시스템과 FSD 구조를 유지하는 개발자
**I want** 스켈레톤이 공통 token·접근성·폴백 규칙을 따르고
**So that** 새 route를 추가해도 같은 규칙으로 스켈레톤을 만들 수 있다.

**Acceptance Criteria:**

- [ ] `Skeleton` primitive(`animate-pulse bg-muted motion-reduce:animate-none`)를 재사용하고 임의의 색·애니메이션을 추가하지 않는다.
- [ ] `PageSkeleton`은 알 수 없는 route의 최소 폴백으로만 사용하고, 제품 route는 `src/_pages/**/ui/*-loading.tsx`에 전용 스켈레톤을 둔다. `app/**/loading.tsx`는 얇은 re-export만 한다.
- [ ] 모든 스켈레톤은 `aria-busy="true" aria-label role="status"`와 `sr-only` 레이블을 제공하고 reduced-motion에서 애니메이션이 정지한다.
- [ ] Storybook에서 각 스켈레톤의 desktop/tablet/mobile 변형을 독립적으로 확인할 수 있다.

### US-3: 로딩 상태를 정확히 인지하는 접근성 사용자

**As a** 스크린리더 또는 reduced-motion 설정 사용자
**I want** 로딩 중임이 정확히 전달되고 움직임이 과하지 않으며
**So that** 시각 효과에 방해받지 않고 다음 행동을 기다릴 수 있다.

**Acceptance Criteria:**

- [ ] 스켈레톤은 `aria-busy`·`role="status"`·`aria-live="polite"` 중 적절한 조합으로 로딩을 알리고, 장식용 block에는 `aria-hidden`을 적용한다.
- [ ] `prefers-reduced-motion`에서 shimmer/pulse가 제거된다.
- [ ] 스켈레톤에는 실제 데이터로 오해될 텍스트·수치를 넣지 않는다.

---

## 기능 요구사항

### FR-1: 스켈레톤 적정성 감사

- 감사 대상: `src/shared/ui/skeleton`, `src/shared/ui/page-skeleton`, `src/_app/layout/product-route-loading.tsx`, `src/_pages/**/ui/*-loading.tsx`, `app/**/loading.tsx`, waveform 내부 skeleton 제외.
- 판단 기준: (1) 실제 페이지와의 폭·gutter·타이포 위계 일치, (2) section·row·카드 개수 일치, (3) token·a11y·reduced-motion 준수, (4) CLS 기여도, (5) 재사용 적절성.
- 결과는 `spec.md` 목적/감사 결과와 `decisions.md`에 기록하고, 부적절 판정은 교체·추가 대상으로 분류한다.

### FR-2: 공통 스켈레톤 계약 유지

- `Skeleton` primitive는 유지한다. 필요한 경우에만 `rounded-*`·`h-*`·`w-*`를 조합해 형태를 만든다.
- `PageSkeleton`은 generic fallback으로 유지하되 제품 route의 주 스켈레톤으로 남용하지 않는다. `label`·`rows` prop과 a11y 속성은 유지한다.
- 새 스켈레톤은 `bg-muted` 계열과 낮은 radius(6–12px), muted surface 규칙을 따른다. accent·gradient를 사용하지 않는다.

### FR-3: Route별 전용 스켈레톤 교정

- 교체: `RecommendationLoading`, `SongDetailLoading`의 스피너를 각 페이지의 실제 레이아웃을 근사하는 스켈레톤으로 교체한다.
  - Recommendation: `CreationFunnelShell` + `ProductPageIntro` + filter bar(`bg-muted/55 p-4`) + 테이블 헤더 + 5–6행 리스트 스켈레톤
  - Song detail: 상단 back link + 타이틀/아티스트 + score 3-tile(`bg-muted/55 p-1` + `bg-background`) + 범위 차트 slot + reason 리스트 + aside action card
- 신규: `ProfileLoading`, `AccountLoading`, `NotificationsLoading`, `VocalProfileDetailLoading`, `AdminLoading`, `AdminSongCatalogLoading`, `AdminCustomMixingLoading`을 해당 페이지 구조에 맞춰 추가한다.
  - Profile: `CreationFunnelShell` steps + hero(eyebrow/title/desc) + HOW TO RECORD 4행 + 우측 voice-scan 입력 slot(파형·타이머·버튼)
  - Account: `ProductPageIntro` + 2-col 요약(`rounded-3xl bg-muted/55` + `bg-foreground`) + ledger 헤더 + 5행 ledger
  - Notifications: `ProductPageIntro` + list 헤더(전체/안읽음) + 5행 알림 + pagination
  - VocalProfileDetail: back link + artwork + title/meta + source waveform slot(72px) + 분석 결과 2–3 section
  - Admin: metric band(4 tile) + filter/search + 2개 테이블(사용자/작업) 스켈레톤
  - Admin songs: filter + catalog toolbar + 테이블/카드 리스트 스켈레톤
- 정합: `LibraryLoading`(5행)과 `MixingDetailLoading`은 실제 간격·카드 radius·padding을 재점검해 미세 보정한다.

### FR-4: Route loading 경계 완성

- 위 전용 스켈레톤을 `src/_pages/<slice>/ui/<name>-loading.tsx`에 두고 `src/_pages/<slice>/index.server.ts`에서 export한다.
- `app/(product)/profile/loading.tsx`, `app/(product)/account/loading.tsx`, `app/(product)/notifications/loading.tsx`, `app/(product)/vocal-profiles/[id]/loading.tsx`, `app/admin/loading.tsx`, `app/admin/songs/loading.tsx`, `app/admin/custom-mixing/loading.tsx`를 얇은 adapter로 추가한다.
- 기존 `app/(product)/loading.tsx`는 알 수 없는 제품 경로의 폴백으로 유지한다.

### FR-5: Storybook 및 검증

- 기존 `PageSkeleton` 스토리 유지, 전용 스켈레톤은 각 slice 또는 shared story로 360×800/768×1024/1280×800에서 overflow·CLS를 검증할 수 있게 한다.
- `pnpm run check`(biome/lint/typecheck/steiger)와 `pnpm run test:storybook` 관련 스토리를 통과한다.

---

## 비기능 요구사항

- **성능**: 스켈레톤은 정적 div·CSS만 사용하고 JS·이미지·WaveSurfer를 로드하지 않는다. CLS 0에 가깝게 유지한다.
- **접근성**: 모든 스켈레톤이 a11y 레이블과 reduced-motion 대응을 제공한다. `docs/designs/design-system.md`의 State language > Loading 규칙을 따른다.

---

## 관련 문서

- PRD: `../../prd/copy-singer-prd.md`
- PRD Refs: `PRD-FR-045`, `PRD-FR-051`
- Design: `../../designs/design-system.md`, `../../designs/product-ui-redesign.md`
- Audit 대상: `src/shared/ui/skeleton/skeleton.tsx`, `src/shared/ui/page-skeleton/page-skeleton.tsx`, `src/_app/layout/product-route-loading.tsx`, `src/_pages/**/ui/*-loading.tsx`, `app/**/loading.tsx`
