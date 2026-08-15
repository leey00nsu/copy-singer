# Implementation Plan: voice-orb-color-blend-smoothing

> 스펙 승인 전에는 구현하지 않습니다.
> canonical docs surface 밖의 산출물이 생기더라도 최종 SSOT는 이 파일로 유지합니다.

---

## 개요

- **기능 ID**: F032
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-15
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| Rendering | 기존 OGL/WebGL fragment shader | 현재 VoiceOrb의 실제 색/alpha 계산 경계다. |
| Fallback | CSS gradients | WebGL 실패/reduced-motion 환경에서도 시각적 seam을 완화한다. |
| UI | React 19 | VoiceOrb public API와 사용처는 유지한다. |
| Test | Storybook + Node/tsx source-contract test + ESLint/TypeScript | 실제 canvas 준비 상태와 shader 불변 조건을 함께 검증한다. |

---

## 구현 방향

### 1. `extractAlpha()`의 hard max 제거

`src/shared/ui/voice-orb/voice-orb.tsx`의 현재 구현은 alpha를 가장 큰 RGB 채널 하나로 선택한다.

```glsl
float a = max(max(colorIn.r, colorIn.g), colorIn.b);
```

핑크 영역에서는 red, 보라 영역에서는 blue가 dominant channel이 되면서 선택 채널이 바뀌는 지점의 기울기가 꺾일 수 있다. 이를 연속적인 smooth norm으로 바꾼다.

최종 구현은 power `6.0`의 smooth norm을 사용한다.

```glsl
float smoothMax3(vec3 colorIn) {
  const float power = 6.0;
  vec3 safeColor = max(colorIn, vec3(0.0));
  vec3 powered = pow(safeColor, vec3(power));
  return pow(powered.r + powered.g + powered.b, 1.0 / power);
}
```

`extractAlpha()`에서는 `a`를 `0..1`로 clamp하고 division denominator를 `max(a, 1e-4)`로 보호한다.

### 2. angular color phase를 넓고 비정형으로 만들기

현재 `cl = cos(ang + time) * 0.5 + 0.5`는 수학적으로 연속이지만 비슷한 색 전환선이 긴 호를 따라 유지된다. 기존 `snoise3`를 재사용해 저주파·저진폭 warp를 phase에만 더한다.

최종 값:

- spatial noise scale: `0.32`
- time scale: `0.1`
- phase amplitude: `0.16`
- blend contrast: 중앙 `0.5` 기준 `0.72`로 압축

고주파 grain으로 보이지 않도록 noise를 색 전환 위치만 천천히 휘게 하는 용도로 제한한다.

### 3. 내부 밝기 transition 완화

현재 `v0 = light1(1.0, 10.0, d0)`의 attenuation을 낮추고 필요 시 clamp 후 gamma/easing을 사용한다.

최종 값:

```glsl
float v0 = light1(1.0, 6.5, d0);
...
v0 = pow(clamp(v0, 0.0, 1.0), 0.8);
```

목표는 중심 highlight의 존재감을 없애는 것이 아니라 밝은 중심→색 영역 전환 폭을 넓히는 것이다.

### 4. 외곽은 변경하지 않기

다음 코드는 회귀 방지용 계약으로 그대로 유지한다.

```glsl
float edgeMask = 1.0 - smoothstep(0.76, 0.9, length(uv));
```

`innerRadius`, canvas size, `ORB_MOTION_SPEED_SCALE`, public props도 내부 seam 해결을 위해 변경하지 않는다. 구현 중 내부 계산상 `innerRadius` 조정이 필요하다고 판단되면 별도 decision으로 기록하고 스펙을 먼저 갱신한다.

### 5. CSS fallback 부드럽게 맞추기

`globals.css`의 `.voice-orb-fallback`은 현재 conic gradient의 강한 색 대비가 live orb와 다른 seam을 만들 수 있다. WebGL 결과를 기준으로 다음 범위에서만 조정한다.

- radial highlight가 `24% → 48%`, 보라 내부광이 `38% → 68%` 범위에서 천천히 사라지도록 transition 폭을 넓힌다.
- conic gradient를 `#c4a8f6 → #b9baf2 → #e1b7ee → #c8b5f0`의 중간 라벤더 계열로 완화한다.
- 기존 silhouette, 크기, shadow 구조는 유지한다.

### 6. 검증용 deterministic story

`VoiceOrb` Storybook에 `speed={0}`인 고정 프레임 story를 추가한다. 이 story는 내부 blend를 사람이 비교하기 위한 reference surface이고, interaction test에서는 WebGL canvas ready와 기존 motion/edge 계약을 확인한다.

자동 회귀는 별도 source-contract test에서 다음을 고정한다.

- hard `max(max(colorIn.r, colorIn.g), colorIn.b)` normalization 제거
- smooth alpha normalization 존재
- low-frequency color warp/contrast compression 존재
- `edgeMask 0.76 → 0.9` 계약 유지
- `ORB_MOTION_SPEED_SCALE = 0.5` 유지

---

## 주요 변경 파일

```text
src/shared/ui/voice-orb/
├── voice-orb.tsx
└── voice-orb.stories.tsx

src/_app/styles/globals.css               # fallback 내부 색 전환 완화
src/features/create-mixing/ui/recommendation-mixing-action.stories.tsx # 전체 회귀 중 드러난 기존 dialog timing 안정화

tests/voice-orb-shader.test.ts            # shader/fallback 회귀 계약

docs/features/web/F032-voice-orb-color-blend-smoothing/
├── spec.md
├── plan.md
├── tasks.md
└── decisions.md
```

---

## 테스트 전략

### 1. shader contract

- hard dominant-channel max 제거 확인
- smooth normalization 확인
- low-frequency warp/contrast compression 확인
- 외곽 edge mask 값 유지
- motion scale 유지

### 2. Storybook

- 기본 live WebGL orb canvas 준비
- `speed=0` soft-blend reference 프레임
- WebGL fallback
- 기존 custom speed 0.3 → effective 0.15
- login/landing/voice-signal-core의 기존 VoiceOrb story 회귀

### 3. 최종 검증

- targeted VoiceOrb/voice-signal/login/landing Storybook
- `pnpm run lint`
- `pnpm exec tsc --noEmit`
- `pnpm test`

---

## 배포/마이그레이션

DB/API migration과 환경변수 변경은 없다. 정적 shader/CSS/UI 변경만 포함한다.
