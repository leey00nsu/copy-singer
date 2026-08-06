# Tasks: vocal-profile-ui-bug-fixes

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
- **브랜치**: `feat/vocal-profile-ui-bug-fixes`
- **대기 중 변경 요청**: -
  - 구현 중 새로 수용한 사용자 요청을 잠시 표시하는 sync marker입니다
  - 요청을 `tasks.md`와 관련 문서에 반영한 뒤 값을 비우세요
  - pre-PR 리뷰 handoff를 시작하면 `Running`, 리뷰 결과 기록까지 끝나면 `Done`으로 변경
  - 형식: `결정: approve|changes_requested|blocked ...` (또는 `decision: ...`)
  - PR 생성 전 최종 통과 기준은 `approve`
  - 기본 베이스라인으로 `agents/skills/create-pr.md`(`Pre-PR 기본 체크리스트`) 기준을 따르세요
- **구현 승인**: 2026-08-06 사용자 승인 — 전체 추천 순위와 선택형 자동 피치 AI 믹싱까지 F007 범위 마무리
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

- [DONE][PRD-FR-001] T-F007-vocal-profile-ui-bug-fixes-01 브라우저 WebM 녹음 MIME 정규화 및 분석 회귀 수정
  - Date: 2026-08-06
  - Acceptance:
    - audio/webm;codecs=opus 브라우저 녹음이 MIME 검증과 실제 FFmpeg 디코딩을 거쳐 보컬 프로필 분석에 성공한다.
    - 정규화된 audio/webm이 recording metadata에 저장되고 기존 미지원·손상 오디오 오류 계약이 유지된다.
  - Checklist:
    - [x] 수정 전 parameterized WebM 415 재현 테스트를 추가한다.
    - [x] analyzer MIME 정규화와 allowlist 적용을 구현한다.
    - [x] 실제 WebM/Opus 성공, unsupported MIME, 손상 payload 회귀 테스트를 통과한다.
    - [x] TypeScript, ESLint, production build와 Python 전체 테스트를 통과한다.

- [DONE][PRD-NFR-005] T-F007-vocal-profile-ui-bug-fixes-02 공식 Next.js Node 런타임 및 pnpm으로 전환
  - Date: 2026-08-06
  - Acceptance:
    - vinext/Cloudflare/Sites 전용 실행 경로가 제거되고 pnpm dev/build/start가 공식 Next.js Node 런타임으로 동작한다.
    - 실제 Next HTTP 요청에서 WebM 분석 결과가 PostgreSQL에 저장되고 기존 프로필·추천·합성 API 회귀 검사가 통과한다.
    - pnpm-lock.yaml이 유일한 lockfile이며 frozen install이 성공한다.
  - Checklist:
    - [x] Sites/vinext/Vite/Worker 파일과 전용 의존성을 제거하고 Next.js 16.3.0 scripts를 구성한다.
    - [x] packageManager를 pnpm 11.9.0으로 고정하고 package-lock.json을 pnpm-lock.yaml로 교체한다.
    - [x] Prisma 및 오디오 Route Handler의 Node runtime 계약과 Next TypeScript 설정을 정리한다.
    - [x] 실제 next dev WebM→analyzer→Prisma HTTP 201 및 DB cleanup을 검증한다.
    - [x] pnpm frozen install, lint, TypeScript, Python, 전체 테스트와 production build를 통과한다.

- [DONE][PRD-FR-003][PRD-FR-021][PRD-DATA-005] T-F007-vocal-profile-ui-bug-fixes-03 시각화용 음정 분포 및 피치 추적 descriptor 추가
  - Date: 2026-08-06
  - Acceptance:
    - analyzer가 기존 음역 통계를 유지하면서 반음별 상대 빈도와 무성 구간을 보존한 bounded pitch series를 반환한다.
    - descriptor는 JSON으로 저장·조회되고 전체 원시 frame 배열이나 720개를 넘는 pitch point를 보관하지 않는다.
  - Checklist:
    - [x] histogram과 bounded pitch track 생성 함수를 구현한다.
    - [x] analyzer/API/TypeScript 계약에 구조화된 descriptor 타입을 반영한다.
    - [x] 실제 분석, 무성 구간, 최대 길이와 기존 통계 회귀 테스트를 통과한다.
    - [x] Docker analyzer에서 새 descriptor가 PostgreSQL을 거쳐 조회되는지 검증한다.

- [DONE][PRD-US-002][PRD-US-008][PRD-FR-021] T-F007-vocal-profile-ui-bug-fixes-04 보컬 프로필 결과 시각화 UI 구현
  - Date: 2026-08-06
  - Acceptance:
    - 첨부 레퍼런스처럼 음역 프로필, 음정 분포, 요약 카드, 품질 지표와 상세 피치 추적을 한 결과 화면에서 확인할 수 있다.
    - descriptor가 없는 기존 프로필과 모바일 화면에서도 오류나 가로 overflow 없이 핵심 집계값을 확인할 수 있다.
  - Checklist:
    - [x] descriptor parser와 MIDI/음이름/축 helper를 구현하고 단위 테스트를 추가한다.
    - [x] 범위·histogram·pitch trace SVG와 품질 카드 컴포넌트를 구현한다.
    - [x] 기존 결과 영역을 새 대시보드로 교체하고 추천·삭제 흐름을 유지한다.
    - [x] lint, TypeScript, production build와 전체 회귀 테스트를 통과한다.
    - [x] 실제 분석 결과를 데스크톱·모바일 브라우저에서 시각 검증한다.

- [DONE][PRD-US-009][PRD-FR-022] T-F007-vocal-profile-ui-bug-fixes-05 긴 파일 최초 음성 기준 60초 자동 자르기
  - Date: 2026-08-06
  - Acceptance:
    - 60초 초과 파일 선택 시 확인 대화상자가 표시되고 거절하면 선택을 취소하며 동의하면 최초 유효 음성부터 최대 60초로 분석한다.
    - 자동 자른 WAV가 분석과 후속 합성 reference에 동일하게 사용되고 일반 파일의 기존 계약이 유지된다.
  - Checklist:
    - [x] 브라우저 파일 duration 확인과 접근 가능한 예/아니오 대화상자를 구현한다.
    - [x] trim 동의 multipart 계약과 파일 카드 상태 안내를 구현한다.
    - [x] analyzer FFmpeg 선행 무음 제거·60초 제한과 trimmed source 보관을 구현한다.
    - [x] 동의/미동의 긴 오디오 API 회귀와 기존 분석 테스트를 통과한다.
    - [x] 실제 로컬 브라우저에서 대화상자와 두 선택 경로를 검증한다.

- [DONE][PRD-US-003][PRD-US-004][PRD-US-005][PRD-US-006][PRD-FR-008][PRD-FR-009][PRD-FR-010][PRD-FR-011][PRD-FR-018] T-F007-vocal-profile-ui-bug-fixes-06 원키 음색 데모 중심 추천 scoring v2
  - Date: 2026-08-06
  - Acceptance:
    - 대칭 테시투라 겹침과 원키 중심 selection score로 좁은 곡·큰 shift 편향을 줄이면서 추천 노래방 키 계산을 유지한다.
    - 새 추천 실행은 key-fit-v2와 selection score를 저장하고 추천 카드는 결과를 원키 음색 데모로 명확히 표시한다.
  - Checklist:
    - [x] key-fit-v2 Dice overlap과 경계 회귀 테스트를 구현한다.
    - [x] 원키 65%·조정 35%·단계형 shift 감점 selection score와 결정적 tie-break를 구현한다.
    - [x] selection score 저장·조회 호환성과 원키 음색 데모 UI 문구를 반영한다.
    - [x] 실제 저장 profile fixture와 100곡 artifact에서 반복 1위 편향 감소를 검증한다.
    - [x] 전체 Node·Python·DB 회귀와 production build를 통과한다.

- [DONE][PRD-US-005][PRD-US-006][PRD-US-007][PRD-FR-011][PRD-FR-016][PRD-FR-017][PRD-FR-018][PRD-NFR-008] T-F007-vocal-profile-ui-bug-fixes-07 전체 추천 순위와 선택형 자동 피치 AI 믹싱
  - Date: 2026-08-06
  - Acceptance:
    - 새 추천 실행은 100곡 전체를 적합도 순 목록으로 저장·반환하고 기존 3곡 실행 조회 호환성을 유지한다.
    - 추천 생성·조회만으로 합성을 시작하지 않으며 사용자가 `AI 믹싱`을 누른 항목 하나만 `auto_pitch_shift=true`로 합성한다.
    - 목록 항목에서 초기 버튼, 진행 상태, 성공 결과, 실패 재시도를 확인할 수 있다.
  - Checklist:
    - [x] ranking·persistence·API를 100곡 전체 결과 계약으로 확장한다.
    - [x] 3개 카드와 mount-time 자동 합성을 전체 목록과 항목별 `AI 믹싱` 동작으로 교체한다.
    - [x] 추천 합성 제품 preset을 `auto_pitch_shift=true`로 변경하고 Workbench 설정과 분리한다.
    - [x] ranking·DB·합성·UI 회귀 테스트와 production build를 통과한다.
    - [x] 로컬 브라우저에서 전체 목록이 초기 미합성 상태로 표시되고 mock 통합 테스트에서 선택한 단일 항목만 합성 시작되는지 검증한다.

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
| `services/vocal-profile-api/.venv/bin/python -m pytest services/vocal-profile-api/tests` | `2026-08-06` | `PASS — 23 tests, 긴 파일 미동의 413·선행 무음 제거·60초 WAV 보관 포함` |
| `pnpm install --frozen-lockfile` | `2026-08-06` | `PASS — pnpm 11.9.0 lockfile 고정 설치 및 Prisma/esbuild build scripts 완료` |
| `pnpm test` | `2026-08-06` | `PASS — Next production build, profile/긴 파일 5, catalog 7, key-fit-v2 19, recommendation 18; 전체 100곡 ranking/UI 포함` |
| `pnpm run lint` | `2026-08-06` | `PASS` |
| `pnpm exec tsc --noEmit` | `2026-08-06` | `PASS` |
| `pnpm run test:recommendation:db` | `2026-08-06` | `PASS — 3 tests; 100개 persistence, 초기 Modal 0회, 선택 항목 1개·중복 요청 Modal 1회, 나머지 99개 not_started, auto_pitch_shift=true` |
| `pnpm dev 실제 HTTP WebM 프로필 저장` | `2026-08-06` | `PASS — HTTP 201, PostgreSQL 저장 및 DELETE cleanup` |
| `pnpm start /api/vocal-profiles/health` | `2026-08-06` | `PASS — HTTP 200, analyzer/database ok` |
| `Docker analyzer audio/webm;codecs=opus smoke test` | `2026-08-06` | `PASS — HTTP 200, mimeType audio/webm, 8초 Opus 분석 후 fixture 삭제` |
| `Next HTTP visualization descriptor 저장 smoke test` | `2026-08-06` | `PASS — 5.4초 WebM, histogram 10 bins, track 466/720 points, 무성 구간 보존, DB cleanup` |
| `Browser desktop/mobile vocal profile visualization` | `2026-08-06` | `PASS — 실제 분석값 렌더링, 375px 가로 overflow 없음, validation fixture cleanup` |
| `Browser 70초 MP3 자동 자르기` | `2026-08-06` | `PASS — 확인 modal 예/아니오, 상태 카드, Next HTTP 201, 결과 60.0초·22,050Hz, DB/source cleanup` |
| `Next HTTP key-fit-v2 추천 smoke test` | `2026-08-06` | `PASS — 고음 실제 profile Top 3 잊었니/붉은 노을/천상연, selection score 저장, synthesis not_started, run cleanup` |
| `Browser 전체 추천 순위 smoke test` | `2026-08-06` | `PASS — 실제 저장 profile로 100개/100개 not_started, AI 믹싱 버튼 100개, 100위 표시, 초기 믹싱 중 0개, 1280px overflow 없음, 검증 run cleanup; 실제 Modal 호출 안 함` |

<!-- lee-spec-kit:workflow-sync 2026-08-06T18:21:00+09:00 -->
