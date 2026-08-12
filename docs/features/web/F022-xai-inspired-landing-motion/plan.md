# Implementation Plan: xai-inspired-landing-motion

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F022
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-12
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| UI runtime | React 19.2 + Next.js 16.3 Server Components | 기존 `LandingPage`의 정적 HTML, 인증별 href와 공통 shell을 유지하고 animation 때문에 랜딩 전체를 client boundary로 만들지 않는다. |
| Styling | Tailwind CSS 4 + CSS Module | 기존 semantic token을 재사용하고 hero 전용 keyframe, mask와 scroll reveal을 route 가까이에 캡슐화한다. |
| Motion | CSS keyframes + progressive-enhancement view timeline | Aceternity/React Bits의 dotted glow, fade content, sticky reveal 패턴을 새 runtime dependency 없이 재구성한다. 미지원 환경에서는 콘텐츠를 숨기지 않고 정적으로 표시한다. |
| Icons/actions | Lucide React + shared `Button` | 현재 접근 가능한 action과 일관된 제품 UI를 유지한다. |
| Component verification | Storybook 10 + Vitest browser + axe addon | signed-out/in, mobile, reduced-motion과 CTA 회귀를 독립적으로 검증한다. |
| Browser verification | Chromium desktop/mobile viewport | hero composition, scroll narrative, overflow, reduced-motion과 console error를 실제 렌더링으로 확인한다. |

---

## 아키텍처

### 렌더링 경계

`HomePage`는 기존처럼 server에서 session을 조회하고 serializable한 `user`/`admin`만 `LandingPage`에 전달한다. 랜딩은 정적 Server Component로 유지하며 새 visual도 semantic HTML과 CSS로 렌더링한다.

```text
HomePage (server session)
  └─ LandingPage (server composition)
      ├─ ProductHeader (existing client boundary)
      ├─ LandingHero
      │   ├─ hero copy + CTA
      │   └─ LandingVoicePreview (semantic figure/link)
      ├─ LandingProductStory
      │   ├─ voice analysis preview
      │   ├─ recommendation preview
      │   └─ selected AI mixing preview
      ├─ LandingTrust
      ├─ final CTA
      └─ ProductFooter
```

### Motion 계층

1. **Hero entry**: headline, description, actions와 preview에 작은 opacity/translate stagger를 적용한다. HTML의 기본 상태는 visible이며 animation 지원 범위 안에서만 entry 효과를 활성화한다.
2. **Voice signal**: 기존 waveform bar의 진폭·위상과 ripple을 확장하고, pseudo-element 기반 dotted glow를 preview 범위 안에만 마스킹한다.
3. **Scroll story**: desktop에서 story heading/설명은 sticky context를 제공하고 각 semantic preview panel은 document scroll 진입에 따라 reveal된다. mobile에서는 sticky를 제거하고 순서가 명확한 stacked layout을 사용한다.
4. **Reduced motion**: media query에서 entry transform, view timeline, ripple, glow와 waveform animation을 제거한다. 정적 파형과 모든 텍스트/action은 그대로 남긴다.

### 데이터와 콘텐츠 정직성

- 랜딩 preview는 API를 호출하거나 microphone 권한을 요청하지 않는다.
- 시각화용 값은 상태/정확도/진행률로 읽히지 않는 장식 waveform 높이에만 사용한다.
- 음역·안정성, 추천 키·이유와 선택형 AI 믹싱 등 PRD에 존재하는 개념만 표시한다.
- preview 내부 action은 가짜 control로 만들지 않고 실제 `/profile` 진입 Link 또는 비상호작용 presentation으로 명확히 구분한다.

### 외부 레퍼런스 적용 정책

- x.ai에서는 중앙형 hero, 단일 primary CTA, 다음 제품 surface가 첫 viewport 아래에서 미리 보이는 정보 구조만 참고한다.
- Aceternity UI의 dotted glow와 sticky reveal은 동작 원리만 프로젝트 CSS로 재작성한다.
- React Bits의 fade/animated content는 짧은 1회 reveal timing과 progressive enhancement 원칙만 참고한다.
- 외부 demo의 global gradient, WebGL, magnetic control, custom cursor, scroll-jacking과 glass surface는 가져오지 않는다.
- 구현 중 CSS만으로 acceptance를 충족하지 못할 때에만 작은 client island와 신규 dependency 없는 `IntersectionObserver`를 대안으로 검토하고, 채택 시 `decisions.md`를 갱신한다.

---

## 파일 구조

```
src/
└── _pages/home/ui/
    ├── landing-page.tsx                 # 전체 server composition과 인증별 CTA
    ├── landing-hero.tsx                 # 중앙형 hero copy/action
    ├── landing-voice-preview.tsx        # waveform, glow와 실제 profile Link
    ├── landing-product-story.tsx        # 3단계 semantic scroll narrative
    ├── landing-trust.tsx                # 실제 측정값/추천 이유/기록 근거
    ├── landing-hero.module.css           # waveform/ripple/glow/entry/view motion
    └── landing-page.stories.tsx          # 상태·접근성·회귀 검증

docs/
├── designs/product-ui-redesign.md        # 최종 landing visual 계약 동기화
├── designs/design-system.md              # 새 motion primitive가 공통 규칙을 바꿀 때만 갱신
└── features/web/F022-xai-inspired-landing-motion/
    ├── spec.md
    ├── plan.md
    ├── tasks.md
    └── decisions.md
```

파일 분리는 구현 중 각 섹션의 응집도와 테스트 가독성을 기준으로 조정할 수 있다. 단순 markup이 짧으면 `landing-page.tsx`에 유지하고, 별도 파일은 독립적인 visual/semantic 책임이 있을 때만 만든다.

---

## 테스트 전략

- **정적/타입 검증**: `pnpm exec tsc --noEmit`, `pnpm run lint`, `pnpm run test:architecture-boundaries`
- **Storybook browser 테스트**:
  - signed-out CTA가 `/login?callbackURL=%2Fprofile`을 유지하는지 확인한다.
  - signed-in CTA가 `/profile`을 유지하고 Admin/UserMenu가 회귀하지 않는지 확인한다.
  - hero의 단일 `h1`, primary flow Link, 3단계 heading과 footer landmark를 확인한다.
  - crystal/prism test id, 가짜 percentage/진행률과 중복 primary action이 없음을 확인한다.
  - mobile viewport에서 핵심 순서와 horizontal overflow가 없는지 확인한다.
  - reduced-motion emulation에서 핵심 콘텐츠/action이 보이고 animation이 비활성화되는지 확인한다.
- **접근성 검증**: Storybook a11y 결과와 keyboard tab 순서, focus-visible, heading/landmark 구조, accessible name을 확인한다.
- **시각 검증**:
  - desktop hero와 첫 제품 preview
  - desktop scroll story의 세 단계
  - mobile 첫 viewport와 stacked story
  - reduced-motion 정적 상태
  - light/dark token 대비가 필요한 경우 기존 theme 범위에서 확인
- **성능 검증**: production build 성공, 랜딩에 신규 WebGL/GSAP/animation runtime이 포함되지 않는지 dependency/diff로 확인하고, animation으로 layout shift나 지속적인 offscreen 작업이 없는지 browser에서 확인한다.
- **회귀 검증**: `pnpm run build`를 최종 gate로 실행하고 기존 header/footer 및 landing Storybook interaction을 통과시킨다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
