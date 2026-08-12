# Feature Spec: xai-inspired-landing-motion

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F022
- **기능명**: xai-inspired-landing-motion
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-12
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

x.ai의 절제된 중앙형 랜딩 구조를 Copy Singer에 맞게 재해석하고, Aceternity UI와 React Bits를 참고한 접근 가능하고 성능 친화적인 애니메이션을 추가한다.

현재 랜딩은 제품 가치, 실제 3단계 흐름과 primary CTA를 정확하게 설명하지만, 첫 viewport의 좌우 분할 구조와 작은 원형 파형만으로는 Copy Singer의 핵심 경험인 `목소리 → 분석 → 추천 → AI 믹싱`이 충분히 인상적으로 연결되지 않는다.

이 Feature는 x.ai의 넓은 여백, 절제된 중앙 정렬 display copy, 작은 announcement, 비대칭 product bento, editorial demo, hairline metric band와 2-up CTA 구성을 참고한다. Aceternity UI의 Bento Grid·Glowing Effect 계열 source pattern과 React Bits의 Orb·content reveal을 Copy Singer의 semantic token, 데이터 정직성, 접근성 및 성능 기준에 맞게 직접 통합한다.

목표는 레퍼런스 사이트를 복제하거나 효과를 많이 추가하는 것이 아니라, 첫 방문자가 제품 가치를 즉시 이해하고 실제 목소리 분석 흐름으로 자연스럽게 진입하도록 만드는 것이다.

---

## 사용자 스토리

### US-1: 첫 방문에서 제품 가치 이해

**As a** Copy Singer를 처음 방문한 사용자
**I want** 첫 화면에서 서비스가 내 목소리를 분석해 맞는 노래와 키를 추천하고 AI 믹싱으로 이어진다는 점을 이해하고
**So that** 서비스를 사용할 가치가 있는지 빠르게 판단할 수 있다.

**Acceptance Criteria:**

- [ ] 첫 viewport에는 하나의 절제된 display headline, 간결한 설명, primary CTA와 secondary anchor, 제품을 설명하는 비대칭 bento visual이 함께 보인다.
- [ ] headline과 설명은 `목소리 분석 → 노래와 키 추천 → 선택형 AI 믹싱`이라는 실제 제품 범위를 과장 없이 전달한다.
- [ ] 비로그인 primary CTA는 Google 로그인 후 `/profile`로, 로그인 사용자 primary CTA는 `/profile`로 연결된다.
- [ ] 제품 visual이 action처럼 보이는 경우 동일한 실제 목소리 분석 흐름으로 이동한다.

### US-2: 스크롤로 제품 흐름 탐색

**As a** 제품 동작을 더 알고 싶은 방문자
**I want** 스크롤하면서 분석, 추천, AI 믹싱의 연결 관계를 시각적으로 확인하고
**So that** 가입 또는 녹음을 시작하기 전에 서비스가 제공하는 결과를 이해할 수 있다.

**Acceptance Criteria:**

- [ ] 랜딩은 분석, 노래와 키 추천, 선택형 AI 믹싱의 세 단계만 실제 순서대로 설명한다.
- [ ] desktop에서는 bento product showcase와 2열 editorial demo가 제품 흐름을 연결하고, mobile에서는 같은 내용을 읽기 쉬운 단일 열로 제공한다.
- [ ] preview는 현재 제품 계약에 있는 파형, 음역·안정성 분석, 추천 키·이유, 사용자 선택형 AI 믹싱만 표현한다.
- [ ] API나 저장 데이터에 없는 점수, 진행률, 앨범 이미지, 장르, 난이도, 가사 또는 인앱 음원 preview를 만들거나 암시하지 않는다.

### US-3: 움직임 설정과 무관한 접근

**As a** 키보드 사용자 또는 움직임 감소 설정을 사용하는 방문자
**I want** 애니메이션 없이도 같은 정보와 action에 접근하고
**So that** 시각 효과 때문에 제품 이해나 이용이 방해받지 않는다.

**Acceptance Criteria:**

- [ ] 모든 링크와 버튼은 keyboard로 접근 가능하고 기존 focus-visible 및 accessible name을 유지한다.
- [ ] `prefers-reduced-motion: reduce`에서는 장식 reveal, ripple, glow 이동과 큰 transform이 제거된다.
- [ ] motion이 정지해도 headline, 단계 제목, 설명, CTA와 제품 visual의 의미가 유지된다.
- [ ] 색상이나 animation만으로 단계, 상태 또는 action을 구분하지 않는다.

---

## 기능 요구사항

### FR-1: 중앙 집중형 Hero

- 기존 좌우 분할 hero를 넓은 여백의 중앙 정렬 composition으로 재구성한다.
- announcement 성격의 짧은 eyebrow 또는 badge, 하나의 display headline, 설명, primary CTA와 secondary anchor를 명확한 위계로 제공한다.
- 화면 대부분은 neutral white, gray, black token을 사용하고 pastel violet·blue accent는 Orb와 분석 신호에만 제한한다.
- global purple gradient, crystal/prism, 의미 없는 glassmorphism과 복수의 동일 위계 primary CTA를 사용하지 않는다.

### FR-2: Hero 제품 Bento

- 첫 viewport 하단에는 x.ai의 product mosaic처럼 분석·추천·믹싱을 서로 다른 크기의 카드로 보여주는 Aceternity 계열 bento를 일부 노출한다.
- preview에는 실제 입력으로 오해할 녹음 시간, 가짜 정확도 또는 가짜 처리 percentage를 표시하지 않는다.
- 실제 `/profile` 진입 action은 명확한 CTA로 유지하고 장식 visual과 분리한다.
- 목소리 분석 카드의 중앙 효과는 React Bits Orb를 `hue=294`, `rotateOnHover=false`, `hoverIntensity=0`으로 사용한다. 기존 waveform, dotted glow, ripple은 제거한다.

### FR-3: Editorial 제품 Story

- `목소리 분석`, `노래와 키 추천`, `선택형 AI 믹싱`을 하나의 연속된 제품 narrative로 제공한다.
- desktop은 x.ai식 2열 editorial demo와 큰 metric band를 제공하며, content가 JavaScript 또는 animation 없이도 문서 순서대로 읽혀야 한다.
- mobile은 horizontal overflow나 scroll-jacking 없이 일반 문서 흐름의 stacked layout을 사용한다.
- 기존 `실제 측정값`, `추천 이유`, `이어지는 기록` 신뢰 근거와 마지막 CTA/footer를 보존하거나 동일 의미로 통합한다.

### FR-4: 제한된 Motion System

- Aceternity UI의 Bento Grid·Glowing Effect와 React Bits의 Orb·Animated Content source pattern을 Copy Singer token과 컴포넌트 구조에 맞게 조정한다.
- Hero headline은 단어 단위로 순차 등장하고 설명은 문장 전체가 아래에서 위로 한 번 등장한다. Bento product showcase는 카드별 분절 없이 전체가 opacity 0에서 1로 천천히 한 번 등장한다.
- Hero 설명과 action은 animation 시작 전 opacity 0으로 완전히 숨기고 각 reveal 시점에만 표시한다.
- 추천 키 preview는 React Bits Count Up source pattern으로 정해진 예시 값 사이를 주기적으로 순환하되 실제 분석 결과로 오해되지 않아야 한다. 각 세로 bar의 원본 높이와 변경 높이 차이 구간만 색으로 표시하고, 화면 텍스트는 하단의 `낮춤/높임` 설명 한 줄만 제공한다.
- Metric band의 `5초+`, `60초`, `3단계`는 정적인 제품 사실로 표시하고 Count Up을 적용하지 않는다.
- headline과 section reveal은 첫 진입 시 한 번만 실행하고, 작은 opacity 및 translate 변화로 제한한다.
- 포인터 기반 highlight를 사용할 경우 제품 preview surface에만 적용하며 primary action의 위치나 hit target을 움직이지 않는다.
- Orb 이외의 custom cursor, magnetic button, 무한 marquee, 3D tilt, scroll-jacking과 상시 전체 화면 WebGL 배경은 제외한다.

### FR-5: 공통 Shell 및 반응형 계약

- 기존 `ProductHeader`, `ProductFooter`, 인증별 사용자 메뉴와 CTA destination을 재사용한다.
- 320px 이상 viewport에서 horizontal overflow가 없어야 한다.
- mobile 첫 viewport에서도 headline, primary CTA와 핵심 product visual을 확인할 수 있어야 한다.
- desktop의 장식 또는 sticky 동작이 지원되지 않아도 콘텐츠와 navigation은 동일하게 동작해야 한다.

### FR-6: 검증 가능한 Landing 상태

- Storybook에서 signed-out, signed-in, mobile과 reduced-motion 상태를 독립적으로 검증할 수 있어야 한다.
- 기존 CTA href, Admin navigation, footer와 accessible waveform action에 대한 회귀 검증을 유지한다.
- 최종 browser 검증에서 desktop과 mobile의 hero, 3단계 흐름, 마지막 CTA와 footer를 확인한다.

---

## 비기능 요구사항

- **성능**: headline, 설명과 CTA는 animation JavaScript 실행 전에도 즉시 렌더링되어야 하며 motion으로 layout shift가 발생하지 않아야 한다. animation client boundary를 랜딩 전체로 확장하지 않고 필요한 visual/reveal island로 제한한다. Orb canvas는 작은 client island로 격리하고 device pixel ratio와 animation lifecycle을 제한하며 viewport 밖 또는 reduced-motion 환경에서는 정지한다.
- **접근성**: WCAG AA 대비를 목표로 하며 keyboard, focus-visible, accessible name과 reduced-motion 대체 표현을 제공한다. 글자별 animation 때문에 heading의 접근 가능한 텍스트가 분절되거나 중복 낭독되지 않아야 한다.
- **호환성**: 최신 Chromium 기반 desktop/mobile과 Storybook browser 환경에서 핵심 콘텐츠 및 action이 동작해야 하며 animation API 미지원 시 정적 화면으로 안전하게 fallback한다.
- **보안**: 신규 사용자 데이터 수집, 외부 전송 또는 browser 권한 요청을 추가하지 않는다. 랜딩 preview는 실제 microphone 접근을 시작하지 않고 기존 `/profile` 흐름으로 이동한다.
- **유지보수성**: 외부 레퍼런스의 전체 패키지나 demo page를 복사하지 않고 필요한 source pattern만 프로젝트 token과 FSD 경계에 맞춰 소유한다. 새 runtime dependency가 필요하면 bundle 비용, 라이선스와 대안을 plan/decisions에 기록한다.

---

## 관련 문서

- PRD: `../../../prd/copy-singer-prd.md`
- PRD Refs: `PRD-FR-045`, `PRD-FR-046`, `PRD-FR-051`
- Product UI: `../../../designs/product-ui-redesign.md`
- Design System: `../../../designs/design-system.md`
- Current Landing: `../../../../src/_pages/home/ui/landing-page.tsx`
- Motion References:
  - `https://x.ai/`
  - `https://ui.aceternity.com/components/bento-grid`
  - `https://ui.aceternity.com/components/glowing-effect`
  - `https://reactbits.dev/backgrounds/orb?hue=294&rotateOnHover=false&hoverIntensity=0`
  - `https://www.reactbits.dev/animations/animated-content`
  - `https://www.reactbits.dev/animations/fade-content`
