# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `DNNN: voice-orb-ios-webgl-compositing 결정 (2026-08-18)`
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

## D001: 투명 WebGL 합성 계약을 premultiplied alpha로 통일한다 (2026-08-18)

- **Context**: iPhone Safari의 실시간 화면에서만 `VoiceOrb` canvas 직사각형이 쨍한 흰색으로 드러나며, 스크린샷 평탄화 후에는 사라진다. 현재 OGL renderer는 `premultipliedAlpha: false` 기본값을 사용하고 fragment shader는 orb 외부에서 유효 RGB와 alpha 0을 함께 출력한다.
- **Constraints**: 기존 orb palette·밀도·silhouette·모션·public API를 유지하고 새 render pass나 dependency를 추가하지 않는다. 실제 iPhone Safari 검증은 사용자 후속 범위다.
- **Options**: canvas를 불투명하게 만들기, CSS 배경으로 사각형을 가리기, straight alpha를 유지하기, context와 fragment output을 premultiplied alpha로 통일하기를 비교한다.
- **Decision**: OGL renderer를 `premultipliedAlpha: true`로 만들고 fragment output을 `vec4(col.rgb * alpha, alpha)`로 통일한다. 역순 `smoothstep` 두 곳은 `1.0 - smoothstep(lowEdge, highEdge, value)` helper로 교체한다.
- **Rationale**: 투명 canvas를 유지하면서 alpha 0 픽셀의 숨은 RGB를 제거해 page compositor 입력 자체를 안정화할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: iOS에서만 보이고 screenshot flattening 후 사라지는 현상을 별도 WebGL layer 합성 문제로 판단했다. OGL 1.0.11의 renderer 기본값이 `premultipliedAlpha=false`임을 설치 소스에서 확인했다.
  - **DONE 전 확정 시점**: alpha 0일 때 premultiplied RGB도 0이 되는 fragment output과 renderer option을 source contract로 고정했다. 두 inverse falloff는 기존 threshold 순서를 low/high로 재배치하고 외곽 `edgeMask`는 유지했다. Storybook의 실제 context attribute와 모바일 viewport live rendering을 확인해 canvas 사각형 없이 기존 orb visual이 유지됨을 검증했다.
  - **머지 후 확인**: 현재 feature branch 검증 완료; local merge 후 통합 상태를 기록한다.
- **Evidence**:
  - **Commit**: `fbeb34c` (`feat(F039): WebGL alpha와 shader falloff 계약 수정`), `c92fcc6` (`test(F039): VoiceOrb alpha context 검증`)
  - **PR**: - (local workflow)
  - **Test/Log**: shader contract PASS 5/5; targeted Storybook PASS 4 files/23 tests; mobile viewport 390×844 live WebGL visual PASS; lint/typecheck PASS; `pnpm test` PASS including Storybook 54 passed/2 skipped and 176 tests.
- **Consequences**: context 합성 계약이 명시적으로 바뀌지만 shader가 premultiplied output을 제공하므로 의도된 화면 색은 유지되어야 한다.
