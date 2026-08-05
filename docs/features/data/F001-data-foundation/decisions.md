# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D001: data-foundation 결정 (2026-08-05)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: 로컬 PostgreSQL과 Prisma 7 기반 선택 (2026-08-05)

- **Context**: 후속 보컬 프로필·곡·추천 기능이 공유할 재현 가능한 관계형 데이터 기반이 필요하다.
- **Constraints**: 로컬 테스트가 우선이며 사용자가 Docker Compose를 직접 기동한다. 기존 Next.js/vinext UI와 Modal SVC 동작은 유지해야 한다.
- **Options**: SQLite + Prisma, 로컬 PostgreSQL + Prisma, 외부 관리형 PostgreSQL
- **Decision**: `postgres:16-alpine` Docker Compose와 Prisma ORM 7.9.1, `@prisma/adapter-pg`를 사용한다.
- **Rationale**: 제품 요구사항의 PostgreSQL SSOT를 처음부터 검증하면서 외부 비용 없이 로컬에서 재현할 수 있고, Prisma 7의 현재 PostgreSQL 연결 계약과 일치한다.
- **Trace**:
  - **DOING 시작 시점**: npm registry에서 Prisma와 `@prisma/client` 최신 안정 버전이 7.9.1임을 확인했다. Prisma 7 공식 문서의 root config, custom client output, driver adapter 및 명시적 seed 방식을 계획에 반영했다.
  - **DONE 전 확정 시점**: Compose 정규화 결과와 설치된 고정 버전을 확인했고, Prisma config를 포함한 TypeScript 검사가 통과했다. Docker 컨테이너는 사용자 실행 경계에 따라 아직 기동하지 않았다.
  - **후속 조정**: 사용자 요청에 따라 PostgreSQL 호스트 기본 포트를 `5433`으로 변경했다. 컨테이너 내부 표준 포트 `5432`는 유지한다.
  - **머지 후 확인**: 실제 결과/영향
- **Evidence**:
  - **Commit**: 첫 태스크 커밋의 Git 이력
  - **PR**: 로컬 워크플로우로 생성하지 않음
  - **Test/Log**: [tasks.md 테스트 실행 기록](./tasks.md#테스트-실행-기록)
- **Consequences**: 결과 및 영향 (선택사항)

## D002: 데이터 관계와 생성 Client 경계 (2026-08-05)

- **Context**: 후속 Feature가 동일한 Recording, VocalProfile, Song, Recommendation 구조를 안전하게 조회해야 한다.
- **Constraints**: 분석기는 재실행·버전 변경이 가능하고, 생성 Prisma Client와 Node `pg` adapter가 브라우저 번들에 포함되면 안 된다.
- **Options**: 분석 결과를 JSON 한 모델에 통합, 핵심 엔터티를 정규화하고 확장 descriptor만 JSON 사용
- **Decision**: 핵심 관계·순위·점수·버전은 정규화된 모델과 DB constraint로 표현하고, 확장 분석값과 이유 상세만 `Json`으로 둔다. Client는 `generated/prisma`에 생성하고 `lib/db/prisma.ts`에서만 adapter와 함께 초기화한다.
- **Rationale**: 추천 재현성과 관계 무결성을 DB에서 보장하면서 후속 분석 알고리즘의 descriptor 확장은 migration 없이 수용할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: Prisma 7의 `prisma-client` generator와 명시적 output, `PrismaPg` 필수 adapter 계약을 기준으로 schema와 singleton 경계를 설계한다.
  - **DONE 전 확정 시점**: 정규화된 다섯 모델과 DB 제약이 Prisma validation을 통과했고, 생성 Client를 사용하는 `PrismaPg` singleton이 TypeScript 및 대상 lint 검사를 통과했다.
- **Evidence**:
  - **Commit**: 두 번째 태스크 커밋의 Git 이력
  - **PR**: 로컬 워크플로우로 생성하지 않음
  - **Test/Log**: [tasks.md 테스트 실행 기록](./tasks.md#테스트-실행-기록)
- **Consequences**: JSON 내부 구조 검증은 해당 값을 생성하는 후속 Feature에서 별도 타입과 validation으로 보완해야 한다.

## D003: Idempotent seed와 실제 PostgreSQL 통합 검증 (2026-08-05)

- **Context**: 후속 Feature 개발 전에 전체 관계를 갖춘 최소 데이터를 반복해서 준비하고 초기 migration의 실제 적용 가능성을 확인해야 한다.
- **Constraints**: 실제 음원과 개인정보를 seed에 포함하지 않으며, Docker Compose 기동은 사용자가 직접 수행한다. Prisma 7은 migration/reset에서 seed를 자동 실행하지 않는다.
- **Options**: 일회성 create seed, unique key 기반 upsert seed, SQL fixture
- **Decision**: 고정 UUID와 unique key 기반 Prisma upsert seed를 사용하고 `prisma db seed`를 명시적으로 실행한다. 별도 verify script가 관계와 핵심 값을 조회·검증한다.
- **Rationale**: 여러 번 실행해도 개발 DB를 깨뜨리지 않으며 Prisma Client가 실제 schema 관계를 올바르게 다루는지 함께 검증할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: DB 없이 seed와 verify 코드를 먼저 작성하고, 사용자의 Compose 기동 후 migrate/seed/verify를 실제 실행한다.
  - **DONE 전 확정 시점**: PostgreSQL 16에 초기 migration을 적용하고 seed를 두 번 연속 실행했다. verify script가 Recording→VocalProfile→RecommendationRun→RecommendationItem→Song→곡 VocalProfile 관계와 추천 shift를 정상 조회했다.
- **Evidence**:
  - **Commit**: 세 번째 태스크 커밋의 Git 이력
  - **PR**: 로컬 워크플로우로 생성하지 않음
  - **Test/Log**: [tasks.md 테스트 실행 기록](./tasks.md#테스트-실행-기록)
