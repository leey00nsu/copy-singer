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

초기 구현의 power norm은 여러 채널의 powered 값을 합산해 기존 hard max보다 alpha를 크게 만들 수 있었고, 실제 검토에서 orb가 이전보다 진하고 불투명해졌다. 후속 보정에서는 **최대 입력 채널을 넘지 않는 smooth weighted average**로 교체한다.

```glsl
float smoothMax3(vec3 colorIn) {
  const float sharpness = 12.0;
  vec3 safeColor = clamp(colorIn, 0.0, 1.0);
  vec3 weights = exp(safeColor * sharpness);
  return dot(safeColor, weights) / max(weights.r + weights.g + weights.b, 1e-4);
}
```

`extractAlpha()`에서는 `a`를 `0..1`로 clamp하고 division denominator를 `max(a, 1e-4)`로 보호한다. weighted average는 dominant-channel 전환에서 연속적이면서 입력의 실제 최대값보다 커지지 않아 F032 적용 전보다 alpha를 체계적으로 높이지 않는다.

### 2. angular color phase를 넓고 비정형으로 만들기

현재 `cl = cos(ang + time) * 0.5 + 0.5`는 수학적으로 연속이지만 비슷한 색 전환선이 긴 호를 따라 유지된다. 기존 `snoise3`를 재사용해 저주파·저진폭 warp를 phase에만 더한다.

최종 값:

- spatial noise scale: `0.32`
- time scale: `0.1`
- phase amplitude: `0.16`
- blend contrast: 중앙 `0.5` 기준 `0.72`로 압축

고주파 grain으로 보이지 않도록 noise를 색 전환 위치만 천천히 휘게 하는 용도로 제한한다.

### 3. 내부 밝기 transition 완화

초기 F032에서 `v0` attenuation을 `6.5`로 낮추고 gamma `0.8`을 적용했지만, 이 변화는 seam 완화와 함께 배경색보다 컬러 기여도도 키워 전체 orb가 진해지는 부작용이 있었다.

후속 보정에서는 **F032 이전의 `light1(1.0, 10.0, d0)`와 선형 falloff를 복원**하고, 내부 seam 완화는 smooth alpha normalization과 color phase warp가 담당하게 한다.

목표는 중심 highlight와 기존 반투명 밀도를 되살리면서 핑크↔보라 전환선의 규칙성만 낮추는 것이다.

### 4. 외곽은 변경하지 않기

다음 코드는 회귀 방지용 계약으로 그대로 유지한다.

```glsl
float edgeMask = 1.0 - smoothstep(0.76, 0.9, length(uv));
```

`innerRadius`, canvas size, `ORB_MOTION_SPEED_SCALE`, public props도 내부 seam 해결을 위해 변경하지 않는다. 구현 중 내부 계산상 `innerRadius` 조정이 필요하다고 판단되면 별도 decision으로 기록하고 스펙을 먼저 갱신한다.

### 5. CSS fallback 부드럽게 맞추기

`globals.css`의 `.voice-orb-fallback`은 현재 conic gradient의 강한 색 대비가 live orb와 다른 seam을 만들 수 있다. WebGL 결과를 기준으로 다음 범위에서만 조정한다.

- radial highlight가 `24% → 48%`, 보라 내부광이 `38% → 68%` 범위에서 천천히 사라지도록 transition 폭을 넓힌다.
- conic gradient의 중간 라벤더 stop은 유지하되 전체 alpha를 낮춰 배경이 은은하게 비치게 한다.
- inner/outer shadow의 불투명도도 필요한 범위에서 낮춘다.
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
