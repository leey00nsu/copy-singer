# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `DNNN: analysis-insight-recommendation-clarity 결정 (2026-08-15)`
> 결정 ID는 Feature별로 독립된 번호를 사용하며 Feature ID와 관계없이 `D001`부터 시작합니다.

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.
- 디자인 시스템 변경이나 예외를 기록할 때는 영향 받는 규칙과 범위, 예외 이유, 제거 조건, 실행 가능한 정본의 동기화 영향을 함께 남깁니다.

---

## D001: key-fit v3는 profile confidence를 적합도 점수에서 분리 (2026-08-15)

- **Context**: `key-fit-v2`는 주요 음역 overlap 55점, 주요 음역 초과 fit 25점, 관측 극단음 fit 15점에 profile confidence 5점을 더한다. profile confidence는 한 사용자에 대해 모든 곡과 모든 shift 후보에 동일하므로 추천 키나 곡 사이 상대 순위에는 영향을 주지 않고, 절대 적합도 숫자만 일괄적으로 높이거나 낮춘다. 또한 confidence의 60%가 자유 가창의 `pitchStability`에서 오므로 사용자가 이해하는 곡 적합도와 입력 품질을 한 점수에 섞는다.
- **Constraints**: `-6..+6` 정수 semitone 탐색, 기존 deterministic tie-break, symmetric 주요 음역 overlap과 초과 부담 구조, low-confidence 안내는 유지해야 한다. 기존 `key-fit-v2` 결과와 새 결과는 scoring version으로 구분되어야 한다.
- **Options**: (1) 기존 confidence 5점 유지, (2) confidence만 제거해 최대 95점으로 유지, (3) confidence를 제거하고 기존 55:25:15 상대 비율을 100점으로 재정규화하는 방식을 비교했다.
- **Decision**: `key-fit-v3`를 도입하고 candidate score에서 confidence contribution을 제거한다. 남은 가중치는 overlap 58, tessitura fit 26, extreme fit 16으로 재정규화한다. `calculateProfileConfidence()`와 breakdown의 top-level `confidence`, `LOW_PROFILE_CONFIDENCE` 안내는 진단 신호로 계속 유지한다.
- **Rationale**: 58:26:16은 기존 55:25:15의 상대 중요도를 거의 그대로 유지하면서 점수의 100점 척도를 보존한다. 점수는 곡과 이번 녹음의 pitch range 관계만 나타내고, 녹음 품질은 별도 주의사항으로 분리된다.
- **Trace**:
  - **DOING 시작 시점**: 같은 user profile의 confidence가 모든 song/shift candidate에 동일하게 더해지는 현재 수식을 확인해 상대 ranking에는 정보량이 없음을 고정했다.
  - **DONE 전 확정 시점**: confidence만 바꾼 두 user profile이 같은 song/shift에서 동일 score/contributions를 반환하고 confidence 값만 달라지는 회귀 테스트를 추가했다. 기존 shift 선택, tie-break, 100곡 결정성/성능은 유지됐다.
  - **머지 후 확인**: Pending
- **Evidence**:
  - **Commit**: Pending
  - **PR**: -
  - **Test/Log**: `pnpm run test:key-fit` 20/20 PASS; `pnpm run test:recommendation` 30/30 PASS; `pnpm run test:query` 32/32 PASS; TypeScript PASS
- **Consequences**: 같은 profile/catalog 입력이라도 v2와 v3의 절대 적합도 값은 달라질 수 있다. 추천 cache/mixing snapshot은 `key-fit-v3` version으로 구분되며, 낮은 입력 신뢰도는 점수가 아니라 별도 warning으로 전달된다.
