# Tasks: waveform-brand-icon

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
- **브랜치**: `feat/waveform-brand-icon`
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

- [DONE][PRD-FR-052] T-F023-waveform-brand-icon-01 벡터 파형 app mark와 파생 아이콘 적용
  - Date: 2026-08-13
  - Acceptance:
    - [x] canonical SVG가 사용자 제공 일곱 막대 geometry와 violet-blue-pink 연속 gradient를 보존한다.
    - [x] ProductMark, favicon과 apple touch icon이 동일 SVG asset family를 사용하고 기존 접근성·metadata 계약을 유지한다.
    - [x] 16px부터 180px까지 clipping이나 bar 결합 없이 파형을 식별할 수 있고 관련 자동 검사와 시각 QA가 통과한다.
  - Checklist:
    - [x] canonical SVG와 deterministic PNG generation script 및 asset contract test를 추가한다.
    - [x] ProductMark와 Storybook asset selector를 SVG source로 전환하고 기존 AI master PNG를 제거한다.
    - [x] 정적 검사, 관련 Storybook test, production build와 multi-size contact sheet QA를 수행한다.

- [DONE][PRD-FR-052] T-F023-waveform-brand-icon-02 metadata SEO 및 Open Graph 브랜드 동기화
  - Date: 2026-08-13
  - Acceptance:
    - [x] 홈 production head가 canonical, complete Open Graph/Twitter metadata와 favicon/apple icon을 Copysinger 기준으로 출력한다.
    - [x] 1200×630 OG PNG가 새 파형 mark와 Copysinger 이름을 사용하고 기존 Vocal Loom/beige artwork를 포함하지 않는다.
    - [x] robots.txt와 sitemap.xml은 공개 route만 crawl/index 대상으로 제공하고 product, login, admin, dev route는 noindex 처리한다.
  - Checklist:
    - [x] canonical site origin resolver와 root/home/private metadata 계약을 구현한다.
    - [x] Copysinger OG SVG master 및 PNG generation을 추가하고 asset test를 확장한다.
    - [x] Next.js robots/sitemap metadata route와 private noindex 경계를 구현한다.
    - [x] metadata unit test, 정적 검사, build, production head 및 OG visual QA를 수행한다.

- [DONE][PRD-FR-052] T-F023-waveform-brand-icon-03 Copysinger wordmark와 Paperlogy OG 정렬
  - Date: 2026-08-13
  - Acceptance:
    - 사용자-visible 제품명, metadata, 인증 appName과 법률 문서가 Copysinger 단일 표기를 사용한다.
    - 공통 ProductBrand wordmark와 OG 제목이 제공된 Paperlogy 7Bold TTF를 동일하게 사용한다.
    - OG는 단색 흰 배경 중앙에 작은 파형 logo, Copysinger, Find your voice. Sing your Match 순서로 정렬된 1200×630 이미지다.
  - Checklist:
    - [x] Paperlogy 7Bold를 repository local font로 추가하고 Next localFont brand token에 연결한다.
    - [x] 서비스명 텍스트 표기를 `Copysinger`로 전역 동기화하고 관련 test를 갱신한다.
    - [x] OG SVG와 generation pipeline에 repository font를 embed하고 요청한 중앙형 composition을 구현한다.
    - [x] asset/metadata/Storybook test, 정적 검사, build, production head와 OG visual QA를 수행한다.

- [DONE][PRD-FR-053] T-F023-waveform-brand-icon-04 비상업적 운영 및 음원 이용 고지 정리
  - Date: 2026-08-13
  - Acceptance:
    - [x] 공개 전 경고와 확인되지 않은 운영자 연락처 placeholder를 사용자 화면에서 제거한다.
    - [x] 이용약관은 Copysinger의 비상업적 토이 프로젝트 성격과 원본 음원 미제공·비판매·비재배포·비학습 원칙을 고지한다.
    - [x] 개인정보 처리방침은 유지하고 존재하지 않는 이메일이나 문의 기능을 안내하지 않는다.
  - Checklist:
    - [x] 법률 문서 공통 layout의 draft 상태와 경고 배너를 제거한다.
    - [x] 이용약관과 개인정보 처리방침의 공개 전 placeholder를 확정된 현재 운영 정책으로 교체한다.
    - [x] 관련 Storybook test와 정적 검사를 실행하고 문서를 동기화한다.

- [DONE][PRD-FR-053] T-F023-waveform-brand-icon-05 공개 화면 외부 기술명 비식별화
  - Date: 2026-08-13
  - Acceptance:
    - [x] 개인정보 처리방침에서 외부 서비스 고유명은 Google만 남긴다.
    - [x] 이용약관과 사용자-visible 화면·오류 메시지에서 PostgreSQL, SoulX, Modal, Leemage 명칭을 제거한다.
    - [x] 내부 구현 식별자와 개발 문서는 기능 보존을 위해 유지하고 전수검사 결과를 분리 기록한다.
  - Checklist:
    - [x] 법률 문서의 업체 목록과 국외 처리 문구를 Google 중심으로 정리한다.
    - [x] src/app 공개 문자열을 전수검사해 외부 기술명을 중립적 용어로 교체한다.
    - [x] Storybook test, 정적 검사와 build를 실행하고 문서를 동기화한다.

- [DONE][PRD-FR-053] T-F023-waveform-brand-icon-06 개인정보 처리방침 사용자 언어 간소화
  - Date: 2026-08-13
  - Acceptance:
    - [x] 개인정보 처리 항목을 계정·접속·음성·추천/믹싱·이용내역의 다섯 범주로 묶어 설명한다.
    - [x] 파기 절차는 보유기간 만료·삭제 요청·복구 곤란 삭제·법정 보존 분리 원칙만 고지한다.
    - [x] 안전성 확보 조치에서 작업 queue, lease, idempotency 같은 시스템 구현 세부사항을 제거한다.
  - Checklist:
    - [x] 개인정보 처리방침 2·8·10절을 사용자 관점 문장으로 다시 작성한다.
    - [x] 법률 Storybook test와 정적 검사·build를 실행한다.
    - [x] Feature 문서와 검증 근거를 동기화한다.

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [x] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료
- [x] 테스트 실행 및 통과 (아래에 명령어/결과 기록)
- [x] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run test:brand-icons` | `2026-08-13` | 통과 — icon/OG asset 5건, canonical/OG/robots/sitemap metadata 3건, 합계 8/8 |
| `pnpm exec vitest --project storybook src/widgets/product-shell/ui/product-shell.stories.tsx src/_pages/login/ui/login-screen.stories.tsx src/_pages/home/ui/landing-page.stories.tsx --run` | `2026-08-13` | 통과 — 3 files, 13 tests |
| `pnpm run check` | `2026-08-13` | 통과 — Biome 기존 warning 56건, ESLint·TypeScript·Steiger·architecture test 성공 |
| `pnpm run build` | `2026-08-13` | 통과 — Next.js 16.3.0 production build, 31 routes; `/robots.txt`·`/sitemap.xml` static 생성 |
| `pnpm run brand:icons` + SHA-256 비교 | `2026-08-13` | 통과 — Paperlogy TTF `fe71049f…`, OG `11deaa82…` 재생성 전후 동일 |
| Browser visual QA | `2026-08-13` | 통과 — production ProductBrand가 Paperlogy 700 계산값을 사용하고 파형 mark/wordmark 정렬 정상; 흰 배경 중앙형 `public/og.png` 확인 |
| production metadata HTTP audit | `2026-08-13` | 통과 — title/OG site name은 `Copysinger`, Twitter large image와 canonical/OG image 출력 확인 |
| `pnpm exec vitest --project storybook src/_pages/legal/ui/legal-pages.stories.tsx --run` | `2026-08-13` | 통과 — Terms/Privacy 2/2, 개인정보 다섯 범주와 비상업·원본 음원 미제공 고지 확인 |
| 공개 문자열 provider-name audit | `2026-08-13` | 통과 — legal 및 `_pages`에서 PostgreSQL/SoulX/Modal/Leemage 노출 0건, 사용자 오류·API 설명의 기존 고유명 문구 0건 |
| `pnpm run test:vocal-profile-analyzer && pnpm run test:voice-scan && pnpm run test:mixing:ui && pnpm run test:recommendation` | `2026-08-13` | 통과 — analyzer 8, voice scan 12, mixing UI 8, recommendation 33; 합계 61/61 |

<!-- lee-spec-kit:workflow-sync 2026-08-13T14:58:45+09:00 -->
