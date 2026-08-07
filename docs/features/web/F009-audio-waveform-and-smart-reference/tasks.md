# Tasks: audio-waveform-and-smart-reference

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
- **브랜치**: `feat/audio-waveform-and-smart-reference`
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

- [DONE][PRD-FR-040] T-F009-audio-waveform-and-smart-reference-01 WaveSurfer 기반 60초 실시간 녹음 구현
  - Date: 2026-08-07
  - Acceptance:
    - 녹음 중 실제 마이크 입력 파형과 경과 시간이 표시되고 수동 정지 또는 60초에 종료된다.
    - 권한 거부·재녹음·unmount에서 recorder, mic stream과 WaveSurfer instance가 남지 않는다.
  - Checklist:
    - [x] wavesurfer.js와 @wavesurfer/react를 설치하고 Record plugin wrapper를 구현한다.
    - [x] 기존 MediaRecorder 흐름을 60초 Record plugin event 계약으로 교체한다.
    - [x] 녹음 lifecycle·MIME·60초 종료 회귀 테스트를 추가한다.

- [DONE][PRD-FR-041] T-F009-audio-waveform-and-smart-reference-02 프로젝트 공통 WaveSurfer 오디오 플레이어 적용
  - Date: 2026-08-07
  - Acceptance:
    - 사용자 재생 오디오가 동일한 파형·재생·탐색·시간 UI를 제공한다.
    - Blob과 보호 Range URL이 동작하고 큰 파일 decode 오류에도 재생 fallback이 남는다.
  - Checklist:
    - [x] 재사용 AudioWaveformPlayer와 접근 가능한 controls·fallback을 구현한다.
    - [x] profile, recommendation, mixing history와 개발 Workbench의 native audio를 교체한다.
    - [x] event·URL cleanup·Range·error fallback 회귀 테스트를 추가한다.

- [DONE][PRD-FR-042] T-F009-audio-waveform-and-smart-reference-03 60초 분석 source와 smart 30초 합성 reference 분리
  - Date: 2026-08-07
  - Acceptance:
    - 프로필 통계는 최대 60초 source로 계산되고 합성 reference만 저·중·고 목표 각 10초의 최대 30초로 생성된다.
    - 품질 좋은 구간이 부족하면 budget을 재분배하며 반복·padding 없이 결정적 phrase 선택과 crossfade를 적용한다.
    - 새 mixing은 smart asset을 사용하고 과거 profile은 기존 source fallback으로 처리된다.
  - Checklist:
    - [x] analyzer phrase selection·reference WAV·descriptor와 download endpoint를 구현한다.
    - [x] Prisma synthesis reference relation과 Leemage 이중 asset 저장·삭제·부분 실패 보상을 구현한다.
    - [x] mixing enqueue asset 선택과 analyzer·DB·cleanup 통합 테스트를 추가한다.

- [DONE][PRD-FR-043] T-F009-audio-waveform-and-smart-reference-04 shadcn Chart 기반 보컬 프로필 시각화 전환
  - Date: 2026-08-07
  - Acceptance:
    - 음역·histogram·pitch trace가 shadcn Chart/Recharts의 반응형 차트와 tooltip으로 표시된다.
    - 무성 pitch gap, MIDI 음이름, accessibility layer와 기존 텍스트 요약이 보존된다.
  - Checklist:
    - [x] shadcn Chart와 Recharts v3를 추가하고 공통 MIDI formatter·chart config를 만든다.
    - [x] range, histogram과 pitch trace의 CSS·수동 SVG 구현을 Recharts로 교체한다.
    - [x] data mapping·tooltip·null gap·legacy unavailable UI 테스트를 추가한다.

- [TODO][PRD-NFR-005] T-F009-audio-waveform-and-smart-reference-05 전체 오디오·시각화 파이프라인과 품질 비교 검증
  - Date: 2026-08-07
  - Acceptance:
    - 녹음부터 profile 저장·추천·mixing reference 선택·결과 재생까지 전체 흐름이 회귀 없이 동작한다.
    - 기존 앞 30초와 smart reference의 voiced density·pitch coverage 비교 결과와 한계를 문서화한다.
  - Checklist:
    - [ ] 브라우저에서 실시간 waveform, 모든 player와 responsive chart를 검증한다.
    - [ ] 동일 source의 baseline/smart reference 정량 비교를 기록하고 실제 Modal A/B는 별도 비용 승인 전 실행하지 않는다.
    - [ ] Python·Prisma·TypeScript·ESLint·build·전체 test와 workflow audit을 통과한다.

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
| `pnpm exec tsx --test tests/vocal-profile-recorder.test.ts` | 2026-08-07 | PASS (2/2) |
| `pnpm exec tsc --noEmit` | 2026-08-07 | PASS |
| `pnpm run lint` | 2026-08-07 | PASS |
| `pnpm run build` | 2026-08-07 | PASS (Next.js 16.3.0, 21 pages) |
| `pnpm exec tsx --test tests/audio-waveform-player.test.ts` | 2026-08-07 | PASS (2/2) |
| `pnpm run test:vocal-profile-history` | 2026-08-07 | PASS (UI 2/2, private Range proxy/history 3/3) |
| `pnpm run test:recommendation` | 2026-08-07 | PASS (18/18) |
| `pnpm run test:mixing:ui` | 2026-08-07 | PASS (1/1) |
| `services/vocal-profile-api/.venv/bin/pytest -q services/vocal-profile-api/tests/test_analysis.py services/vocal-profile-api/tests/test_reference.py services/vocal-profile-api/tests/test_api.py::test_health_analyze_and_delete` | 2026-08-07 | PASS (10/10) |
| `pnpm run test:media` | 2026-08-07 | PASS (5/5, source/synthesis Leemage assets 포함) |
| `pnpm run test:mixing:db` | 2026-08-07 | PASS (smart reference snapshot/worker 1/1) |
| `pnpm exec tsx --test tests/mixing-reference.test.ts` | 2026-08-07 | PASS (smart 우선·legacy fallback·ownership 3/3) |
| `pnpm run db:validate && pnpm run db:status` | 2026-08-07 | PASS (migration 7개, up to date) |
| `pnpm exec tsx --test tests/vocal-profile-visualization.test.ts` | 2026-08-07 | PASS (mapping·null gap 5/5) |
| Chrome local browser (`/vocal-profiles/:id`) | 2026-08-07 | PASS (shadcn chart 3개, tooltip, 375px no overflow) |

<!-- lee-spec-kit:workflow-sync 2026-08-07T09:13:57.000Z -->
