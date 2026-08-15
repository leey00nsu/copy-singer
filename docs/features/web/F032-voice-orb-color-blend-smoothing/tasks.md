# Tasks: voice-orb-color-blend-smoothing

## 태스크 규칙

- **상태**: `[TODO]` → `[DOING]` → `[DONE]`
- `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 상태를 갱신합니다.
- `[DOING] → [DONE]`: Acceptance와 Checklist를 실제 검증 후 함께 완료합니다.
- 한 번에 하나의 태스크만 진행합니다.
- 문서화된 review checkpoint와 원격/파괴적 작업 외에는 별도 승인 단계를 추가하지 않습니다.

---

## 로컬 추적 정보

- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/voice-orb-color-blend-smoothing`
- **대기 중 변경 요청**: -
- **스펙 승인**: 2026-08-15 사용자 응답 `자동진행.`을 workflow 승인 옵션 `A`로 기록
- **구현 승인**: 2026-08-15 사용자 응답 `완료처리해줘`를 최신 구현에 대한 workflow 승인 옵션 `A`로 기록
- **로컬 머지 승인**: -
- **PR 전 리뷰**: Pending
- **PR 전 리뷰 Evidence**: -
- **PR 전 리뷰 Decision**: -
- **PR 리뷰**: -
- **PR 리뷰 Evidence**: -
- **PR 리뷰 Decision**: -

---

## 태스크 목록

- [DONE][PRD-FR-064] T-F032-voice-orb-color-blend-smoothing-01 WebGL 내부 색 혼합 완화
  - Date: 2026-08-15
  - Acceptance:
    - dominant RGB channel이 바뀌는 지점에서 alpha normalization이 불연속적으로 꺾이지 않는다.
    - 핑크↔보라 전환 구간이 넓어지고 단일 선처럼 읽히는 색 경계가 완화된다.
    - 중앙 highlight→컬러 영역 밝기 falloff가 급격한 내부 contour를 만들지 않는다.
    - 외곽 edgeMask, orb 크기, motion scale, public props는 유지된다.
  - Checklist:
    - [x] `extractAlpha()`를 연속적인 smooth normalization으로 교체했다.
    - [x] angular color phase에 저주파·저진폭 warp를 적용했다.
    - [x] blend contrast와 `v0` attenuation/gamma를 조정했다.
    - [x] 외곽/motion 불변 조건을 source-contract test로 고정해 2/2 PASS를 확인했다.

- [DONE][PRD-FR-064] T-F032-voice-orb-color-blend-smoothing-02 fallback·Storybook 시각 회귀 정리
  - Date: 2026-08-15
  - Acceptance:
    - WebGL fallback도 live orb와 비교해 날카로운 내부 색 seam을 만들지 않는다.
    - `speed=0` 고정 프레임 Storybook에서 내부 blend를 반복해서 비교할 수 있다.
    - login/landing/voice-signal-core의 기존 VoiceOrb 사용처 레이아웃과 상태 동작이 유지된다.
  - Checklist:
    - [x] fallback gradient의 내부 highlight/보라 전환 폭을 넓히고 중간 라벤더 톤을 추가했다.
    - [x] `speed=0` 고정 프레임 `SoftBlendReference` Storybook story를 추가했다.
    - [x] VoiceOrb/login/landing/voice-signal 주요 사용처 Storybook을 실행해 5 files / 25 tests PASS를 확인했다.

- [DONE][PRD-FR-064] T-F032-voice-orb-color-blend-smoothing-03 전체 회귀 검증과 문서 동기화
  - Date: 2026-08-15
  - Acceptance:
    - shader/CSS 변경이 기존 빌드·정적 분석·Storybook을 깨지 않는다.
    - spec/plan/tasks/decisions와 실제 최종 구현이 일치한다.
  - Checklist:
    - [x] shader/fallback source contract test를 실행해 3/3 PASS를 확인했다.
    - [x] `pnpm run lint`를 실행해 PASS를 확인했다.
    - [x] `pnpm exec tsc --noEmit`을 실행해 PASS를 확인했다.
    - [x] `pnpm test`를 실행해 build/unit/integration 및 Storybook 163/163 PASS를 확인했다.
    - [x] 구현 수치와 검증 Evidence를 decisions/tasks에 동기화했다.

- [DONE][PRD-FR-064] T-F032-voice-orb-color-blend-smoothing-04 기존 투명감 복원
  - Date: 2026-08-15
  - Acceptance:
    - smooth normalization과 저주파 color warp는 유지해 내부 핑크↔보라 seam을 다시 만들지 않는다.
    - F032 초기 구현에서 증가한 alpha/채도 밀도를 낮춰 이전 orb처럼 배경이 은은하게 비치는 가벼운 인상을 복원한다.
    - 외곽 `edgeMask`, orb 크기, motion scale, public props는 변경하지 않는다.
    - WebGL fallback도 live orb와 비슷한 투명한 밀도를 유지한다.
  - Checklist:
    - [x] smooth normalization을 softmax-weighted average(`sharpness=12`)로 바꿔 기존 hard max보다 alpha가 커지지 않게 했다.
    - [x] `v0` attenuation/gamma를 F032 이전 밀도로 복원하고 fallback gradient/inner shadow의 불투명도를 낮췄다.
    - [x] shader contract 4/4와 고정 프레임/주요 사용처 Storybook 5 files / 25 tests PASS를 확인했다.
    - [x] lint/typecheck와 최종 `pnpm test`를 다시 통과해 Storybook 163/163 PASS를 확인했다.
    - [x] 최종 Evidence를 decisions/tasks에 동기화했다.

---

## 완료 조건

- [x] 모든 태스크가 `[DONE]`이며 Acceptance/Checklist가 완료됨
- [x] 테스트 실행 및 통과 기록 완료
- [x] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

- 2026-08-15 최신 구현 승인: 투명감 복원 결과 공유 후 사용자 응답 `완료처리해줘`를 현재 구현 전체에 대한 workflow 승인 옵션 `A`로 기록했다.

### 테스트 실행 기록

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| VoiceOrb shader/fallback contract | `2026-08-15` | `PASS — 4/4, smooth alpha ≤ 기존 hard max 검증 포함` |
| targeted Storybook: VoiceOrb/login/landing/voice-signal | `2026-08-15` | `PASS — 5 files / 25 tests` |
| `pnpm run lint` | `2026-08-15` | `PASS` |
| `pnpm exec tsc --noEmit` | `2026-08-15` | `PASS` |
| `pnpm test` | `2026-08-15` | `PASS — build + unit/integration + Storybook 163/163` |

- **구현 커밋**: `2961a82` (`feat(F032): 전체 회귀 검증과 문서 동기화`), `4eafce2` (`feat(F032): 기존 투명감 복원`)

<!-- lee-spec-kit:workflow-sync 2026-08-15T10:16:17.000Z -->
