# Decisions: voice-orb-color-blend-smoothing

## D001: 내부 색 seam은 외곽 alpha가 아니라 shader 내부 normalization과 blend 폭에서 해결한다 (2026-08-15)

- **Context**: 사용자가 지적한 경계는 orb 바깥 silhouette가 아니라 내부 핑크↔보라 색이 섞이는 지점이다. 현재 shader는 `extractAlpha()`에서 RGB 최대 채널을 직접 선택하고 angular cosine으로 두 색을 섞는다.
- **Constraints**: 외곽 edge feather와 orb 크기/모션을 바꾸면 문제 영역이 아닌 silhouette까지 달라진다.
- **Options**: 외곽 blur/edgeMask 확대, 전체 canvas blur, 내부 normalization·blend 조정 방식을 비교한다.
- **Decision**: 외곽 `edgeMask`는 유지하고, dominant-channel hard max를 연속적인 smooth normalization으로 교체하며 색 blend 폭과 내부 밝기 falloff를 완화한다.
- **Rationale**: 사용자가 지적한 실제 seam의 원인 후보에 직접 대응하면서 기존 orb 외곽 형태와 화면 배치를 보존할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: T01에서 `extractAlpha()` hard max 제거와 내부 `v0` falloff 완화를 시작했다.
  - **DONE 전 확정 시점**: `smoothMax3(power=6)`, `light1(..., 6.5, d0)`, `pow(v0, 0.8)`을 적용하고 source-contract test로 기존 `edgeMask(0.76, 0.9)`와 `ORB_MOTION_SPEED_SCALE=0.5`를 고정했다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: pending task commit
  - **PR**: -
  - **Test/Log**: shader/fallback contract 3/3 PASS; targeted VoiceOrb 사용처 Storybook 5 files / 25 tests PASS; 최종 Storybook 163/163 PASS.
- **Consequences**: shader 내부 계산은 변경되지만 VoiceOrb public API와 외곽 mask 계약은 그대로 유지한다.

## D002: 색 경계를 흐리기 위한 noise는 보이는 질감이 아니라 저주파 phase warp로만 사용한다 (2026-08-15)

- **Context**: 단순한 angular gradient는 부드럽게 보간되어도 같은 전환선이 긴 호를 따라 유지되어 경계처럼 인지될 수 있다.
- **Constraints**: orb에 grain/noise texture가 눈에 띄면 현재 부드러운 제품 미감이 깨지고 WebGL 비용도 불필요하게 증가한다.
- **Options**: 고주파 dithering, 별도 blur pass, 기존 simplex noise의 저주파 phase warp를 비교한다.
- **Decision**: 이미 shader에 있는 `snoise3`를 낮은 spatial/time frequency와 작은 amplitude로 color phase에만 사용하고, blend contrast를 압축해 중간색 영역을 넓힌다.
- **Rationale**: 새 dependency나 render pass 없이 전환선의 기하학적 규칙성만 약하게 깨면서 시각적 노이즈는 만들지 않는다.
- **Trace**:
  - **DOING 시작 시점**: T01에서 기존 `snoise3`를 color phase에만 재사용하는 저주파 warp를 적용했다.
  - **DONE 전 확정 시점**: spatial scale `0.32`, time scale `0.1`, amplitude `0.16`, blend contrast `0.72`로 확정하고 fallback에도 넓은 radial transition과 중간 라벤더 conic stops를 적용했다. `speed=0`의 `SoftBlendReference` Story로 고정 프레임 비교 경로를 추가했다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: pending task commit
  - **PR**: -
  - **Test/Log**: targeted Storybook 5 files / 25 tests PASS; lint/typecheck PASS; `pnpm test` PASS (Storybook 163/163).
- **Consequences**: 내부 색 경계는 시간에 따라 천천히 움직이지만 기존 전체 orb motion 속도 계약은 바뀌지 않는다.
