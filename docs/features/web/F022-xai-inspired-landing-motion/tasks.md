# Tasks: xai-inspired-landing-motion

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
- **브랜치**: `feat/xai-inspired-landing-motion`
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

> 아래에 태스크를 추가하세요. **최소 1개가 필요**합니다.
> 태스크는 하나의 순차 리스트로 유지하고, 위에서 아래 순서 자체를 실행 우선순위로 취급하세요.
> 새 태스크 append에는 `npx lee-spec-kit task add <feature-ref> --title "..." --ref NON-PRD --acceptance "..." --check "..."` 사용을 우선하세요.
> 새 태스크는 마지막 기존 태스크 아래에 완전한 태스크 블록으로 추가하세요. `PRD-FR-001`이나 `PRD-SCOPE-V1-DESKTOP-EDITOR`처럼 이미 정의된 PRD key를 사용하거나, 내부 작업이면 `[NON-PRD]`를 사용합니다.
> placeholder 상태의 `Acceptance` / `Checklist`를 그대로 두지 마세요. 구체 항목이 아니면 구현을 시작하지 않습니다.
> 수동 편집이 필요하면 현재 태스크 근처가 아니라 `태스크 목록`의 마지막 기존 태스크 block 아래에만 append 하세요.

---

- [DONE][PRD-FR-046] T-F022-xai-inspired-landing-motion-01 중앙형 랜딩 구조와 제품 preview 재구성
  - Date: 2026-08-12
  - Acceptance:
    - 첫 viewport에 중앙 정렬 headline, 설명, 단일 primary CTA와 실제 profile 흐름으로 연결되는 voice preview가 함께 표시된다.
    - 기존 인증별 CTA href, ProductHeader, ProductFooter와 실제 3단계 제품 범위를 유지한다.
  - Checklist:
    - [x] landing page markup을 hero, voice preview와 후속 section 책임으로 정리했다.
    - [x] 가짜 진행률·점수·데이터와 crystal/prism 없이 semantic token으로 구성했다.
    - [x] signed-out과 signed-in CTA 및 공통 shell 회귀를 Storybook에서 확인했다.

- [DONE][PRD-FR-045] T-F022-xai-inspired-landing-motion-02 절제된 waveform·glow·reveal motion 구현
  - Date: 2026-08-12
  - Acceptance:
    - Hero waveform, masked dotted glow와 section reveal이 Copy Singer accent 범위 안에서 동작하며 layout shift를 만들지 않는다.
    - WebGL·GSAP·motion runtime 없이 CSS progressive enhancement로 구현하고 미지원 환경에서 콘텐츠가 정적으로 보인다.
  - Checklist:
    - [x] 기존 waveform/ripple CSS를 진폭·위상·glow 계층으로 확장했다.
    - [x] entry와 view reveal은 작은 opacity/translate 변화로 한 번만 실행되게 했다.
    - [x] dotted glow는 정적으로 유지하고 지속 animation은 첫 Hero의 waveform/ripple로 제한했다.

- [DONE][PRD-FR-046] T-F022-xai-inspired-landing-motion-03 3단계 scroll story와 반응형 fallback 완성
  - Date: 2026-08-12
  - Acceptance:
    - Desktop에서 분석, 추천, 선택형 AI 믹싱이 sticky scroll narrative로 실제 순서대로 연결된다.
    - Mobile 320px 이상에서는 sticky나 scroll-jacking 없이 단일 열로 표시되고 horizontal overflow가 없다.
  - Checklist:
    - [x] 세 단계 preview에 현재 제품 계약에 존재하는 정보만 사용했다.
    - [x] 실제 action은 Hero의 profile Link로 유지하고 story preview는 비상호작용 presentation으로 구분했다.
    - [x] scroll story 뒤에 trust 근거, 마지막 CTA와 footer가 이어지는 문서 순서를 확인했다.

- [TODO][PRD-FR-051] T-F022-xai-inspired-landing-motion-04 접근성·reduced-motion·Storybook 회귀 검증
  - Date: 2026-08-12
  - Acceptance:
    - Keyboard, focus-visible, accessible name, heading/landmark 구조와 WCAG AA 대비 기준을 충족한다.
    - Reduced-motion에서 장식 animation과 큰 transform이 제거돼도 모든 정보와 action이 유지된다.
  - Checklist:
    - [ ] signed-out, signed-in, mobile과 reduced-motion Storybook 상태를 추가 또는 보강한다.
    - [ ] Storybook browser interaction과 a11y 검증을 실행한다.
    - [ ] TypeScript, lint와 architecture boundary 검사를 통과한다.

- [TODO][NON-PRD] T-F022-xai-inspired-landing-motion-05 브라우저 시각·성능 검증과 문서 동기화
  - Date: 2026-08-12
  - Acceptance:
    - Desktop/mobile/reduced-motion 브라우저 검증에서 hero, scroll story, CTA/footer가 의도대로 보이며 console 오류가 없다.
    - Production build가 통과하고 신규 animation runtime이나 WebGL dependency가 포함되지 않는다.
  - Checklist:
    - [ ] desktop과 mobile 결과 스크린샷을 생성하고 직접 검토한다.
    - [ ] production build 및 관련 전체 검증 명령을 실행한다.
    - [ ] product UI 디자인 문서, decisions와 workflow sync evidence를 최종 구현에 맞게 갱신한다.

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
| `pnpm run test:storybook --run src/_pages/home/ui/landing-page.stories.tsx` | `2026-08-12` | 통과 — motion 적용 후 signed-out/in CTA, waveform action, Admin/UserMenu와 footer 회귀 2/2 |
| `pnpm exec biome check src/_pages/home/ui/landing-page.tsx src/_pages/home/ui/landing-hero.tsx src/_pages/home/ui/landing-hero.module.css` | `2026-08-12` | 통과 — 3개 landing 파일 format/lint 확인 |
| `pnpm run typecheck` | `2026-08-12` | 통과 — 신규 landing story component 포함 TypeScript 오류 없음 |

<!-- lee-spec-kit:workflow-sync 2026-08-12T01:48:07.000Z -->
