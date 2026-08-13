# Implementation Plan: waveform-brand-icon

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F023
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-13
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| Master asset | 정적 SVG (`viewBox="0 0 32 32"`) | 사용자 제공 geometry를 손실 없이 보존하고 모든 UI 크기에서 동일한 source를 사용한다. |
| Gradient | SVG `linearGradient`, `gradientUnits="userSpaceOnUse"` | 일곱 path마다 gradient가 반복되지 않고 파형 전체에서 violet → blue → pink가 연속되게 한다. |
| UI rendering | Next.js `Image` + public SVG | 기존 `ProductMark`의 sizing, preload와 접근성 계약을 최소 변경으로 유지한다. |
| Raster derivation | Sharp 기반 deterministic generation script | 같은 SVG에서 64px favicon과 180px apple touch PNG를 반복 생성하고 크기·alpha를 검증할 수 있다. |
| Verification | Node test + Storybook interaction/visual QA | 자산 구조와 UI 사용처를 자동 검증하고 실제 축소 렌더링을 눈으로 확인한다. |

---

## 아키텍처

```text
사용자 제공 32×32 SVG geometry
  → public/brand/copy-singer-mark.svg (canonical master + fixed sRGB gradient)
      ├─ ProductMark → ProductBrand / LoginScreen / footer·header consumers
      └─ generation script
          ├─ public/favicon.png (64×64 RGBA)
          └─ public/apple-touch-icon.png (180×180 RGBA)
```

- canonical SVG는 외부 reference 없이 `defs`의 단일 `linearGradient`와 일곱 `path`만 포함한다. `gradientUnits="userSpaceOnUse"`, `x1="3"`, `x2="29"`로 drawable bounds 전체에 색상을 매핑한다.
- gradient stop은 `globals.css`의 현재 brand token을 sRGB로 고정 변환한 값으로 정의한다. SVG/PNG가 document theme나 CSS load order에 따라 달라지지 않게 한다.
- `ProductMark`의 source와 intrinsic dimensions를 32×32 SVG에 맞추되 기존 `size-6`, opt-in preload, empty alt와 `aria-hidden`을 유지한다.
- PNG 파생 script는 SVG를 정사각 투명 canvas에 그대로 rasterize하며 geometry 보정, blur, shadow 또는 배경색을 추가하지 않는다.
- 기존 AI master PNG는 canonical 자산에서 제거한다. 같은 basename의 SVG를 사용해 Storybook selector와 자산 회귀 검증을 새 확장자에 맞춘다.

---

## 파일 구조

```
src/
└── widgets/product-shell/ui/
    ├── product-mark.tsx                         # SVG master source와 intrinsic size
    └── product-shell.stories.tsx                # 새 asset selector 회귀
src/_pages/login/ui/
└── login-screen.stories.tsx                     # 새 asset selector 회귀
public/
├── brand/copy-singer-mark.svg                   # canonical vector master
├── favicon.png                                  # generated 64×64 RGBA
└── apple-touch-icon.png                         # generated 180×180 RGBA
scripts/
└── generate-brand-icons.mjs                     # SVG → PNG deterministic rasterization
tests/
└── brand-icon-assets.test.ts                    # SVG safety/geometry/gradient 및 PNG 계약
package.json                                     # generation/test script와 직접 dev dependency
pnpm-lock.yaml                                   # dependency lock
```

---

## 테스트 전략

- **단위 테스트**: canonical SVG가 32×32 viewBox, 일곱 path, 단일 user-space gradient, 세 brand stop, 외부 reference/script/event handler 부재를 만족하는지 검사한다. PNG 두 개의 signature, dimensions, alpha channel, transparent corner와 nonempty bounds를 검사한다.
- **통합 테스트**: ProductMark와 관련 Storybook interaction test가 새 SVG source를 사용하면서 접근 가능한 제품명과 기존 layout을 유지하는지 확인한다. `pnpm run check`로 타입·lint·FSD 경계를 검증한다.
- **시각 QA**: master와 16/24/32/64/180px contact sheet를 직접 열어 bar 간격, clipping, gradient 연속성과 light/dark 배경 대비를 확인한다. login 및 공통 product shell Storybook에서 logo 크기와 정렬 회귀를 확인한다.
- **빌드 검증**: `pnpm run build`로 Next.js image/metadata 자산 처리를 확인한다.

## 구현 순서

1. SVG master와 재생성 script를 추가하고 PNG 파생본을 생성한다.
2. 자산 계약 테스트를 추가해 geometry, 안전성, dimensions와 alpha를 고정한다.
3. `ProductMark`와 Storybook selector를 새 SVG로 전환한다.
4. 정적 검사, 관련 Storybook test, production build와 contact sheet 시각 QA를 수행한다.

## 위험과 대응

- 16px에서 2-unit bar가 한 픽셀로 축소되므로 antialiasing에 따라 흐려질 수 있다. 원본 geometry는 바꾸지 않고 raster density와 투명 padding만 검증한다.
- CSS `oklch()`를 SVG/Sharp가 다르게 해석할 수 있으므로 SVG에는 확정된 sRGB stop을 기록하고 변환 근거를 decision log에 남긴다.
- browser favicon cache가 이전 PNG를 유지할 수 있으므로 파일 내용 hash와 실제 metadata request를 함께 검증한다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
