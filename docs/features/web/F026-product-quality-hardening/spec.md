# Feature Spec: product-quality-hardening

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F026
- **기능명**: product-quality-hardening
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-14
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

단일 종합 품질 개선으로 아래 6개 영역의 잔여 부채를 한 번에 해소한다. F025에서 loading skeleton을 정리했다면, 이 feature는 나머지 상태 언어·아키텍처·스토리북·데이터 페칭·접근성·메타데이터/관찰성을 같은 품질 기준으로 끌어올린다.

**배경 감사 결과:**

1. **상태 언어 불일치**: route마다 empty/error/disabled/permission 문구·아이콘·action이 다르다. 일부는 `StatePanel` destructive + retry, 일부는 inline `StatusNotice`, 일부는 스피너 혼용. 디자인 시스템 State language 테이블과 어긋난다.
2. **FSD 아키텍처 경고 5건**: `pnpm run check:architecture`에서 for(1)bidden-import 1건과 insignificant-slice 4건이 지속된다. (`create-mixing/mixing-queue.ts`의 cross-import, `song-catalog` 등 단일 참조 slice)
3. **스켈레톤 Storybook 부재**: F025에서 9개 전용 스켈레톤을 추가했으나 Storybook story는 `PageSkeleton` 2개뿐이다. 뷰포트(360/768/1280) 자동 검증이 없다.
4. **RSC 스트리밍/Waterfall**: `RecommendationResults`, `SongDetail`, `MixingDetail`, `NotificationsList` 등이 SSR `initial` + client `useQuery`로 구성돼 Suspense 이점이 반감되고 waterfall이 발생한다.
5. **접근성 심화 미흡**: 자동 lint/a11y는 통과하지만 키보드 플로우 전체 순회, 스크린리더 `aria-busy/live` 중복, waveform 키보드 seek 일관성은 수동 감사가 없다.
6. **메타데이터/관찰성**: sitemap/robots/OG는 존재하지만 관리자·상세의 `noindex`·OG 갱신이 누락됐고, PRD 상 PostHog/Sentry는 instrumentation이 비어 있다.

---

## 사용자 스토리

### US-1: 일관된 상태 언어를 보는 사용자

**As a** 빈 목록·오류·권한 거부를 마주한 사용자
**I want** 어디서든 같은 톤의 제목·설명·아이콘·다음 행동을 보고
**So that** 무엇이 문제인지와 다음에 무엇을 해야 할지 즉시 알 수 있다.

**Acceptance Criteria:**

- [ ] 모든 제품 route의 empty/error/disabled/permission 상태가 디자인 시스템 State language 테이블의 tone(icon/root)·문구·action 규칙을 따른다
- [ ] error 상태는 retry 가능/불가와 stale data 유지 여부를 구분해 안내한다
- [ ] Storybook에서 각 상태 tone을 독립적으로 확인할 수 있다

### US-2: 깨지지 않는 FSD 경계에서 작업하는 개발자

**As a** slice 경계를 지켜 작업하는 개발자
**I want** `pnpm run check:architecture`가 warning 0으로 통과하고
**So that** 다음 feature에서 잘못된 cross-import를 실수로 만들지 않는다.

**Acceptance Criteria:**

- [ ] forbidden-import 1건이 해소된다 (create-mixing → create-recommendation 직접 참조 제거 또는 shared로 승격)
- [ ] insignificant-slice 4건이 해소된다 (병합 또는 `steiger.config.ts`에서 근거 있는 exception으로 명시)
- [ ] `pnpm run check:architecture`가 0 error로 통과한다

### US-3: 스켈레톤을 시각 회귀로 검증하는 디자이너

**As a** 레이아웃을 검토하는 디자이너
**I want** Storybook에서 모든 스켈레톤을 3개 뷰포트로 확인하고
**So that** 다음 변경에서 시각 회귀를 자동으로 잡을 수 있다.

**Acceptance Criteria:**

- [ ] 9개 전용 스켈레톤(Profile/Account/Notifications/VocalProfileDetail/Admin/AdminSongs/AdminCustomMixing/Recommendation/SongDetail) + Library/MixingDetail이 `Shared UI/Skeletons` 또는 각 slice story로 등록된다
- [ ] 360×800/768×1024/1280×800에서 horizontal overflow 0을 브라우저 테스트로 검증한다
- [ ] reduced-motion에서 `animate-none`이 적용됨을 regression test로 검증한다

### US-4: 빠르게 스트리밍되는 페이지를 보는 사용자

**As a** 추천·믹싱 상세를 여는 사용자
**I want** HTML이 점진적으로 스트리밍되고 불필요한 waterfall이 없으며
**So that** 다음 화면을 더 빨리 볼 수 있다.

**Acceptance Criteria:**

- [ ] `useQuery(initial)` 패턴을 `useSuspenseQuery` + RSC prefetch(HydrationBoundary) 또는 route-level Suspense 경계로 개선한다. 최소 Recommendation, SongDetail, MixingDetail에서 waterfall 1단계 이상 감소한다
- [ ] TanStack Query key가 `catalogRevision/scoringVersion` 등 revision 계약을 유지한다
- [ ] `loading.tsx` 스켈레톤이 Suspense 폴백으로 실제로 사용된다

### US-5: 키보드·스크린리더로 전 플로우를 완료하는 사용자

**As a** 키보드·스크린리더 사용자
**I want** Profile → Library → Recommendations → SongDetail → MixingDetail 전 플로우를 키보드로 완료하고 스크린리더 중복 안내가 없으며
**So that** 시각 효과 없이도 제품을 완전히 사용할 수 있다.

**Acceptance Criteria:**

- [ ] Tab/Shift+Tab/Enter/Escape로 전 플로우의 모든 interactive 요소에 도달하고 포커스 트랩/복원이 올바르다
- [ ] `aria-busy`/ `aria-live`가 중복으로 울리지 않고, skeleton 장식에는 `aria-hidden`이 적용된다
- [ ] waveform 키보드 seek(좌우 화살표/스페이스 등)가 모든 오디오 경로에서 동일 계약으로 동작한다
- [ ] axe + 수동 체크리스트로 critical 0을 유지한다

### US-6: 올바른 메타데이터와 관찰성을 가진 운영자

**As a** 검색·공유·운영을 담당하는 운영자
**I want** sitemap/robots/OG/noindex가 정확하고, 분석·믹싱 실패가 관찰 가능하며
**So that** 잘못된 인덱싱 없이 문제를 빠르게 인지한다.

**Acceptance Criteria:**

- [ ] `/admin/*`, `/recommendations/*`, `/vocal-profiles/*` 등 인증·관리자 route는 `noindex`를 유지하고, public sitemap에는 public route만 포함된다
- [ ] OG 이미지(1200×630)와 canonical/home 메타가 최신 디자인과 일치한다
- [ ] 분석·믹싱 큐(analysis/mixing worker)의 실패가 Sentry 또는 구조화된 로그로 관찰 가능하다 (최소 error capture + context: userId/jobId)

---

## 기능 요구사항

### FR-1: 상태 언어 감사·통일

- 대상: `app/**/error.tsx`, `app/**/not-found.tsx`, `src/_pages/**/ui`, `src/shared/ui/state-panel`, `src/shared/ui/status-notice`, `src/widgets/library` 내 empty/error/disabled/permission 분기
- 디자인 시스템 State language 테이블(tone별 icon/root, neutral/success/warning/destructive)과 `docs/designs/design-system.md` 규칙을 SSOT로 삼는다
- 문구·아이콘·action을 route별 테이블로 감사하고, 불일치를 `StatePanel`/`StatusNotice`의 단일 규칙으로 교정한다
- retry 가능 error는 `reset()` + stale data 유지 문구를, 불가 error는 안전한 다음 링크를 제공한다

### FR-2: FSD 아키텍처 경고 해소

- `src/features/create-mixing/api/mixing-queue.ts`의 `create-recommendation` cross-import를 제거한다. 선택지: (a) 공유 contract를 `entities/recommendation` 또는 `shared`로 승격, (b) facade를 app/worker 경계로 이동
- `src/entities/song-catalog`, `src/features/admin-custom-mixing`, `src/features/manage-song-catalog`, `src/widgets/library` 4건의 insignificant-slice에 대해 병합 또는 `steiger.config.ts`에서 App/worker 소비자 근거를 명시해 exception을 좁게 유지한다
- `pnpm run check:architecture` 0 error 달성

### FR-3: 스켈레톤 Storybook 커버리지

- 9개 전용 스켈레톤 + Library/MixingDetail을 story로 등록 (`Shared UI/Skeletons/*` 또는 각 slice story)
- 각 story에서 360/768/1280 뷰포트 테스트와 reduced-motion(`::before` animation none) 테스트를 포함한다
- `PageSkeleton` 기존 story 유지

### FR-4: RSC 스트리밍·쿼리 최적화

- Recommendation(`recommendationDetailQueryOptions`), SongDetail, MixingDetail, NotificationsList의 data fetching을 `useSuspenseQuery` + RSC prefetch 패턴으로 개선한다
- `loading.tsx`가 Suspense 폴백으로 동작하도록 route 경계를 확인하고, 불필요한 client waterfall을 제거한다
- Query key는 `catalogRevision`/`scoringVersion` revision 계약을 그대로 유지한다

### FR-5: 접근성 심화

- 키보드 전체 순회, focus-visible, 포커스 트랩(Dialog/Sheet), waveform 키보드 seek, `aria-busy/live` 중복 제거를 수동 체크리스트로 감사·수정한다
- axe-core(Storybook a11y addon) critical 0 유지
- `prefers-reduced-motion`에서 skeleton/waveform/Orb 애니메이션이 정지함을 확인한다

### FR-6: 메타데이터·관찰성

- sitemap/robots가 public route만 노출하고, 인증·관리자 route는 `noindex`를 유지하는지 검증한다
- OG 이미지·canonical·home 메타를 F023 결과와 일치하도록 재확인한다
- 분석·믹싱 worker와 API route의 실패 경로에 Sentry(또는 구조화된 logger) capture를 최소 범위로 추가한다 (`SENTRY_DSN` 없으면 no-op)

---

## 비기능 요구사항

- **성능**: Suspense 추가로 TTFB/TTI 개선 또는 유지, CLS 0 유지 (스켈레톤은 정적 div만 사용)
- **접근성**: axe critical 0, 키보드 100% 도달, 스크린리더 중복 0
- **아키텍처**: steiger 0 error, FSD layer 위반 0
- **관찰성**: PII 없이 userId/jobId/errorCode만 로깅, DSN 없으면 빌드/런타임 영향 0

---

## 관련 문서

- PRD: `../../prd/copy-singer-prd.md`
- PRD Refs: `PRD-FR-045`, `PRD-FR-051`, `PRD-FR-052`
- Design: `../../designs/design-system.md`, `../../designs/product-ui-redesign.md`
- Audit 대상: `src/shared/ui/state-panel`, `src/shared/ui/status-notice`, `steiger.config.ts`, `src/_pages/**/ui/*-loading.tsx`, `app/**/loading.tsx`, `app/**/error.tsx`

