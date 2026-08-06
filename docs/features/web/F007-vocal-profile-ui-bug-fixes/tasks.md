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
| `services/vocal-profile-api/.venv/bin/python -m pytest services/vocal-profile-api/tests` | `2026-08-06` | `PASS — 20 tests, 실제 WebM/Opus parameterized MIME 포함` |
| `pnpm install --frozen-lockfile` | `2026-08-06` | `PASS — pnpm 11.9.0 lockfile 고정 설치 및 Prisma/esbuild build scripts 완료` |
| `pnpm test` | `2026-08-06` | `PASS — Next production build, SSR 3, catalog 7, key-fit 18, recommendation 15` |
| `pnpm run lint` | `2026-08-06` | `PASS` |
| `pnpm exec tsc --noEmit` | `2026-08-06` | `PASS` |
| `pnpm run test:recommendation:db` | `2026-08-06` | `PASS — 3 tests` |
| `pnpm dev 실제 HTTP WebM 프로필 저장` | `2026-08-06` | `PASS — HTTP 201, PostgreSQL 저장 및 DELETE cleanup` |
| `pnpm start /api/vocal-profiles/health` | `2026-08-06` | `PASS — HTTP 200, analyzer/database ok` |
| `Docker analyzer audio/webm;codecs=opus smoke test` | `2026-08-06` | `PASS — HTTP 200, mimeType audio/webm, 8초 Opus 분석 후 fixture 삭제` |

<!-- lee-spec-kit:workflow-sync 2026-08-06T14:56:54+09:00 -->
