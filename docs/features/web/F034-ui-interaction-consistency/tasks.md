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
  - Evidence: Voice Scan Storybook 12/12 PASS; `pnpm exec tsc --noEmit` PASS

- [TODO][PRD-FR-049][PRD-FR-056][PRD-FR-066] T-F034-ui-interaction-consistency-02 추천 행 클릭으로 YouTube 미리보기 토글
  - Date: 2026-08-16
  - Acceptance:
    - 추천 행의 비상호작용 영역 click/keyboard 실행이 곡 선택과 영상 미리보기를 함께 토글한다.
    - 같은 행은 닫히고 다른 행은 교체되며 iframe은 최대 하나만 존재한다.
    - YouTube facade와 AI 믹싱 control은 중복 실행 없이 기존 독립 동작을 유지한다.
  - Checklist:
    - [ ] 영상 toggle 함수를 단일화하고 기존 `ResourceRowButton`에 selection + toggle을 연결한다.
    - [ ] `aria-expanded`와 `aria-controls`를 실제 player row와 동기화한다.
    - [ ] nested button·interactive `tr`·row-level click handler를 추가하지 않는다.
    - [ ] mouse, keyboard, 같은 행 닫기, 다른 행 교체, 독립 control 회귀 Storybook을 검증한다.
    - [ ] 추천 관련 Storybook과 TypeScript 검사를 통과한다.

- [TODO][PRD-FR-058][PRD-FR-066] T-F034-ui-interaction-consistency-03 Header Bell을 unread 전용 목록으로 분리
  - Date: 2026-08-16
  - Acceptance:
    - Header Bell은 최신 unread 알림만 최대 5개 표시하고 읽음 처리된 항목을 제거한다.
    - 모두 읽음 후 `새 알림이 없어요.` 상태를 표시한다.
    - 전체 알림 페이지는 읽은 알림을 포함한 전체 이력을 유지한다.
  - Checklist:
    - [ ] notification filter schema/API/client query에 기본값 false의 `unreadOnly`를 추가한다.
    - [ ] notification service의 where, total, unreadCount, pageCount 의미를 filter별로 검증한다.
    - [ ] Bell query만 unread filter를 사용하고 전체 페이지 query는 history 기본값을 유지한다.
    - [ ] 개별/모두 읽음 mutation 후 두 query cache가 올바르게 갱신되는지 검증한다.
    - [ ] service/API test와 Bell/전체 알림 Storybook을 통과한다.

- [TODO][PRD-FR-045][PRD-FR-051][PRD-FR-066] T-F034-ui-interaction-consistency-04 semantic icon color 기준 적용과 전체 회귀
  - Date: 2026-08-16
  - Acceptance:
    - 상태·알림 유형·오디오/데이터 icon만 semantic color를 사용하고 일반 navigation/action icon은 foreground를 상속한다.
    - Voice Scan guide icon은 하나의 `data-accent` 계열로 정리되며 색 외 텍스트 의미를 유지한다.
    - 디자인 시스템, Feature 문서, 실행 코드와 Storybook이 같은 규칙을 설명한다.
  - Checklist:
    - [ ] `docs/designs/design-system.md`에 icon color 적용/비적용 기준을 추가한다.
    - [ ] 새 token·raw color 없이 Voice Scan guide domain icon에 기존 semantic token을 적용한다.
    - [ ] 알림 badge·`StatusNotice`·data icon의 기존 semantic 표현과 일반 action icon의 상속을 감사한다.
    - [ ] 영향 받는 공통 UI API 또는 theme token이 없는지 확인하고 결과를 decisions/tasks에 기록한다.
    - [ ] 관련 Storybook, lint, TypeScript, 전체 `pnpm test`를 통과한다.
    - [ ] spec/plan/tasks/decisions와 workflow sync marker를 최종 구현에 맞게 동기화한다.

## 완료 조건

- [ ] 모든 태스크가 `[DONE]`이며 Acceptance/Checklist가 완료됨
- [ ] 테스트 실행 및 통과 기록 완료
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `/usr/bin/arch -arm64 /usr/local/bin/node /Users/leeyoonsu/.local/bin/pnpm exec vitest --project storybook --run src/_pages/profile/ui/voice-scan-input.stories.tsx` | `2026-08-16` | `PASS — 12/12` |
| targeted recommendation Storybook | `-` | `PENDING` |
| targeted notification tests/Storybook | `-` | `PENDING` |
| `pnpm run lint` | `-` | `PENDING` |
| `pnpm exec tsc --noEmit` | `-` | `PENDING` |
| `pnpm test` | `-` | `PENDING` |

<!-- lee-spec-kit:workflow-sync 2026-08-16T09:29:31.000Z -->
