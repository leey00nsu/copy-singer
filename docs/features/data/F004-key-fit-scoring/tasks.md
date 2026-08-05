# Tasks: key-fit-scoring

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
- **레포**: copy-singer-data
- **브랜치**: `feat/key-fit-scoring`
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

- [DONE][PRD-FR-008][PRD-FR-010] T-F004-01 scorer 계약과 profile validation 구현
  - Date: 2026-08-06
  - Acceptance:
    - USER/SONG profile 공통 필드와 versioned 결과·오류 계약이 TypeScript로 정의된다.
    - finite 숫자, MIDI 구간 순서, quality 범위와 analyzer 호환성을 안정적인 오류 코드로 검증한다.
  - Checklist:
    - [x] public contract와 `key-fit-v1` 상수 정의
    - [x] validation 및 invalid/incompatible fixture 테스트

- [DONE][PRD-FR-008][PRD-NFR-007] T-F004-02 원키 score와 설명 가능한 breakdown 구현
  - Date: 2026-08-06
  - Acceptance:
    - 원키 점수가 0~100 범위에서 overlap, tessitura/extreme burden, confidence를 계획된 weight로 반영한다.
    - 각 정규화 metric과 weighted contribution을 결과에서 검증할 수 있다.
  - Checklist:
    - [x] interval·clamp·rounding 계산 구현
    - [x] 완전 겹침·고음·저음·저신뢰 경계 fixture 테스트

- [DONE][PRD-FR-009][PRD-FR-010] T-F004-03 추천 shift 탐색과 결정적 reason code 구현
  - Date: 2026-08-06
  - Acceptance:
    - -6~+6 정수 후보 중 최고 점수를 선택하고 동점은 문서화된 순서로 항상 동일하게 해소한다.
    - 원키/조정 점수, 추천 shift, 두 breakdown과 고정 순서 reason code를 반환한다.
  - Checklist:
    - [x] 후보 평가·tie-break·불변 입력 구현
    - [x] 키 내림·키 올림·원키·동점·반복 직렬화 테스트

- [DONE][PRD-FR-010][PRD-NFR-004] T-F004-04 100곡 artifact bulk adapter와 회귀 검증
  - Date: 2026-08-06
  - Acceptance:
    - F003 READY artifact 100곡을 catalogOrder 순서로 평가하고 비정상 상태는 명시적으로 거절한다.
    - 100곡 평가가 테스트 환경에서 100ms 목표를 만족하며 전체 프로젝트 회귀 테스트가 통과한다.
  - Checklist:
    - [x] bulk adapter와 package script 추가
    - [x] 실제 artifact 통합·성능·전체 회귀 테스트

---

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [x] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료
- [x] 테스트 실행 및 통과 (아래에 명령어/결과 기록)
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `npm run test:key-fit` | `2026-08-06` | PASS — 17 tests, 실제 READY 100곡 7.3ms, 결정성·오류 격리 포함 |
| `npx tsc --noEmit && npm run lint && npm test` | `2026-08-06` | PASS — TypeScript, ESLint, production build, UI/API·catalog·key-fit 전체 회귀 |

<!-- lee-spec-kit:workflow-sync 2026-08-05T15:24:43.000Z -->
