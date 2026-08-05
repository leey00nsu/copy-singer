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
  - **머지 후 확인**: 실제 결과/영향
- **Evidence**:
  - **Commit**: 첫 태스크 커밋의 Git 이력
  - **PR**: 로컬 워크플로우로 생성하지 않음
  - **Test/Log**: [tasks.md 테스트 실행 기록](./tasks.md#테스트-실행-기록)
- **Consequences**: 결과 및 영향 (선택사항)
