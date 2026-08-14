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

## D027-06: 오디오 준비 progress 완료 상태 시각 동기화 (2026-08-14)

- **Context**: 60초 초과 업로드를 자르고 인코딩할 때 MediaBunny의 progress 값과 숫자 표시는 100%까지 도달하지만 progress indicator가 중간 위치에 남은 채 준비 UI가 종료되는 현상이 있었다.
- **Constraints**: progress 값/접근성 계약은 Base UI `Progress.Root`의 0–100 값을 유지하고, 녹음 시간·관리자 작업 등 기존 공용 Progress 사용처를 깨지 않아야 한다.
- **Decision**: `ProgressIndicator`는 진행 중에는 width만 transition하고 Base UI state가 `complete`가 되는 순간 transition을 제거한다. 따라서 100% 값에서는 indicator width가 즉시 track 전체 폭과 동기화된다.
- **Rationale**: 원인은 progress 계산 오류가 아니라 `transition-all`의 시각적 지연이었다. 변환 완료 직후 준비 UI가 unmount되므로, 완료 width까지 애니메이션을 기다리는 방식보다 완료 상태를 즉시 그리는 것이 실제 상태를 정확히 반영한다.
- **Trace**:
  - **DOING 시작 시점**: `prepareProfileAudio`의 `conversion.onProgress`는 0–1 값을 정상 전달하고 `VoiceScanInput`은 이를 0–100으로 정상 표시함을 확인했다. Base UI Indicator는 inline width를 즉시 100%로 갱신하지만 wrapper의 CSS transition 때문에 실제 렌더 폭이 뒤처졌다.
  - **DONE 전 확정 시점**: `Shared UI/Progress > CompletionSync`에서 36→100 동적 변경 직후 `aria-valuenow=100`, computed transition duration `0s`, indicator/track 실제 width 동일을 브라우저에서 검증했다.
- **Evidence**:
  - **Commit**: `d5f5f0b` (`fix(F027): 오디오 준비 progress 완료 동기화`)
  - **Test/Log**: Progress story 3/3 PASS, `pnpm run test:voice-scan` 12/12 PASS, `pnpm run test:storybook --run` 53 indexed files 중 51 passed + 2 skipped / 151 tests PASS, `pnpm run typecheck` PASS, `pnpm run check:architecture` PASS.
- **Consequences**: 진행 중 progress는 기존처럼 부드럽게 움직이되 완료 순간에는 시각적 지연 없이 실제 100% 상태가 표시된다. 다만 후속 실사용 재검증에서 이 변경만으로는 충분하지 않았고, T08에서 React paint/unmount 타이밍 문제를 추가로 수정했다.

## D027-07: 오디오 준비 100% paint 보장 (2026-08-14)

- **Context**: T07 이후에도 실사용 `/profile` 퍼널에서 숫자는 100%에 도달하지만 indicator가 이전 중간 위치에 남은 채 Ready 화면으로 전환되는 현상이 재현됐다. 공용 Progress 단독 story에서는 100% width가 정상이라 컴포넌트 자체보다 상위 상태 전환 타이밍을 다시 조사했다.
- **Constraints**: `effect-cleanup.test.ts`가 Client Component의 `setTimeout`/`setInterval` 사용을 금지하므로 인위적인 timer hold는 사용할 수 없다. MediaBunny `Conversion.onProgress`의 마지막 `1` 콜백은 output finalize 후 `execute()`가 resolve되기 직전에 발생한다.
- **Decision**: `prepareProfileAudio()`가 resolve된 직후 workbench가 `setPreparationProgress(1)`을 명시하고, `requestAnimationFrame` 8프레임 동안 `preparing=true`를 유지한 뒤 Ready 상태로 전환한다. Base UI Progress의 complete-state 즉시 width 동기화는 유지한다. T07의 generic `Shared UI/Progress > CompletionSync` story는 제거하고 실제 `VoiceScanInput`의 `Preparing` 46%와 `PreparingComplete` 100% story에서 indicator/track 실제 폭을 검증한다.
- **Rationale**: 마지막 progress update와 `setPreparingAudio(false)`가 같은 React batch에 들어가면 100% DOM 상태가 실제 browser paint 전에 unmount될 수 있다. 완료 width를 즉시 계산하는 것만으로는 이 paint boundary를 보장하지 못한다. animation frame 경계를 명시하면 timer 없이 완료 상태가 실제 렌더링된 뒤 화면을 교체할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: MediaBunny 1.52.3 소스에서 `output.finalize()` 후 `onProgress(1)`을 호출하고 곧바로 `execute()`가 반환하는 순서를 확인했다. 현재 workbench는 `await prepareProfileAudio()` 직후 성공 state를 설정하고 `finally`에서 즉시 `setPreparingAudio(false)`를 호출하고 있었다.
  - **DONE 전 확정 시점**: `setPreparationProgress(1)` 후 8개의 `requestAnimationFrame`을 기다리도록 변경했다. 실제 `VoiceScanInput` story에서 46%는 indicator/track 비율 약 0.46, 100%는 indicator width와 track width가 동일함을 Chromium DOM에서 검증했다.
- **Evidence**:
  - **Commit**: `a4c88ee` (`fix(F027): 오디오 준비 완료 프레임 보장`)
  - **Test/Log**: `pnpm run test:voice-scan` 12/12 PASS, VoiceScanInput + Progress 타깃 Storybook 12/12 PASS, `pnpm run test:storybook --run` 최종 53 indexed files 중 51 passed + 2 skipped / 151 tests PASS, `pnpm run typecheck` PASS, `pnpm run check:architecture` PASS. 전체 Storybook 첫 실행에서 기존 `LongAudioDialog` focus assertion 1건이 간헐 실패했으나 해당 story 단독 2/2 및 전체 재실행 151/151 PASS.
- **Consequences**: 업로드 자르기/인코딩이 완료되면 100% 숫자와 full-width bar가 실제로 paint된 뒤 Ready UI로 전환된다. 완료 표시를 위한 별도 polling/timer는 추가하지 않는다.

## D027-08: 진행 중 숫자와 progress bar를 같은 프레임에 표시 (2026-08-14)

- **Context**: T08로 100% 완료 프레임은 보장됐지만 실사용 재검증에서 1~99% 구간의 숫자와 막대 위치가 서로 어긋나 보였다. `VoiceScanInput` 숫자는 React state 변경 즉시 새 값을 표시하는 반면 공용 `ProgressIndicator`에는 `transition-[width]`가 남아 있어 막대가 이전 width에서 약간 늦게 따라왔다.
- **Constraints**: Base UI가 계산하는 `aria-valuenow`와 indicator inline width를 SSOT로 유지하고, 녹음 시간 progress와 관리자 상태 progress 등 공용 사용처의 값/접근성 계약은 바꾸지 않는다.
- **Decision**: 공용 `ProgressIndicator`에서 width transition을 제거한다. 숫자, `aria-valuenow`, inline `width`와 실제 렌더 폭이 같은 렌더의 동일 값을 나타내도록 하고, T08의 완료 paint 보장 로직은 그대로 유지한다.
- **Rationale**: determinate progress는 애니메이션된 추정 위치보다 현재 보고된 값을 정확히 보여주는 것이 우선이다. MediaBunny progress가 빠르게 갱신될 때 150ms 시각 지연은 숫자와 막대가 서로 다른 상태처럼 보이게 한다.
- **Trace**:
  - **DOING 시작 시점**: `ProgressIndicator`에 진행 중 `transition-[width]`가 유지되고 있고 `VoiceScanInput`의 퍼센트 숫자는 동일한 `preparationProgress`를 transition 없이 즉시 표시함을 확인했다.
  - **DONE 전 확정 시점**: transition 제거 후 `VoiceScanInput > Preparing`에서 숫자 `46%`, `aria-valuenow=46`, indicator inline width `46%`, computed transition duration `0s`, 실제 indicator/track 폭 비율 약 `0.46`을 Chromium에서 동시에 검증했다.
- **Evidence**:
  - **Commit**: `0e66113` (`fix(F027): progress 숫자와 막대 실시간 동기화`)
  - **Test/Log**: `pnpm run typecheck` PASS, `pnpm run test:voice-scan` 12/12 PASS, VoiceScanInput + Progress 타깃 Storybook 12/12 PASS, `pnpm run test:storybook --run` 최종 53 indexed files 중 51 passed + 2 skipped / 151 tests PASS, `pnpm run check:architecture` PASS. 전체 Storybook 첫 실행에서 기존 `AudioWaveformPlayer` readiness assertion 1건이 간헐 실패했으나 해당 story 단독 3/3 및 전체 재실행 151/151 PASS.
- **Consequences**: progress 숫자와 막대가 중간 구간에서도 같은 값을 즉시 가리킨다. 공용 Progress의 시각적 보간은 제거되지만 값 정확성과 접근성 상태는 그대로 유지된다.

## D027-09: 알림 dropdown hover/focus에서 semantic icon color 유지 (2026-08-14)

- **Context**: `NotificationItemContent`의 타입별 배지는 기본 상태에서 success/data-accent/destructive 색을 사용하지만, `DropdownMenuItem`의 공용 `focus:**:text-accent-foreground` 규칙이 hover로 highlight/focus된 모든 자식의 foreground를 덮어써 아이콘이 검정 계열로 바뀌었다.
- **Constraints**: 다른 dropdown의 focus 텍스트 동작은 유지하고, 알림 타입 의미 색만 hover/focus에서도 보존해야 한다. `/notifications` 목록과 Bell dropdown은 같은 `NotificationItemContent`를 공유한다.
- **Decision**: 공용 dropdown 스타일은 변경하지 않고 알림 icon badge에 타입별 semantic foreground를 inline CSS token(`var(--success-foreground)`, `white`, `var(--destructive)`)으로 고정한다. Storybook에서 실제 Bell을 열어 5종 menuitem을 hover하고 computed color가 hover 전후 동일한지 검증한다.
- **Rationale**: `group-focus` utility는 공용 descendant selector의 specificity를 이기지 못해 실제 회귀 테스트가 실패했다. 배지 자체의 inline foreground는 영향 범위를 알림 semantic icon에 한정하면서 공용 dropdown focus 동작보다 우선한다.
- **Trace**:
  - **DOING 시작 시점**: 실제 `NotificationBell` story에 hover 전후 computed color 비교를 추가하자 `ticket_credit`가 `oklch(0.38 0.105 151)`에서 `oklch(0.205 0 0)`로 바뀌며 재현됐다.
  - **DONE 전 확정 시점**: inline semantic foreground 적용 후 NotificationBell + badge 타깃 Storybook 2/2 PASS, 전체 Storybook 최종 51 passed + 2 skipped / 151 tests PASS.
- **Evidence**:
  - **Commit**: `8c9c4b7` (`fix(F027): 알림 hover 아이콘 semantic color 유지`)
  - **Test/Log**: `pnpm run typecheck` PASS, NotificationBell + badge Storybook 2/2 PASS, `pnpm run check:architecture` PASS, `pnpm run test:storybook --run` 최종 151/151 PASS. 전체 실행 중 기존 AdminCustomMixing/VoiceOrb/AudioWaveform 타이밍성 테스트가 각각 간헐 실패했으나 각 단독 재검증은 통과했고 마지막 전체 실행은 green.
- **Consequences**: 알림 배지는 pointer hover와 keyboard focus 모두 타입 의미 색을 유지하며, 다른 dropdown item의 focus color 정책은 바뀌지 않는다. 다만 T11 실사용 재검증에서 이 검증이 wrapper `span`만 확인해 실제 Lucide `svg` 회귀를 놓친 것으로 확인되어 후속 보완했다.

## D027-10: 알림 hover 회귀 검증 대상을 실제 SVG로 수정 (2026-08-14)

- **Context**: T10 완료 후 로컬 실사용에서 알림 아이콘이 hover 시 여전히 검정으로 바뀌었다. T10 Storybook은 `data-notification-icon-badge` wrapper의 computed color만 비교했고, 공용 `DropdownMenuItem`의 descendant selector는 내부 Lucide `svg`에 직접 `color`를 지정하고 있었다.
- **Constraints**: 공용 dropdown의 focus/highlight 텍스트 정책은 유지하고, 실제 아이콘 SVG의 semantic foreground만 알림 타입별로 고정해야 한다.
- **Decision**: `NotificationItemContent`의 Lucide `Icon` 자체에도 badge와 동일한 semantic foreground inline style을 적용한다. `NotificationBell` 회귀 테스트는 wrapper가 아니라 실제 `svg`의 hover 전후 computed color를 직접 비교한다.
- **Rationale**: 부모의 inline `color`는 자식에 직접 적용된 CSS `color` 선언을 이길 수 없다. SVG 자체의 inline color가 가장 좁은 범위에서 공용 descendant selector보다 우선하며, 테스트도 사용자가 실제로 보는 요소를 검증해야 한다.
- **Trace**:
  - **DOING 시작 시점**: 테스트 대상을 실제 SVG로 바꾸자 `ticket_credit` 아이콘이 hover 전 `oklch(0.38 0.105 151)`에서 hover 후 `oklch(0.205 0 0)`으로 바뀌며 로컬 증상을 그대로 재현했다.
  - **DONE 전 확정 시점**: SVG 자체에 semantic foreground를 적용한 뒤 NotificationBell + badge 타깃 Storybook 2/2, typecheck, architecture가 통과했다.
- **Evidence**:
  - **Commit**: `c54dcfe` (`fix(F027): 알림 SVG hover semantic color 유지`)
  - **Test/Log**: 수정 전 실제 SVG hover 회귀 테스트 1/1 FAIL로 재현, 수정 후 NotificationBell + badge 2/2 PASS, `pnpm run typecheck` PASS, `pnpm run check:architecture` PASS. 전체 Storybook에서는 기존 VoiceOrb WebGL/AudioWaveform readiness 타이밍성 테스트가 각각 간헐 실패했으며 단독 재검증은 VoiceScanInput 10/10, AudioWaveformPlayer 3/3 PASS.
- **Consequences**: 알림 아이콘의 실제 Lucide SVG가 hover/focus에서도 success/data-accent/destructive foreground를 유지한다. 이후 hover 회귀는 wrapper가 아니라 실제 시각 요소의 computed style을 검증한다. 다만 후속 실사용 재검증에서 SVG 부모의 color만 확인해 실제 선을 그리는 `<path>`에 공용 descendant focus color가 적용되는 경우를 놓친 것으로 확인됐다.

## D027-11: Lucide mark descendant까지 semantic color 상속 강제 (2026-08-14)

- **Context**: T11 이후에도 실제 로컬 Bell dropdown에서 hover된 `mixing_succeeded` 아이콘 선이 흰색에서 검정으로 변했다. Lucide SVG는 `stroke="currentColor"`를 사용하지만 실제 선은 내부 `<path>`가 그리며, `DropdownMenuItem`의 `focus:**:text-accent-foreground`는 SVG뿐 아니라 그 `<path>`까지 직접 `color`를 지정한다.
- **Constraints**: 공용 dropdown의 다른 텍스트/focus 정책은 변경하지 않고, 알림 아이콘 subtree만 타입별 semantic color를 유지해야 한다. 회귀 테스트는 wrapper나 SVG 부모가 아니라 실제 렌더 mark를 확인해야 한다.
- **Decision**: 알림 badge에 `[&_svg_*]:!text-inherit`를 적용해 Lucide 내부 mark가 SVG의 semantic foreground를 `!important`로 상속하게 한다. 기존 badge/SVG inline semantic foreground는 유지하고, Storybook은 각 타입의 `<path>`/mark computed color가 badge semantic color와 같으며 hover와 focus 후에도 불변인지 검사한다.
- **Rationale**: SVG 부모의 inline `color`는 자식 `<path>`에 직접 적용된 CSS color 선언을 이길 수 없다. mark 자체에 `color: inherit !important`를 적용하면 공용 descendant selector의 직접 color를 무효화하면서도 영향 범위를 notification icon subtree로 제한할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 테스트 대상을 실제 `<path>`로 바꾸자 `ticket_credit`가 hover 전 `oklch(0.38 0.105 151)`에서 hover 후 `oklch(0.205 0 0)`으로 변해 사용자 스크린샷과 같은 문제를 Chromium에서 재현했다.
  - **DONE 전 확정 시점**: `[&_svg_*]:!text-inherit` 적용 후 NotificationBell의 5종 mark가 badge semantic color와 일치하고 pointer hover 및 focus 후에도 그대로 유지됐다.
- **Evidence**:
  - **Commit**: `0bcd933` (`fix(F027): 알림 Lucide mark hover 색상 고정`)
  - **Test/Log**: 수정 전 NotificationBell 실제 mark 회귀 1/1 FAIL로 재현, 수정 후 NotificationBell + badge 2/2 PASS, `pnpm run typecheck` PASS, `pnpm run check:architecture` PASS. 전체 Storybook은 기존 VoiceOrb/AdminCustomMixing 타이밍성 실패가 각각 한 번 발생했으나 단독 10/10·3/3 PASS 후 최종 전체 51 passed + 2 skipped / 151 tests PASS.
- **Consequences**: 실제 사용자에게 보이는 Lucide 선 색이 hover/focus에서도 타입별 semantic color를 유지한다. 이후 notification icon 회귀 테스트는 SVG 부모가 아니라 실제 mark descendant를 기준으로 한다.

## D027-12: 작업 lifecycle 상태 컬러를 current/completed/terminal 기준으로 통일 (2026-08-14)

- **Context**: F027 초기 결정은 active 상태만 `data-accent`로 강조하고 succeeded/completed를 검정으로 유지했지만, `ActualStateTimeline`은 completed를 브랜드 컬러로 사용해 `MixingStatusBadge`, 상단 funnel stepper, 믹싱 상세 timeline과 의미가 뒤집혀 있었다. 사용자는 동일한 작업 상태가 화면마다 다른 컬러 의미를 갖는 문제를 확인했다.
- **Constraints**: primary action 버튼은 검정 단색을 유지하고, status UI만 의미 기반으로 통일한다. 실패는 destructive, 대기·취소는 neutral 규칙을 유지해야 한다.
- **Options**: (a) 진행 중=검정 / 완료=브랜드로 단순 swap, (b) 현재/진행 중=연한 브랜드, 완료된 중간 단계=검정, 최종 성공=진한 브랜드로 상태 강도를 분리.
- **Decision**: (b)를 채택한다. 공용 semantic class를 shared SSOT로 두고 lifecycle UI에서 `active/current`는 brand tint, `completed intermediate`는 foreground solid, `terminal success`는 brand solid, `failed`는 destructive, `upcoming/canceled`는 neutral로 사용한다. 이 결정은 D027-02의 succeeded=검정 판정을 supersede한다.
- **Rationale**: 사용자가 지금 있는 위치는 브랜드 컬러로 즉시 보여주되, 이미 지나온 단계는 검정으로 후퇴시켜 시선을 현재에 둔다. 작업 전체가 성공적으로 확정된 terminal success에는 다시 강한 브랜드 컬러를 사용해 완료의 긍정적 확정성을 전달한다.
- **Trace**:
  - **DOING 시작 시점**: `CreationFunnelStepper`와 `MixingStatusBadge`는 current/active=brand·complete/succeeded=black, `ActualStateTimeline`은 complete=brand, 믹싱 상세 `MixingTimeline`은 complete=black으로 서로 다른 매핑을 사용하는 것을 코드로 확인했다.
  - **DONE 전 확정 시점**: `lifecycleStatusClassNames`를 shared SSOT로 추가하고 생성 퍼널·실제 상태 timeline·믹싱 timeline·MixingStatusBadge·분석 상태 badge가 이를 사용하도록 변경했다. 믹싱 terminal은 실제 job status를 확인해 succeeded=brand solid, failed=destructive, canceled=neutral로 분기하며 failed terminal은 check 대신 warning icon을 사용한다.
- **Evidence**:
  - **Commit**: `e8d8263` (`feat(F027): 작업 상태 컬러 semantic 규칙 통일`)
  - **Test/Log**: 변경 파일 Biome PASS, `pnpm run typecheck` PASS, `pnpm run check:architecture` PASS (Steiger 0 issues, boundary 4/4), mixing/voice 관련 10/10 PASS, 관련 Storybook 5 files / 20 tests PASS, `pnpm run test:storybook --run` 54 indexed files 중 52 passed + 2 skipped / 152 tests PASS, `git diff --check` PASS.
- **Consequences**: 작업 상태를 나타내는 chip/timeline은 화면 종류와 무관하게 같은 색 의미를 갖는다. 진행 중은 연한 brand tint, 지나온 중간 완료는 foreground solid, 최종 성공은 brand solid, 실패는 destructive, 대기·취소는 neutral이다. 상단 생성 navigation stepper는 후속 D027-13에서 별도 hierarchy 규칙으로 분리한다. 일반 정보 badge와 primary button은 이 규칙의 대상이 아니다.

## D027-13: 생성 navigation stepper의 current는 solid brand 유지 (2026-08-14)

- **Context**: T13에서 상단 `CreationFunnelStepper`까지 lifecycle status의 `active=brand tint` 규칙에 포함하면서 기존 solid brand current marker가 연한 outline/tint 형태로 바뀌었다. 사용자 재검증에서 기존 퍼널의 강한 현재 위치 표시가 더 명확하다는 피드백이 있었다.
- **Constraints**: 내부 작업 상태 timeline/chip의 `active=brand tint` 규칙은 유지하고, 완료된 이전 퍼널 단계는 검정, upcoming은 neutral이어야 한다.
- **Decision**: `CreationFunnelStepper`는 작업 상태 indicator가 아니라 생성 여정의 navigation hierarchy로 분리한다. current는 기존 `border-data-accent bg-data-accent text-white` solid brand를 복원하고, complete는 foreground solid, upcoming은 neutral을 유지한다.
- **Rationale**: navigation stepper는 사용자의 현재 위치를 가장 강하게 보여주는 것이 우선이고, 내부 lifecycle status는 진행 강도를 보조적으로 전달하므로 같은 `active` 표현을 공유할 필요가 없다.
- **Trace**:
  - **DOING 시작 시점**: T13 이전 stepper current가 solid brand였고 T13 이후 `lifecycleStatusClassNames.active`의 brand tint로 바뀐 diff를 확인했다.
  - **DONE 전 확정 시점**: `CreationFunnelStepper` current를 기존 solid brand class로 복원하고, 같은 `ActiveAnalysis` story에서 상단 current는 solid brand, 내부 `ActualStateTimeline` current는 brand tint임을 동시에 검증했다.
- **Evidence**:
  - **Commit**: `ea3cda4` (`fix(F027): 생성 퍼널 current solid brand 복원`)
  - **Test/Log**: 변경 파일 Biome PASS, `pnpm run typecheck` PASS, Creation Funnel Storybook 4/4 PASS, `pnpm run check:architecture` PASS (4/4), `pnpm run test:storybook --run` 54 indexed files 중 52 passed + 2 skipped / 152 tests PASS.
- **Consequences**: 브랜드 컬러 의미는 유지하되 계층을 구분한다. 상단 navigation current는 강한 solid brand, 내부 진행 상태는 연한 brand tint를 사용한다.

