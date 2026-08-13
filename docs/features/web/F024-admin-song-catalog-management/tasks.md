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

- [TODO][PRD-US-028][PRD-FR-059] T-F024-admin-song-catalog-management-04 관리자 카탈로그 UI 구현
  - Date: 2026-08-13
  - Acceptance:
    - 관리자는 catalog 목록에서 검색과 상태 필터를 사용하고 곡·출처·분석·target·공개 상태를 구분할 수 있다.
    - 추가 및 교체 form은 검증 오류와 처리 상태를 표시하며 중복 제출을 막는다.
    - 실패 재시도와 공개/보관 action은 명시적 확인과 실제 서버 결과를 반영한다.
  - Checklist:
    - [ ] 기존 admin page에 catalog section과 query state를 추가한다.
    - [ ] 곡 추가·source 교체·target upload form과 상태 feedback을 구현한다.
    - [ ] loading·empty·error·disabled·mobile 상태의 Storybook/UI 테스트를 작성한다.
    - [ ] 관리자 전체 회귀 테스트와 접근성 검사를 실행한다.

- [TODO][PRD-FR-059][PRD-DATA-006] T-F024-admin-song-catalog-management-05 교체된 4곡 재분석·target 교체 및 잘못된 음원 삭제
  - Date: 2026-08-13
  - Acceptance:
    - 순위 47·62·70·76이 각각 `HdTUQhHHJEg`, `vepz3RlTd4M`, `saK6H76TyMI`, `zBTINvN-rCk` source/analysis/target revision을 사용한다.
    - 신규 m4a 네 파일의 identity와 bytes를 검증한 뒤 기존 video ID의 로컬 음원 네 파일을 삭제한다.
    - 네 곡의 새 analysis와 target이 READY이고 추천·믹싱 preflight가 통과한다.
  - Checklist:
    - [ ] 신규/기존 4쌍의 정확한 local path, video ID, MIME, size와 hash를 기록한다.
    - [ ] 신규 source revision을 분석하고 target asset을 업로드·활성화한다.
    - [ ] 기존 잘못된 local 음원 네 파일과 참조되지 않는 superseded remote asset을 정리한다.
    - [ ] catalog/recommendation/mixing 검증을 수행한다.

- [TODO][PRD-NFR-005] T-F024-admin-song-catalog-management-06 전체 검증과 legacy JSON runtime 정리
  - Date: 2026-08-13
  - Acceptance:
    - production build, lint, TypeScript, Prisma와 전체 테스트가 통과한다.
    - 애플리케이션 runtime에 `tj-2607-song-profiles.json` direct import와 100곡 고정 계약이 남지 않는다.
    - Feature 문서와 실제 migration·운영 절차·검증 근거가 동기화된다.
  - Checklist:
    - [ ] dead code와 legacy artifact validator를 정리한다.
    - [ ] full test/check/build 및 공개 문자열·runtime import audit를 실행한다.
    - [ ] decisions와 테스트 로그, workflow sync marker를 갱신한다.

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
| `pnpm test` | `-` | 미실행 |
| `pnpm run lint` | `-` | 미실행 |
| `pnpm exec tsx --test tests/song-catalog-domain.test.ts` | `2026-08-13` | 통과 — readiness·metric contract 3/3 |
| `node --conditions react-server --import tsx --test tests/song-catalog-db.integration.ts` | `2026-08-13` | 통과 — revision 관계·active pointer·중복 video ID DB 계약 1/1 |
| `pnpm exec tsc --noEmit` | `2026-08-13` | 통과 |
| `pnpm exec prisma validate` | `2026-08-13` | 통과 |
| `pnpm run catalog:bootstrap && pnpm run catalog:db:verify && pnpm run catalog:export` | `2026-08-13` | 통과 — idempotent bootstrap, DB 100/100 READY, JSON export 100곡 |
| `node --conditions react-server --import tsx --test tests/song-catalog-bootstrap.integration.ts` | `2026-08-13` | 통과 — bootstrap idempotency와 JSON↔DB 전체 ranking parity 1/1 |
| `pnpm run test:recommendation && pnpm run test:recommendation:db` | `2026-08-13` | 통과 — 추천 unit/UI 33/33, DB persistence/synthesis 3/3 |
| `pnpm run test:catalog-targets && pnpm run test:mixing:db` | `2026-08-13` | 통과 — target revision 1/1, mixing queue 1/1 |
| runtime JSON/고정 크기 `rg` audit | `2026-08-13` | 통과 — `src`의 artifact direct import·`RECOMMENDATION_CATALOG_SIZE` 0건 |
| `pnpm run test:song-analysis-queue` | `2026-08-13` | 통과 — 관리자 mutation/publish와 durable claim/retry 4/4 |
| `pnpm run test:admin && pnpm run test:architecture-boundaries && pnpm run test:process-scripts` | `2026-08-13` | 통과 — admin 2/2, architecture 4/4, process 5/5 |
| Task 03 targeted Biome·ESLint·TypeScript | `2026-08-13` | 통과 |

<!-- lee-spec-kit:workflow-sync 2026-08-13T18:02:00+09:00 -->
