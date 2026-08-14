# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D027: notification-brand-color 결정 (2026-08-14)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: notification-brand-color 결정 (2026-08-14)

- **Context**: 문제 상황 또는 배경
- **Constraints**: 제약 조건 (시간/기술/운영/호환성)
- **Options**: 고려한 대안들
- **Decision**: 최종 선택
- **Rationale**: 선택 이유
- **Trace**:
  - **DOING 시작 시점**: 초기 판단/가설
  - **DONE 전 확정 시점**: 선택 근거 최종화
  - **머지 후 확인**: 실제 결과/영향
- **Evidence**:
  - **Commit**: 커밋 해시 또는 링크
  - **PR**: PR 링크
  - **Test/Log**: 테스트 결과/로그/스크린샷 경로
- **Consequences**: 결과 및 영향 (선택사항)


## D027-01: 브랜드 컬러 선택적 적용 범위 (2026-08-14)

- **Context**: 아이콘·버튼·칩이 검정 일색이라 알림 모달에서 아이콘(`bg-muted`)과 호버(`bg-accent≈muted`)가 구분 안 됨. 디자인 시스템은 "brand gradient는 연속 데이터·active signal에만, primary/보더/포커스 링은 단색 유지"를 규정.
- **Constraints**: 넓은 배경은 neutral 유지, 한 surface에 accent 2개 이상 금지, 한 화면에 primary 1개.
- **Options**: (a) 전체를 브랜드 컬러로, (b) 상태성만 선별 교체.
- **Decision**: (b) 채택. 상태성 아이콘·칩만 `data-accent`/`success`/`destructive`로 교체, primary 버튼 검정 유지.
- **Rationale**: 구분이 필요한 알림 타입·활성 칩에만 컬러 포인트를 주고, 전체 톤은 neutral로 절제해야 디자인 시스템 원칙을 지킨다.
- **Trace**:
  - **DOING 시작 시점**: `data-accent`가 Bell 배지와 waveform active에 이미 쓰이는 중간 보라임을 확인, 알림 모달을 대표 사례로 선정.
- **Evidence**:
  - **Commit**: TBD
  - **Test/Log**: Storybook 시각 검증
- **Consequences**: 알림 모달이 브랜드 컬러 첫 적용처, 이후 상태 칩에도 동일 규칙 적용.



## D027-02: 상태 칩 감사 결과 (2026-08-14)

- **Context**: 전역 Badge 15개 사용처를 grep으로 감사.
- **Decision**: 기존 톤 체계 유지. MixingStatusBadge active는 이미 `bg-data-accent/10`로 브랜드 컬러, succeeded는 primary(검정, 단일 primary 원칙), failed는 destructive로 적합. 필터·상태 칩의 secondary/outline도 neutral 유지가 맞음.
- **Rationale**: 디자인 시스템 "한 surface에 accent 2개 이상 금지" + "primary 버튼은 단색 유지"를 지키므로 추가 컬러 교체가 불필요.
- **Trace**:
  - **DONE 전 확정 시점**: 15개 Badge grep, 각각 tone 일관성 확인.
- **Consequences**: 알림 아이콘만 타입별 컬러로 교체하고 칩은 현행 유지.



## D027-03: 스토리북 51개 전수조사 (2026-08-14)

- **Context**: `src/**/*.stories.*` 51개 중 실제 UI에서 쓰이지 않는 story가 있는지 전수조사.
- **Constraints**: .storybook/main.ts 글롭 ../src/**/*.stories.* 로 수집. shared/ui에서 story 없는 컴포넌트는 bento-grid/chart 등 8개.
- **Options**: (a) 전체 삭제, (b) allowlist 문서화, (c) 빈 디렉터리만 제거 + active 유지.
- **Decision**: (c) 채택. 빈 디렉터리 2개(count-up-text, grainient-background)만 rmdir. 나머지 49개 active story는 유지 — 각 story가 import하는 컴포넌트는 app/src에서 실제 사용 중임을 rg로 교차 검증.
- **Rationale**: 8개 no-story shared/ui는 bento-grid(landing-product-story), chart(vocal-range-chart), gradient-text(landing-hero), reveal-content(landing), sonner(root-layout), voice-signal-core(recorder) 등 실제 사용 중이라 story 없는 게 정상. 빈 디렉터리는 F022 vestige.
- **Trace**:
  - **DOING 시작 시점**: rg --files 51개 수집, shared/ui no-story 8개 식별.
  - **DONE 전 확정 시점**: rg 교차 검증으로 8개 모두 실제 사용 중 확인, 빈 디렉터리 2개 제거.
- **Evidence**:
  - **Commit**: TBD
  - **Test/Log**: rg 교차 검증, ls로 빈 디렉터리 확인 후 rmdir
- **Consequences**: 미사용 story 0건, vestige 디렉터리만 정리. 다음 조사 시 같은 글롭으로 재검증.

## D027-04: Storybook 실제 UI 정합성 재감사 (2026-08-14)

- **Context**: T04는 story 파일의 사용 여부만 검증했고, 사용 중인 story가 실제 제품 화면의 props·wrapper·폭·배경·상태 composition을 충실히 재현하는지는 검증하지 못했다. 사용자가 Storybook에서 실제 UI와 다른 몇 개의 화면을 직접 확인했다.
- **Constraints**: Storybook 전용 mock markup으로 제품 UI를 흉내 내는 방식은 최소화하고, 가능한 한 실제 컴포넌트와 제품 사용처의 composition을 그대로 재사용한다. 제품 코드 동작은 이 감사 때문에 변경하지 않는다.
- **Options**: (a) 눈에 띄는 story만 개별 수정, (b) 51개 story를 실제 import/use site 기준으로 다시 대조한 뒤 불일치 story만 수정.
- **Decision**: (b) 채택. 제품 화면을 복제한 story markup을 줄이고 실제 제품에서 사용하는 presentational frame/component composition을 공유한다. Library와 Notifications는 페이지 content frame을 실제 page와 story가 함께 사용하고, widget story는 오래된 가짜 페이지 chrome을 제거한다. AnalysisStatus는 실제 `CreationFunnelShell` 안에서 렌더링하고, 알림 hover 검증은 fake `<div>` 대신 실제 `NotificationBell` story로 옮긴다. `VocalProfileResults`와 `VoiceScanInput`은 실제 사용 props/폭을 기준으로 맞춘다.
- **Rationale**: 단순 import 존재 여부나 비슷하게 만든 wrapper로는 Storybook이 제품 화면의 신뢰 가능한 시각 회귀 기준이 되지 못한다. 실제 composition을 공유하면 제품 UI 변경이 story에도 구조적으로 전파된다.
- **Trace**:
  - **DOING 시작 시점**: 51개 story의 meta/component/render/decorator 구성을 수집했다. 실제 컴포넌트를 직접 렌더하지 않고 story 전용 wrapper/mock composition을 만드는 항목과 fullscreen/padded 차이를 우선 후보로 봤다.
  - **DONE 전 확정 시점**: Library page story는 실제 CTA와 긴 description이 누락됐고 Library widget 2개 story는 구형 heading/간격을 복제하고 있었다. Notifications story도 `ProductPageIntro` 대신 수동 heading을 사용하고 `ProductShell`이 없었다. AnalysisStatus는 실제 funnel shell이 빠져 있었고, notification badge story는 실제 dropdown hover를 `<div>`로 흉내 냈다. `VocalProfileResults`는 실제 유일 사용처와 달리 `showSummary=true`/source audio 없음으로 렌더링했고 VoiceScanInput story 폭은 실제 desktop 우측 column보다 넓었다. 이 차이를 수정하고 실제 `NotificationBell` open story를 추가해 story 수는 52개가 됐다.
- **Evidence**:
  - **Commit**: `5b51fae` (`refactor(F027): Storybook 실제 UI 정합성 보정`)
  - **Test/Log**: `pnpm run typecheck` PASS, `pnpm run check:architecture` PASS (Steiger 0 issues, boundary 4/4), 변경 대상 8 story files 27/27 PASS, `pnpm run test:storybook --run` 최종 52 files / 152 tests PASS
- **Consequences**: Library/Notifications 페이지 story는 실제 제품 frame 변경을 공유하며, NotificationBell의 실제 dropdown을 Storybook에서 직접 확인할 수 있다. widget/entity story는 제품 페이지를 임의로 흉내 내기보다 자신의 실제 사용 폭·props에 집중한다.

## D027-05: 분석 완료 후 저장된 보컬 프로필 상세로 직접 이동 (2026-08-14)

- **Context**: 실제 `/vocal-profiles/[id]` 상세은 Saved analysis 헤더, 제출 보컬 플레이어, 상세 분석과 프로필 actions를 제공하지만 Storybook에는 이 page-level composition이 없었다. 반대로 분석 직후 `/profile`에는 `AnalysisSuccess` + `VocalProfileSummary` 중간 화면이 있어 사용자가 실제 저장된 프로필 UI와 다른 Summary를 별도 제품 화면으로 오해할 수 있었다.
- **Constraints**: durable analysis job 성공 시점에는 저장된 `vocalProfileId`가 이미 존재하며, 프로필 상세는 PRD-FR-039의 사용자 소유 상세 조회 경로다. Storybook은 서버 fetch를 복제하지 않고 실제 페이지 body composition을 공유해야 한다.
- **Options**: (a) AnalysisSuccess Summary를 유지하고 상세 story만 추가, (b) 성공 즉시 상세로 이동하고 Summary 성공 화면을 제품 흐름에서 제거한 뒤 실제 상세 story를 기준으로 사용.
- **Decision**: (b) 채택. 성공 terminal job에서 local job key를 제거하고 `router.replace`로 `/vocal-profiles/[id]`에 이동한다. `VocalProfileResults`의 선택적 Summary 렌더링 경로도 제거했다. 기존 `Analysis Success`와 `Vocal Profile/Summary` stories는 `!dev`/`!test`로 제품 Storybook 목록과 회귀 대상에서 제외하고, `VocalProfileDetailContent`를 서버 페이지와 `Pages/Vocal Profile Detail` Desktop/Mobile stories가 함께 사용한다.
- **Rationale**: 분석 완료 후 사용자가 확인해야 할 SSOT는 영속 저장된 프로필 상세이며, 별도 성공 Summary는 같은 데이터를 다른 composition으로 한 번 더 보여줘 탐색 단계와 Storybook 기준을 불필요하게 이원화한다.
- **Trace**:
  - **DOING 시작 시점**: 실제 상세 페이지에는 `VocalProfileSummary`가 없고 `VocalProfileResults showSummary={false}`만 사용하며, Summary는 분석 성공 중간 화면에만 노출됨을 확인했다.
  - **DONE 전 확정 시점**: workbench 성공 branch를 제거하고 terminal effect에서 상세 redirect를 수행하도록 변경했다. 상세 body를 `VocalProfileDetailContent`로 추출해 실제 page와 story가 같은 JSX를 사용한다. Summary/Analysis Success stories는 Storybook dev/test에서 제외됐다.
- **Evidence**:
  - **Commit**: `2e5be66` (`feat(F027): 분석 완료 상세 직행 및 보컬 프로필 Storybook 추가`)
  - **Test/Log**: `pnpm run test:voice-scan` 12/12 PASS, `pnpm run test:vocal-profile-presentation` 12/12 PASS, 신규 상세 Storybook 2/2 PASS, `pnpm run test:storybook --run` 53 indexed files 중 51 passed + 2 skipped / 150 tests PASS, `pnpm run typecheck` PASS, `pnpm run check:architecture` PASS. 전체 `pnpm run check`는 이번 변경과 무관한 기존 repo-wide Biome 진단 때문에 baseline 실패를 유지한다.
- **Consequences**: 분석 성공 후 browser history에 중간 성공 화면을 남기지 않고 저장된 상세로 바로 이동한다. Storybook의 대표 보컬 프로필 화면은 실제 상세 composition이 되며, Summary/Analysis Success는 제품 UI 탐색에서 보이지 않는다.

