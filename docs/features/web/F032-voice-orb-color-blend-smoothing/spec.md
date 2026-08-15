# Feature Spec: voice-orb-color-blend-smoothing

> 기술 스택과 구체적인 shader 변경은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F032
- **기능명**: voice-orb-color-blend-smoothing
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-15
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

현재 `VoiceOrb` 내부에서 핑크·라벤더·보라 계열 색이 섞이는 일부 구간이 연속적인 빛의 덩어리보다 얇은 경계/띠처럼 읽힌다. 외곽 silhouette나 alpha feather를 바꾸는 것이 아니라 **orb 내부의 색 혼합과 밝기 전환만 더 넓고 연속적으로 보이게** 조정한다.

사용자가 특정 색 경계선을 쉽게 짚을 수 없는 상태를 목표로 하되, 현재 브랜드 hue, orb 크기, 외곽 투명도, 모션 속도와 상호작용 계약은 유지한다.

---

## 사용자 스토리

### US-1: 부드러운 내부 색 혼합

**As a** Copysinger 사용자
**I want** VoiceOrb 안의 핑크와 보라가 자연스럽게 이어져 보인다.
**So that** orb가 여러 색 영역을 붙여 놓은 원보다 하나의 부드러운 음성 신호처럼 느껴진다.

**Acceptance Criteria:**

- [ ] live WebGL orb의 내부 핑크↔보라 전환이 얇은 선이나 뚜렷한 띠처럼 읽히지 않는다.
- [ ] 두 색 사이에 충분한 중간 라벤더/중간톤 영역이 생기고 전환 위치가 단일 선으로 고정되어 보이지 않는다.
- [ ] 중앙 밝은 영역에서 컬러 영역으로 넘어가는 밝기 변화도 급격한 내부 contour를 만들지 않는다.
- [ ] 색 혼합을 부드럽게 하기 위해 고주파 grain이나 눈에 띄는 노이즈 질감을 새로 만들지 않는다.

### US-2: 기존 Orb 동작 유지

**As a** 기존 제품 사용자
**I want** 색 혼합이 부드러워져도 VoiceOrb의 크기·외곽·움직임이 갑자기 달라지지 않는다.
**So that** 로그인, 랜딩, 녹음 상태 등 기존 화면의 시각적 리듬이 유지된다.

**Acceptance Criteria:**

- [ ] 외곽 `edgeMask`와 orb silhouette의 기준 반경은 이번 feature에서 변경하지 않는다.
- [ ] `hue`, `speed`, `hoverIntensity`, `rotateOnHover`, `backgroundColor`, `forceFallback` public API를 변경하지 않는다.
- [ ] 기존 `ORB_MOTION_SPEED_SCALE=0.5`와 상태별 speed 계약을 유지한다.
- [ ] WebGL 실패 또는 reduced-motion 환경의 fallback도 live orb와 어긋나는 날카로운 내부 색 경계를 만들지 않는다.
- [ ] 로그인, 랜딩, voice-signal-core에서 기존 크기/레이아웃 계약을 유지한다.

---

## 기능 요구사항

### FR-1: 연속적인 alpha/color normalization

현재 fragment shader의 `extractAlpha()`에서 RGB 최대 채널을 직접 선택하는 불연속적인 `max(max(r,g),b)` normalization을 내부 색 혼합의 시각적 seam 원인 후보로 본다. dominant channel이 바뀌어도 결과가 연속적으로 변하는 smooth norm/soft-max 계열 계산으로 교체한다.

새 계산은 `colorIn`의 상대 색조를 유지하면서 alpha가 `0..1` 범위를 벗어나지 않아야 하며 0에 가까운 입력에서 division instability를 만들지 않아야 한다.

### FR-2: 넓은 색 전환 영역

`color1`과 `color2`를 섞는 angular phase는 단일 선이 오래 유지되지 않도록 저주파의 작은 spatial warp를 허용한다. 최종 blend factor의 대비를 압축해 양 끝 색보다 중간 라벤더 영역이 더 넓게 보이게 한다.

warp는 현재 simplex noise 함수를 재사용하고 별도 dependency/render pass를 추가하지 않는다. 노이즈가 질감으로 인지될 정도의 고주파/고진폭 변형은 사용하지 않는다.

### FR-3: 내부 밝기 falloff 완화

중앙 밝은 영역과 컬러 영역의 전환을 만드는 `v0` 계열 attenuation을 완화해 내부에 등고선 같은 밝기 경계가 생기지 않게 한다. 필요하면 clamp 이후 완만한 gamma/easing을 적용한다.

### FR-4: 외곽 계약 유지

이번 feature는 다음 외곽 처리 계약을 유지한다.

```glsl
float edgeMask = 1.0 - smoothstep(0.76, 0.9, length(uv));
```

외곽 alpha feather, orb 크기, canvas layout을 내부 색 혼합 문제 해결 수단으로 사용하지 않는다.

### FR-5: fallback 일관성

CSS fallback의 색 전환이 live orb보다 더 선명한 seam을 만들 경우, 기존 브랜드 색과 silhouette를 유지하는 범위에서 gradient stop/중간색을 조정한다. fallback은 애니메이션이나 WebGL 기능을 추가하지 않는다.

---

## 비기능 요구사항

- **성능**: 기존 단일 fragment shader render pass를 유지하고 새 texture, framebuffer, dependency를 추가하지 않는다.
- **안정성**: fragment color/alpha 결과에 NaN/Infinity가 생기지 않아야 한다.
- **접근성/모션**: reduced-motion fallback과 기존 motion policy를 유지한다.
- **반응형**: 로그인·랜딩·프로필에서 작은/큰 orb 모두 동일한 내부 blend 원칙을 사용한다.
- **회귀 방지**: Storybook과 정적 shader contract test로 내부 blend 정책과 외곽/motion 불변 조건을 고정한다.

---

## 제외 범위

- orb 외곽 feather/halo 재설계
- orb 크기 또는 배치 변경
- 브랜드 hue palette 전면 교체
- 녹음 waveform/voice-signal-core 상태 전환 재설계
- WebGL renderer 또는 OGL 교체
- 새로운 사용자 설정 추가

---

## 관련 문서

- PRD: `docs/prd/copy-singer-prd.md`
- PRD Refs: `PRD-FR-064`
- Plan: [plan.md](./plan.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
