# Tasks: voice-orb-ios-webgl-compositing

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
- **디자인 시스템 동기화(조건부)**: `docs/designs/design-system.md`를 변경하는 태스크는 영향 받는 디자인 문서, token/theme, 공통 UI, Storybook/workbench와 검증을 같은 task의 `Checklist`에서 추적하세요. 영향이 없는 영역은 변경하지 말고 영향 여부만 확인합니다.

---

## 로컬 추적 정보
- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/voice-orb-ios-webgl-compositing`
- **대기 중 변경 요청**: -
  - 구현 중 새로 수용한 사용자 요청을 잠시 표시하는 sync marker입니다
  - 요청을 `tasks.md`와 관련 문서에 반영한 뒤 값을 비우세요
  - pre-PR 리뷰 handoff를 시작하면 `Running`, 리뷰 결과 기록까지 끝나면 `Done`으로 변경
  - 형식: `결정: approve|changes_requested|blocked ...` (또는 `decision: ...`)
  - PR 생성 전 최종 통과 기준은 `approve`
  - 기본 베이스라인으로 `agents/skills/create-pr.md`(`Pre-PR 기본 체크리스트`) 기준을 따르세요
- **스펙 승인**: 2026-08-18 사용자 응답 `자동 진행해줘. 대신 실제 ihpone safari에서는 내 실 기기로 테스트할거니까 그 부분은 제외하고 진행`을 실제 iPhone Safari 검증 제외 조건이 반영된 spec 승인으로 기록
- **실기기 검증 경계**: 실제 iPhone Safari 확인은 사용자 후속 범위이며 Feature 완료 조건과 자동화 Evidence에서 제외
- **실기기 후속 확인**: 2026-08-18 사용자가 실제 iPhone Safari에서 canvas 흰 사각형 문제가 해결됐음을 확인
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

> 아래에 태스크를 추가하세요. **최소 1개가 필요**합니다.
> 태스크는 하나의 순차 리스트로 유지하고, 위에서 아래 순서 자체를 실행 우선순위로 취급하세요.
> 새 태스크 append에는 `npx lee-spec-kit task add <feature-ref> --title "..." --ref NON-PRD --acceptance "..." --check "..."` 사용을 우선하세요.
> 새 태스크는 마지막 기존 태스크 아래에 완전한 태스크 블록으로 추가하세요. `PRD-FR-001`이나 `PRD-SCOPE-V1-DESKTOP-EDITOR`처럼 이미 정의된 PRD key를 사용하거나, 내부 작업이면 `[NON-PRD]`를 사용합니다.
> placeholder 상태의 `Acceptance` / `Checklist`를 그대로 두지 마세요. 구체 항목이 아니면 구현을 시작하지 않습니다.
> 수동 편집이 필요하면 현재 태스크 근처가 아니라 `태스크 목록`의 마지막 기존 태스크 block 아래에만 append 하세요.

---

- [DONE][PRD-FR-064] T-F039-voice-orb-ios-webgl-compositing-01 WebGL alpha와 shader falloff 계약 수정
  - Date: 2026-08-18
  - Acceptance:
    - 투명 canvas의 drawing buffer와 fragment output이 동일한 premultiplied alpha 계약을 사용한다.
    - orb 외부 alpha 0 픽셀의 RGB가 page compositor에 색을 전달하지 않는다.
    - 역순 smoothstep이 정의된 inverse falloff로 교체되며 기존 threshold와 외곽 silhouette가 유지된다.
  - Checklist:
    - [x] OGL Renderer에 premultipliedAlpha true를 명시한다.
    - [x] 최종 fragment RGB에 alpha를 premultiply한다.
    - [x] 두 역순 smoothstep을 lowEdge < highEdge인 inverse helper 호출로 교체한다.
    - [x] shader source contract를 갱신하고 targeted test 5/5를 통과한다.

- [DONE][PRD-FR-064] T-F039-voice-orb-ios-webgl-compositing-02 VoiceOrb browser와 사용처 회귀 검증
  - Date: 2026-08-18
  - Acceptance:
    - live VoiceOrb canvas가 실제 premultiplied alpha context를 사용한다.
    - 고정 프레임과 fallback, login, landing, voice-signal-core의 기존 레이아웃과 상태 동작이 유지된다.
    - 자동화 가능한 모바일 viewport에서 canvas 직사각형 배경이 노출되지 않는다.
  - Checklist:
    - [x] VoiceOrb Storybook에서 실제 context attribute가 `premultipliedAlpha=true`임을 검증한다.
    - [x] targeted Storybook 4 files / 23 tests를 실행해 통과했다.
    - [x] 모바일 390×844 viewport의 live WebGL 화면에서 canvas 사각형이 보이지 않음을 시각 확인했다.

- [DONE][PRD-FR-064] T-F039-voice-orb-ios-webgl-compositing-03 전체 회귀 검증과 문서 동기화
  - Date: 2026-08-18
  - Acceptance:
    - 변경이 lint, typecheck, build와 전체 테스트를 깨지 않는다.
    - spec, plan, tasks, decisions와 최종 구현 및 검증 Evidence가 일치한다.
  - Checklist:
    - [x] lint와 typecheck를 통과한다.
    - [x] 전체 `pnpm test`를 통과했다.
    - [x] 최종 기술 결정과 테스트 결과를 decisions와 tasks에 기록했다.
    - [x] workflow sync marker를 갱신하고 audit 대상으로 준비했다.

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [x] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료 <!-- lee-spec-kit:completion:all-tasks -->
- [x] 테스트 실행 및 통과 (아래에 명령어/결과 기록) <!-- lee-spec-kit:completion:tests -->
- [x] 사용자 자동 진행 요청 범위에서 최종 결과와 검증 Evidence를 문서화함 <!-- lee-spec-kit:completion:final-outcome -->

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm exec tsx --test tests/voice-orb-shader.test.ts` | `2026-08-18` | `PASS — 5/5` |
| `pnpm exec biome check src/shared/ui/voice-orb/voice-orb.tsx tests/voice-orb-shader.test.ts` | `2026-08-18` | `PASS — 2 files` |
| targeted Storybook: VoiceOrb/login/landing/voice-signal | `2026-08-18` | `PASS — 4 files / 23 tests` |
| `pnpm exec biome check src/shared/ui/voice-orb/voice-orb.stories.tsx` | `2026-08-18` | `PASS — 1 file` |
| mobile viewport live WebGL visual | `2026-08-18` | `PASS — 390×844, canvas 333×208 CSS px, no rectangular background` |
| `pnpm run lint` | `2026-08-18` | `PASS` |
| `pnpm exec tsc --noEmit` | `2026-08-18` | `PASS` |
| `pnpm test` | `2026-08-18` | `PASS — production build + Node/integration + Storybook 54 passed/2 skipped, 176 tests` |
| 실제 iPhone Safari 후속 확인 | `2026-08-18` | `PASS — 사용자 확인, orb 주변 canvas 흰 사각형 미노출` |

<!-- lee-spec-kit:workflow-sync 2026-08-18T09:10:00.000Z -->
