# Tasks: midrange-only-vocal-reference

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
- **브랜치**: `feat/midrange-only-vocal-reference`
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

> 아래 태스크는 위에서 아래 순서대로 실행합니다.

- [DONE][PRD-FR-042] T-F011-midrange-only-vocal-reference-01 mid-only synthesis reference 알고리즘과 descriptor 전환
  - Date: 2026-08-08
  - Acceptance:
    - 최대 60초 분석 source와 profile 통계는 그대로 유지하면서 synthesis reference selection만 `mid` candidate 전용으로 바뀐다.
    - 좋은 mid phrase가 30초보다 짧으면 반복·padding·low/high 재분배 없이 실제 길이 그대로 `smart-reference-mid-v1` WAV를 만든다.
    - 유효 mid phrase가 없으면 새 version의 unavailable descriptor를 남기고 synthesis artifact를 만들지 않는다.
  - Checklist:
    - [x] 기존 VAD/quality candidate builder와 p10/median/p90 mid boundary를 재사용하고 좁은 음역의 수치 오차를 위한 ±0.25 semitone tolerance를 추가했다.
    - [x] selector가 mid candidate만 품질순으로 한 번씩 채택하고 최대 30초 cap 후 원본 시간순으로 정렬하도록 변경했다.
    - [x] `algorithm=voiced-mid-phrase-selection`, `version=smart-reference-mid-v1`, mid-only `sourceRanges`, `bandSeconds(low=0, high=0)` 계약을 고정했다.
    - [x] 짧은 mid-only reference, 30초 cap, low/high-only unavailable, 결정성 Python 테스트를 추가했고 target 17/17 및 전체 analyzer 35 passed/3 skipped를 확인했다.

- [DONE][PRD-FR-042] T-F011-midrange-only-vocal-reference-02 analyzer dual-version contract와 local/Modal transport parity
  - Date: 2026-08-08
  - Acceptance:
    - 새 분석 결과는 `smart-reference-mid-v1`을 정상 contract로 인정하고 기존 저장 `smart-reference-v1`은 계속 읽을 수 있다.
    - 기존 `modal-analysis-envelope-v1` transport가 새 descriptor와 synthesis reference bytes를 손실 없이 전달한다.
  - Checklist:
    - [x] TypeScript analyzer contract validator가 v1과 mid-v1을 모두 지원하도록 확장하고 version 판별 helper를 추가했다.
    - [x] mid-v1의 descriptor/artifact version mismatch, empty range와 low/high source range를 invalid response로 차단한다.
    - [x] Modal profile/envelope fixture와 health capability를 `smart-reference-mid-v1` 생성 계약으로 갱신했다.
    - [x] TS contract 5/5, Python local↔Modal parity 4/4, Modal transport 9/9, analyzer adapter 8/8, tsc를 통과했다.

- [DONE][PRD-US-018][PRD-FR-042] T-F011-midrange-only-vocal-reference-03 실제 저장된 중음 reference 단일 플레이어
  - Date: 2026-08-08
  - Acceptance:
    - 새 mid-v1 프로필 결과 화면은 low/mid/high source-range player 대신 실제 `SYNTHESIS_REFERENCE` asset을 재생하는 `AI 믹싱 중음 레퍼런스` player 하나를 보여준다.
    - 재생 API는 로그인 사용자 소유권과 READY 상태를 검증하고 Range를 지원하며 Leemage URL을 노출하지 않는다.
    - 기존 smart-reference-v1 프로필은 현재 3-band preview UI를 유지한다.
  - Checklist:
    - [x] owner-scoped synthesis reference 조회 helper와 same-origin audio proxy route를 추가했다.
    - [x] mid-v1 UI를 single stored-reference player로 분기하고 unavailable profile에는 재녹음 안내를 표시했다.
    - [x] v1/legacy UI 분기를 유지해 과거 프로필의 3-band preview를 보존했다.
    - [x] UI 5/5와 private Range proxy/DB ownership 3/3, TypeScript/lint를 통과했다.

- [DONE][PRD-FR-042] T-F011-midrange-only-vocal-reference-04 mid-v1 mixing reference strict policy
  - Date: 2026-08-08
  - Acceptance:
    - mid-v1 profile의 새 AI 믹싱 job은 READY `SYNTHESIS_REFERENCE`가 있을 때만 생성된다.
    - mid-v1 reference가 없거나 READY가 아니면 source `REFERENCE`로 fallback하거나 티켓을 차감하지 않는다.
    - 기존 smart-reference-v1과 version 없는 legacy profile은 현재 fallback 정책을 유지한다.
  - Checklist:
    - [x] reference contract version을 mixing selection에 전달하는 version-aware policy를 구현했다.
    - [x] mid-v1 strict failure는 기존 stable `MIXING_REFERENCE_UNAVAILABLE`로 티켓 차감 전에 거부한다.
    - [x] READY mid-v1 asset은 기존 `referenceAssetId` snapshot semantics로 고정되는 기존 worker flow를 유지했다.
    - [x] selector 4/4와 ticket/job side-effect를 포함한 mixing queue integration 1/1, TypeScript/lint를 통과했다.

- [DONE][PRD-NFR-005] T-F011-midrange-only-vocal-reference-05 전체 로컬 회귀·문서·workflow 검증
  - Date: 2026-08-08
  - Acceptance:
    - 기존 F009 smart-reference-v1 profile/preview와 F010 queue/persistence가 회귀하지 않는다.
    - TypeScript, lint, build, Prisma, Python analyzer/Modal transport와 관련 UI/mixing 테스트가 모두 통과한다.
  - Checklist:
    - [x] `pnpm test`, lint, tsc, build, Prisma validate를 통과했다.
    - [x] Python analyzer suite와 Modal transport/parity local suite를 통과했다.
    - [x] PRD/spec/plan/decisions/system architecture와 Modal README를 최종 mid-v1 생성 + v1 dual-read 계약에 동기화했다.
    - [x] `npx lee-spec-kit workflow-audit --json`가 `WORKFLOW_IN_SYNC`를 반환했다.

- [DONE][PRD-US-018][PRD-FR-042] T-F011-midrange-only-vocal-reference-06 사람용 3-band 분석 표시와 mid-only synthesis reference 분리
  - Date: 2026-08-08
  - Acceptance:
    - 새 mid-v1 프로필도 기존처럼 제출 source의 low/mid/high 대표 분석 구간을 3개 player로 보여준다.
    - 사람용 3-band sourceRanges와 모델용 mid-only synthesisReference sourceRanges가 서로 다른 descriptor 의미로 분리된다.
    - 실제 mixing reference 선택은 계속 READY mid-only `SYNTHESIS_REFERENCE`만 사용한다.
  - Checklist:
    - [x] analyzer가 기존 band selection 결과를 `analysisReferenceBands` descriptor로 별도 생성한다.
    - [x] `referenceBandSegments`가 새 descriptor를 우선 읽고 기존 smart-reference-v1은 기존 sourceRanges fallback을 유지한다.
    - [x] mid-v1 단일 synthesis-reference player 분기를 제거하고 기존 3-band UI를 새 profile에도 복원한다.
    - [x] Python target 8/8, UI/segment 8/8, 전체 `pnpm test`, analyzer 35 passed/3 skipped, Modal local 9/9, local parity 4/4, tsc/lint를 통과했다.

- [DONE][PRD-FR-042][PRD-NFR-005] T-F011-midrange-only-vocal-reference-07 Modal analyzer 재배포와 remote parity 확인
  - Date: 2026-08-08
  - Acceptance:
    - 사용자 승인 후 `dbstndla1212` Modal workspace에 배포된 `copy-singer-vocal-profile-analyzer`가 최종 mid-v1 shared code를 사용한다.
    - 실제 remote endpoint와 local analyzer가 동일 fixture에서 분석 descriptor와 synthesis reference bytes parity를 만족한다.
  - Checklist:
    - [x] 원격 deploy 전에 active Modal profile/workspace가 `dbstndla1212`이고 다른 profile이 `dbstndla1212yt`임을 확인했다.
    - [x] 기존 Modal SDK pin `1.5.3`으로 `copy-singer-vocal-profile-analyzer`를 재배포했다.
    - [x] wrong key 401과 authenticated health의 `smart-reference-mid-v1`, CPU 2 cores/4096 MiB/scale-to-zero 설정을 확인했다.
    - [x] 10/30/60초 fixture의 deployed local↔remote profile JSON + source/reference bytes exact parity 3/3을 확인했다.

- [DONE][PRD-FR-042][PRD-NFR-005] T-F011-midrange-only-vocal-reference-08 믹싱 song-target Modal 이관과 preflight retry·진단 강화
  - Date: 2026-08-08
  - Acceptance:
    - `VOCAL_PROFILE_ANALYZER_BACKEND=modal`이면 mixing worker의 곡 target 준비도 `dbstndla1212`의 `copy-singer-vocal-profile-analyzer` `/v1/song-target`을 사용해 로컬 `localhost:8001` analyzer 없이 동작한다.
    - Modal song-target은 기존 catalog allowlist, yt-dlp/FFmpeg WAV 생성, request-scoped cleanup과 `X-API-Key` 인증을 유지한다.
    - preflight 네트워크 오류는 reference/song-target/Modal-submit 단계별 stable error code로 기록되고, retryable preflight failure는 `maxAttempts` 범위에서 재큐잉된다.
    - Lemon 실제 target 준비가 Modal에서 성공하고 기존 실패 job의 티켓 환불 semantics는 유지된다.
  - Checklist:
    - [x] Modal image에 `yt-dlp==2026.7.4`와 packaged catalog allowlist를 포함하고 authenticated `/v1/song-target` + stream cleanup을 추가했다.
    - [x] mixing worker가 analyzer backend별 song-target endpoint/auth를 선택하며 `modal` backend에서는 `VOCAL_PROFILE_MODAL_URL`을 사용해 localhost 의존성을 제거했다.
    - [x] `REFERENCE_FETCH_FAILED`, `SONG_TARGET_FETCH_FAILED`, `MODAL_SUBMIT_FAILED`, `MODAL_STATUS_FETCH_FAILED`, `MODAL_RESULT_FETCH_FAILED` 단계별 오류와 `nextAttemptAt` bounded retry를 구현했다. non-idempotent SoulX submit network 단절은 중복 방지를 위해 자동 재시도하지 않는다.
    - [x] `.env.example`/운영 문서에서 `VOCAL_PROFILE_API_URL`을 local backend 전용으로 명시했고 `.env.local`의 중복 key를 1개로 정리했다.
    - [x] active Modal profile/workspace `dbstndla1212`를 재확인해 analyzer를 재배포했고 Lemon(89, `SX_ViT4Ra7k`) target probe가 52,660,710-byte WAV를 13.264초에 반환함을 확인했다.
    - [x] 전체 `pnpm test`, lint, tsc, build, Prisma validate/status, Python analyzer 35 passed/3 skipped, Modal unit 9/9, `git diff --check`, workflow audit를 통과했다.

- [DONE][PRD-FR-019][PRD-DATA-006][PRD-DATA-010][PRD-NFR-005] T-F011-midrange-only-vocal-reference-09 카탈로그 target asset 사전 업로드와 Song 연결
  - Date: 2026-08-08
  - Acceptance:
    - 사용 권한을 확인한 카탈로그 원본 파일을 Git 비추적 `tmp/catalog-targets` staging에 두고 RIFF WAV로 정규화한 뒤 Leemage catalog target asset으로 업로드할 수 있다.
    - Song row가 READY `CatalogTargetAsset`을 연결하고 새 MixingJob은 해당 `targetAssetId`를 snapshot하며 worker는 런타임 YouTube 다운로드 대신 이 asset을 사용한다.
    - catalog target import는 파일 누락, catalog-order/sourceVideoId 불일치, 동일 SHA-256 중복 업로드를 안전하게 처리하고 재실행 가능하다.
  - Checklist:
    - [x] `/tmp/`를 gitignore하고 `catalog:targets:import`, `catalog:targets:verify` CLI와 local staging README를 추가했다.
    - [x] `CatalogTargetAsset`, `Song.targetAssetId`, nullable legacy-compatible `MixingJob.targetAssetId`와 migration을 추가해 DB에 적용했다.
    - [x] mixing enqueue는 target 미준비 시 티켓 차감 전에 `MIXING_TARGET_UNAVAILABLE`, worker는 cached target fetch + `CATALOG_TARGET_FETCH_FAILED` retry를 사용하도록 변경했다.
    - [x] importer integration 1/1, mixing DB integration 1/1, 전체 `pnpm test`, lint, tsc, Prisma validate/status와 `git diff --check`를 통과했다.
    - [x] `catalog:targets:verify`는 실제 catalog 100곡을 정확히 검사하며 현재 authorized staging 파일이 없어 `0/100 READY`임을 확인했다. `catalog:targets:import -- 34`는 필요한 `034-B_Xj5ddZDHE.*` 파일명을 안전하게 missing으로 보고한다.
    - [x] PRD/spec/plan/ADR/system architecture/Modal README를 production cached-target 계약으로 동기화했다.

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
| `pnpm test` | `2026-08-08` | `PASS (build + 전체 TS/UI/DB integration suite)` |
| `pnpm run build` | `2026-08-08` | `PASS (Next.js 16.3.0, synthesis-reference audio route 포함)` |
| `pnpm run db:validate` | `2026-08-08` | `PASS (Prisma schema valid)` |
| `services/vocal-profile-api/.venv/bin/pytest -q services/vocal-profile-api/tests` | `2026-08-08` | `PASS (35 passed, remote-only 3 skipped)` |
| `pnpm exec tsx --test tests/vocal-profile-contract.test.ts` | `2026-08-08` | `PASS (5/5 dual-version contract)` |
| `cd services/vocal-profile-modal && ../vocal-profile-api/.venv/bin/pytest -q test_transport.py test_runtime.py test_modal_app_source.py` | `2026-08-08` | `PASS (9/9)` |
| `services/vocal-profile-api/.venv/bin/pytest -q services/vocal-profile-api/tests/test_modal_parity.py -k 'not deployed'` | `2026-08-08` | `PASS (4/4 local parity, remote 3 deselected)` |
| `pnpm run test:vocal-profile-analyzer` | `2026-08-08` | `PASS (8/8)` |
| `pnpm exec tsc --noEmit` | `2026-08-08` | `PASS` |

| `pnpm exec tsx --test tests/vocal-profile-reference-bands.test.ts tests/vocal-profile-results-ui.test.tsx` | `2026-08-08` | `PASS (8/8: 새 mid-v1도 사람용 low/mid/high 3-band 분석 UI 유지)` |
| `node --conditions react-server --import tsx --test tests/private-audio-proxy.test.ts tests/vocal-profile-history.integration.ts` | `2026-08-08` | `PASS (3/3: Range + owner scope including synthesis reference)` |
| `pnpm run lint` | `2026-08-08` | `PASS` |

| `pnpm exec tsx --test tests/mixing-reference.test.ts` | `2026-08-08` | `PASS (4/4: mid-v1 strict + legacy fallback)` |
| `pnpm run test:mixing:db` | `2026-08-08` | `PASS (1/1: reference + catalog target preflight, target snapshot/fetch retry, submit ambiguity, result flow)` |
| `pnpm run modal:vocal-profile:deploy` | `2026-08-08` | `PASS (active workspace dbstndla1212, Modal 1.5.3, analyzer redeployed)` |
| `MODAL_BENCHMARK_COLD_WAIT_SECONDS=0 pnpm run modal:vocal-profile:benchmark -- 10` | `2026-08-08` | `PASS (wrong key 401, health smart-reference-mid-v1 + song-target-v1, 10s cold/warm 35.798s/7.766s)` |
| `pnpm run modal:vocal-profile:song-target-probe -- 89` | `2026-08-08` | `PASS (Lemon, audio/wav RIFF, 52,660,710 bytes, 13.264s)` |
| `pnpm run db:status` | `2026-08-08` | `PASS (10 migrations, database schema up to date)` |
| `pytest -q services/vocal-profile-api/tests/test_modal_parity.py -k deployed` | `2026-08-08` | `PASS (3/3: 10/30/60 exact profile + source/reference bytes)` |
| `pnpm run test:catalog-targets` | `2026-08-08` | `PASS (1/1: Leemage upload mock + Song link + SHA-256 idempotency)` |
| `pnpm run catalog:targets:verify` | `2026-08-08` | `PASS (catalog 100곡 정확히 검사, 현재 0/100 READY)` |
| `pnpm run catalog:targets:import -- 34` | `2026-08-08` | `PASS (authorized staging 파일 없음, expected 034-B_Xj5ddZDHE.* missing 보고)` |

<!-- lee-spec-kit:workflow-sync 2026-08-08T03:51:22.000Z -->
