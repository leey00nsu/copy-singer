# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D006: recommendation-card-synthesis 결정 (2026-08-06)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: RecommendationItem을 합성 idempotency 경계로 사용 (2026-08-06)

- **Context**: 추천 결과 화면의 재실행·새로고침과 동시 요청이 같은 곡의 Modal GPU job을 중복 생성할 수 있다.
- **Constraints**: 추천 run당 대상은 정확히 3개이며 외부 job 생성과 PostgreSQL transaction을 하나의 원자 작업으로 묶을 수 없다.
- **Options**: 별도 queue 테이블, 메모리 lock, RecommendationItem의 nullable 상태를 conditional update하는 방식을 검토한다.
- **Decision**: 초기 null 상태의 RecommendationItem을 conditional update로 `PREPARING` 전환한 요청만 외부 작업을 시작하게 하고 상태·job ID·retry history를 item에 저장한다. 상태 전이는 별도 순수 함수의 allowlist로 제한한다.
- **Rationale**: 기존 3개 item이 자연스러운 멱등성 key이며 프로세스 재시작과 여러 Next instance에서도 PostgreSQL의 조건부 갱신이 유지된다.
- **Trace**:
  - **DOING 시작 시점**: `updateMany(where: { id, synthesisStatus: null })`의 affected row를 시작 소유권으로 사용하고 허용 transition을 별도 helper로 제한한다.
  - **DONE 전 확정 시점**: Prisma enum과 nullable 초기 상태를 적용했다. migration 적용 후 실제 PostgreSQL의 추천 run 생성·직렬화·cascade 삭제가 기존 동작과 함께 통과했다.
  - **머지 후 확인**: 실제 결과/영향
- **Evidence**:
  - **Commit**: 커밋 해시 또는 링크
  - **PR**: PR 링크
  - **Test/Log**: `npm run test:recommendation` 14/14 PASS, `npm run test:recommendation:db` 1/1 PASS, `npx tsc --noEmit` PASS (2026-08-06)
- **Consequences**: 결과 및 영향 (선택사항)
