# Tasks: data-foundation

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
- **브랜치**: `feat/data-foundation`
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

- [DONE][PRD-DATA-001] T-F001-data-foundation-01 PostgreSQL 및 Prisma 개발 기반 구성
  - Date: 2026-08-05
  - Acceptance:
    - Docker Compose 구성과 Prisma 7.9.1 의존성 및 환경 변수 계약이 저장소에 추가되고 정적 구성이 검증된다.
  - Checklist:
    - [x] postgres:16-alpine 서비스, named volume, healthcheck를 docker-compose.yml에 정의한다.
    - [x] Prisma 7.9.1, PostgreSQL adapter, pg, tsx 의존성과 DB scripts를 추가한다.
    - [x] .env.example, .gitignore, prisma.config.ts를 로컬 보안 원칙에 맞게 갱신한다.

- [DONE][PRD-DATA-002] T-F001-data-foundation-02 핵심 Prisma schema 및 서버 client 구현
  - Date: 2026-08-05
  - Acceptance:
    - 다섯 핵심 모델과 enum, 관계, unique/index 제약이 Prisma schema에 정의되고 validate와 generate가 성공한다.
  - Checklist:
    - [x] Recording, VocalProfile, Song, RecommendationRun, RecommendationItem 및 enum을 정의한다.
    - [x] 관계, 삭제 정책, unique constraint와 조회 index를 정의한다.
    - [x] PrismaPg 기반 서버 전용 singleton client를 추가한다.

- [DONE][PRD-NFR-004] T-F001-data-foundation-03 초기 migration과 반복 가능한 seed 검증
  - Date: 2026-08-05
  - Acceptance:
    - 사용자가 기동한 빈 PostgreSQL에 초기 migration을 적용하고 seed를 두 번 실행한 뒤 관계 조회 검증이 통과한다.
  - Checklist:
    - [x] 초기 migration SQL과 migration lock을 생성하고 적용 상태를 확인한다.
    - [x] 비민감성 고정 예제 데이터를 upsert하는 seed를 구현한다.
    - [x] seed 관계와 핵심 데이터를 조회하는 verify script를 구현하고 실행한다.

- [DONE][PRD-DATA-003] T-F001-data-foundation-04 로컬 사용 문서화 및 회귀 검증
  - Date: 2026-08-05
  - Acceptance:
    - 사용자가 README만 보고 DB 기동, migration, generate, seed, 검증과 종료를 수행할 수 있고 기존 앱 검사가 통과한다.
  - Checklist:
    - [x] README에 PostgreSQL과 Prisma 로컬 명령 및 사용자 실행 경계를 기록한다.
    - [x] Prisma, TypeScript, lint, build, test 검증 결과를 tasks.md에 기록한다.
    - [x] Feature 문서와 구현 결과를 동기화하고 workflow audit을 통과한다.

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
| `docker compose config` | `2026-08-05` | PASS — 호스트 `5433` → 컨테이너 `5432`, PostgreSQL 16, healthcheck, named volume 확인 |
| `DATABASE_URL=... npx prisma --version` | `2026-08-05` | PASS — Prisma CLI 및 Client 7.9.1 확인 |
| `npm ls @prisma/client @prisma/adapter-pg prisma pg dotenv tsx @types/pg --depth=0` | `2026-08-05` | PASS — 고정 의존성 설치 확인 |
| `npx tsc --noEmit` | `2026-08-05` | PASS |
| `DATABASE_URL=... npm run db:validate` | `2026-08-05` | PASS — schema valid |
| `DATABASE_URL=... npm run db:generate` | `2026-08-05` | PASS — Prisma Client 7.9.1 생성 |
| `npx eslint lib/db/prisma.ts prisma.config.ts` | `2026-08-05` | PASS |
| `npm run lint` | `2026-08-05` | PASS — 제품 코드와 생성 hook/client의 lint 경계 분리 |
| `npx eslint prisma/seed.ts scripts/verify-database.ts` | `2026-08-05` | PASS |
| `docker compose ps` | `2026-08-05` | PASS — PostgreSQL healthy, 호스트 `5433` → 컨테이너 `5432` |
| `docker compose exec -T postgres pg_isready -U copy_singer -d copy_singer` | `2026-08-05` | PASS — accepting connections |
| `DATABASE_URL=... npm run db:migrate -- --name init_data_foundation` | `2026-08-05` | PASS — 초기 migration 생성 및 적용 |
| `DATABASE_URL=... npm run db:seed` | `2026-08-05` | PASS — 2회 연속 실행, 중복 충돌 없음 |
| `DATABASE_URL=... npm run db:verify` | `2026-08-05` | PASS — Recording→Profile→Run→Item→Song 관계와 추천 shift 조회 |
| `DATABASE_URL=... npm run db:status` | `2026-08-05` | PASS — 1 migration, schema up to date |
| `DATABASE_URL=... npm run db:migrate:deploy` | `2026-08-05` | PASS — pending migration 없음 |
| `npm run build` | `2026-08-05` | PASS — vinext production build, 기존 API route 포함 |
| `npm test` | `2026-08-05` | PASS — production build 및 rendered HTML test 1건 |

<!-- lee-spec-kit:workflow-sync 2026-08-05T10:47:09.000Z -->
