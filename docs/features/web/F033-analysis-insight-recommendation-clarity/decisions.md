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
  - **Commit**: `6d205db` (`feat(F033): key-fit scoring v3로 신뢰도 가산 분리`)
  - **PR**: -
  - **Test/Log**: `pnpm run test:key-fit` 20/20 PASS; `pnpm run test:recommendation` 30/30 PASS; `pnpm run test:query` 32/32 PASS; TypeScript PASS
- **Consequences**: 같은 profile/catalog 입력이라도 v2와 v3의 절대 적합도 값은 달라질 수 있다. 추천 cache/mixing snapshot은 `key-fit-v3` version으로 구분되며, 낮은 입력 신뢰도는 점수가 아니라 별도 warning으로 전달된다.

## D002: selectionScore를 사용자-facing 추천 점수와 순위의 단일 기준으로 사용 (2026-08-15)

- **Context**: 서버 `rank`는 `selectionScore = 0.65 × originalKeyScore + 0.35 × adjustedScore - shiftPenalty`로 정하지만, 추천 목록의 대표 `추천 적합도`와 기본 정렬은 `adjustedScore`를 사용하고 있었다. 따라서 서버 1위와 화면의 기본 첫 곡이 서로 다른 기준일 수 있고 `추천 적합도 높은 순`과 `종합 추천 순위`가 동시에 존재했다.
- **Constraints**: 기존 selection policy와 shift penalty는 이번 Feature에서 재튜닝하지 않는다. 원키 적합도와 추천 키 적합도는 상세 근거로 유지하고, 기존 URL의 `sort=rank`와 `sort=adjusted-score`는 깨뜨리지 않아야 한다.
- **Options**: (1) `adjustedScore`를 rank 기준으로 바꾸기, (2) rank와 adjusted score를 계속 별도 노출하기, (3) 실제 rank source인 `selectionScore`를 사용자-facing `추천 점수`로 승격하고 상세에 key-fit score를 남기는 방식을 비교했다.
- **Decision**: `selectionScore`를 0–100의 `추천 점수`로 표시하고 서버 `rank`, 기본 목록 순서, 추천 점수 filter/sort를 같은 기준으로 통일한다. 대표 점수는 확률처럼 읽히지 않도록 `%` 대신 `점`으로 표시한다. 정렬은 `추천 점수 높은 순`, `원키 적합도 높은 순`, `곡명 가나다순`만 제공한다. legacy `rank`/`adjusted-score` query는 parser에서 `recommendation-score`로 normalize한다.
- **Rationale**: 사용자는 하나의 추천 기준을 보고, 원키/추천키 적합도는 곡 상세의 설명 근거로 분리된다. 서버와 UI의 첫 곡·순위·점수가 동일한 source-of-truth를 사용한다.
- **Trace**:
  - **DOING 시작 시점**: `rankRecommendations()`는 selectionScore를 사용하지만 `DEFAULT_RECOMMENDATION_FILTERS.sort`와 `recommendationMatchPercent()`는 adjustedScore를 사용하는 불일치를 확인했다.
  - **DONE 전 확정 시점**: canonical `recommendation-score` sort, legacy alias parsing, selectionScore score/filter/color helper와 server rank 표시를 구현했다. 추천 결과·곡 상세 Storybook에서 `점` 표기와 선택 순위를 검증했다.
  - **머지 후 확인**: Pending
- **Evidence**:
  - **Commit**: `41c14d3` (`feat(F033): 추천 점수·순위·정렬 기준 통일`)
  - **PR**: -
  - **Test/Log**: `pnpm run test:recommendation` 30/30 PASS; `pnpm run test:query` 32/32 PASS; targeted Storybook 12/12 PASS; TypeScript PASS
- **Consequences**: 목록 대표 추천 점수는 adjusted key-fit score와 수치가 다를 수 있으며, 곡 상세에서 원키/추천키 적합도를 별도 근거로 확인할 수 있다. 기존 sort URL은 읽을 수 있지만 새 URL에는 canonical 값만 기록한다.

## D003: raw 분석 metric은 보존하고 사용자 presentation만 단순화 (2026-08-15)

- **Context**: 성공한 보컬 프로필 화면에 clipping, RMS, sample rate, pitch stability, raw MIDI가 함께 노출되어 내부 QA/분석 단위와 사용자가 실제로 이해해야 할 결과가 섞여 있었다. `tessituraLow/High`도 p10–p90 관찰 구간인데 `실용 음역`으로 표시되어 능력 전체를 측정한 것처럼 읽힐 여지가 있었다.
- **Constraints**: analyzer rejection, DB persistence, catalog snapshot, mixing/reference selection은 기존 raw metric을 계속 사용해야 하며 데이터 migration이나 analyzer/Modal 재배포를 만들면 안 된다. 한 소절만으로 성별·성종·장르를 추정하지 않는다.
- **Options**: raw metric 자체를 제거, 상세 접힘 영역으로 유지, 내부 계약은 그대로 두고 성공 화면에서 사용자 의미가 있는 정보만 표시하는 방식을 비교했다.
- **Decision**: analyzer/DB의 `voicedRatio`, `pitchStability`, `clippingRatio`, `rmsDb`, `sampleRate`, MIDI 통계는 그대로 보존한다. 사용자-facing 성공 화면은 `관측 음역`, p10–p90의 `주요 음역`, p50의 `중심 음`, `유효 음성 구간`, 녹음 길이 중심으로 단순화한다. 음높이는 `레4(D4)`처럼 한국어 계이름과 국제 음이름을 병기하고 raw MIDI decimal은 숨긴다. 보컬 프로필 목록에서는 안정도 컬럼을 제거한다.
- **Rationale**: 품질 gate와 추천 계산에 필요한 측정값을 잃지 않으면서 사용자는 자신의 녹음에서 실제로 관찰된 정보만 이해하게 된다. 용어가 분석 정의와 일치해 과도한 능력·성별 추론을 줄인다.
- **Trace**:
  - **DOING 시작 시점**: analyzer에서 min/max가 2/98 percentile, 주요 구간이 p10/p90, voiced ratio가 valid voiced frame 비율임을 확인했다.
  - **DONE 전 확정 시점**: 사용자-facing source/story에서 오래된 `실용 음역`, `중앙음`, `추천 적합도`를 제거했고 analyzer/persistence contract에 raw metric이 그대로 존재하는 rg audit를 통과했다.
  - **머지 후 확인**: Pending
- **Evidence**:
  - **Commit**: `7d40e98` (보컬 분석 presentation), `9ff7505` (Library/곡 비교)
  - **PR**: -
  - **Test/Log**: vocal presentation 12/12 PASS; key-fit 20/20 PASS; full `pnpm test` PASS; Storybook 163/163 PASS; raw metric source audit PASS
- **Consequences**: 저장 스키마와 analyzer response는 바뀌지 않아 기존 프로필을 재분석할 필요가 없다. 사용자 화면의 용어와 정보 밀도만 변경된다.
