# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D025: skeleton-ui-audit 결정 (2026-08-14)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D025-01: 페이지 레벨 스켈레톤 감사와 개선 범위 (2026-08-14)

- **Context**: 제품 전반에서 `PageSkeleton` generic fallback이 실제와 다른 레이아웃의 route에 재사용되고, recommendation/song-detail은 스피너만 사용해 CLS와 체감이 떨어진다. profile/account/notifications/vocal-profile-detail/admin 계열은 `loading.tsx` 자체가 없어 부모 폴백에 의존한다.
- **Constraints**: Skeleton primitive(`bg-muted animate-pulse`)와 `PageSkeleton` a11y/motion 규칙을 유지해야 하고, FSD 경계(`app`은 얇은 adapter, `_pages`가 소유)를 지켜야 한다. waveform 내부 72px veil은 범위 밖이다.
- **Options**: (a) 모든 route를 `PageSkeleton` 하나로 통일, (b) 각 route마다 전용 스켈레톤을 `_pages`에 두고 `app`은 re-export, (c) 클라이언트 Suspense에서 JS로 스켈레톤을 동적 생성.
- **Decision**: (b) 채택. `Skeleton` primitive 재사용 + route별 전용 `_pages/**/ui/*-loading.tsx` + `app/**/loading.tsx` 얇은 adapter.
- **Rationale**: 실제 페이지의 max-width(72rem)·gutter·section 간격과 가장 정합하게 CLS를 줄일 수 있고, FSD 경계와 Storybook 뷰포트 검증이 가장 명료하다. (a)는 레이아웃 불일치가 재발하고 (c)는 정적 streaming 이점이 사라진다.
- **Trace**:
  - **DOING 시작 시점**: 5개 `loading.tsx`만 존재하고 실제 10+ route와의 불일치를 `rg`와 파일 구조로 확인.
  - **DONE 전 확정 시점**: 전용 스켈레톤 7개 신규 + 2개 교체 + 2개 보정으로 정리하고 Storybook/검증 단계에서 3개 뷰포트를 확인.
  - **머지 후 확인**: 각 route의 Suspense 폴백이 실제 페이지와 같은 rail에서 전환되는지 브라우저에서 확인.
- **Evidence**:
  - **Commit**: TBD
  - **PR**: TBD
  - **Test/Log**: `pnpm run check` / `pnpm run test:storybook --run` 관련 스토리
- **Consequences**: 새 route 추가 시 전용 스켈레톤 생성이 규칙이 되며, `PageSkeleton`은 unknown route 폴백이라는 역할이 명확해진다.

## D025-02: Recommendation/SongDetail 스피너 교체 결정 (2026-08-14)

- **Context**: `RecommendationLoading`·`SongDetailLoading`이 중앙 `LoaderCircle` 스피너 텍스트만 제공해 레이아웃을 보존하지 못한다.
- **Constraints**: 실제 페이지의 `CreationFunnelShell`/`ProductPageIntro`/metric band/filter bar 구조를 근사해야 하고, WaveSurfer 등 JS를 로드하지 않아야 한다.
- **Options**: (a) 스피너 유지 + 텍스트만 개선, (b) `PageSkeleton` 재사용, (c) 페이지 구조를 근사하는 전용 스켈레톤 제작.
- **Decision**: (c) 채택. 각 페이지의 실제 section·tile·row 개수를 반영한 스켈레톤으로 교체.
- **Rationale**: 스피너는 체감 성능과 CLS 모두에서 불리하고, generic fallback은 funnel/intro 구조를 표현하지 못한다.
- **Trace**:
  - **DOING 시작 시점**: 두 파일의 스피너를 `cat`으로 확인.
  - **DONE 전 확정 시점**: recommendation은 funnel intro + filter + 테이블, song-detail은 back link + 3-tile + chart slot + reason + aside card 스켈레톤으로 교체.
- **Evidence**:
  - **Commit**: TBD
  - **PR**: TBD
  - **Test/Log**: Storybook 3뷰포트 캡처
- **Consequences**: 두 추천 경로의 로딩이 레이아웃 시프트 없이 전환된다.
