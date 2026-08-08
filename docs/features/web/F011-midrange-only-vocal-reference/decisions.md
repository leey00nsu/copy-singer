# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D011: midrange-only-vocal-reference 결정 (2026-08-08)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: 새 synthesis reference는 기존 mid boundary를 유지한 mid-only selection으로 생성 (2026-08-08)

- **Context**: F009 `smart-reference-v1`은 low/mid/high를 약 10초씩 채우지만 사용자 실험에서는 안정적인 중음만 prompt로 사용했을 때 합성이 더 깔끔했다.
- **Constraints**: 최대 60초 분석 source와 profile 통계는 유지해야 하고, 기존 `smart-reference-v1` 저장 프로필은 migration 없이 계속 읽어야 한다. 30초는 SoulX prompt 최대 길이이지 최소 목표가 아니다.
- **Options**: 기존 10:10:10 유지, mid 우선 후 부족분 low/high 보충, mid-only + 짧은 reference 허용을 비교한다.
- **Decision**: 새 `smart-reference-mid-v1`은 기존 p10/median/p90 band boundary와 candidate 품질 평가를 재사용하되 `mid` candidate만 최대 30초까지 선택한다. low/high 보충, 반복, silence padding은 하지 않는다.
- **Rationale**: profile 의미를 바꾸지 않고 실제 합성 품질에서 관찰된 중음 reference 장점을 직접 반영하며, 불안정한 저·고음이 prompt에 다시 들어오는 경로를 제거한다.
- **Trace**:
  - **DOING 시작 시점**: 기존 `_build_candidates`는 유지하고 `_select_candidates`를 mid-only budget으로 단순화하며 output은 시간순/crossfade를 유지한다.
  - **DONE 전 확정 시점**: `_select_candidates`를 mid-only 단일 pass로 바꿔 candidate 반복·low/high 재분배를 제거했다. 거의 단일 음정인 녹음에서 segmented pYIN median의 미세 오차로 mid가 사라지는 edge case를 테스트가 발견해 boundary에 ±0.25 semitone tolerance를 추가했다. 새 descriptor는 `voiced-mid-phrase-selection` / `smart-reference-mid-v1`이며 unavailable reason은 `no-quality-mid-phrase`다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: task commit 후 갱신
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: target 17/17 PASS; 전체 analyzer suite 35 passed, remote-only 3 skipped
- **Consequences**: 새 reference는 30초보다 짧을 수 있으며, mid candidate가 전혀 없으면 profile은 저장되더라도 synthesis reference는 unavailable 상태가 된다.
