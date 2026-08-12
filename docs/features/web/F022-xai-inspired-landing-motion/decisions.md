# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D022: xai-inspired-landing-motion 결정 (2026-08-12)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: 랜딩 motion 경계와 외부 레퍼런스 적용 방식 (2026-08-12)

- **Context**: 중앙형 Hero와 제품 narrative를 강화하면서 Aceternity UI와 React Bits의 시각 패턴을 Copy Singer 랜딩에 적용해야 한다.
- **Constraints**: 기존 랜딩은 Server Component이며 공통 Header/Footer, 인증별 CTA, neutral semantic token, reduced-motion과 데이터 정직성 계약을 유지해야 한다. 프로젝트에는 motion, GSAP, OGL runtime이 없다.
- **Options**: 외부 animation runtime과 demo component를 직접 도입 / CSS와 semantic markup으로 패턴 재구현 / 랜딩 전체를 client component로 전환
- **Decision**: CSS와 semantic Server Component markup으로 중앙형 Hero, preview와 motion pattern을 재구현하고, CSS만으로 acceptance를 충족하지 못할 때에만 작은 client island를 별도 검토한다.
- **Rationale**: 초기 HTML과 CTA를 즉시 제공하고 client bundle과 hydration 범위를 늘리지 않으면서 progressive enhancement 및 reduced-motion fallback을 가장 명확하게 보장한다.
- **Trace**:
  - **DOING 시작 시점**: 현재 waveform/ripple CSS와 정적 랜딩 구조만으로 Hero의 semantic 재구성과 preview 기반을 만들 수 있다고 판단했다. 외부 레퍼런스는 레이아웃과 motion timing의 근거로만 사용한다.
  - **DONE 전 확정 시점**: `LandingHero`를 Server Component로 분리하고 기존 CSS waveform을 재사용해 중앙형 headline, 실제 CTA와 semantic preview를 구성했다. 별도 client boundary 없이 Storybook signed-out/in 회귀가 통과했다.
  - **머지 후 확인**: local integration 이후 최종 확인 예정
- **Evidence**:
  - **Commit**: `654fd3a` (`feat(F022-xai-inspired-landing-motion): 중앙형 랜딩 구조와 제품 preview 재구성`)
  - **PR**: local workflow이므로 원격 PR 없음
  - **Test/Log**: `pnpm run test:storybook --run src/_pages/home/ui/landing-page.stories.tsx` 통과 (2/2)
- **Consequences**: Landing markup이 Hero와 product story 책임으로 분리되고 외부 animation runtime 없이 유지된다.

## D002: CSS progressive enhancement motion (2026-08-12)

- **Context**: Hero와 후속 section에 Aceternity/React Bits 계열의 glow·fade·reveal 감각을 적용해야 한다.
- **Constraints**: 기본 콘텐츠는 항상 보여야 하고 reduced-motion, CSS animation 미지원, Server Component와 초기 bundle 기준을 지켜야 한다.
- **Options**: motion 또는 GSAP runtime 도입; IntersectionObserver client island; CSS keyframe과 view timeline progressive enhancement
- **Decision**: 정적 dotted glow, CSS waveform/ripple, 1회 entry와 @supports 안의 view timeline reveal을 사용한다.
- **Rationale**: 새 runtime과 hydration 없이 기본 HTML을 visible 상태로 유지하고, 지원 환경에서만 장식 motion을 더할 수 있다.
- **Trace**:
  - **At DOING start**: CSS만으로 motion을 구성하되 기본 opacity와 문서 흐름은 visible 상태로 유지하는 가설로 시작했다.
  - **Before DONE**: entry 시작 opacity를 0이 아닌 값으로 보정해 첫 animation frame에서도 preview가 접근성 검사에서 visible하도록 했고, Storybook 회귀를 재통과했다.
  - **Post-merge check**: local integration 이후 최종 확인 예정
- **Evidence**:
  - **Commit**: `817aa52` (`feat(F022-xai-inspired-landing-motion): waveform glow와 reveal motion 구현`)
  - **Test/Log**: pnpm run test:storybook --run src/_pages/home/ui/landing-page.stories.tsx 통과 (2/2)
- **Consequences**: 지원하지 않는 browser에서는 section reveal이 생략되지만 정보와 action은 동일하게 유지된다.

## D003: 단일 DOM 기반 반응형 scroll story (2026-08-12)

- **Context**: Desktop에서 제품 narrative를 강화하면서 mobile과 animation 미지원 환경에서 같은 내용을 유지해야 한다.
- **Constraints**: Scroll-jacking과 horizontal carousel은 금지하며 320px부터 자연스러운 문서 흐름과 heading 순서를 보장해야 한다.
- **Options**: Desktop/mobile 별도 markup; JavaScript active-step state; 단일 semantic list와 CSS sticky/reveal
- **Decision**: 하나의 ordered list를 사용하고 desktop에서만 설명 header를 sticky로 만들며 mobile에서는 일반 stacked layout으로 해제한다.
- **Rationale**: 중복 콘텐츠와 client state 없이 DOM 순서, 접근성, mobile fallback과 제품 단계의 정직성을 함께 유지한다.
- **Trace**:
  - **At DOING start**: Desktop와 mobile markup을 분기하지 않고 ordered list의 문서 순서를 그대로 유지하는 구조로 시작했다.
  - **Before DONE**: 세 단계 preview를 비상호작용 presentation으로 구성하고, desktop에서만 sticky header를 활성화했다. TypeScript와 Storybook 회귀가 통과했다.
  - **Post-merge check**: local integration 이후 최종 확인 예정
- **Evidence**:
  - **Commit**: `054347a` (`feat(F022-xai-inspired-landing-motion): 3단계 scroll story 구현`)
  - **Test/Log**: pnpm run typecheck 통과
  - **Test/Log**: pnpm run test:storybook --run src/_pages/home/ui/landing-page.stories.tsx 통과 (2/2)
- **Consequences**: Desktop active step을 별도 상태로 강조하지 않지만 세 패널의 위치와 순서가 narrative를 전달한다.

## D004: 최종 시각·성능 검증 결과 (2026-08-12)

- **Context**: 정적 테스트만으로는 sticky, responsive layout, CSS animation fallback과 실제 화면 품질을 확정할 수 없다.
- **Constraints**: 사용자 소유 카탈로그 변경은 검증과 commit 범위에서 제외하고, UI 스크린샷은 로컬 임시 evidence로 유지한다.
- **Options**: Storybook 테스트만 사용 / 실제 Next.js route와 reduced-motion Storybook을 함께 검증
- **Decision**: 실제 `/` route를 desktop 1440×1000과 mobile 390×844로 검증하고, reduced-motion Storybook에서 computed animation 수를 확인한다.
- **Rationale**: 실제 route의 공통 Header/Footer, responsive sticky fallback, overflow와 console 상태를 함께 확인할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 기존 로컬 Next.js 서버와 임시 Storybook 서버를 분리해 검증했다.
  - **DONE 전 확정 시점**: desktop/mobile overflow 없음, desktop sticky/mobile static, reduced-motion animation 0개와 console warning/error 0개를 확인했다.
  - **머지 후 확인**: local integration 이후 최종 확인 예정
- **Evidence**:
  - **Screenshot**: `/tmp/lee-spec-kit/pr-assets/f022-landing-desktop-hero.png`
  - **Screenshot**: `/tmp/lee-spec-kit/pr-assets/f022-landing-desktop-story.png`
  - **Screenshot**: `/tmp/lee-spec-kit/pr-assets/f022-landing-mobile.png`
  - **Screenshot**: `/tmp/lee-spec-kit/pr-assets/f022-landing-mobile-story.png`
  - **Screenshot**: `/tmp/lee-spec-kit/pr-assets/f022-landing-reduced-motion.png`
  - **Test/Log**: `pnpm run build` 통과 — Next.js production build와 29개 static page 생성
- **Consequences**: 신규 animation runtime 또는 WebGL dependency 없이 F022의 시각·성능 acceptance를 충족했다.

## D005: 사용자 변경 요청에 따른 실제 source component 도입 (2026-08-12)

- **Context**: 최초 구현은 x.ai의 중앙 hero만 얕게 반영하고 CSS로 waveform·dotted glow·ripple과 sticky card를 재구현해, 사용자가 요구한 x.ai의 제품 모자이크·editorial rhythm과 Aceternity/React Bits의 미려한 효과를 충족하지 못했다.
- **Constraints**: 인증별 CTA와 공통 shell, 데이터 정직성, mobile 문서 순서, reduced-motion과 WebGL fallback을 유지하며 사용자가 지정한 Orb 설정을 랜딩 및 실제 분석 진행에 공통 적용해야 한다.
- **Options**: 기존 CSS 효과를 조정 / x.ai layout만 재구성 / Aceternity와 React Bits source component를 작은 client island로 실제 통합
- **Decision**: 기존 waveform·dotted·ripple·dashed ring을 제거하고 Aceternity Bento Grid·Glowing Effect·restrained scroll reveal과 React Bits Orb·Animated Content를 source 수준에서 통합한다. Orb는 `hue=294`, `rotateOnHover=false`, `hoverIntensity=0`으로 고정하며 `ogl`을 유일한 필수 신규 runtime dependency로 허용한다.
- **Rationale**: 사용자가 명시한 레퍼런스의 시각 품질을 실제 동작 단위로 가져오면서 Server Component composition과 제품 고유 콘텐츠를 유지할 수 있다. Orb를 공유하면 랜딩 preview와 분석 진행 화면의 visual language도 일치한다.
- **Trace**:
  - **DOING 시작 시점**: 제공된 1440px x.ai 캡처, 현 landing code, React Bits 공식 Orb source와 Next.js 16 client boundary/lazy-loading guide를 비교했다. 서브에이전트의 읽기 전용 gap review도 bento·metric band·editorial rail 누락과 `ProcessHero` 교체를 동일하게 지적했다.
  - **DONE 전 확정 시점**: 구현 및 시각 검증 후 보강 예정
- **Evidence**:
  - **Reference**: `https://reactbits.dev/backgrounds/orb?hue=294&rotateOnHover=false&hoverIntensity=0`
  - **Source**: `https://github.com/DavidHDev/react-bits/blob/main/src/ts-tailwind/Backgrounds/Orb/Orb.tsx`
  - **Reference**: `https://ui.aceternity.com/bento-grid`
- **Consequences**: 기존 no-runtime/WebGL 제외 결정(D001/D002)은 F022 변경 요청 범위에서 폐기되며 Orb island의 lifecycle·fallback·라이선스 검증이 새 completion gate가 된다.
