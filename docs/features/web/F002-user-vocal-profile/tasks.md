# Tasks: user-vocal-profile

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
- **브랜치**: `feat/user-vocal-profile`
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

- [DONE][PRD-FR-002] T-F002-user-vocal-profile-01 librosa 보컬 분석기와 품질 gate 구현
  - Date: 2026-08-05
  - Acceptance:
    - 합성 고정음·sweep·무음·clipping 입력에서 정의된 품질 reason code와 집계 pitch 통계를 결정적으로 반환한다.
  - Checklist:
    - [x] ffmpeg 표준화 전후에 적용할 duration, RMS, clipping, voiced ratio gate를 구현한다.
    - [x] segmented melody/glissando 및 일반 upload 통계 계산을 구현한다.
    - [x] 합성 fixture 단위 테스트로 임계값과 analyzer version을 검증한다.

- [DONE][PRD-DATA-004] T-F002-user-vocal-profile-02 로컬 analyzer API와 오디오 저장 경계 구현
  - Date: 2026-08-05
  - Acceptance:
    - FastAPI analyzer가 25MB 제한 multipart를 streaming 저장·분석하고 health/delete 계약과 24시간 storage metadata를 제공한다.
  - Checklist:
    - [x] FastAPI analyze, health, delete endpoint와 구조화된 오류 계약을 구현한다.
    - [x] Python 3.12/ffmpeg Docker image와 bind volume을 Compose에 추가한다.
    - [x] API upload, 오류, 삭제 테스트와 container healthcheck를 통과한다.

- [DONE][PRD-FR-004] T-F002-user-vocal-profile-03 Next 보컬 프로필 API와 Prisma 저장 구현
  - Date: 2026-08-05
  - Acceptance:
    - same-origin API에서 body streaming 분석, Recording/VocalProfile transaction 저장, 단건 조회와 원본 포함 삭제가 동작한다.
  - Checklist:
    - [x] 공유 TypeScript contract와 analyzer proxy route를 구현한다.
    - [x] Prisma create/get/delete와 BigInt response 정규화를 구현한다.
    - [x] DB 저장 실패 고아 파일 정리와 analyzer/DB health 응답을 구현한다.

- [DONE][PRD-FR-001] T-F002-user-vocal-profile-04 적응형 안내 멜로디와 브라우저 녹음 UI 구현
  - Date: 2026-08-05
  - Acceptance:
    - 사용자가 세 키를 미리 듣고 count-in 후 21초 visual guide를 따라 녹음하거나 파일을 선택해 미리 들을 수 있다.
  - Checklist:
    - [x] 80 BPM 상대 멜로디 preset과 Web Audio preview를 구현한다.
    - [x] MediaRecorder 권한, 자동 timeline, 재녹음과 업로드 대안을 구현한다.
    - [x] MIME, 25MB 제한, object URL lifecycle과 접근성 상태를 처리한다.

- [DONE][PRD-FR-003] T-F002-user-vocal-profile-05 프로필 결과·품질 오류·삭제 UI 구현
  - Date: 2026-08-05
  - Acceptance:
    - 사용자가 분석 진행, 구조화된 한국어 품질 오류, MIDI/음이름 결과와 analyzer metadata를 확인하고 확인 후 삭제할 수 있다.
  - Checklist:
    - [x] POST/GET 결과 상태와 MIDI note label을 시각화한다.
    - [x] reason code별 재시도 안내와 책임 있는 사용 고지를 구현한다.
    - [x] DELETE 확인과 UI/DB/file 제거 상태를 구현한다.

- [TODO][PRD-NFR-005] T-F002-user-vocal-profile-06 통합 검증과 로컬 운영 문서화
  - Date: 2026-08-05
  - Acceptance:
    - 실제 Docker analyzer와 PostgreSQL에서 생성→조회→삭제가 통과하고 README 및 전체 회귀 검사가 재현 가능하다.
  - Checklist:
    - [ ] 실제 API fixture 통합 테스트와 로컬 브라우저 흐름을 검증한다.
    - [ ] README와 환경 변수 예시에 analyzer 실행·분석 명령을 기록한다.
    - [ ] Python tests, TypeScript, lint, build, npm test, Prisma validate와 workflow audit을 통과한다.

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
| `docker run ... python:3.12-slim ... pytest -q` | `2026-08-05` | PASS — pYIN 합성 melody/glissando 및 quality gate 5건 |
| `docker compose build vocal-profile-api` | `2026-08-05` | PASS — Python 3.12, ffmpeg, pinned analyzer image |
| `docker compose run ... pytest -q` | `2026-08-05` | PASS — analyzer unit/API 8건, deprecation warning 4건 비차단 |
| `curl -fsS http://localhost:8001/health` | `2026-08-05` | PASS — analyzer/storage healthy |
| `npx tsc --noEmit` | `2026-08-05` | PASS — Next API/Prisma contract 포함 |
| `npx eslint app/api/vocal-profiles lib/vocal-profile` | `2026-08-05` | PASS |
| `npm run build` | `2026-08-05` | PASS — vocal-profile API route 3개 포함 |
| `curl POST/GET/DELETE http://localhost:3100/api/vocal-profiles...` | `2026-08-05` | PASS — 201→200→200→404, DB/file 삭제 확인 |
| `browser http://localhost:3100/profile` | `2026-08-05` | PASS — 세 preset 선택, 12초 Web Audio preview 재생/복귀, 접근 가능한 녹음·업로드 UI 확인 |
| `browser upload → POST /api/vocal-profiles` | `2026-08-05` | PASS — 실제 guided WAV 결과 카드와 4초 WAV `TOO_SHORT` 한국어 안내 확인 |
| `curl DELETE /api/vocal-profiles/{id}` | `2026-08-05` | PASS — UI 검증 fixture의 DB row 및 analyzer 원본 제거 확인 |

<!-- lee-spec-kit:workflow-sync 2026-08-05T11:27:00.000Z -->
