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
| Styling | Tailwind CSS 4 + CSS Module | 기존 semantic token을 재사용하고 bento/editorial layout과 정적 fallback을 route 가까이에 캡슐화한다. |
| Motion | `motion/react` + Aceternity/React Bits source components | 공식 Gradient Text의 frame-driven yoyo와 Hero/Reveal viewport motion을 작은 client island로 통합한다. React Bits Orb는 `ogl` 기반 공통 visual로 유지하고 미지원 환경에서는 콘텐츠를 숨기지 않는다. |
| Orb runtime | `ogl` + React client island | 공식 React Bits Orb shader를 필요한 범위에만 소유하고 DPR·RAF·visibility·WebGL cleanup을 보강한다. |
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
      ├─ LandingHero (hero copy + CTA)
      ├─ LandingProductBento
      │   ├─ voice scan / profile / song match surfaces
      │   ├─ AI mixing surface
      │   └─ Voice Orb client island
      ├─ LandingEditorialStory
      ├─ LandingMetrics + VoiceNotes
      ├─ 2-up final CTA
      └─ ProductFooter

ProcessHero
  └─ active tone: shared VoiceSignalCore(processing)

VocalProfileRecorder
  └─ VoiceSignalCore
      ├─ idle/requesting/stopping: low-speed VoiceOrb
      └─ recording: audio-reactive VoiceOrb + microphone RMS/peak CSS variables
          └─ Orb 아래 ElevenLabs Waveform 기반 brand-gradient scrolling canvas
```

### Motion 계층

1. **Hero entry**: headline은 접근 가능한 원문과 `aria-hidden` visual word span으로 분리해 Motion stagger를 적용하고, 설명과 action은 opacity 0인 하나의 block이 각 delay에 맞춰 아래에서 위로 등장한다. `내 목소리`는 공식 React Bits Gradient Text source의 하나의 연속 gradient field와 `animationSpeed=1.5`, yoyo 왕복을 사용한다. bento는 카드별 stagger 없이 하나의 wrapper가 opacity 0에서 1로 천천히 한 번 등장한다.
2. **Bento interaction**: Aceternity Bento Grid와 Glowing Effect source를 Copy Singer token으로 조정하고 pointer hover와 keyboard focus에 같은 경계 강조를 제공한다.
3. **Voice Orb**: 분석 bento card와 실제 active `ProcessHero`에 공통 Orb를 사용한다. `hue=294`, `rotateOnHover=false`, `hoverIntensity=0`을 고정하고 viewport/visibility/reduced-motion에 따라 RAF를 정지한다.
   Profile recorder는 이를 감싼 `VoiceSignalCore`를 사용한다. idle/requesting은 processing보다 느린 grayscale shader를 유지하고 recording부터 color로 전환하되 filter transition으로 상태 경계를 부드럽게 잇는다. Recorder visual region은 Orb 위치를 고정한 채 recording 진입 시 height transition으로 waveform slot을 열어 아래 copy/control을 자연스럽게 민다. Waveform canvas는 지연된 opacity entrance를 사용하고 reduced-motion에서는 즉시 최종 layout을 표시한다. Recording은 하나의 MediaStream analyser에서 RMS·peak를 45ms 간격으로 smoothing해 `--signal-level` CSS 변수와 scrolling history bar를 함께 갱신한다. Orb 아래 canvas는 ElevenLabs UI `ScrollingWaveform`의 x-position animation·rounded bar·edge fade pattern을 사용하고 브랜드 linear gradient로 채운다. Core surface와 Orb alpha 밖은 transparent·borderless이며, reduced-motion·WebGL 실패에서는 정적 poster/파형으로 대체한다. React state는 고주파 신호에 사용하지 않으며 unmount/recording 종료에서 RAF, ResizeObserver, source, analyser와 AudioContext를 정리한다.
4. **Editorial story**: desktop에서 2열 제품 demo를 사용하고 mobile에서는 sticky 없이 순서가 명확한 stacked layout을 사용한다. 하단 reveal은 `RevealContent`의 section·group·stagger·line·fade variant를 Motion viewport·selector animation과 공통 easing으로 묶고, heading→단계, hairline→정적 metric, heading→Voice Notes card, final CTA 단일 fade 순서를 제어한다.
5. **Sample Vocal Range Profile**: 실제 `VocalRangeProfile`에서 range chart를 `VocalRangeChart` client island로 분리하고 실제 분석 결과와 랜딩이 같은 Recharts 축·range·median 규칙을 사용한다. 랜딩은 저장·API 호출 없는 직렬화 가능한 고정 profile만 전달하고 별도 sample header 없이 chart만 표시하며 metric band는 정적으로 유지한다.
6. **Reduced motion/fallback**: word/bento reveal을 제거하고 Orb는 정지 또는 CSS poster fallback으로 전환한다. Vocal Range chart와 모든 텍스트/action은 animation 없이 그대로 남긴다.
7. **Border와 status hierarchy**: Page/section의 장식 hairline은 whitespace·quiet fill로 대체하고, form control·table/list row·focus·overlay 경계는 보존한다. Card형 status/alert는 shared `StatusNotice`에서 icon·copy 중앙 정렬과 tone을 소유한다.

### 데이터와 콘텐츠 정직성

- 랜딩 preview는 API를 호출하거나 microphone 권한을 요청하지 않는다.
- 시각화용 값은 상태/정확도/진행률로 읽히지 않는 장식 waveform 높이에만 사용한다.
- 음역·안정성, 추천 키·이유와 선택형 AI 믹싱 등 PRD에 존재하는 개념만 표시한다.
- preview 내부 action은 가짜 control로 만들지 않고 실제 `/profile` 진입 Link 또는 비상호작용 presentation으로 명확히 구분한다.

### 제품 화면 정합성 확장

- `shared/ui/product-page-intro`는 Server Component로 유지하고 `index`, `detail`, `task` variant에서 eyebrow·title·description·aside의 typography와 spacing만 소유한다. Route data fetching이나 interaction은 포함하지 않는다.
- Login은 별도 full-width hairline shell을 제거하고 공통 `ProductHeader`/`ProductFooter`를 조합하되, 인증 form은 작은 단일 client boundary로 유지한다.
- Account와 Admin은 page intro를 재사용하고 desktop composition만 정리한다. Table/list/form border는 유지하고 요약 영역의 장식 card/hairline만 quiet fill과 whitespace로 대체한다.
- Vocal profile artwork는 기존 hash seed를 유지하되 허용 hue family를 brand violet·blue·pink token 범위로 매핑한다.
- Creation stepper는 semantic `ol`, `aria-current`, complete/current/upcoming state를 유지하면서 horizontal progress line과 step marker로 표현한다.
- Storybook은 Login, Account, Admin, Recommendation desktop/mobile과 Creation Funnel을 검증하고 변경된 accessible action name을 실제 UI 계약과 동기화한다.

### 외부 레퍼런스 적용 정책

- x.ai에서는 절제된 중앙형 hero, 넓은 section whitespace, 비대칭 product mosaic, 2열 editorial demo, hairline metric band, 4-up editorial rail과 2-up CTA의 정보 구조를 참고한다.
- Aceternity UI의 Bento Grid·Glowing Effect와 restrained scroll reveal은 source component로 가져와 프로젝트 semantic token과 FSD 경계에 맞게 소유한다.
- React Bits의 Orb와 Animated Content를 source component로 가져와 client boundary를 해당 visual/reveal로 제한한다.
- 외부 demo의 global gradient, magnetic control, custom cursor, scroll-jacking과 glass surface는 가져오지 않는다. WebGL은 Orb에만 허용한다.
- React Bits 라이선스 고지를 보존하고 `ogl`과 `motion`을 runtime dependency로 사용한다. Motion은 공식 Gradient Text, Hero entry와 공통 RevealContent에만 적용하고 Orb/audio RAF와 단순 hover CSS에는 확산하지 않는다.

---

## 파일 구조

```
src/
└── _pages/home/ui/
    ├── landing-page.tsx                 # 전체 server composition과 인증별 CTA
    ├── landing-hero.tsx                 # 중앙형 hero copy/action
    ├── landing-product-story.tsx        # bento + editorial product narrative
    ├── landing-hero.module.css           # landing layout와 static fallback
    └── landing-page.stories.tsx          # 상태·접근성·회귀 검증

src/shared/ui/motion/
├── voice-orb.tsx                         # React Bits Orb 기반 공통 client island
├── animated-content.tsx                  # restrained one-shot reveal
└── glowing-card.tsx                      # Aceternity 경계 효과

src/entities/vocal-profile/ui/
└── vocal-range-chart.tsx                 # 실제 결과와 랜딩이 공유하는 range chart client island

public/
└── images/landing/voice-notes/              # 사용자 제공 Aurora WebP 4장
└── images/landing/album-covers/             # Pixabay Content License 기반 AI 믹싱 장식 cover 4장

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
  - hero의 단일 `h1`, primary flow Link, bento 3단계 heading과 footer landmark를 확인한다.
  - crystal/prism test id, 가짜 percentage/진행률과 중복 primary action이 없음을 확인한다.
  - mobile viewport에서 핵심 순서와 horizontal overflow가 없는지 확인한다.
  - reduced-motion emulation에서 핵심 콘텐츠/action이 보이고 animation이 비활성화되는지 확인한다.
- **접근성 검증**: Storybook a11y 결과와 keyboard tab 순서, focus-visible, heading/landmark 구조, accessible name을 확인한다.
- **시각 검증**:
  - desktop hero와 첫 제품 preview
  - desktop bento와 editorial demo의 세 단계
  - mobile 첫 viewport와 stacked story
  - reduced-motion 정적 상태
  - light/dark token 대비가 필요한 경우 기존 theme 범위에서 확인
  - Voice Notes 네 이미지의 desktop/mobile object-cover crop과 밝음→어두움 순서를 확인
  - AI 믹싱 album-cover stack의 layer order, crop, hover/focus fan-out과 reduced-motion 정적 상태를 확인
  - Hero word stagger 순서, bento 단일 fade-in과 추천 키의 deterministic cycle을 확인
  - metric `5초+`, `60초`, `3단계`가 animation 없이 정적으로 표시되는지 확인
  - 실제 결과와 landing sample의 관찰 음역·실용 음역·중앙음 chart contract를 확인
- **성능 검증**: production build 성공, Orb client island 밖으로 `ogl`이 확산되지 않는지 dependency/diff로 확인하고, DPR 최대 1.5, offscreen/background RAF 정지, context cleanup, layout shift와 console/WebGL 오류가 없는지 browser에서 확인한다.
- **회귀 검증**: `pnpm run build`를 최종 gate로 실행하고 기존 header/footer 및 landing Storybook interaction을 통과시킨다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
