# Designs

Copy Singer의 현재 UI 디자인 정본과 장기 규칙을 관리한다.

## 현재 정본

1. [`references/copy-singer/`](./references/copy-singer/README.md) — 최종 사용자 승인 visual reference의 유일한 위치
2. [`design-system.md`](./design-system.md) — 전 제품의 color, typography, spacing, component, 상태, responsive, 접근성 규칙
3. [`product-ui-redesign.md`](./product-ui-redesign.md) — F018 화면별 visual brief와 구현 해석

현재 구현 screenshot은 기능·데이터·상태 계약 확인용으로만 사용하며 visual source of truth로 승격하지 않는다.

## 금지된 기준

다음 경로는 과거 산출물로 취급하며 신규 구현·리뷰에서 참조하지 않는다.

- `docs/designs/assets/product-ui-redesign/` — 2026-08-10 이전 1448×1086 reference
- `docs/designs/generated/page-redesigns/` — 과거 current capture 및 generated V2 concept
- `docs/designs/page-redesign-analysis.md` — 과거 current-vs-concept gap 분석

이전 방향이 필요하면 Git history를 사용한다. working tree에는 현재 정본을 우선하고, 일회성 비교 screenshot은 repository에 추가하지 않는다.

## 작성 규칙

- reference 이미지는 `docs/designs/references/<product>/` 아래에만 저장한다.
- 파일명은 역할이 드러나는 kebab-case를 사용한다.
- 새로운 reference를 추가하거나 교체하면 해당 reference README와 관련 Design System/Feature decision을 같은 변경에서 갱신한다.
- production asset은 실제 runtime에서 사용하는 파일만 `public/`에 둔다.
- 일회성 visual QA screenshot, generated concept, intermediate contact sheet는 `/tmp` 또는 gitignored artifact 경로에서 생성하고 commit하지 않는다.
