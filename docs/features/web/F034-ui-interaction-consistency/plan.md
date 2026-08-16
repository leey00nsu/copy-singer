# Implementation Plan: ui-interaction-consistency

> 승인된 spec.md를 구현 가능한 변경 단위로 구체화합니다.

---

## 개요

- **기능 ID**: F034
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-16
- **상태**: Approved

## 기술 스택

| 구분 | 선택 | 이유 |
| --- | --- | --- |
| 녹음 출처 상태 | 기존 React local state + discriminating prop | 실제 `File.name`과 업로드 계약을 바꾸지 않고 presentation만 분기한다. |
| 추천 행 상호작용 | 기존 `ResourceRowButton` stretched action | 중첩 button이나 interactive table row 없이 행의 주 interaction을 확장한다. |
| 알림 필터 | Zod query contract + Prisma `where` + TanStack Query key | Bell과 전체 이력의 조회 의미를 API부터 cache까지 명시적으로 분리한다. |
| 아이콘 색 | 기존 Tailwind semantic token | raw color와 새 라이브러리 없이 디자인 시스템 의미를 실행 코드와 맞춘다. |
| 검증 | node:test 또는 기존 단위 테스트 + Storybook interaction + ESLint/TypeScript | 데이터 필터, 접근성, 반응형 UI와 회귀를 함께 검증한다. |

## 구현 원칙

1. 자동 녹음의 파일 객체·MIME·확장자는 그대로 유지하고 화면에 보이는 이름만 숨긴다.
2. 업로드 파일명은 사용자가 선택한 대상을 확인하는 정보이므로 유지한다.
3. 추천 행에 새 `onClick`이나 `role=button`을 붙이지 않고 기존 stretched button을 확장한다.
4. Bell의 unread 전용 조회와 전체 알림 페이지의 history 조회는 서로 다른 query key를 사용한다.
5. 아이콘 색은 상태·도메인 의미를 보조하는 semantic token만 사용하고 일반 action glyph는 재색칠하지 않는다.

## 1. 녹음 결과 presentation과 입력 action 정리

### 1.1 오디오 출처 상태

`src/_pages/profile/ui/vocal-profile-workbench.tsx`에 `AudioInputSource = "recording" | "upload"` 성격의 local state를 둔다.

- 마이크 녹음 완료 시 `recording`
- 파일 선택·60초 자르기 확정 시 `upload`
- reset 시 `null`
- 준비 실패 시 이전 준비 결과와 출처가 잘못 표시되지 않도록 상태 정리

`VoiceScanInput`에는 `audioSource`를 전달한다. 준비 카드에서 `audioSource === "upload"`일 때만 `audioFile.name`을 렌더링하고, 녹음 경로는 `내 녹음`처럼 새 가짜 파일명을 만들지 않고 크기·길이 metadata만 표시한다.

### 1.2 동일한 action width

`RecorderSurface`의 idle/error action과 `VoiceScanInput`의 upload label에 같은 width constraint를 적용한다. 두 control은 content rail 전체 폭을 사용한다. 녹음 중 원형 stop/cancel control과 분석 준비 후 action은 범위에서 제외한다.

Primary/secondary 위계는 다음처럼 유지한다.

- 녹음 시작·마이크 다시 시도: 기존 primary Button
- 녹음 파일로 분석하기: 기존 dashed secondary upload label

### 1.3 Storybook

`voice-scan-input.stories.tsx`와 recorder 관련 story에서 다음을 검증한다.

- 자동 녹음 준비 상태에 내부 파일명 부재
- 직접 업로드 준비 상태에 사용자 파일명 존재
- idle/error recorder와 upload action의 width contract
- mobile/desktop layout과 기존 duration/status UI 유지

## 2. 추천 행 클릭 기반 YouTube 미리보기

`src/_pages/recommendation-detail/ui/recommendation-song-list.tsx`에서 영상 toggle 함수를 한 곳으로 추출한다.

- 기존 `ResourceRowButton` click: `onSelect(item.id)` 후 해당 영상 toggle
- `aria-expanded={videoActive}`와 `aria-controls={playerId}` 연결
- YouTube facade: 영상만 toggle하며 이벤트가 stretched row action으로 중복 전달되지 않는 기존 z-index/독립 control 구조 유지
- Mixing action: 기존 독립 control 유지
- 활성 ID 하나만 유지해 여러 iframe을 동시에 만들지 않음

`recommendation-results.stories.tsx`에서 행 일반 영역의 mouse/keyboard 실행, 같은 행 닫기, 다른 행 교체, facade/mixing 독립 동작과 iframe 최대 1개를 검증한다.

## 3. Header Bell unread 전용 조회

### 3.1 계약과 서버

`src/entities/notification/model/contract.ts`의 filters에 boolean query parameter `unreadOnly`를 추가하고 기본값은 `false`로 둔다.

`src/_app/api-routes/notifications/notifications-route.ts`가 query string을 schema에 전달하고, `getNotifications()`가 filter를 받아 Prisma `where`를 다음처럼 선택한다.

- `false`: `{ userId }`
- `true`: `{ userId, readAt: null }`

filter가 true이면 `total`은 필터된 unread 결과 수이고 `unreadCount`와 일치한다. 전체 이력 query에서는 `total`은 전체 수, `unreadCount`는 전체 중 unread 수를 유지한다.

### 3.2 Client cache와 UI

`src/features/manage-notifications/api/client.ts`가 `unreadOnly`를 URL과 query key에 포함한다. `NotificationBell`만 `{ page: 1, pageSize: 5, unreadOnly: true }`를 사용하고 `/notifications`는 기본 `false`를 유지한다.

기존 read/read-all mutation의 list-family invalidation으로 두 cache를 함께 갱신한다. 읽음 처리 뒤 Bell에서 항목이 제거되고 zero state가 표시되는지 검증한다.

### 3.3 검증

- notification service/API test: unread filter, 정렬, total/unreadCount/pageCount
- Bell Storybook: 읽은 fixture 제외, 개별 읽음 후 제거, 모두 읽음 후 empty
- 전체 알림 Storybook: 읽은 항목 유지

## 4. Semantic icon color 적용

`docs/designs/design-system.md`의 Color 또는 Component rules에 icon color 기준을 명시한다.

이번 Feature의 실행 코드 변경은 다음으로 제한한다.

- Voice Scan `HOW TO RECORD`의 네 domain icon을 단일 `data-accent` 계열로 보조 강조
- 이미 semantic color를 사용하는 알림 유형 badge, `StatusNotice`, score/data icon은 유지 및 회귀 확인
- navigation, search, chevron, close, reset, upload, Button 내부 icon은 foreground 상속 유지

새 CSS token, raw hex, icon gradient는 추가하지 않는다. Voice Scan Storybook에서 icon color가 semantic token을 사용하고 텍스트·layout을 해치지 않는지 확인한다.

## 5. 공용 오디오 player 재생속도·음량 조절

`src/shared/ui/audio-waveform-player/audio-waveform-player.tsx`에 player instance 단위 state와 compact Popover control을 추가한다.

- playback rate: 음소거 왼쪽 speed icon trigger + `0.75`, `1`, `1.25`, `1.5` preset Popover
- volume: 음소거 왼쪽 volume icon trigger + `0..100`, step 5의 공용 Slider와 정수 percentage label Popover
- rate 변경: `wavesurfer.setPlaybackRate(rate, true)`로 pitch 보존
- volume 변경: `wavesurfer.setVolume(value / 100)`; 0보다 큰 slider 변경은 mute 해제
- mute button: 현재 volume 값은 보존하고 `setMuted()`만 toggle
- 새 `src`: 기존 keyed instance 경계에 따라 1×·100%·unmuted 기본값으로 초기화

기존 playback/time row 안에서 `speed → volume → mute` 순서로 compact icon trigger를 배치하고 별도 하단 control row는 제거한다. 공용 Base UI Popover wrapper를 추가해 focus, Escape와 outside click 접근성을 유지한다. decode fallback의 native audio control은 유지한다. `audio-waveform-player.stories.tsx`에서 Popover open/close, preset 선택, keyboard volume 변경, mute 상호작용과 기존 loading/reduced-motion 상태를 검증하고 전체 회귀를 실행한다.

## 6. 완료된 추천 믹싱을 Library 상세로 연결

`RecommendationMixingAction`의 succeeded non-compact branch에서 `synthesis.jobId`가 있으면 `mixingJobDetailHref(jobId)`를 사용한 `믹싱 결과 보기` Link를 렌더링한다. component-owned `audioOpen`, 인라인 `AudioWaveformPlayer`, download anchor를 제거한다. `jobId`가 없는 불완전 완료 payload에는 잘못된 Link 대신 완료 badge만 제공한다.

Recommendation action/결과 Storybook과 정적 UI test를 `결과 듣기` 부재, 정확한 상세 href와 인라인 player 부재 기준으로 갱신한다.

## 파일 구조

```text
docs/
├── designs/design-system.md
├── prd/copy-singer-prd.md
└── features/web/F034-ui-interaction-consistency/
    ├── spec.md
    ├── plan.md
    ├── tasks.md
    └── decisions.md
src/
├── _app/api-routes/notifications/notifications-route.ts
├── _pages/profile/ui/
│   ├── vocal-profile-workbench.tsx
│   ├── voice-scan-input.tsx
│   ├── voice-scan-guide.tsx
│   ├── vocal-profile-recorder.tsx
│   └── voice-scan-input.stories.tsx
├── _pages/recommendation-detail/ui/
│   ├── recommendation-song-list.tsx
│   └── recommendation-results.stories.tsx
├── entities/notification/
│   ├── api/notification-service.ts
│   └── model/contract.ts
├── features/manage-notifications/
│   ├── api/client.ts
│   └── ui/notification-bell.tsx
└── shared/ui/audio-waveform-player/
    ├── audio-waveform-player.tsx
    └── audio-waveform-player.stories.tsx
```

## 테스트 전략

- **단위/API 테스트**: recording source presentation helper가 생기면 source별 label, notification unread filter와 pagination 의미를 검증한다.
- **Storybook interaction**: Voice Scan, recommendation results, notification Bell, full notifications list의 실제 click/keyboard/empty state를 검증한다.
- **정적 검사**: 관련 테스트 후 `pnpm run lint`, `pnpm exec tsc --noEmit`을 실행한다.
- **전체 회귀**: `pnpm test`로 build, unit/integration, FSD, Storybook 전체를 검증한다.

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
- Design System: `docs/designs/design-system.md`
