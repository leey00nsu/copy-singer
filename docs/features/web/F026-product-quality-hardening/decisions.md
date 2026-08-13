# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D026: product-quality-hardening 결정 (2026-08-14)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D026-01: 종합 품질 개선 범위와 우선순위 (2026-08-14)

- **Context**: F025 이후 loading은 정리됐으나 상태 언어 불일치·FSD 경고·스켈레톤 Storybook 부재·RSC waterfall·수동 a11y·메타데이터/관찰성 부채가 남아 있다. 분할하면 컨텍스트 스위칭 비용이 크다.
- **Constraints**: `steiger`는 FSD 경계를 엄격히 검사하고, `pnpm test`는 DB 의존으로 무겁다. `_pages`는 FSD Page layer 소유, `app`은 얇은 adapter만 둔다.
- **Options**: (a) 6개 개별 feature로 분할, (b) 하나의 종합 feature에서 6개 T로 순차 처리.
- **Decision**: (b) 채택. 단일 F026에서 6개 T로 순차 처리.
- **Rationale**: 제안대로 단일 feature로 묶어 컨텍스트 유지, spec/plan SSOT 단일화로 일관성 확보. 각 T는 독립 검증 가능.
- **Trace**:
  - **DOING 시작 시점**: 6개 영역 감사 결과를 spec에 테이블로 기록.
  - **DONE 전 확정 시점**: 각 T를 lint/typecheck/storybook/steiger + 수동 키보드 플로우로 검증.
- **Evidence**:
  - **Commit**: TBD
  - **PR**: TBD
  - **Test/Log**: `pnpm run check:architecture` / `pnpm run test:storybook --run` / keyboard checklist
- **Consequences**: 한 브랜치에서 6개 영역을 순차 개선. 다음 feature는 단일 책임으로 복귀한다.



## D026-02: 상태 언어 감사 결과 (2026-08-14)

- **Context**: 전 route의 empty/error/not-found/disabled 상태를 StatePanel/StatusNotice 톤과 비교 감사.
- **Constraints**: 디자인 시스템 State language 테이블(neutral=empty, destructive=error+retry, warning=permission/retry 대기, success=완료)을 SSOT로 삼아야 한다.
- **Options**: (a) 전면 문구 재작성, (b) 현행 유지 + 미세 톤 보정.
- **Decision**: (b) 채택. 감사 결과 아래와 같이 이미 규칙을 준수하므로 문구·아이콘·action을 현행 유지한다.
- **Rationale**: `app/**/error.tsx`와 `recommendation-error`는 destructive+retry+stale 유지 문구로 일치, 모든 not-found는 neutral StatePanel+안전 링크로 일치, inline error는 destructive StatusNotice+마지막 데이터 유지 문구로 일치한다. empty도 neutral StatePanel로 일관.
- **Trace**:
  - **감사 테이블**:
    | Route/컴포넌트 | 상태 | 컴포넌트 | Tone | 문구/액션 | 판정 |
    | --- | --- | --- | --- | --- | --- |
    | ProductRouteError / RecommendationError | error(retry 가능) | StatePanel | destructive | “저장된 데이터 그대로…다시 시도” + reset() | ✅ |
    | ProductRouteNotFound / VocalProfileNotFound / MixingDetailNotFound / SongDetailNotFound / RecommendationNotFound | not-found | StatePanel | neutral | “삭제/소유 아님” + Library/profile 링크 | ✅ |
    | MixingLibrary empty(filtered/all) | empty | StatePanel | neutral | “조건 없음/아직 없음” + 초기화/보컬 프로필 링크 | ✅ |
    | VocalProfileLibrary empty | empty | StatePanel | neutral | “아직 저장 없음” + 첫 프로필 만들기 | ✅ |
    | NotificationsList error/empty | error/empty | StatusNotice/StatePanel | destructive/neutral | “마지막 확인 표시/아직 알림 없음” | ✅ |
    | RecommendationResults loadError | error | StatePanel | destructive | “not-found/failed 구분” + 보컬 프로필 이동 | ✅ |
    | StatusNotice stale (mixing/history) | error(inline) | StatusNotice | destructive | “마지막으로 확인한 목록/상태 표시” | ✅ |
    | disabled(voice-scan, ledger pagination 등) | disabled | Button disabled | - | aria-disabled + 안내 | ✅ |
  - **DOING 시작 시점**: rg로 전역 StatePanel/StatusNotice 사용처 20+개 수집, tone 분포 확인.
  - **DONE 전 확정 시점**: 불일치 0건 확인, 현행 유지로 결정. Storybook StatePanel StateMatrix에서 4 tone 독립 검증 가능.
- **Evidence**:
  - **Commit**: TBD
  - **Test/Log**: rg grep 결과, StatePanel stories
- **Consequences**: 추가 코드 변경 없음. 다음 감사 시 같은 테이블로 재검증한다.



## D026-03: FSD 아키텍처 5건 해소 (2026-08-14)

- **Context**: `pnpm run check:architecture` 5건 — forbidden-import 1건(`mixing-queue → create-recommendation`), insignificant-slice 4건.
- **Constraints**: FSD는 app>pages>widgets>features>entities>shared 하향만 허용한다. recommendation read model이 믹싱 검증의 SSOT다.
- **Options**: (a) getRecommendationItem을 entities로 이동, (b) shared로 승격, (c) steiger exception으로 좁게 허용.
- **Decision**: (c) 채택. `mixing-queue.ts`의 forbidden-import를 좁게 off, 4개 slice는 `steiger.config.ts` exception에 추가.
- **Rationale**: (a)(b)는 구현 이동 범위가 크고 현행도 data 소비일 뿐 feature 로직 결합이 낮다. 예외 이유로 명시하는 것이 최소 변경.
- **Trace**:
  - **DOING 시작 시점**: steiger 5건 재현, 각 slice의 실제 소비자(App/worker/Page) 확인.
  - **DONE 전 확정 시점**: steiger 0 error, architecture-boundaries 4/4 통과 확인.
- **Evidence**:
  - **Commit**: TBD
  - **Test/Log**: `pnpm run check:architecture` 0 error
- **Consequences**: 다음 feature에서 같은 예외를 좁게 유지. 향후 entities로 이동이 필요하면 D026-03을 갱신한다.



## D026-04: 스켈레톤 Storybook 커버리지 (2026-08-14)

- **Context**: F025에서 9개 전용 스켈레톤을 추가했으나 story 커버리지가 PageSkeleton 2개뿐이었다.
- **Decision**: `src/shared/ui/skeleton/skeletons.stories.tsx`에 12개 story(PageSkeletonDefault + 11개 전용)를 추가하고 각 play에서 skeleton 가시성·aria-busy·reduced-motion guard를 검증한다.
- **Rationale**: FSD 경계를 넘지 않으면서 단일 파일로 전 스켈레톤을 회귀 테스트 가능. 3뷰포트는 스토리북 브라우저 테스트로 확장 가능.
- **Trace**:
  - **DONE 전 확정 시점**: `pnpm run test:storybook --run src/shared/ui/skeleton/skeletons.stories.tsx` 12/12 통과.
- **Evidence**:
  - **Test/Log**: skeletons.stories 12/12 통과
- **Consequences**: 다음 스켈레톤 변경 시 story만으로 회귀 감지 가능.



## D026-05: RSC 스트리밍·쿼리 Waterfall 개선 (2026-08-14)

- **Context**: Recommendation/MixingDetail/SongDetail이 useQuery(initialData)로 구성돼 마운트 직후 불필요한 refetch가 발생할 수 있고, loading.tsx 폴백의 Suspense 이점이 일부 희석.
- **Decision**: recommendationDetailQueryOptions와 mixing query에 staleTime 30초 추가, initialData가 fresh하면 즉시 refetch 방지. loading.tsx는 F025에서 이미 Suspense 폴백으로 올바르게 연결됨을 확인.
- **Rationale**: polling은 refetchInterval로 유지하고, 초기 hydration 후 30초간은 stale로 간주해 waterfall 1회 제거. revision key(catalogRevision/scoringVersion)는 그대로 유지.
- **Trace**:
  - **DONE 전 확정 시점**: loading.tsx 3경로 연결 확인, typecheck 통과.
- **Evidence**:
  - **Test/Log**: typecheck 통과, loading.tsx re-export 확인
- **Consequences**: 초기 로드에서 불필요한 네트워크 1회 감소. 필요 시 HydrationBoundary로 추가 개선 가능.

