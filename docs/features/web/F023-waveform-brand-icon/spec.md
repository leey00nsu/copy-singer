# Feature Spec: waveform-brand-icon

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F023
- **기능명**: waveform-brand-icon
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-13
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

사용자 제공 32×32 SVG 파형을 기하학적 master로 삼아 기존 AI 생성 헤드폰 PNG app mark를 브랜드 violet–blue–pink 그라데이션 파형 아이콘으로 교체하고, ProductMark와 favicon 및 apple touch icon을 동일 자산 계열로 동기화한다.

현재 master는 AI로 생성한 1024px PNG라 작은 크기에서 경계와 내부 형태가 픽셀 단위로 일관되지 않는다. 정수 좌표와 단순한 rounded bar geometry를 가진 SVG를 source of truth로 사용해 화면과 브라우저 아이콘에서 동일한 silhouette과 선명도를 확보한다.

---

## 사용자 스토리

### US-1: 선명하고 일관된 제품 마크

**As a** Copy Singer 사용자
**I want** 모든 화면과 브라우저 탭에서 같은 파형 제품 마크를 보고
**So that** 작은 크기에서도 서비스를 즉시 식별하고 일관된 브랜드 경험을 얻을 수 있다.

**Acceptance Criteria:**

- [ ] header, footer와 login의 공통 `ProductMark`가 사용자 제공 SVG와 같은 일곱 막대 파형 silhouette을 표시한다.
- [ ] favicon과 apple touch icon이 같은 벡터 master에서 파생되고 투명 배경과 브랜드 gradient를 유지한다.
- [ ] 16px, 24px, 32px, 64px와 180px에서 bar가 잘리거나 서로 붙지 않고 파형으로 식별된다.

---

## 기능 요구사항

### FR-1: 사용자 제공 SVG를 canonical master로 사용

- 첨부된 `viewBox="0 0 32 32"` SVG의 일곱 rounded vertical bar 경로와 정수 좌표 geometry를 보존한다.
- AI 생성 헤드폰, bitmap edge, shadow, outline과 추가 장식을 새 mark에 포함하지 않는다.
- 프로젝트가 외부 다운로드 위치에 의존하지 않도록 canonical SVG를 `public/brand` 아래에서 버전 관리한다.

### FR-2: 브랜드 gradient 적용

- 전체 파형에 하나의 좌→우 연속 gradient를 적용하며 stop 순서는 기존 chart brand와 같은 violet → blue → pink로 한다.
- SVG와 raster 파생본은 CSS runtime 변수에 의존하지 않는 확정된 sRGB 색상 값을 사용하되, 현재 `--brand-violet`, `--brand-blue`, `--brand-pink`의 시각적 관계를 유지한다.
- light/dark 배경에서 동일 자산을 사용하며 외곽 배경 plate를 추가하지 않는다.

### FR-3: 공통 mark와 browser icon 동기화

- `ProductMark`는 canonical SVG를 사용하고 현재 장식 이미지 접근성 계약(`alt=""`, `aria-hidden="true"`)과 고정 intrinsic ratio를 유지한다.
- `public/favicon.png` 64×64와 `public/apple-touch-icon.png` 180×180은 canonical SVG에서 deterministic rasterize한다.
- root metadata의 icon URL, 크기와 MIME 계약은 유지한다.

### FR-4: 범위 제한

- 제품명 `Copy Singer`, wordmark typography, OG image, 보컬 차트와 artwork gradient 동작은 변경하지 않는다.
- 첨부 SVG의 막대 수, 높이 순서와 간격을 재설계하지 않는다.

---

## 비기능 요구사항

- **성능**: 공통 mark는 작은 정적 SVG 한 개로 제공하고 layout shift를 만들지 않는다. favicon raster 크기는 기존 계약을 유지한다.
- **보안**: SVG에는 script, external reference, embedded bitmap과 event handler를 포함하지 않는다.
- **접근성**: mark 자체는 장식으로 숨기고 인접한 `Copy Singer` text 또는 link/button label이 accessible name을 제공한다.
- **시각 품질**: 16px 축소에서도 bar 사이 최소 한 픽셀 이상의 투명 간격과 식별 가능한 outer padding을 유지하고 transparent corner를 검증한다.

---

## 관련 문서

- PRD: `../../prd/`
- PRD Refs: `PRD-FR-045`, `PRD-FR-052`
  - 이미 원문 요구사항 문서에 정의된 ID만 적으세요. `spec.md`나 `tasks.md`에서 임의로 PRD ID를 만들지 않습니다.
  - 레거시 요구사항 문서에 아직 PRD ID가 없다면, 먼저 원문에 ID를 backfill한 뒤 이 필드와 `tasks.md` 태스크 태그를 함께 갱신하세요.
  - 요구사항/스코프 변경 시 PRD 문서 + 이 필드 + `tasks.md` 태스크 태그를 함께 갱신하세요.
  - 구현 중 더 나은 사용자 동작이 발견되어 최종 요구사항이 바뀌었다면, 이를 영구적인 `[NON-PRD]` 예외로 두지 말고 PRD 업데이트로 취급하세요.
