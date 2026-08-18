# Feature Spec: voice-orb-ios-webgl-compositing

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F039
- **기능명**: voice-orb-ios-webgl-compositing
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-18
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

iPhone Safari에서 VoiceOrb의 투명 WebGL 캔버스가 흰 사각형으로 드러나는 합성 문제를 수정하고 브라우저 간 셰이더 결과를 안정화한다.

현재 iPhone Safari의 실시간 화면에서는 orb 외부의 투명 영역이 카드와 자연스럽게 합성되지 않고 canvas 경계에 해당하는 쨍한 흰 사각형으로 보일 수 있다. 같은 장면을 iOS 스크린샷으로 평탄화하면 사각형이 사라지고, macOS Safari에서는 재현되지 않으며 Chrome과 Safari 사이에는 orb 내부 색·falloff가 미묘하게 다르다.

`VoiceOrb`의 기존 색감·크기·silhouette·모션을 재설계하지 않고, WebGL drawing buffer의 alpha 표현과 fragment output을 같은 계약으로 맞추며 브라우저별 정의되지 않은 shader 연산을 제거한다. 이를 통해 iPhone Safari의 실시간 합성에서도 canvas 직사각형이 드러나지 않고 지원 브라우저가 일관된 orb를 표시하게 한다.

---

## 사용자 스토리

### US-1: iPhone에서도 자연스러운 투명 Orb

**As a** iPhone Safari 사용자
**I want** orb 바깥 영역이 카드 배경과 자연스럽게 이어져 보인다.
**So that** WebGL canvas의 직사각형 경계를 제품 UI로 오인하지 않고 의도된 orb에 집중할 수 있다.

**Acceptance Criteria:**

- [ ] iPhone Safari의 실시간 랜딩 화면에서 `VoiceOrb` canvas 경계에 해당하는 흰 사각형이 보이지 않는다.
- [ ] 스크롤·애니메이션 진행·화면 회전 또는 Safari foreground 복귀 후에도 투명 영역이 카드 배경과 동일하게 합성된다.
- [ ] 스크린샷으로 평탄화하기 전후에 orb 외부 배경의 시각적 차이가 생기지 않는다.

### US-2: 브라우저 간 안정적인 Orb

**As a** Copysinger 사용자
**I want** 지원 브라우저마다 orb의 외곽과 내부 색 전환이 본질적으로 같은 모습으로 보인다.
**So that** 사용하는 기기와 브라우저에 따라 브랜드 visual이 달라지지 않는다.

**Acceptance Criteria:**

- [ ] Chrome과 Safari에서 orb의 중심 highlight, 내부 색 전환과 외곽 feather가 동일한 shader 계약을 따른다.
- [ ] GLSL 사양에서 결과가 정의되지 않는 역순 `smoothstep(edge0, edge1, x)` 호출이 남지 않는다.
- [ ] alpha가 0인 orb 외부 픽셀은 page compositor에 색이 새지 않는 방식으로 출력된다.
- [ ] WebGL 실패와 reduced-motion 환경의 CSS fallback 동작은 유지된다.

---

## 기능 요구사항

### FR-1: WebGL alpha 합성 계약 정합화

`VoiceOrb`가 생성하는 WebGL context의 `premultipliedAlpha` 설정과 fragment shader의 RGB/alpha 표현을 명시적으로 일치시킨다. page compositor가 premultiplied drawing buffer로 해석한다면 fragment output도 `rgb * alpha` 형태를 사용해야 하며, orb 외부의 `alpha=0` 픽셀이 유효 색을 page compositor로 전달하지 않아야 한다.

OGL의 암묵적 기본값에 의존하지 않고 renderer 생성 위치에서 alpha 계약을 드러낸다. 투명 canvas와 기존 `gl.clearColor(0, 0, 0, 0)` 동작은 유지한다.

### FR-2: 정의된 Shader Falloff

현재 역순 경계로 호출되는 내부 mask/falloff `smoothstep`은 같은 형태의 명시적인 inverse smoothstep으로 바꾼다.

```glsl
1.0 - smoothstep(lowEdge, highEdge, value)
```

변환 전 Chromium 계열에서 보이던 의도된 mask 방향과 threshold를 유지하고, orb 외곽 `edgeMask(0.76, 0.9)`, `innerRadius`, color phase warp와 motion speed는 변경하지 않는다.

### FR-3: 기존 VoiceOrb 시각·API 계약 유지

- `hue`, `speed`, `hoverIntensity`, `rotateOnHover`, `backgroundColor`, `forceFallback` public props를 유지한다.
- `ORB_MOTION_SPEED_SCALE=0.5`, canvas layout, orb silhouette와 기존 사용처 크기를 유지한다.
- 로그인, 랜딩, voice-signal-core의 상태 동작을 변경하지 않는다.
- 이번 호환성 수정과 무관한 palette·밝기·투명도 재튜닝은 하지 않는다.

### FR-4: 브라우저 합성 회귀 검증

정적 shader contract 검증에 renderer alpha 설정, premultiplied fragment output과 역순 `smoothstep` 부재를 추가한다. Storybook에서는 live WebGL canvas와 fallback 준비 상태, 기존 public controls를 검증하고 데스크톱 Chromium/WebKit 계열에서 가능한 범위의 시각 회귀를 확인한다. 실제 iPhone Safari 실기기 확인은 사용자가 별도로 수행하므로 Feature의 구현 완료·승인 조건과 자동화 Evidence에서 제외한다.

---

## 비기능 요구사항

- **성능**: 기존 단일 fragment shader render pass와 투명 canvas 구조를 유지하며 texture, framebuffer, dependency를 추가하지 않는다.
- **호환성**: WebGL 1 fallback을 포함해 GLSL ES에서 정의된 연산만 사용하고 자동화 가능한 Chromium/WebKit 결과를 비교한다. 실제 iPhone Safari 실기기 검증은 사용자 후속 확인 범위다.
- **안정성**: context loss 시 기존 CSS fallback 전환을 유지하고 RGB/alpha 결과에 NaN 또는 Infinity를 만들지 않는다.
- **접근성**: `prefers-reduced-motion` 사용자는 기존 정적 CSS fallback을 계속 사용한다.
- **보안**: 사용자 데이터·권한·네트워크·서버 계약 변경은 없다.

---

## 제외 범위

- VoiceOrb palette, 크기, 외곽 silhouette 또는 모션 재설계
- landing bento 레이아웃과 카드 배경 token 변경
- CSS fallback visual 재디자인
- WebGL renderer/OGL 교체 또는 새로운 사용자 설정 추가

---

## 관련 문서

- PRD: `../../../prd/copy-singer-prd.md`
- PRD Refs: `PRD-FR-064`
- Plan: [plan.md](./plan.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
- Design Refs: - (기존 visual 유지 목적의 호환성 수정이므로 별도 디자인 문서 없음)
