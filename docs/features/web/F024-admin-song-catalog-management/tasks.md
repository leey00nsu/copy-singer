# Tasks: admin-song-catalog-management

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
- **브랜치**: `feat/admin-song-catalog-management`
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

- [DONE][PRD-FR-005][PRD-DATA-013] T-F024-admin-song-catalog-management-01 DB 카탈로그와 revision 모델 구축
  - Date: 2026-08-13
  - Acceptance:
    - [x] 곡 identity, source, analysis, catalog membership과 analysis job이 분리된 Prisma schema와 breaking migration이 유효하다.
    - [x] active source/analysis/target pointer와 published entry 제약이 불완전한 곡의 추천 노출을 막는다.
    - [x] 추천 실행이 사용한 song analysis revision을 추적할 수 있다.
  - Checklist:
    - [x] Prisma enum/model/relation/index와 migration을 구현한다.
    - [x] 공통 catalog domain contract와 readiness validator를 구현한다.
    - [x] schema validation 및 DB integration test를 실행한다.

- [DONE][PRD-FR-005][PRD-FR-007] T-F024-admin-song-catalog-management-02 기존 100곡 bootstrap과 DB 추천 전환
  - Date: 2026-08-13
  - Acceptance:
    - [x] 기존 READY JSON 100곡을 idempotent하게 DB revision 모델로 적재할 수 있다.
    - [x] 추천·합성·target lookup이 JSON direct import와 정확히 100곡 하드코딩 없이 DB active revision을 사용한다.
    - [x] 동일 입력의 전환 전후 추천 순서와 점수가 일치한다.
  - Checklist:
    - [x] bootstrap/export/verify command를 구현한다.
    - [x] recommendation·synthesis·target asset 경로를 DB query/adapter로 전환한다.
    - [x] JSON runtime import와 `RECOMMENDATION_CATALOG_SIZE` 의존을 제거한다.
    - [x] parity 및 관련 회귀 테스트를 실행한다.

- [DONE][PRD-FR-059][PRD-NFR-009] T-F024-admin-song-catalog-management-03 관리자 곡 API와 durable 분석 작업 구현
  - Date: 2026-08-13
  - Acceptance:
    - [x] 관리자만 곡 등록·source 교체·target 업로드·분석 재시도·공개·보관 mutation을 실행할 수 있다.
    - [x] 장시간 분석은 durable job으로 처리되고 재시작·중복 claim·실패 retry 경계를 검증한다.
    - [x] 공개 transaction은 READY source analysis와 일치하는 READY target만 활성화한다.
  - Checklist:
    - [x] 관리자 입력 schema와 server service/API route를 구현한다.
    - [x] SongAnalysisJob worker와 analyzer adapter를 구현한다.
    - [x] target multipart upload와 superseded asset cleanup 정책을 연결한다.
    - [x] 권한·idempotency·queue·publish 통합 테스트를 작성한다.

- [DONE][PRD-US-028][PRD-FR-059] T-F024-admin-song-catalog-management-04 관리자 카탈로그 UI 구현
  - Date: 2026-08-13
  - Acceptance:
    - [x] 관리자는 catalog 목록에서 검색과 상태 필터를 사용하고 곡·출처·분석·target·공개 상태를 구분할 수 있다.
    - [x] 추가 및 교체 form은 검증 오류와 처리 상태를 표시하며 중복 제출을 막는다.
    - [x] 실패 재시도와 공개/보관 action은 명시적 확인과 실제 서버 결과를 반영한다.
  - Checklist:
    - [x] 기존 admin page에 catalog section과 query state를 추가한다.
    - [x] 곡 추가·source 교체·target upload form과 상태 feedback을 구현한다.
    - [x] loading·empty·error·disabled·mobile 상태의 Storybook/UI 테스트를 작성한다.
    - [x] 관리자 전체 회귀 테스트와 접근성 검사를 실행한다.

- [DONE][PRD-FR-059][PRD-DATA-006] T-F024-admin-song-catalog-management-05 교체된 4곡 재분석·target 교체 및 잘못된 음원 삭제
  - Date: 2026-08-13
  - Acceptance:
    - [x] 순위 47·62·70·76이 각각 `HdTUQhHHJEg`, `vepz3RlTd4M`, `saK6H76TyMI`, `zBTINvN-rCk` source/analysis/target revision을 사용한다.
    - [x] 신규 m4a 네 파일의 identity와 bytes를 검증한 뒤 기존 video ID의 로컬 음원 네 파일을 삭제한다.
    - [x] 네 곡의 새 analysis와 target이 READY이고 추천·믹싱 preflight가 통과한다.
  - Checklist:
    - [x] 신규/기존 4쌍의 정확한 local path, video ID, MIME, size와 hash를 기록한다.
    - [x] 곡 분석 worker를 업로드 target 기반 Modal CPU submit/poll 흐름으로 전환하고 재시작 복구를 검증한다.
    - [x] 일회성 교체 스크립트 없이 관리자 전용 `음원 관리` 페이지의 `음원 추가` dialog에서 곡 정보와 파일을 한 번에 등록한다.
    - [x] 관리자 입력에서 원키·video ID·출처 라벨을 제거하고 URL 파생 video ID와 Modal 원키 추정·공개 반영을 검증한다.
    - [x] 신규 source revision을 분석하고 target asset을 업로드·활성화한다.
    - [x] 기존 잘못된 local 음원 네 파일과 참조되지 않는 superseded remote asset을 정리한다.
    - [x] catalog/recommendation/mixing 검증을 수행한다.
- [DONE][PRD-NFR-005] T-F024-admin-song-catalog-management-06 전체 검증과 legacy JSON runtime 정리
  - Date: 2026-08-13
  - Acceptance:
    - [x] production build, lint, TypeScript, Prisma와 전체 테스트가 통과한다.
    - [x] 애플리케이션 runtime에 `tj-2607-song-profiles.json` direct import와 100곡 고정 계약이 남지 않는다.
    - [x] Feature 문서와 실제 migration·운영 절차·검증 근거가 동기화된다.
  - Checklist:
    - [x] dead code와 legacy artifact validator를 정리한다.
    - [x] full test/check/build 및 공개 문자열·runtime import audit를 실행한다.
    - [x] decisions와 테스트 로그, workflow sync marker를 갱신한다.

- [DONE][PRD-FR-057] T-F024-admin-song-catalog-management-07 추천 스냅샷 제거와 revision 기반 재계산 전환
  - Date: 2026-08-13
  - Acceptance:
    - [x] 추천 결과는 영속 RecommendationRun/RecommendationItem 스냅샷 없이 현재 보컬 프로필·공개 카탈로그·scoring revision 조합으로 계산된다.
    - [x] 카탈로그 공개 revision이 변경되면 기존 클라이언트 캐시와 분리되어 교체·추가·보관된 곡을 반영한 추천을 다시 계산한다.
    - [x] 믹싱 작업은 추천 항목 row가 아니라 검증된 보컬 프로필·곡 분석·target asset·추천 키 입력을 immutable하게 저장한다.
    - [x] 보컬 프로필의 최근 추천 결과 보기 문구는 추천 결과 보기로 표시된다.
  - Checklist:
    - [x] PRD와 F024 spec·plan·decisions를 on-demand 추천 계약에 맞게 갱신한다.
    - [x] Catalog revision과 추천 API·TanStack Query cache key 계약을 구현한다.
    - [x] RecommendationRun/RecommendationItem 의존과 스냅샷 저장 모델을 제거하고 믹싱 handoff를 revision 입력으로 전환한다.
    - [x] 보컬 프로필 CTA 문구와 관련 단위·통합·UI 테스트를 갱신한다.
    - [x] Prisma validation, typecheck, lint, 관련 테스트와 production build를 실행한다.

- [DONE][PRD-FR-060][PRD-FR-061] T-F024-admin-song-catalog-management-08 관리자 커스텀 믹싱 도입과 개발·레거시 목록 경로 정리
  - Date: 2026-08-13
  - Acceptance:
    - [x] 관리자 전용 /admin/custom-mixing에서 자신의 USER 보컬 프로필을 선택하고 target audio 업로드로 Modal SoulX 믹싱을 실행한다.
    - [x] custom target 원본은 Leemage·PostgreSQL·프로젝트 파일·일반 MixingJob·티켓 원장에 영구 저장되지 않고 처리 중에만 전달된다.
    - [x] /dev/svc, /mixing-history, /vocal-profiles 목록 page와 관련 legacy client/API 참조를 제거하고 /vocal-profiles/[id] 상세와 /library?tab=profiles 복귀 흐름을 유지한다.
    - [x] 관리자 권한·profile ownership·파일 검증·상태 polling·결과 재생/다운로드/삭제를 검증하는 테스트와 production build를 통과한다.
  - Checklist:
    - [x] PRD, F024 spec/plan/decisions를 새 custom mixing 및 route removal 계약과 동기화한다.
    - [x] 관리자 custom mixing API/page/client contract와 Modal conversion adapter를 구현한다.
    - [x] /dev/svc 및 /api/conversions/development-conversion 제거와 목록 route/link/metadata 정리를 완료한다.
    - [x] TypeScript, lint, 관련 unit/integration/UI 테스트, architecture audit, production build를 실행한다.

- [DONE][NON-PRD] T-F024-admin-song-catalog-management-09 카탈로그 스냅샷 내보내기/가져오기와 저장소 artifact 제거
  - Date: 2026-08-13
  - Acceptance:
    - [x] 관리자는 /admin/songs의 내보내기로 현재 DB 카탈로그를 JSON 스냅샷으로 추출하고 가져오기로 새 DB에 idempotent하게 복원할 수 있다.
    - [x] 스냅샷에는 분석 결과와 외부 target metadata만 포함되고 원본 음원 bytes·임시 처리 파일은 포함되지 않는다.
    - [x] data/catalogs의 JSON과 top100.md가 저장소에서 제거되고 runtime·테스트가 이를 참조하지 않는다.
    - [x] 노래·음원 등록은 관리자 음원 관리 경로로 단일화되고 일회성 bootstrap·targets 스크립트와 package command가 제거된다.
    - [x] Modal/vocal-profile-api 서비스의 노래 allowlist가 서비스 전용 위치로 이전되어 동작이 유지된다.
  - Checklist:
    - [x] PRD와 F024 spec·plan·decisions에 스냅샷 import/export 및 저장소 artifact 제거 계약을 반영한다.
    - [x] 카탈로그 스냅샷 export 확장과 schema 검증·transaction·idempotent import 서비스를 구현한다.
    - [x] 관리자 export/import API와 음원 관리 UI(내보내기/가져오기)를 구현한다.
    - [x] data/catalogs 제거, bootstrap·targets 스크립트/command 정리, allowlist 이전을 완료한다.
    - [x] snapshot/합성 fixture 테스트와 TypeScript·lint·전체 테스트·production build를 통과시킨다.

- [DONE][NON-PRD] T-F024-admin-song-catalog-management-10 카탈로그 YouTube allowlist 제거와 URL 검증 단일화
  - Date: 2026-08-13
  - Acceptance:
    - [x] services/vocal-profile-api/catalogs/tj-2607-top100.md 파일이 저장소와 Docker/Modal 패키징에서 제거된다.
    - [x] services/vocal-profile-api/app/song_pipeline.py의 _allowed_video_ids/_catalog_path/CATALOG_ENTRY_PATTERN과 catalogEntries 카운트가 제거되고 _validate_source_url은 allowlist 없이 https+youtube watch URL+v 일치만 검증한다.
    - [x] services/vocal-profile-api/app/main.py와 services/vocal-profile-modal/modal_app.py의 SOURCE_NOT_ALLOWLISTED 분기가 제거된다.
    - [x] allowlist 관련 테스트와 문서 검증이 정리되고 services/vocal-profile-modal/README.md의 /v1/song-target 설명이 URL 검증 기준으로 갱신된다.
    - [x] decisions D009/D012가 allowlist 제거를 반영하고 TypeScript·lint·build 검증을 통과한다.
  - Checklist:
    - [x] song_pipeline.py의 allowlist 코드와 catalogEntries 의존을 제거한다.
    - [x] Dockerfile의 SONG_CATALOG_PATH와 Modal add_local_file allowlist 패키징을 제거한다.
    - [x] main.py와 modal_app.py의 SOURCE_NOT_ALLOWLISTED 에러 분기를 제거한다.
    - [x] allowlist 테스트와 modal allowlist 검증 문구를 정리하고 README를 갱신한다.
    - [x] F024 spec/plan/decisions와 tasks를 allowlist 제거 계약에 맞게 동기화한다.

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
| `pnpm test` | `2026-08-13` | 통과 — production build, unit/integration/UI, architecture, Storybook 48/48 files·135/135 tests 포함 전체 suite |
| `pnpm run lint` | `2026-08-13` | 통과 |
| `pnpm run build` | `2026-08-13` | 통과 — `/admin/songs` dynamic route 포함 production build |
| `pnpm exec tsx --test tests/song-catalog-domain.test.ts` | `2026-08-13` | 통과 — readiness·metric contract 3/3 |
| `node --conditions react-server --import tsx --test tests/song-catalog-db.integration.ts` | `2026-08-13` | 통과 — revision 관계·active pointer·중복 video ID DB 계약 1/1 |
| `pnpm exec tsc --noEmit` | `2026-08-13` | 통과 |
| `pnpm exec prisma validate` | `2026-08-13` | 통과 |
| `pnpm run test:recommendation && pnpm run test:recommendation:db` | `2026-08-13` | 통과 — 추천 unit/UI 33/33, DB persistence/synthesis 3/3 |
| `pnpm run test:catalog-targets && pnpm run test:mixing:db` | `2026-08-13` | 통과 — target revision 1/1, mixing queue 1/1 |
| runtime JSON/고정 크기 `rg` audit | `2026-08-13` | 통과 — `src`의 artifact direct import·`RECOMMENDATION_CATALOG_SIZE` 0건 |
| `pnpm run test:song-analysis-queue` | `2026-08-13` | 통과 — Modal submit/poll, target 준비 gate와 durable claim/retry 6/6 |
| Modal catalog analyzer unittest | `2026-08-13` | 통과 — 입력 제한·확장자·major/minor 원키 추정·CPU resource·spawn/poll/idempotency·GPU 미사용 계약 4/4 |
| `pnpm run test:admin && pnpm run test:architecture-boundaries && pnpm run test:process-scripts` | `2026-08-13` | 통과 — admin 2/2, architecture 4/4, process 5/5 |
| Task 03 targeted Biome·ESLint·TypeScript | `2026-08-13` | 통과 |
| `pnpm run test:admin` | `2026-08-13` | 통과 — URL 기반 video ID 파생·최소 입력 음원 관리 page/dialog와 기존 admin 5/5 |
| catalog manager Storybook Vitest | `2026-08-13` | 통과 — add audio dialog·default·empty·error/retry·loading/disabled·mobile 및 a11y 6/6 |
| Task 04 targeted Biome·ESLint·TypeScript·architecture | `2026-08-13` | 통과 |
| Modal CPU 배포 health 및 4곡 submit/poll/publish | `2026-08-13` | 통과 — 8 vCPU·16 GiB health, 4/4 SUCCEEDED·READY·PUBLISHED |
| analyzer/mixing resource `rg` audit | `2026-08-13` | 통과 — catalog analyzer GPU 할당 0건, 곡 믹싱 `services/soulx-singer-svc/modal_app.py`만 L4 GPU 사용 |
| Task 05 순차 회귀 검증 | `2026-08-13` | 통과 — admin 5/5, analysis queue 6/6, recommendation 33/33+DB 3/3, target/mixing 각 1/1, TypeScript·Prisma·build |
| Task 06 legacy/runtime `rg` audit | `2026-08-13` | 통과 — `src`/`app` JSON direct import 0건, `Song.catalogOrder` 제거, legacy generate/analyze/verify command 제거 |
| Task 06 bootstrap/migration 검증 | `2026-08-13` | 통과 — null catalog snapshot backfill migration 적용, bootstrap 2회 idempotent, DB 100/100 READY |
| `pnpm run test:recommendation:db && pnpm run test:mixing:db` | `2026-08-13` | 통과 — on-demand 재계산·revision cache identity와 immutable mixing input DB 계약 각 1/1 |
| `node --conditions react-server --import tsx --test tests/admin-song-catalog.integration.ts` | `2026-08-13` | 통과 — 공개 revision 증가·동일 재공개 idempotency·보관 revision 증가 포함 2/2 |
| Task 07 persistence·문구 `rg` audit | `2026-08-13` | 통과 — runtime Prisma 추천 스냅샷 model/field와 `최근 추천 결과 보기`·추천 삭제 UI 0건 |
| Task 08 legacy 경로 `rg` audit | `2026-08-13` | 통과 — `src`/`app`/`tests`의 `/dev/svc`·`/api/conversions`·`/api/health`·`development-conversion`·`/mixing-history` 참조 0건 |
| `node --conditions react-server --import tsx --test tests/admin-custom-mixing.integration.ts tests/conversion-stream-upload.test.ts` | `2026-08-13` | 통과 — profile ownership·reference 우선순위·custom target 비영속·Modal FormData forwarding 2/2 |
| Task 08 검증 묶음 | `2026-08-13` | 통과 — query/contract 23/23, UI/프레젠테이션 34/34, architecture 4/4, process·boundary 5/5, effect-cleanup 2/2, TypeScript·Biome·ESLint |
| Task 08 Storybook | `2026-08-13` | 통과 — 48/48 files·135/135 tests (waveform 준비 타이밍 플레이크 1건 단독 재실행 통과) |
| `pnpm test` | `2026-08-13` | 통과 — production build, unit/integration/UI, architecture, Storybook 48/48 files·135/135 tests 포함 전체 suite (재실행 실패 0건) |
| `pnpm run lint` | `2026-08-13` | 통과 |
| `pnpm run build` | `2026-08-13` | 통과 — `/admin/custom-mixing` 신규 dynamic route 포함, `/dev/svc`·`/mixing-history`·`/vocal-profiles` 목록·`/api/conversions`·`/api/health` 제거 확인 |
| Task 08 UI 통일성 개선 Storybook | `2026-08-13` | 통과 — 패널 empty/queued/succeeded 스토리 3/3, 전체 49/49 files·138/138 tests |
| Task 08 UI 통일성 개선 `pnpm test` | `2026-08-13` | 통과 — 한국어 단일 카드 UI 전환 후 전체 suite 실패 0건 |
| Task 08 UI 통일성 개선 검증 | `2026-08-13` | 통과 — TypeScript·Biome·ESLint·production build |

| `node --conditions react-server --import tsx --test tests/catalog-snapshot.integration.ts` | `2026-08-13` | 통과 — fresh catalog idempotent import, revision 단조 증가, raw bytes 제외·sourceUrl/videoId 일치·duplicate position/videoId/target 검증 (DB 필요 시 skip) |
| snapshot export sanitize `rg` audit | `2026-08-13` | 통과 — snapshot에 audioBytes/base64/tempPath 없음, pipelineMetadata allowlist만 포함 |
| legacy catalog artifact `rg` audit | `2026-08-13` | 통과 — `data/catalogs`·legacy bootstrap/targets script·package command 0건, allowlist는 `services/vocal-profile-api/catalogs`에서만 참조 |

<!-- lee-spec-kit:workflow-sync 2026-08-13T23:36:52.291871+09:00 -->
