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

---

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [ ] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료
- [ ] 테스트 실행 및 통과 (아래에 명령어/결과 기록)
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run check:architecture` | `-` | `-` |
| `pnpm run test:storybook --run` | `-` | `-` |
| `pnpm run typecheck` | `-` | `-` |



<!-- lee-spec-kit:workflow-sync 2026-08-14T02:27:12.297Z -->








