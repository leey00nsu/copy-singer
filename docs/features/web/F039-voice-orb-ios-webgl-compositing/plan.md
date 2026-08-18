# Implementation Plan: voice-orb-ios-webgl-compositing

> 승인된 spec.md를 구현 기준으로 사용합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F039
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-18
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| Rendering | 기존 OGL 1.0.11 WebGL renderer | renderer 교체 없이 context alpha 계약만 명시한다. |
| Shader | 기존 단일 GLSL ES fragment shader | 새 pass 없이 fragment output과 falloff만 사양에 맞춘다. |
| Fallback | 기존 CSS gradient | WebGL 실패·reduced-motion 경로는 변경하지 않는다. |
| Test | Node source contract + Storybook browser test + lint/typecheck/build | 정적 계약과 실제 context attribute, 기존 사용처 회귀를 함께 검증한다. |

---

## 구현 방향

### 1. Drawing buffer와 fragment output을 premultiplied alpha로 통일

현재 OGL `Renderer`는 `alpha: true`만 전달받아 library 기본값인 `premultipliedAlpha: false`를 사용한다. 이를 호출부에서 명시적으로 `true`로 설정하고, fragment shader의 최종 출력도 다음처럼 premultiplied RGB로 맞춘다.

```glsl
float alpha = col.a * edgeMask;
gl_FragColor = vec4(col.rgb * alpha, alpha);
```

이 계약에서는 orb 외부의 `alpha=0` 픽셀 RGB도 0이 되므로 iOS page compositor가 투명 canvas를 별도 layer로 합성할 때 숨은 흰색 RGB가 새지 않는다. 기존 `gl.clearColor(0, 0, 0, 0)`와 `alpha: true`는 유지한다.

### 2. 역순 `smoothstep` 제거

현재 내부 mask 두 곳은 `edge0 > edge1`인 `smoothstep`을 사용한다. Chromium에서 의도했던 반전 방향을 유지하도록 공통 helper를 추가한다.

```glsl
float inverseSmoothstep(float lowEdge, float highEdge, float value) {
  return 1.0 - smoothstep(lowEdge, highEdge, value);
}
```

- `smoothstep(r0 * 1.05, r0, len)` → `inverseSmoothstep(r0, r0 * 1.05, len)`
- `smoothstep(1.0, outerRadius, len)` → `inverseSmoothstep(outerRadius, 1.0, len)`

threshold, `innerRadius`, 외곽 `edgeMask`, color warp 수치는 유지한다.

### 3. 실제 context attribute 검증

기존 source-contract test는 renderer option과 shader output/inverse falloff를 고정한다. `VoiceOrb` Storybook play test에서는 생성된 canvas의 기존 WebGL context에서 `getContextAttributes()?.premultipliedAlpha === true`를 확인한다. CSS fallback story와 public control 검증은 유지한다.

### 4. 시각 회귀 범위

고정 프레임 `SoftBlendReference`와 landing/login/voice-signal-core Storybook을 실행해 orb 크기, ready/fallback, 상태 전환 회귀를 확인한다. 자동화 환경의 Chromium에서 mobile viewport를 확인하고 가능한 WebKit 계열 비교를 수행하되, 실제 iPhone Safari 실기기 검증은 사용자의 별도 후속 확인으로 남기며 Feature 완료 gate로 사용하지 않는다.

---

## 파일 구조

```
src/shared/ui/voice-orb/
├── voice-orb.tsx                 # renderer alpha 계약과 shader falloff 수정
└── voice-orb.stories.tsx         # 실제 context attribute 검증

tests/
└── voice-orb-shader.test.ts      # premultiplied output·defined smoothstep 계약

docs/features/web/F039-voice-orb-ios-webgl-compositing/
├── spec.md
├── plan.md
├── tasks.md
└── decisions.md
```

---

## 테스트 전략

- **Shader contract**: `tsx --test tests/voice-orb-shader.test.ts`
  - renderer가 `premultipliedAlpha: true`를 명시한다.
  - 최종 RGB가 alpha로 premultiply된다.
  - 역순 `smoothstep` 호출이 없고 inverse helper의 low/high 순서가 고정된다.
  - 기존 `edgeMask`, motion scale, smooth color normalization을 유지한다.
- **Storybook**:
  - `VoiceOrb` live canvas의 실제 context attribute가 premultiplied alpha임을 확인한다.
  - `Default`, `SoftBlendReference`, `WebGLFallback`, custom speed를 유지한다.
  - login/landing/voice-signal-core 주요 사용처 회귀를 확인한다.
- **정적 검증**: `pnpm run lint`, `pnpm exec tsc --noEmit`.
- **전체 회귀**: `pnpm test`로 build, Node/integration, 전체 Storybook을 검증한다.
- **실기기 경계**: 실제 iPhone Safari 확인은 사용자가 별도로 수행하며 자동화 결과나 Feature 완료 조건에 포함하지 않는다.

---

## 배포·마이그레이션

DB, API, 환경변수와 사용자 데이터 migration은 없다. 클라이언트 shader와 renderer context option만 변경한다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
