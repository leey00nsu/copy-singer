# Tasks: notification-brand-color

## 태스크 규칙

- **상태**: `[TODO]` → `[DOING]` → `[DONE]`
- **태스크 공유 / 확인**:
  - `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 `tasks.md`에서 상태를 함께 갱신합니다
  - `[DOING] → [DONE]`: 완료 전 결과/검증을 공유하고 같은 수정에서 `Acceptance`와 `Checklist`를 함께 갱신합니다
  - 태스크 상태 변경 전에 승인이 필요한 경우는 문서화된 review checkpoint 또는 원격/파괴적 작업 직전뿐입니다.
  - 워크플로우가 요구하지 않는 standalone `OK` 승인 단계는 만들지 않습니다.
  - 해당 태스크의 `Checklist`에 unchecked 항목이 남아 있으면 `[DONE]`으로 전환하지 않습니다.
- **PRD 매핑(권장)**: 각 태스크 라인에 `[PRD-FR-001]` 또는 `[PRD-SCOPE-V1-DESKTOP-EDITOR]` 같은 기존 PRD 요구사항 ID 태그를 추가하거나, PRD와 무관한 태스크는 `[NON-PRD]`로 표시하세요.
  - 단, `tasks.md`에서 PRD ID를 임의로 만들지 마세요. `docs/prd` 또는 상위 요구사항 문서에 먼저 정의된 ID만 참조해야 합니다.
  - 레거시 문서에 아직 PRD ID가 없다면, 먼저 원문 요구사항 문서에 ID를 backfill한 뒤 `spec.md`의 `PRD Refs`와 태스크 태그를 함께 맞추세요.
  - `[NON-PRD]`는 내부 구현 작업 전용입니다. 사용자 동작, acceptance criteria, 범위가 바뀌는 태스크라면 PRD를 먼저 backfill하고 `[PRD-...]`로 태깅하세요.

---

## 로컬 추적 정보
- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/notification-brand-color`
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

- [DONE][PRD-FR-051] T-F027-notification-brand-color-01 알림 아이콘 타입별 컬러 분리
  - Date: 2026-08-14
  - Acceptance:
    - `NotificationItemContent` 아이콘 배지가 타입 5종에서 서로 구분된다
    - `data-accent`/`success`/`destructive` 토큰만 사용하고 primary/보더 규칙을 깨지 않는다
  - Checklist:
    - [x] `notification-item-content.tsx`에 타입→스타일 맵 추가
    - [x] 5종 타입 시각 검증 (스토리북 또는 브라우저)
    - [x] 다크모드 대비 확인

- [DONE][PRD-FR-051] T-F027-notification-brand-color-02 알림 모달 호버 대비 확보
  - Date: 2026-08-14
  - Acceptance:
    - 모달 아이템 호버 시 배경과 아이콘 배지가 명확히 구분된다
    - 키보드 focus-visible에서도 같은 대비가 유지된다
  - Checklist:
    - [x] `notification-bell.tsx` 호버 배경 대비 수정 — T01 컬러 배지로 대비 확보 (배지 컬러 유지로 해결)
    - [x] `/notifications` 목록 hover와 톤 일치 확인
    - [x] 브라우저 호버·포커스 검증

- [DONE][PRD-FR-051] T-F027-notification-brand-color-03 상태 칩 선택적 브랜드 컬러 적용
  - Date: 2026-08-14
  - Acceptance:
    - 활성/선택 칩만 브랜드 컬러로 강조되고 비활성은 neutral 유지
    - primary 버튼 검정은 유지, 넓은 배경은 neutral 유지
  - Checklist:
    - [x] 상태성 칩 grep 식별 및 선별 교체 — 15개 Badge 사용처 감사, MixingStatusBadge active는 이미 data-accent/10, succeeded는 primary(유지), failed는 destructive로 적합 판정
    - [x] `Badge` variant 또는 호출부 수정 — 추가 변경 불필요 (기존 톤 체계가 PRD-FR-045 규칙 준수)
    - [x] 디자인 시스템 규칙 위반 없음 확인


- [DONE][NON-PRD] T-F027-notification-brand-color-04 스토리북 미사용 전수조사 및 정리
  - Date: 2026-08-14
  - Acceptance:
    - `src/**/*.stories.*` 51개 전수조사 결과가 `decisions.md`에 기록된다
    - 미사용으로 판정된 story는 삭제되거나 allowlist로 문서화된다
    - `pnpm run test:storybook --run`이 통과한다
  - Checklist:
    - [x] 51개 story의 import 대상 컴포넌트 실제 사용 여부 교차 검증 — bento-grid/gradient-text/reveal-content/voice-signal-core 등 8개 shared/ui no-story 컴포넌트는 실제 사용 중, count-up-text/grainient-background 빈 디렉터리 2개 제거
    - [x] .storybook/main.ts 글롭 포함 여부 확인 — ../src/**/*.stories.* 에 51개 모두 포함
    - [x] 미사용 story 삭제 또는 유지 근거 기록 — 빈 디렉터리 2개 rmdir, 나머지 49개 active story는 유지 (decisions.md 기록)
    - [x] pnpm run test:storybook --run 회귀 확인 — notification-badge-colors 3/3, skeleton 12/12 등 통과

- [DONE][NON-PRD] T-F027-notification-brand-color-05 Storybook과 실제 UI 시각 정합성 재감사
  - Date: 2026-08-14
  - Acceptance:
    - 실제 제품에서 사용되는 컴포넌트의 story가 제품 사용처와 동일한 핵심 props, wrapper, width/background/context를 사용한다
    - 실제 UI를 흉내 낸 별도 mock markup 대신 가능한 한 실제 컴포넌트와 동일 composition을 렌더링한다
    - 불일치로 판정한 story와 수정 근거가 `decisions.md`에 기록된다
    - 관련 Storybook test와 `pnpm run typecheck`가 통과한다
  - Checklist:
    - [x] 51개 기존 story를 실제 import/use site와 다시 대조 — Library/Notifications/AnalysisStatus/Notification/VocalProfileResults/VoiceScanInput에서 정합성 차이 식별
    - [x] props, container, theme/background, responsive width 차이를 실제 UI 기준으로 수정 — 페이지 content frame 공유, Library widget wrapper 정규화, VoiceScanInput 폭 보정
    - [x] story 전용 mock markup이 실제 UI와 다른 경우 실제 컴포넌트 composition으로 교체 — fake notification hover 제거 후 실제 `NotificationBell` open story 추가, Notifications/Library는 제품 frame 재사용
    - [x] 수정 story 테스트와 회귀 확인 — 변경 대상 8 files 27/27 PASS, 전체 Storybook 52 files / 152 tests PASS

- [DONE][PRD-FR-039] T-F027-notification-brand-color-06 분석 성공 후 보컬 프로필 상세 직행 및 상세 Storybook 추가
  - Date: 2026-08-14
  - Acceptance:
    - `/profile`의 분석 job이 성공하면 별도 Summary 성공 화면 없이 생성된 `/vocal-profiles/[id]` 상세로 자동 이동한다
    - 제품 흐름에서 더 이상 사용하지 않는 `VocalProfileSummary` 중간 UI와 해당 전용 story를 정리한다
    - Storybook에 실제 `/vocal-profiles/[id]` 상세 composition을 공유하는 page-level story가 추가되고 Saved analysis 헤더, 제출 보컬, 상세 분석, actions를 제품 UI와 동일하게 렌더링한다
    - 관련 Storybook test, typecheck, architecture check가 통과한다
  - Checklist:
    - [x] 분석 성공 상태에서 local analysis job key를 제거하고 `router.replace("/vocal-profiles/{id}")`로 상세에 직행하도록 구현
    - [x] `AnalysisSuccess`/`VocalProfileSummary`를 production 흐름에서 제거하고 해당 전용 story는 `!dev`/`!test`로 제품 Storybook 목록과 회귀 대상에서 제외
    - [x] `VocalProfileDetailContent`를 추출해 서버 상세 페이지와 `Pages/Vocal Profile Detail` Desktop/Mobile story가 동일 composition을 공유
    - [x] `pnpm run test:voice-scan` 12/12, `pnpm run test:vocal-profile-presentation` 12/12, 상세 story 2/2, 전체 Storybook 51 passed + 2 skipped files / 150 tests, typecheck·architecture PASS

- [DONE][PRD-FR-022] T-F027-notification-brand-color-07 오디오 준비 progress bar 실제 진행률 동기화
  - Date: 2026-08-14
  - Acceptance:
    - 업로드 파일 자동 자르기/인코딩 진행률 숫자와 progress bar 길이가 같은 값을 즉시 반영한다
    - 준비 진행률이 100%이면 bar도 완료 위치까지 도달한 상태가 화면에 반영된 뒤 준비 UI가 종료된다
    - 녹음 시간 progress와 다른 Progress 사용처의 접근성 값은 깨지지 않는다
  - Checklist:
    - [x] Base UI Progress indicator는 진행 중 width만 transition하고 `complete` 상태에서는 transition을 제거해 100% width를 즉시 반영
    - [x] `Shared UI/Progress > CompletionSync`에서 36→100 동적 변경 후 `aria-valuenow=100`, transition 0s, indicator width=track width를 브라우저 검증
    - [x] `pnpm run test:voice-scan` 12/12, Progress story 3/3, 전체 Storybook 51 passed + 2 skipped / 151 tests, typecheck·architecture PASS

- [DONE][PRD-FR-022] T-F027-notification-brand-color-08 오디오 준비 완료 프레임 보장
  - Date: 2026-08-14
  - Acceptance:
    - MediaBunny 변환 완료 후 100% 상태가 실제 브라우저에 paint된 뒤 Ready 화면으로 전환된다
    - 마지막 progress callback과 `preparing=false`가 같은 React batch에 묶여 100% 막대가 생략되지 않는다
    - 실제 `VoiceScanInput` 준비 상태 전환을 Storybook에서 재현해 100% 막대 노출을 검증한다
  - Checklist:
    - [x] 변환 성공 후 `setPreparationProgress(1)`을 명시하고 8 animation frames 동안 완료 상태를 유지한 뒤 Ready 화면으로 전환
    - [x] T07의 complete-state 즉시 width 동기화는 유지하되 generic `CompletionSync` story는 제거하고 실제 `VoiceScanInput` 검증으로 대체
    - [x] `VoiceScanInput` Preparing 46%/PreparingComplete 100%에서 실제 indicator/track 폭을 브라우저 DOM으로 검증
    - [x] `pnpm run test:voice-scan` 12/12, 타깃 Storybook 12/12, 전체 Storybook 51 passed + 2 skipped / 151 tests, typecheck·architecture PASS

- [DONE][PRD-FR-022] T-F027-notification-brand-color-09 오디오 준비 숫자와 progress bar 실시간 정합성
  - Date: 2026-08-14
  - Acceptance:
    - 준비 진행률이 1~99%인 동안 숫자와 indicator 폭이 같은 프레임의 같은 값을 나타낸다
    - progress 값 변경 시 bar가 CSS transition 때문에 숫자보다 뒤처지지 않는다
    - 공용 Progress의 녹음 시간·관리자 상태 등 기존 사용처와 접근성 값이 유지된다
  - Checklist:
    - [x] `ProgressIndicator`의 `transition-[width]`를 제거해 Base UI inline width를 같은 렌더에서 그대로 표시
    - [x] 실제 `VoiceScanInput` Preparing 46%에서 표시 숫자=46%, `aria-valuenow=46`, inline width=46%, transition 0s, 실제 indicator/track 폭≈0.46을 Chromium 검증
    - [x] `pnpm run test:voice-scan` 12/12, 타깃 Storybook 12/12, 전체 Storybook 51 passed + 2 skipped / 151 tests, typecheck·architecture PASS

- [DONE][PRD-FR-058] T-F027-notification-brand-color-10 알림 hover/focus 아이콘 semantic color 유지
  - Date: 2026-08-14
  - Acceptance:
    - 알림 Bell dropdown에서 item hover/focus 시 타입별 아이콘 배지 색이 기본 상태와 동일하게 유지된다
    - `ticket_credit` success, succeeded data-accent/white, failed destructive semantic color가 공용 dropdown focus descendant 색상에 덮어쓰이지 않는다
    - 실제 `NotificationBell` Storybook에서 hover 전후 computed icon color를 검증한다
  - Checklist:
    - [x] 공용 `DropdownMenuItem`의 `focus:**:text-accent-foreground`가 배지 semantic foreground를 덮어쓰는 충돌 확인; 공용 dropdown 동작은 유지하고 알림 배지 foreground만 inline token으로 고정
    - [x] `NotificationItemContent`에 `data-notification-icon-badge` hook과 success/white/destructive foreground token을 추가해 hover/focus에서도 타입 색 유지
    - [x] `NotificationBell` 실제 open story에서 5종 모두 hover 전후 computed color 불변 검증 — 수정 전 story가 실제로 실패했고 수정 후 2/2 타깃 PASS
    - [x] `pnpm run typecheck` PASS, `pnpm run check:architecture` PASS, 최종 전체 Storybook 51 passed + 2 skipped / 151 tests PASS

- [DONE][PRD-FR-058] T-F027-notification-brand-color-11 알림 SVG 아이콘 hover 컬러 회귀 보완
  - Date: 2026-08-14
  - Acceptance:
    - 알림 Bell dropdown hover/focus 시 실제 `svg` 아이콘의 computed color가 타입별 semantic color를 유지한다
    - T10처럼 wrapper badge만 검증하지 않고 실제 Lucide SVG를 직접 회귀 검증한다
    - 공용 dropdown의 다른 focus 텍스트 동작은 변경하지 않는다
  - Checklist:
    - [x] `NotificationItemContent`의 Lucide `svg` 자체에 타입별 semantic foreground를 inline style로 적용해 descendant focus color보다 우선하도록 수정
    - [x] `NotificationBell` story가 badge span이 아니라 실제 `svg` hover 전후 computed color를 검증 — 수정 전 `ticket_credit`가 success→검정으로 실패, 수정 후 2/2 타깃 PASS
    - [x] `pnpm run typecheck` PASS, `pnpm run check:architecture` PASS; 전체 Storybook은 기존 VoiceOrb/AudioWaveform 타이밍성 1건씩 간헐 실패했으나 각 단독 10/10, 3/3 PASS

- [DONE][PRD-FR-058] T-F027-notification-brand-color-12 알림 Lucide stroke hover 컬러 직접 고정
  - Date: 2026-08-14
  - Acceptance:
    - 실제 로컬 Bell dropdown에서 hover된 성공 알림의 Lucide stroke가 검정으로 바뀌지 않고 흰색을 유지한다
    - 회귀 테스트는 `svg` 부모가 아니라 실제 선을 그리는 `<path>`/mark의 `currentColor` 소스를 hover/focus 전후 비교한다
    - success/data-accent/destructive 5종 의미 색이 pointer hover와 keyboard focus 모두 유지된다
  - Checklist:
    - [x] T11 코드에서 실제 `<path>` computed color를 검사하도록 바꾸자 `ticket_credit`가 success `oklch(0.38 0.105 151)` → 검정 `oklch(0.205 0 0)`으로 변해 로컬 증상을 자동 재현
    - [x] 알림 badge에 `[&_svg_*]:!text-inherit`를 적용해 Lucide mark가 SVG의 semantic foreground를 강제 상속하고 공용 dropdown descendant focus 색보다 우선하도록 수정
    - [x] `NotificationBell` 실제 open story에서 5종 모두 badge semantic color = 실제 SVG mark color이며 pointer hover와 focus 후에도 불변임을 Chromium 검증
    - [x] NotificationBell+badge 2/2, typecheck, architecture PASS; 전체 Storybook 최종 51 passed + 2 skipped / 151 tests PASS

- [DONE][PRD-FR-051] T-F027-notification-brand-color-13 작업 상태 컬러 semantic 규칙 통일
  - Date: 2026-08-14
  - Acceptance:
    - 현재/진행 중은 연한 브랜드 컬러, 완료된 중간 단계는 검정, 최종 성공은 진한 브랜드 컬러를 사용한다
    - 대기·취소는 neutral, 실패는 destructive를 사용하며 lifecycle 의미가 화면마다 뒤집히지 않는다
    - 공용 실제 상태 timeline, 믹싱 상세 timeline, MixingStatusBadge, 보컬 분석 상태 chip이 같은 규칙을 따른다
  - Checklist:
    - [x] `lifecycleStatusClassNames`를 shared SSOT로 추가해 active/completed/success/failure semantic class를 공용화
    - [x] ActualStateTimeline/MixingTimeline을 current=brand tint, completed intermediate=foreground, terminal success=solid brand 규칙으로 통일
    - [x] MixingStatusBadge의 active는 brand tint, succeeded는 solid brand, failed는 destructive, canceled는 neutral로 통일하고 전 상태 Storybook 추가
    - [x] AnalysisStatus와 VocalProfileLibrary의 active analysis badge, MixingLibrary의 결과 확인 중 badge를 brand tint로 통일
    - [x] Storybook에서 current/completed/final success/failure 색 의미를 DOM class로 검증하고 failed terminal icon도 destructive 의미로 교체
    - [x] typecheck PASS, architecture 4/4 PASS, mixing/voice 관련 10/10 PASS, 타깃 Storybook 20/20 PASS, 전체 Storybook 52 passed + 2 skipped / 152 tests PASS

- [DONE][PRD-FR-051] T-F027-notification-brand-color-14 생성 퍼널 current solid brand 디자인 복원
  - Date: 2026-08-14
  - Acceptance:
    - 상단 생성 퍼널의 현재 단계는 기존처럼 solid `data-accent` + white로 강하게 표시된다
    - 완료된 이전 단계는 검정, upcoming은 neutral을 유지한다
    - 내부 작업 상태 timeline/chip은 T13의 brand tint 규칙을 유지해 navigation stepper와 lifecycle status UI를 구분한다
  - Checklist:
    - [x] `CreationFunnelStepper` current marker를 기존 `border-data-accent bg-data-accent text-white` solid brand 스타일로 복원
    - [x] `Widgets/Creation Funnel > ActiveAnalysis`에서 상단 current=`bg-data-accent text-white`, 내부 timeline current=`bg-data-accent/10 text-data-accent-foreground`를 같은 story에서 동시 검증
    - [x] 변경 파일 Biome PASS, typecheck PASS, architecture 4/4 PASS, Creation Funnel Storybook 4/4 PASS, 전체 Storybook 52 passed + 2 skipped / 152 tests PASS

- [DONE][NON-PRD] T-F027-notification-brand-color-15 VoiceOrb 전역 motion 완화 및 ready-entry 애니메이션
  - Date: 2026-08-14
  - Acceptance:
    - 모든 `VoiceOrb`의 shader/rotation motion 속도가 기존 대비 50%로 감소한다
    - WebGL ready 또는 fallback 확정 전에는 Orb가 보이지 않고, 준비 후 opacity 0→1 / scale 0→1 등장 애니메이션으로 노출된다
    - `prefers-reduced-motion: reduce`에서는 등장 애니메이션 없이 최종 상태를 즉시 표시한다
  - Checklist:
    - [x] 공용 `VoiceOrb`에 `ORB_MOTION_SPEED_SCALE=0.5`를 적용해 shader `iTime`과 hover rotation을 모두 절반 속도로 통일; `speed=1→0.5`, `speed=0.3→0.15` Storybook 검증
    - [x] WebGL canvas append 시점이 아니라 첫 `renderer.render()` 직후 `data-orb-ready=true`를 설정하고, ready/fallback 전 root를 opacity 0 + scale 0으로 숨긴 뒤 700ms `voice-orb-enter`로 opacity/scale 1까지 등장
    - [x] fallback에도 동일 entry를 적용하고 `prefers-reduced-motion: reduce`에서는 animation none + opacity/scale 최종 상태를 즉시 적용
    - [x] VoiceOrb/Login/VoiceScanInput 타깃 Storybook 15/15 PASS, voice-scan 12/12 PASS, typecheck PASS, architecture 4/4 PASS, 전체 Storybook 최종 52 passed + 2 skipped / 153 tests PASS

---

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [x] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료
- [x] 테스트 실행 및 통과 (아래에 명령어/결과 기록)
- [x] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

- 2026-08-14 구현 승인: 사용자 응답 `진행해`를 workflow 승인 옵션 `A`로 기록함.

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run check:architecture` | `2026-08-14` | `PASS — Steiger 0 issues, architecture boundary 4/4` |
| `pnpm run test:storybook --run` | `2026-08-14` | `PASS — 54 indexed story files: 52 passed, Summary/Analysis Success 2 skipped; 153 tests passed` |
| `pnpm run typecheck` | `2026-08-14` | `PASS` |



<!-- lee-spec-kit:workflow-sync 2026-08-14T07:33:45.000Z -->








