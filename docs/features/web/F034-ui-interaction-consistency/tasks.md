# Tasks: ui-interaction-consistency

## 태스크 규칙

- **상태**: `[TODO]` → `[DOING]` → `[DONE]`
- `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 상태를 갱신합니다.
- `[DOING] → [DONE]`: Acceptance와 Checklist를 실제 검증 후 함께 완료합니다.
- 한 번에 하나의 태스크만 `[DOING]`으로 유지합니다.
- 완료된 태스크에 후속 작업이 생기면 기존 태스크를 다시 쓰지 않고 새 태스크를 추가합니다.

## 로컬 추적 정보

- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/ui-interaction-consistency`
- **대기 중 변경 요청**: -
- **PR 리뷰**: -
- **PR 리뷰 Evidence**: -

## 태스크 목록

- [DONE][PRD-FR-047][PRD-FR-062][PRD-FR-066] T-F034-ui-interaction-consistency-01 녹음 결과 정보와 입력 action 폭 정리
  - Date: 2026-08-16
  - Acceptance:
    - 자동 마이크 녹음 준비 화면에는 내부 파일명이 표시되지 않고 직접 업로드한 파일명은 유지된다.
    - 파일 크기·길이·waveform·준비 상태와 실제 분석 업로드 계약은 유지된다.
    - idle/error의 녹음 action과 upload action은 mobile/desktop에서 같은 width를 사용한다.
  - Checklist:
    - [x] workbench에서 recording/upload 출처를 명시적으로 추적하고 reset/error 경로를 정리했다.
    - [x] `VoiceScanInput` 준비 카드의 파일명 presentation을 출처에 따라 분기했다.
    - [x] recorder idle/error action과 upload label에 같은 width constraint를 적용했다.
    - [x] 자동 녹음·직접 업로드·error/mobile 상태 Storybook을 추가하거나 갱신했다.
    - [x] 관련 Storybook과 TypeScript 검사를 통과했다.
  - Evidence: `12f2fe7` (`feat(F034): 녹음 입력 정보와 버튼 폭 정리`); Voice Scan Storybook 12/12 PASS; `pnpm exec tsc --noEmit` PASS

- [DONE][PRD-FR-049][PRD-FR-056][PRD-FR-066] T-F034-ui-interaction-consistency-02 추천 행 클릭으로 YouTube 미리보기 토글
  - Date: 2026-08-16
  - Acceptance:
    - 추천 행의 비상호작용 영역 click/keyboard 실행이 곡 선택과 영상 미리보기를 함께 토글한다.
    - 같은 행은 닫히고 다른 행은 교체되며 iframe은 최대 하나만 존재한다.
    - YouTube facade와 AI 믹싱 control은 중복 실행 없이 기존 독립 동작을 유지한다.
  - Checklist:
    - [x] 영상 toggle 함수를 단일화하고 기존 `ResourceRowButton`에 selection + toggle을 연결했다.
    - [x] `aria-expanded`와 `aria-controls`를 실제 player row와 동기화했다.
    - [x] nested button·interactive `tr`·row-level click handler를 추가하지 않았다.
    - [x] mouse, keyboard, 같은 행 닫기, 다른 행 교체, 독립 control 회귀 Storybook을 검증했다.
    - [x] 추천 관련 Storybook과 TypeScript 검사를 통과했다.
  - Evidence: `69cc4eb` (`feat(F034): 추천 행 영상 미리보기 토글`); recommendation Storybook 10/10 PASS; `pnpm exec tsc --noEmit` PASS

- [DONE][PRD-FR-058][PRD-FR-066] T-F034-ui-interaction-consistency-03 Header Bell을 unread 전용 목록으로 분리
  - Date: 2026-08-16
  - Acceptance:
    - Header Bell은 최신 unread 알림만 최대 5개 표시하고 읽음 처리된 항목을 제거한다.
    - 모두 읽음 후 `새 알림이 없어요.` 상태를 표시한다.
    - 전체 알림 페이지는 읽은 알림을 포함한 전체 이력을 유지한다.
  - Checklist:
    - [x] notification filter schema/API/client query에 기본값 false의 `unreadOnly`를 추가했다.
    - [x] notification service의 where, total, unreadCount, pageCount 의미를 filter별로 검증했다.
    - [x] Bell query만 unread filter를 사용하고 전체 페이지 query는 history 기본값을 유지했다.
    - [x] 개별/모두 읽음 mutation 후 두 query cache가 올바르게 갱신되는지 검증했다.
    - [x] service/API test와 Bell/전체 알림 Storybook을 통과했다.
  - Evidence: `0d74a70` (`feat(F034): 알림 목록 unread 조회 분리`); `test:query` 32/32 PASS; notification Storybook 4/4 PASS; notification DB integration 1/1 PASS; `pnpm exec tsc --noEmit` PASS

- [DONE][PRD-FR-045][PRD-FR-051][PRD-FR-066] T-F034-ui-interaction-consistency-04 semantic icon color 기준 적용과 전체 회귀
  - Date: 2026-08-16
  - Acceptance:
    - 상태·알림 유형·오디오/데이터 icon만 semantic color를 사용하고 일반 navigation/action icon은 foreground를 상속한다.
    - Voice Scan guide icon은 하나의 `data-accent` 계열로 정리되며 색 외 텍스트 의미를 유지한다.
    - 디자인 시스템, Feature 문서, 실행 코드와 Storybook이 같은 규칙을 설명한다.
  - Checklist:
    - [x] `docs/designs/design-system.md`에 icon color 적용/비적용 기준을 추가했다.
    - [x] 새 token·raw color 없이 Voice Scan guide domain icon에 기존 semantic token을 적용했다.
    - [x] 알림 badge·`StatusNotice`·data icon의 기존 semantic 표현과 일반 action icon의 상속을 감사했다.
    - [x] 영향 받는 공통 UI API 또는 theme token이 없음을 확인하고 decisions/tasks에 기록했다.
    - [x] 관련 Storybook, lint, TypeScript, 전체 `pnpm test`를 통과했다.
    - [x] spec/plan/tasks/decisions와 workflow sync marker를 최종 구현에 맞게 동기화했다.
  - Evidence: `dfee58d` (`feat(F034): semantic 아이콘 색상 기준 적용`); Voice Scan Storybook 13/13 PASS; `pnpm run lint` PASS; `pnpm exec tsc --noEmit` PASS; full `pnpm test` PASS — build + unit/integration/DB/FSD + Storybook 166/166

- [DONE][PRD-FR-047][PRD-FR-050][PRD-FR-066] T-F034-ui-interaction-consistency-05 공용 오디오 player 재생속도·음량 조절 추가
  - Date: 2026-08-16
  - Acceptance:
    - 모든 공용 waveform player가 pitch-preserving `0.75×`, `1×`, `1.25×`, `1.5×` 속도와 0–100 음량 조절을 제공한다.
    - 기존 play/pause, seek, restart, mute, segment playback과 fallback 동작을 유지한다.
    - control은 keyboard/ARIA와 mobile responsive 계약을 충족한다.
  - Checklist:
    - [x] player instance에 playback rate·volume state와 Wavesurfer 동기화를 추가했다.
    - [x] responsive speed Select와 volume Slider/percentage label을 추가했다.
    - [x] volume 변경과 mute toggle의 상호작용을 일관되게 처리했다.
    - [x] Storybook에서 rate preset, volume keyboard, mute, loading/reduced-motion 회귀를 검증했다.
    - [x] lint, TypeScript와 전체 `pnpm test`를 통과했다.
    - [x] spec/plan/tasks/decisions와 workflow sync marker를 최종 구현에 맞게 동기화했다.
  - Evidence: AudioWaveformPlayer Storybook 3/3 PASS; `pnpm run lint` PASS; `pnpm exec tsc --noEmit` PASS; full `pnpm test` PASS — build + unit/integration/DB/FSD + Storybook 166/166

## 완료 조건

- [x] 모든 태스크가 `[DONE]`이며 Acceptance/Checklist가 완료됨
- [x] 테스트 실행 및 통과 기록 완료
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `/usr/bin/arch -arm64 /usr/local/bin/node /Users/leeyoonsu/.local/bin/pnpm exec vitest --project storybook --run src/_pages/profile/ui/voice-scan-input.stories.tsx` | `2026-08-16` | `PASS — 12/12` |
| `/usr/bin/arch -arm64 /usr/local/bin/node /Users/leeyoonsu/.local/bin/pnpm exec vitest --project storybook --run src/_pages/recommendation-detail/ui/recommendation-results.stories.tsx` | `2026-08-16` | `PASS — 10/10` |
| `/usr/bin/arch -arm64 /usr/local/bin/node /Users/leeyoonsu/.local/bin/pnpm run test:query` | `2026-08-16` | `PASS — 32/32` |
| `/usr/bin/arch -arm64 /usr/local/bin/node /Users/leeyoonsu/.local/bin/pnpm exec vitest --project storybook --run src/features/manage-notifications/ui/notification-bell.stories.tsx src/_pages/notifications/ui/notifications-list.stories.tsx` | `2026-08-16` | `PASS — 4/4` |
| `/usr/bin/arch -arm64 /usr/local/bin/node --conditions react-server --import tsx --test tests/notification-service.integration.ts` | `2026-08-16` | `PASS — 1/1` |
| `/usr/bin/arch -arm64 /usr/local/bin/node /Users/leeyoonsu/.local/bin/pnpm exec vitest --project storybook --run src/shared/ui/audio-waveform-player/audio-waveform-player.stories.tsx` | `2026-08-16` | `PASS — 3/3` |
| `pnpm run lint` | `2026-08-16` | `PASS` |
| `pnpm exec tsc --noEmit` | `2026-08-16` | `PASS` |
| `/usr/bin/arch -arm64 /usr/local/bin/node /Users/leeyoonsu/.local/bin/pnpm test` | `2026-08-16` | `PASS — build + unit/integration/DB/FSD + Storybook 166/166` |

<!-- lee-spec-kit:workflow-sync 2026-08-16T10:01:53.000Z -->
