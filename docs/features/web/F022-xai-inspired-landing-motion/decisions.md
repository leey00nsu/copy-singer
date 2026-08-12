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
  - **T06 완료 시점**: Aceternity 공식 registry의 `BentoGrid`/`BentoGridItem` 구조를 semantic token과 focus/hover 상태에 맞게 도입했다. 거대한 hero, 단일 dashboard, waveform·dotted·ripple과 반복 sticky panel을 제거하고 3+2 제품 mosaic로 교체했으며 Storybook 4/4, TypeScript와 architecture boundary를 통과했다.
  - **T07 완료 시점**: React Bits 공식 Orb shader와 `ogl@1.0.11`을 공통 `VoiceOrb` client island로 통합했다. DPR을 1.5로 제한하고 ResizeObserver, IntersectionObserver, visibilitychange, context-lost 및 unmount cleanup을 보강했으며 reduced-motion/WebGL 실패 시 정적 poster가 남는다. Landing bento와 active ProcessHero에 같은 exact props를 적용하고 Storybook 8/8을 통과했다.
  - **T08 완료 시점**: 기존의 작은 trust band와 pastel gradient CTA를 2열 editorial product demo, 계약상 참인 `5초+`·`60초`·`3단계` metric band, 비상호작용 Voice Notes 4열과 profile/library 2-up CTA로 교체했다. Reveal Content는 offscreen 내용을 숨기지 않도록 초기 opacity 0.94와 8px 이동으로 제한했고 1266px full-page 캡처에서 x.ai형 macro rhythm과 모든 section 노출을 확인했다.
  - **DONE 전 확정 시점**: Landing/ProcessHero/Orb fallback Storybook 10/10, TypeScript, ESLint, architecture boundary와 Next.js production build를 통과했다. 실제 `/` route full-page 검토에서 horizontal overflow 0, 단일 h1, Orb DPR 1.5와 모든 macro section 노출을 확인했다.
- **Evidence**:
  - **Reference**: `https://reactbits.dev/backgrounds/orb?hue=294&rotateOnHover=false&hoverIntensity=0`
  - **Source**: `https://github.com/DavidHDev/react-bits/blob/main/src/ts-tailwind/Backgrounds/Orb/Orb.tsx`
  - **Reference**: `https://ui.aceternity.com/bento-grid`
  - **Notice**: `THIRD_PARTY_NOTICES.md`
  - **Test/Log**: `pnpm run test:storybook --run src/_pages/home/ui/landing-page.stories.tsx src/widgets/creation-funnel/ui/creation-funnel.stories.tsx src/shared/ui/voice-orb/voice-orb.stories.tsx` 통과 (10/10)
  - **Test/Log**: `pnpm run typecheck`, `pnpm run lint`, `pnpm run test:architecture-boundaries`, `pnpm run build` 통과
- **Consequences**: 기존 no-runtime/WebGL 제외 결정(D001/D002)은 F022 변경 요청 범위에서 폐기됐다. WebGL은 공통 Orb island에만 포함되고 나머지 landing content는 Server Component 또는 작은 reveal island로 유지된다.

## D006: Voice Notes Grainient canvas 공유 (2026-08-12)

- **Context**: 사용자가 Bento의 작은 우측 설명과 trailing caption 제거를 요청하고, Voice Notes 카드 배경에 React Bits Grainient 적용을 제안했다.
- **Constraints**: 네 카드에 각각 WebGL renderer를 만들지 않고 기존 `ogl` runtime, reduced-motion/WebGL fallback, offscreen 정지와 낮은 정보 밀도를 유지해야 한다.
- **Options**: 카드별 Grainient canvas 4개 / 카드군 전체에 Grainient canvas 1개 / CSS gradient로만 유사 구현
- **Decision**: Voice Notes grid 배경에 Grainient renderer 하나만 배치하고 각 카드 visual을 반투명 surface로 구성해 같은 field의 서로 다른 영역처럼 보이게 한다. Bento의 optional 우측 설명 surface와 trailing caption은 제거한다.
- **Rationale**: 실제 Grainient의 grain·warp motion을 사용하면서 WebGL context와 RAF를 하나로 제한하고 네 카드가 하나의 visual family로 읽히게 한다.
- **Trace**:
  - **DOING 시작 시점**: React Bits 공식 Grainient source의 WebGL2 shader, `ogl`, offscreen/visibility pause 구조와 기본 parameter를 확인했다. Copy Singer에는 느린 timeSpeed와 violet·blue·pale palette를 적용한다.
  - **DONE 전 확정 시점**: `GrainientBackground` client island를 추가하고 DPR 1.25, ResizeObserver, IntersectionObserver, visibility pause와 WebGL cleanup을 적용했다. 네 카드는 하나의 canvas 위에 대비가 확보된 translucent surface로 구성했다. 실제 route에서 Grainient canvas 1개, 전체 canvas 2개, 제거 대상 문구 0개와 overflow 0을 확인했다.
- **Evidence**:
  - **Reference**: `https://www.reactbits.dev/backgrounds/grainient`
  - **Source**: `https://github.com/DavidHDev/react-bits/blob/main/src/ts-tailwind/Backgrounds/Grainient/Grainient.tsx`
- **Test/Log**: landing·Grainient·Orb Storybook 8/8, TypeScript, ESLint, architecture boundary, Next.js production build 통과

## D007: Voice Notes Tailwind grain surface와 Orb 투명 배경 (2026-08-12)

- **Context**: 사용자가 Voice Notes의 shared Grainient panel을 이전 독립 카드 구조로 되돌리고 배경만 Grainient 느낌의 Tailwind surface로 만들며, VOICE SIGNAL과 Orb Storybook의 회색 반원·사각 배경을 제거하도록 요청했다.
- **Constraints**: 기존 카드 정보 구조와 Orb exact props를 유지하고 Voice Notes의 추가 WebGL runtime을 제거해야 한다.
- **Options**: shared Grainient canvas 유지 / 카드별 WebGL / Tailwind 정적 multi-gradient와 micro-grain overlay
- **Decision**: D006의 shared Grainient canvas 결정을 폐기하고, 이전 4개 독립 카드 markup에 Tailwind multi-gradient와 정적 micro-grain overlay만 적용한다. Orb shader background는 검정 alpha 기준으로 바꾸고 container/decorator surface는 `background` token으로 통일한다.
- **Rationale**: 사용자가 선호한 카드 리듬을 복원하면서 추가 canvas 없이 Grainient의 유기적 색 분포와 질감만 가볍게 유지하고, Orb 주변의 light-background shader artifact를 제거한다.
- **Trace**:
  - **DOING 시작 시점**: 현 Voice Notes shared canvas, Orb shader의 `backgroundColor=#fafafa`, Landing `bg-[#fafafa]`와 Storybook decorator `bg-[#fafafa]`가 회색 surface를 만드는 경로를 확인했다.
  - **DONE 전 확정 시점**: Voice Notes를 독립 카드 markup으로 복원하고 네 Tailwind multi-gradient에 3px micro-grain overlay를 추가했다. 실제 회색 반원은 Orb fallback poster가 rectangular container에서 타원으로 늘어나 canvas 뒤에 남은 것이 원인이어서 fallback을 정원으로 고치고 `data-orb-ready`에서 숨겼다. Storybook/실제 route에서 root transparent, fallback opacity 0, Grainient canvas 0, Orb canvas 1과 overflow 0을 확인했다.
- **Evidence**:
  - **Reference**: `https://www.reactbits.dev/backgrounds/grainient`
  - **Test/Log**: Landing·Orb·ProcessHero Storybook 10/10, TypeScript, ESLint, architecture boundary, Next.js production build 통과

## D008: Voice Notes 사용자 제공 Aurora 이미지 적용 (2026-08-12)

- **Context**: 사용자가 직접 생성한 Aurora gradient WebP 4장을 Voice Notes 카드 visual에 적용하도록 요청했다.
- **Constraints**: 기존 독립 카드의 label·title·description 구조, 반응형 crop과 장식 이미지 접근성 계약을 유지하고 사용자 소유 원본 파일은 수정하지 않는다.
- **Options**: Tailwind 생성 gradient 유지 / 한 이미지를 네 카드에 반복 / 네 WebP를 각 카드 의미에 맞게 개별 배치
- **Decision**: 사용자 제공 원본을 landing 전용 public 자산으로 복사하고 밝은 ice, cyan, blue-violet, dark neutral 순으로 네 Voice Notes visual에 각각 배치한다.
- **Rationale**: 각 단계의 성격을 구분하면서도 생성된 질감을 그대로 보존하고, x.ai형 editorial rail에 필요한 밝고 어두운 visual 대비를 만든다.
- **Trace**:
  - **DOING 시작 전**: 제공된 네 이미지의 색감과 기존 Voice Notes 순서를 비교해 녹음→음역→추천→믹싱의 점진적 tonal flow를 정했다.
  - **DONE 전 확정 시점**: 원본 1920×1080 WebP를 의미 기반 파일명으로 복사하고 `next/image`의 `fill`, 반응형 `sizes`, `object-cover`로 연결했다. 기존 중복 제목 overlay와 합성 grain/shimmer는 제거했다. 실제 1440×1000과 390×844 화면에서 네 이미지의 crop, 순서, overflow 0과 console warning/error 0을 확인했다.
- **Evidence**:
  - **Source assets**: 사용자 제공 `aurora-gradient-*.webp` 4장
  - **Test/Log**: landing Storybook 4/4, TypeScript와 Biome 통과
- **Consequences**: D007의 Tailwind 생성 gradient 결정은 카드 구조와 Orb 수정에 대해서만 유지되고 Voice Notes visual 배경 선택은 이 결정으로 대체된다. 이미지 4장은 viewport 밖에서 lazy-load되며 별도 canvas나 animation runtime을 추가하지 않는다.

## D009: AI 믹싱 Pixabay Album Cover Stack (2026-08-12)

- **Context**: 사용자가 `선택한 추천곡만 AI 믹싱` 왼쪽의 검은 음표 아이콘 대신 첨부 gallery prompt를 참고한 album-cover stack과 Pixabay 무료 이미지 4장을 요청했다.
- **Constraints**: LandingProductStory의 Server Component 경계, 작은 bento 높이, reduced-motion, 데이터 정직성, Pixabay Content License와 출처 추적을 유지한다. 프로젝트에는 Framer Motion이 없다.
- **Options**: 첨부 prompt를 그대로 복사하고 Framer Motion 추가 / CSS·Tailwind 정적 stack과 hover fan-out / 한 장의 cover만 표시
- **Decision**: 식별 가능한 인물·로고가 없는 Pixabay 이미지 4장을 로컬 자산으로 저장하고, absolute layer·작은 rotation·shadow와 group hover/focus-within transition으로 stack을 구현한다. drag, random rotation과 Framer Motion은 도입하지 않는다.
- **Rationale**: 첨부 예시의 겹침과 깊이는 살리면서 번들·hydration·임의성·모바일 drag 문제를 추가하지 않고 기존 bento와 motion 계약에 맞출 수 있다.
- **Trace**:
  - **DOING 시작 전**: Pixabay 공식 이미지 페이지와 Content License Summary를 확인하고 stars mountain, sunset sea, neon city, colorful abstract 네 장을 선택했다. 최초 vinyl 후보는 앨범 artwork와 인물이 보여 제외했다.
  - **DONE 전 확정 시점**: 네 JPG를 landing 전용 local asset으로 저장하고 `next/image`, absolute layer, 작은 회전·offset·shadow와 bento hover fan-out으로 구현했다. Storybook 4/4와 TypeScript를 통과했으며 실제 desktop/mobile에서 cover 4장 로드, overflow 0과 console warning/error 0을 확인했다.
- **Evidence**:
  - **License**: `https://pixabay.com/service/license-summary/`
  - **Sources**: Pixabay `5442598`, `6887775`, `3880335`, `4001306`
  - **Notice**: `THIRD_PARTY_NOTICES.md`
- **Consequences**: AI 믹싱 bento는 추가 client runtime 없이 더 강한 시각적 focal point를 얻는다. 네 이미지는 장식으로 숨기고 실제 추천 데이터와 분리하며, 출처와 라이선스는 저장소에서 추적한다.

## D010: 단어 reveal과 dependency-free Count Up island (2026-08-12)

- **Context**: 사용자가 Hero 텍스트의 단어별 순차 등장, bento 전체 fade-in, Recommended key와 metric band의 React Bits Count Up 애니메이션을 요청했다.
- **Constraints**: LandingPage와 정적 문구의 Server Component 경계를 유지하고, screen reader 중복 낭독·layout shift·무한 background animation과 `motion/react` 신규 의존성을 피해야 한다.
- **Options**: React Bits 원본과 `motion/react` 추가 / CSS keyframe과 requestAnimationFrame 기반 작은 client island / 모든 숫자를 CSS counter로만 모사
- **Decision**: Hero heading은 하나의 `aria-label`과 `aria-hidden` visual word span으로 구성하고 설명은 공백을 보존한 word span으로 구성해 CSS stagger를 적용한다. Bento는 `RevealContent`의 configurable opacity·duration을 이용해 전체 wrapper 하나가 1.4초 동안 fade-in한다. React Bits Count Up의 viewport-triggered transition은 `requestAnimationFrame`·IntersectionObserver 기반 공통 `CountUpText` island로 재구성하고 추천 키는 `−2 → 1 → −1 → 0` 순서로 순환한다.
- **Rationale**: 정적 Server Component의 문장·레이아웃과 screen reader용 전체 heading을 유지하면서 client JavaScript는 숫자 island에만 제한할 수 있다. deterministic cycle은 random 값보다 visual regression과 사용자 이해가 안정적이며 `motion/react` 번들 추가가 필요 없다.
- **Trace**:
  - **DOING 시작 시점**: React Bits 공식 Count Up source가 `useInView`, motion value와 spring을 사용해 viewport 진입 시 목표 숫자로 이동하는 구조임을 확인했다. 현재 프로젝트에는 `motion/react`가 없으므로 같은 사용자 경험을 requestAnimationFrame·IntersectionObserver와 deterministic cycle로 재구성하는 방향을 검토한다.
  - **DONE 전 확정 시점**: Hero 단어 index를 연속 배정하고 bento 전체의 초기 opacity 0·duration 1400ms를 Storybook contract로 고정했다. CountUp은 reduced-motion/API 미지원 시 SSR 최종값을 유지하고, viewport 밖·background에서는 RAF와 timer를 정리한다. 실제 브라우저에서 초기 word/bento opacity 0, 완료 opacity 1, 추천 키 `−2 → 1`, metric `1초+·0초·0단계 → 5초+·60초·3단계`와 1440/390 overflow 0을 확인했다.
- **Evidence**:
  - **Reference**: `https://www.reactbits.dev/text-animations/count-up`
  - **Source**: `https://github.com/DavidHDev/react-bits/blob/main/src/ts-tailwind/TextAnimations/CountUp/CountUp.tsx`
- **Test/Log**: landing Storybook 4/4, Biome, TypeScript, ESLint, architecture boundary와 Next.js 16.3 production build 통과
- **Consequences**: D011에서 공통 `CountUpText`와 metric Count Up을 제거했으므로, 이 결정에서 남는 범위는 Hero word reveal과 `RevealContent`의 configurable opacity·거리·duration뿐이다.

## D011: Recommended key의 원본 기준 visualizer와 metric motion 제거 (2026-08-12)

- **Context**: 사용자가 Hero 설명의 단어별 reveal과 metric Count Up을 제거하고, Recommended key 숫자 변화가 원본 대비 어떤 의미인지 waveform 형태의 기준점·delta 색으로 설명하도록 요청했다.
- **Constraints**: 첨부 visual의 단순한 rounded bar rhythm을 참고하되 기존에 제거한 장식 waveform을 재도입하지 않고, 색상만으로 상승·하강을 구분하지 않으며 reduced-motion과 offscreen pause를 유지해야 한다.
- **Options**: 숫자와 색만 유지 / pitch chart 추가 / 원본 중앙 bar와 delta 구간을 결합한 landing 전용 key scale visualizer
- **Decision**: 21개 rounded bar의 중앙을 흰색 원본 0 기준으로 고정하고, delta 한 키당 인접 bar 두 개를 하강은 cyan, 상승은 violet로 표시한다. `Key delta`, `Lower / Original 0 / Higher`와 `원본에서 N키 낮춤/높임` 문구를 같은 landing 전용 client island에서 동기화한다. Metric Count Up과 공통 `CountUpText` public API는 제거하고 세 수치는 정적으로 복원한다.
- **Rationale**: 숫자, 방향축, 위치와 명시 문구를 함께 보여주므로 색각과 관계없이 원본 대비 변화를 이해할 수 있다. Visualizer를 Recommended key에만 한정하면 숫자 animation의 제품 의미가 분명해지고 metric band는 x.ai식 정적인 정보 위계를 되찾는다.
- **Trace**:
  - **DOING 시작 시점**: 사용자 첨부 이미지는 21개의 rounded bar 중 중앙 기준 bar 하나를 진하게 표시한다. 이를 단순 waveform 장식이 아니라 원본 0과 delta 방향을 읽는 scale로 재해석하고, metric은 Server Component 정적 문자열로 복원한다.
  - **DONE 전 확정 시점**: Hero 설명의 word span을 제거해 자식 없는 한 문장 block reveal로 바꾸고, 21-bar key scale을 구현했다. 브라우저에서 `−2`일 때 cyan 하강 bar 4개, `+1`일 때 violet 상승 bar 2개, 원본 bar 1개와 각각의 `낮춤/높임` 접근 가능한 문구가 동기화되는 것을 확인했다. 1440/390 overflow 0, CountUp marker 0을 확인했다.
- **Evidence**:
  - **Reference image**: 사용자 제공 `codex-clipboard-2d7872dd-6db3-4cfa-a304-184fdca97b7a.png`
  - **Count Up source**: `https://github.com/DavidHDev/react-bits/blob/main/src/ts-tailwind/TextAnimations/CountUp/CountUp.tsx`
- **Test/Log**: landing Storybook 4/4, TypeScript, ESLint, architecture boundary, Next.js 16.3 production build 통과
- **Consequences**: 키 변화 visualizer는 landing preview의 설명용이며 실제 분석 데이터가 아니다. Reduced-motion에서는 `−2` 정적 상태를 유지하고, 일반 환경의 순환은 offscreen·background에서 정지한다.

## D012: 각 bar 내부 vertical delta segment와 Hero 완전 숨김 (2026-08-12)

- **Context**: 사용자가 Hero 설명·버튼이 animation 전에도 희미하게 보이는 문제와 Recommended key의 과도한 라벨, 가로 방향 delta 강조가 의도와 다름을 지적했다.
- **Constraints**: 첨부 visual처럼 세로 bar rhythm을 유지하고, 원본 대비 차이는 각 bar 내부에서 수직으로 읽혀야 하며 화면 텍스트는 하단 설명 한 줄로 제한해야 한다.
- **Options**: 기존 가로 delta bar의 라벨만 제거 / 전체 bar 색 변경 / neutral 원본 bar와 수직 delta cap을 같은 column에 겹쳐 표시
- **Decision**: Hero `landing-entry`의 시작 opacity를 0으로 바꾼다. Key visualizer는 21개 column 각각에 neutral base와 delta segment를 겹쳐 렌더링하며, 한 키당 높이 6%를 사용해 하강은 원본 상단 내부 cyan segment, 상승은 원본 위 violet cap으로 표시한다. 중앙 원본 bar는 neutral 강조만 유지하고 visible label은 하단 방향 문구 한 줄로 제한한다.
- **Rationale**: 설명·action의 animation 전 노출을 완전히 제거하고, key 변화가 어느 가로 위치로 이동했다는 오해 없이 모든 세로 bar의 높이 변화로 읽히게 한다. Base와 delta를 별도 segment로 유지하면 원본과 변경분의 관계가 명확하다.
- **Trace**:
  - **DOING 시작 시점**: 현재 `landing-entry`가 opacity 0.24에서 시작해 사전 노출이 발생하고, visualizer는 중앙 기준 좌우 bar 묶음을 색칠해 가로 변화로 읽힌다는 원인을 확인했다.
  - **DONE 전 확정 시점**: 브라우저 즉시 측정에서 Hero 설명·action opacity 0과 translateY 14px, 완료 후 opacity 1을 확인했다. Key `−1`에서 21개 neutral base와 21개 cyan 차감 segment, `+1`에서 21개 violet 증가 segment가 각 bar 상단에 수직으로 배치되며 visible text가 하단 한 줄뿐임을 확인했다. 1440/390 overflow 0을 확인했다.
- **Evidence**:
  - **Reference image**: 사용자 제공 `codex-clipboard-2d7872dd-6db3-4cfa-a304-184fdca97b7a.png`
- **Test/Log**: landing Storybook 4/4, TypeScript, ESLint, architecture boundary, Next.js 16.3 production build 통과
- **Consequences**: 키가 낮아질 때 cyan segment는 원본 높이 안에서 차감된 구간을, 높아질 때 violet segment는 원본 높이 위에 추가된 구간을 나타낸다. 시각 라벨을 줄였지만 `role=img`의 동적 accessible name은 방향과 값을 계속 전달한다.

## D013: Recommended key 대신 실제 Vocal Range Profile chart 재사용 (2026-08-12)

- **Context**: 사용자가 반복 조정한 key delta visualizer 대신 첨부 이미지처럼 실제 보컬 프로필 차트를 가상 데이터로 표시하도록 요청했다.
- **Constraints**: 가상 데이터를 실제 사용자 결과로 오해시키지 않고, 기존 분석 상세 화면과 landing이 서로 다른 chart 규칙을 중복 구현하지 않아야 한다.
- **Options**: 첨부 이미지를 CSS로 별도 모사 / 기존 `VocalRangeProfile` 전체 card 삽입 / range chart만 공통 component로 분리해 재사용
- **Decision**: 기존 Recharts range chart를 entity public component `VocalRangeChart`로 분리하고 실제 `VocalRangeProfile`과 landing sample이 이를 함께 사용한다. Landing은 직렬화 가능한 가상 profile을 전달하고 `Sample profile`과 `가상 데이터`를 동시에 표시하며, 별도 Recommended key visualizer와 남은 Count Up 고지를 제거한다.
- **Rationale**: 실제 분석 화면의 축 범위, 음명 formatting, 전체·실용 음역 bar와 중앙음 reference line을 그대로 재사용해 랜딩 preview와 제품 결과의 시각 언어를 일치시킨다. 가상 데이터 표기를 두 위치에 명시해 실제 사용자 측정값으로 오해할 위험을 낮춘다.
- **Trace**:
  - **DOING 시작 시점**: 실제 제품은 `VocalRangeProfile`에서 `midiAxis`, `rangeChartData`, `midiToNoteName`, median ReferenceLine을 사용한다. Landing이 이를 재사용하면 첨부 이미지의 전체/실용 음역과 중앙음 구성을 제품 계약과 동일하게 표현할 수 있다.
  - **DONE 전 확정 시점**: `VocalRangeChart`를 entity public API로 분리하고 기존 결과 화면과 landing bento를 같은 component에 연결했다. Storybook 8/8, typecheck, lint, architecture boundary와 production build를 통과했으며 실제 1440px/390px route에서 accessible range label, 두 range 의미, 중앙음, 가상 데이터 표기, 기존 visualizer 0개와 horizontal overflow 0을 확인했다.
- **Evidence**:
  - **Reference image**: 사용자 제공 `codex-clipboard-501e82de-2ab9-4105-ae08-728efcceb81c.png`
  - **Shared component**: `src/entities/vocal-profile/ui/vocal-range-chart.tsx`
- **Test/Log**: landing·profile Storybook 8/8, TypeScript, ESLint, architecture boundary, Next.js 16.3 production build와 desktop/mobile browser QA 통과
- **Consequences**: D011/D012의 landing 전용 Recommended key visualizer 계약은 이 결정으로 대체된다. Landing sample은 실제 분석 chart 표현을 사용하지만 저장·API 호출 없이 고정된 가상 profile만 렌더링한다.

## D014: Bento 보조 라벨을 제거한 최소 visual surface (2026-08-12)

- **Context**: 사용자가 보컬 프로필 chart의 `Sample profile`·`가상 데이터`와 아래 Orb surface의 `VOICE SIGNAL`·아이콘을 제거하도록 요청했다.
- **Constraints**: 화면상 보조 라벨을 없애더라도 chart의 accessible range 설명과 Orb의 WebGL/fallback 동작은 유지해야 한다.
- **Options**: 보조 라벨 유지 / 일부만 제거 / 요청한 네 요소를 모두 제거하고 visual만 유지
- **Decision**: `KeySurface`에서는 `Sample profile`·`가상 데이터` header row를 제거하고 chart를 카드 중앙에 배치한다. `OrbPoster`에서는 `VOICE SIGNAL`·Sparkles overlay를 제거하고 Orb만 유지한다. Chart의 accessible range name과 Orb canvas/fallback은 변경하지 않는다.
- **Rationale**: 카드 title과 chart 자체가 이미 visual의 역할을 전달하므로 중복 microcopy를 덜어 정보 밀도를 낮출 수 있다. 의미가 필요한 chart 범위는 접근 가능한 이름에 남기고 Orb는 순수한 장식 visual로 유지한다.
- **Trace**:
  - **DOING 시작 시점**: `KeySurface`의 두 `<p>`와 `OrbPoster`의 absolute label row가 대상이며, Sparkles는 해당 row에서만 사용되므로 import도 함께 정리할 수 있다.
  - **DONE 전 확정 시점**: 네 보조 요소와 Sparkles import를 제거하고 chart margin을 중앙 정렬에 맞게 정리했다. Landing Storybook 4/4, typecheck와 lint를 통과했으며 실제 1440px/390px route에서 세 텍스트 0개, accessible chart 유지, Orb canvas 1개와 horizontal overflow 0을 확인했다.
- **Evidence**:
  - **Component**: `src/_pages/home/ui/landing-product-story.tsx`
- **Test/Log**: landing Storybook 4/4, TypeScript, ESLint와 desktop/mobile browser QA 통과
- **Consequences**: D013의 명시적 `Sample profile`·`가상 데이터` header 결정은 이 결정으로 대체된다. 고정 chart 값은 landing preview 안에서만 사용하며 실제 결과나 저장 데이터로 연결하지 않는다.

## D015: 하단 섹션의 역할 기반 reveal hierarchy (2026-08-12)

- **Context**: 사용자가 스크롤 이후 모든 section이 조금씩 위로 올라오는 동일한 motion만 반복되어 단조롭다고 보고, 랜딩 전체의 통일성을 높이는 수정안을 적용하도록 요청했다.
- **Constraints**: 기존 Hero word reveal과 Bento full fade를 유지하고, metric Count Up·scroll-jacking·과도한 transform을 재도입하지 않으며 client observer 수와 reduced-motion 계약을 관리해야 한다.
- **Options**: 모든 section에 같은 translate-up 강화 / 외부 motion runtime 추가 / 기존 `RevealContent`를 역할별 variant와 CSS child stagger로 확장
- **Decision**: `RevealContent`에 공통 `cubic-bezier(0.22, 1, 0.36, 1)` 기반 section·group·stagger·line·fade variant를 추가한다. Editorial은 heading과 app header·3단계, metric은 두 hairline과 정적 숫자 3개, Voice Notes는 heading과 card 4개를 분리해 reveal하고 final CTA는 이동 없는 단일 fade를 사용한다. Child 순서는 CSS variable delay로 처리해 카드마다 observer를 만들지 않는다.
- **Rationale**: 같은 easing과 70ms rhythm은 페이지를 하나의 motion family로 묶고, 역할별 opacity·translate·scale 차이는 반복되는 translate-up의 단조로움을 줄인다. Metric 숫자는 animation 없이 제품 사실로 남고 선만 펼쳐져 기존 결정과도 충돌하지 않는다.
- **Trace**:
  - **DOING 시작 시점**: 현재 `RevealContent` 기본값은 opacity 0.94, translateY 8px, 700ms이며 editorial·Voice Notes·CTA 전체와 metric 각 칸에 반복 적용돼 차이가 거의 보이지 않으면서 동일한 상승 동작만 누적된다.
  - **DONE 전 확정 시점**: variant default map과 CSS child target을 추가하고 하단 네 section을 역할별 markup으로 재구성했다. 실제 브라우저에서 scroll 전 section 16px, card 6px, metric item opacity 0, hairline scaleX 0, final CTA opacity 0/이동 0을 확인하고 각 진입 후 모두 최종 상태가 되는 것을 확인했다. Storybook 4/4, TypeScript, ESLint, architecture boundary와 production build를 통과했다.
- **Evidence**:
  - **Components**: `src/shared/ui/reveal-content`, `src/_pages/home/ui/landing-page.tsx`
- **Test/Log**: landing Storybook 4/4, TypeScript, ESLint, architecture boundary, Next.js 16.3 production build와 1440px/390px browser scroll QA 통과
- **Consequences**: `RevealContent`의 기존 explicit duration·distance·opacity API는 유지되며 Bento full fade는 회귀하지 않는다. Reduced-motion·no-script에서는 root, item, media와 line 모두 즉시 최종 상태를 표시한다.

## D016: 프로필 녹음의 audio-reactive Voice Core (2026-08-12)

- **Context**: 사용자가 분석 중에는 Orb를 사용하지만 분석 전 profile에는 기존 막대 파형이 남아 있고 녹음 중 live waveform도 현재 디자인과 어울리지 않는다고 지적했다.
- **Constraints**: 실제 마이크 반응을 유지하되 amplitude를 장식 정보 이상으로 과장하지 않고 React high-frequency render, 복수 AudioContext, WebGL 의존 실패, reduced-motion과 녹음 cleanup 문제를 피해야 한다.
- **Options**: 막대 스타일만 변경 / 원형 spectrum 추가 / idle·recording·processing을 하나의 Voice Core 상태로 통합
- **Decision**: 공통 `VoiceSignalCore`에 idle·requesting·recording·stopping·processing mode를 정의한다. 최초 구현은 idle/requesting/stopping에 poster fallback을 사용했으며, D017에서 이를 저속 dynamic Orb로 확장했다. Recording은 full Orb와 glow를 MediaStream analyser의 RMS·peak에서 smoothing한 `--signal-level`로만 반응시키고 `ProcessHero` active도 같은 core의 processing mode를 사용한다.
- **Rationale**: 분석 전부터 분석 중까지 같은 형태를 유지해 제품의 visual continuity를 만들면서, 녹음 중 신호는 오디오 편집기형 history waveform 없이도 살아 있는 입력으로 느껴진다. 고주파 값을 DOM CSS 변수로 직접 전달하므로 React render를 반복하지 않고 기존 timer·progress의 의미도 침범하지 않는다.
- **Trace**:
  - **DOING 시작 시점**: 현재 `RecorderSurface`는 idle에서 20개 고정 bar, recording에서 별도 2D canvas의 history bar와 baseline을 사용하고 `ProcessHero`만 `VoiceOrb`를 사용한다. Timer·milestone·progress는 visual과 독립된 의미 계약이므로 그대로 보존할 수 있다.
  - **DONE 전 확정 시점**: 고정 `previewBars`, `LiveMicrophoneWaveform` 2D canvas와 theme color helper를 제거하고 shared Voice Core를 recorder와 ProcessHero에 연결했다. Idle Storybook은 WebGL canvas 0, recording은 old waveform canvas 0·Orb canvas 1, processing은 ready Orb canvas 1을 확인했으며 390px overflow 0을 확인했다. Storybook 13/13, TypeScript, ESLint, architecture boundary와 production build를 통과했다.
- **Evidence**:
  - **Components**: `src/shared/ui/voice-signal-core`, `src/_pages/profile/ui/vocal-profile-recorder.tsx`, `src/widgets/creation-funnel/ui/process-hero.tsx`
- **Test/Log**: Profile input·Creation Funnel·Orb Storybook 13/13, TypeScript, ESLint, architecture boundary, Next.js 16.3 production build와 desktop/mobile browser QA 통과
- **Consequences**: 준비된 audio의 `AudioWaveformPlayer`는 탐색·재생 기능이 있으므로 유지한다. Reduced-motion에서는 microphone analyser와 signal-driven scale을 시작하지 않고 정적 recording core와 glow를 표시하며, 녹음 종료/unmount 시 RAF·audio graph·AudioContext를 정리한다.

## D017: Dynamic idle·강한 signal response·inline audio notice (2026-08-12)

- **Context**: 사용자가 분석 전 Orb도 움직이게 하고 녹음 반응을 더 강하게 만들며, 짧은 오디오 오류의 위아래 border panel을 현재 디자인에 맞게 바꾸도록 요청했다.
- **Constraints**: Idle animation은 full processing과 위계를 구분하고 reduced-motion fallback을 유지해야 한다. Recording 반응은 시각적으로 커져도 layout shift와 control 이동을 만들지 않아야 하며 notice는 기존 오류 문구와 분석 disable 계약을 유지해야 한다.
- **Options**: idle CSS poster pulse / idle full Orb shader / recording scale만 확대 / scale·glow·signal gain 동시 조정 / hairline 유지 / rounded inline notice
- **Decision**: Idle/requesting/stopping은 각각 speed 0.35/0.45/0.35의 저채도 full Orb를 사용하고 processing은 1, recording은 0.75로 위계를 둔다. Recording analyser는 RMS gain 8, peak gain 2.6과 attack/release 0.5/0.16을 사용하며 Orb scale은 0.82–1, glow opacity는 0.12–0.77 범위로 반응한다. Audio duration 안내는 status별 icon과 low-tint surface를 가진 rounded inline notice로 바꾼다.
- **Rationale**: 같은 shader가 idle부터 processing까지 끊기지 않아 상태 전환이 자연스럽고, signal gain과 scale·glow를 함께 확대해야 작은 음량에서도 반응이 읽힌다. Notice는 주변 control과 같은 radius·border 언어를 사용하면서 icon과 tone으로 성공/오류를 텍스트 외에도 구분한다.
- **Trace**:
  - **DOING 시작 시점**: Idle은 `forceFallback` 때문에 canvas 0인 정적 poster이고 recording은 최대 scale 변화가 5.5%, glow opacity 변화가 30%라 실제 음성에서 차이가 약하다. 짧은 오디오 안내는 `border-y bg-muted/25` surface라 다른 rounded input control과 형태가 단절된다.
  - **DONE 전 확정 시점**: Mode별 shader speed를 추가하고 idle 강제 fallback을 제거했다. Recording gain·smoothing과 scale·glow 범위를 확대했으며, duration 안내를 valid/invalid icon·tone의 rounded notice로 교체했다. Storybook에서 idle ready canvas 1, recording/processing Voice Core, valid/invalid notice와 fallback을 확인했고 관련 14/14, TypeScript, ESLint, architecture boundary와 production build를 통과했다.
- **Evidence**:
  - **Components**: `src/shared/ui/voice-orb`, `src/shared/ui/voice-signal-core`, `src/_pages/profile/ui/voice-scan-input.tsx`
- **Test/Log**: Profile input·Creation Funnel·Orb Storybook 14/14, TypeScript, ESLint, architecture boundary, Next.js 16.3 production build와 desktop/mobile browser QA 통과
- **Consequences**: Idle도 WebGL runtime을 사용하지만 기존 viewport·visibility 정지, DPR 제한과 cleanup을 그대로 적용한다. Reduced-motion 또는 WebGL 실패에서는 static poster가 남고, notice 문구와 분석 가능/불가 계약은 변경하지 않는다.

## D018: Semantic border hierarchy·shared StatusNotice·neutral idle Orb (2026-08-12)

- **Context**: 사용자가 구현 승인 대신 변경 요청 `B`를 선택해 프로젝트 전반의 의미 없는 상·하단 border, recorder의 recording tint와 Orb 사각형 배경, 정렬이 어긋난 상태 카드, idle Orb의 유채색을 제거하도록 요청했다.
- **Constraints**: Border를 전부 없애 table/list 행, form control, focus와 modal boundary까지 훼손해서는 안 된다. Status 의미는 색과 icon만이 아니라 텍스트와 ARIA role로 유지하고, idle Orb의 animation·recording audio response·WebGL fallback도 보존해야 한다.
- **Options**: 요청 화면만 국소 수정 / 모든 border 일괄 삭제 / semantic border 규칙과 shared status primitive를 만든 뒤 장식 surface를 선별 정리
- **Decision**: Page heading·일반 section·empty/status/recording surface의 장식 hairline은 whitespace·radius·quiet fill로 대체하고 form control·table/list row·focus·overlay의 구조적 border는 유지한다. Card형 status/alert는 shared `StatusNotice`의 neutral/success/warning/destructive tone과 grid 기반 icon/copy 중앙 정렬로 통합한다. Recorder surface는 모든 mode에서 transparent·borderless로 유지하고 Orb fragment에 원형 edge alpha mask를 적용한다. Idle/requesting은 grayscale shader, recording부터 color와 audio-reactive glow를 사용한다.
- **Rationale**: Border의 의미를 구조에 한정하면 페이지가 선으로 잘게 나뉘는 현상을 줄이면서 데이터 비교와 interaction affordance는 보존할 수 있다. 공통 notice가 정렬·tone·ARIA를 소유하면 route별 오차가 사라지며, shader alpha mask는 canvas 사각형을 가리는 CSS overlay 없이 실제 투명 픽셀을 보장한다.
- **Trace**:
  - **DOING 시작 시점**: `RecorderSurface` 자체에 `border-y`와 recording 보라 tint가 있고, `VoiceOrb` shader의 기본 배경색이 흰색이라 투명 canvas에서도 사각 영역처럼 보일 수 있다. Status/alert는 각 화면에서 icon margin, radius, border와 background를 개별 정의해 정렬과 tone이 다르다.
  - **DONE 전 확정 시점**: Recorder hairline·recording tint를 제거하고 Orb shader에 radial edge mask를 추가했으며 idle/requesting에 grayscale filter를 적용했다. Shared `StatusNotice`를 Profile, Recommendation, Library, Mixing Detail과 dev handoff의 card형 상태에 연결하고 page heading·section의 장식 border를 선별 제거했다. Storybook 43/43, TypeScript, ESLint, architecture boundary와 production build를 통과했고 browser에서 idle transparent/border 0px/grayscale/canvas 1, recording tint·square artifact 0과 390px notice 정렬을 확인했다.
- **Evidence**:
  - **Shared components**: `src/shared/ui/status-notice`, `src/shared/ui/voice-orb`, `src/shared/ui/voice-signal-core`
  - **Primary surface**: `src/_pages/profile/ui/vocal-profile-recorder.tsx`, `src/_pages/profile/ui/voice-scan-input.tsx`
- **Test/Log**: 관련 Storybook 43/43, TypeScript, ESLint, architecture boundary, Next.js 16.3 production build와 desktop/mobile browser QA 통과
- **Consequences**: Border의 전면 금지가 아니라 semantic 사용 규칙이므로 table/list/form/overlay 경계는 유지된다. Idle Orb는 움직이지만 색상 위계가 recording과 분리되며, reduced-motion·WebGL fallback과 audio analyser cleanup 계약은 그대로다.

## D019: Orb body-bound alpha mask (2026-08-12)

- **Context**: 사각 canvas 배경을 제거하기 위해 추가한 radial alpha mask가 shader의 넓은 무채색 외곽 halo까지 남겨 사용자 화면에서 굵은 회색 원으로 보였다.
- **Constraints**: Color Orb 본체와 내부 motion은 자르지 않으면서 canvas 모서리, gray halo와 hard clipping을 모두 피해야 한다.
- **Decision**: Radial alpha는 normalized radius 0.76–0.9에서 feather하고, 0.58–0.8의 outer band에서는 RGB chroma 기반 mask를 추가한다. Orb 중심은 chroma와 무관하게 유지하고 외곽의 무채색 pixel만 투명하게 만든다.
- **Rationale**: Radial mask만 좁히면 gray halo가 얇은 outline으로 남거나 움직이는 color edge를 함께 자른다. 외곽에만 chroma 조건을 적용하면 밝은 중심은 보존하면서 shader background에서 유래한 gray만 제거할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 현재 mask는 normalized radius 0.92–1.12에서만 fade되어 약 0.8 반경부터 보이는 shader의 gray halo가 그대로 불투명하게 남는다.
  - **DONE 전 확정 시점**: body-bound radial feather와 outer chroma mask를 함께 적용했다. Browser screenshot에서 recording color Orb와 idle grayscale Orb 모두 gray ring·square artifact가 사라지고 본체 edge와 motion이 유지됨을 확인했으며 관련 Storybook 14/14, TypeScript와 ESLint를 통과했다.
- **Evidence**: `src/shared/ui/voice-orb/voice-orb.tsx`
- **Test/Log**: Profile input·Creation Funnel·Orb Storybook 14/14, TypeScript, ESLint와 desktop browser screenshot QA 통과
- **Consequences**: Mask는 alpha에만 적용되어 hue·animation·audio response를 바꾸지 않는다. WebGL fallback은 CSS poster 경로이므로 영향받지 않는다.

## D020: Orb alpha compositing correction (2026-08-12)

- **Context**: Halo 제거 후에도 확대 화면에서 Orb 본체의 가장 바깥 shader pixel이 얇은 회색 contour로 남았다.
- **Constraints**: 전체 반경을 과도하게 줄이거나 color edge와 내부 highlight를 손상하지 않아야 한다.
- **Decision**: Fragment output은 `vec4(col.rgb, alpha)`로 unpremultiplied RGB와 radial alpha를 전달하고 canvas 합성 단계에 premultiplication을 맡긴다. D019에서 임시 도입한 outer chroma rejection은 제거한다.
- **Rationale**: Gray contour는 shader 색 자체가 아니라 RGB에 alpha를 미리 곱한 뒤 canvas가 다시 premultiply하며 생긴 dark fringe였다. 합성 계약을 바로잡으면 color 정보를 자르거나 Orb 반경을 축소하지 않고 contour만 제거된다.
- **Trace**:
  - **DOING 시작 시점**: D019의 chroma mask는 낮은 threshold 때문에 미세한 hue를 가진 어두운 gray contour를 color edge로 통과시킨다.
  - **DONE 전 확정 시점**: RGB 사전 premultiplication을 제거하고 radial alpha만 별도로 출력했다. 320px 확대 Orb와 실제 recording surface screenshot에서 gray contour가 사라지고 pastel edge·투명 canvas·motion이 유지됨을 확인했으며 관련 Storybook 14/14, TypeScript와 ESLint를 통과했다.
- **Evidence**: `src/shared/ui/voice-orb/voice-orb.tsx`
- **Test/Log**: Profile input·Creation Funnel·Orb Storybook 14/14, TypeScript, ESLint와 확대/실사용 browser screenshot QA 통과
- **Consequences**: 별도 color threshold가 없어 shader의 원래 hue와 highlight가 보존된다. Radial alpha mask, idle grayscale CSS filter와 fallback 경로는 유지된다.

## D021: Rail-scoped chrome separators and scroll glass (2026-08-12)

- **Context**: 사용자가 Header/Footer border를 page content 폭으로 제한하고, Header는 top에서 border 없이 시작해 scroll 후에만 border가 나타나며 뒤 content가 희미하게 비치는 blur surface를 원했다.
- **Constraints**: Landing과 authenticated route가 같은 chrome을 사용하고 mobile에서도 separator width가 viewport 밖으로 넘치지 않아야 한다. Scroll listener는 상태 변화 시에만 render하고 cleanup해야 한다.
- **Decision**: Header outer는 `background/72`와 24px backdrop blur·1.5 saturation을 사용하고 지원 환경에서는 fill을 `background/64`로 낮춘다. 8px 초과 scroll을 boolean state로 추적해 72rem inner rail의 bottom separator만 transparent에서 `border/80`으로 전환한다. Footer outer border를 제거하고 동일 72rem inner rail에 top separator를 둔다.
- **Rationale**: Blur와 낮은 불투명도는 sticky header 뒤의 content를 미세하게 연결하면서 text 대비를 보존한다. Separator를 inner rail에 두면 넓은 화면에서 페이지 content 폭과 정렬되고, boolean 전환이라 연속 scroll마다 불필요한 React update가 발생하지 않는다.
- **Trace**:
  - **DOING 시작 시점**: 현재 Header/Footer outer element에 full-width `border-b`/`border-t`가 있고 Header는 scroll 여부와 무관하게 `bg-background/96 backdrop-blur-xl`을 사용한다.
  - **DONE 전 확정 시점**: Header에 passive scroll listener와 `data-scrolled` 상태를 추가하고 inner rail separator를 연결했으며 Footer border를 rail 내부로 옮겼다. Storybook 11/11, TypeScript, ESLint, architecture boundary와 production build를 통과했다. Browser에서 1265px viewport의 top separator transparent, scrollY 180에서 separator/footer 1152px, blur 24px·saturate 1.5를 확인했다.
- **Evidence**: `src/widgets/product-shell/ui/product-shell.tsx`, `src/widgets/product-shell/ui/product-shell.stories.tsx`
- **Test/Log**: ProductShell·Landing Storybook 11/11, TypeScript, ESLint, architecture boundary, Next.js 16.3 production build와 browser top/scrolled QA 통과
- **Consequences**: Landing과 authenticated route가 같은 component를 사용하므로 별도 scroll implementation이 없다. Header scroll listener는 unmount에서 제거되고 Footer는 viewport에 고정되지 않아 blur 비용이 지속적으로 발생하지 않는다.

## D022: React Bits-style brand Gradient Text (2026-08-12)

- **Context**: 사용자가 Landing headline의 `내 목소리` 부분에 React Bits Gradient Text를 브랜드 컬러와 1.5초 속도로 적용하도록 요청했다.
- **Constraints**: 기존 word-by-word entry, heading accessible name, 한국어 조사 `에`, reduced-motion과 text contrast를 보존해야 한다.
- **Decision**: `내`와 `목소리에`의 기존 word wrapper를 유지하고 내부에서 `내`, `목소리`만 `gradientText` span으로 감싸 조사는 단색으로 남긴다. Gradient는 semantic `data-accent-foreground`에서 blue `oklch(0.59 0.18 260)`, restrained pink `oklch(0.67 0.17 330)`를 지나 처음 색으로 돌아오며 `background-size: 300% 100%`, linear 1.5초 infinite shift를 사용한다. Reduced-motion에서는 50% position의 정적 gradient로 고정한다.
- **Rationale**: Word wrapper를 쪼개지 않아 reveal index와 한국어 줄바꿈을 그대로 유지하면서 사용자가 지정한 phrase만 색을 줄 수 있다. Semantic violet을 양 끝에 반복해 loop seam을 줄이고 blue/pink는 기존 Orb·data accent 계열과 연결한다.
- **Trace**:
  - **DOING 시작 시점**: Headline은 공백 기준 `StaggeredWords`로 `내`와 `목소리에`가 각각 reveal되며 전체가 foreground 단색이다.
  - **DONE 전 확정 시점**: 두 word wrapper 안에 phrase-only gradient span을 추가하고 1.5초 animation과 reduced-motion 정적 상태를 구현했다. Landing Storybook 4/4, TypeScript와 ESLint를 통과했으며 browser에서 desktop/mobile의 segment text, gradient stops, duration 1.5s와 390px overflow 0을 확인했다.
- **Evidence**: `src/_pages/home/ui/landing-hero.tsx`, `src/_pages/home/ui/landing-hero.module.css`, `src/_pages/home/ui/landing-page.stories.tsx`
- **Test/Log**: Landing Storybook 4/4, TypeScript, ESLint와 desktop/mobile browser QA 통과
- **Consequences**: Accessible H1은 기존 단일 `aria-label`을 유지해 animation markup이 읽기 순서에 노출되지 않는다. Gradient animation은 word entry 이후에도 지속되지만 reduced-motion에서는 완전히 정지한다.

## D023: Gradient Text ping-pong loop (2026-08-12)

- **Context**: 0%→100% 단방향 background-position이 iteration 경계에서 즉시 0%로 reset되어 gradient가 중간에 끊겼다가 다시 재생되는 것처럼 보였다.
- **Constraints**: 사용자가 지정한 1.5초 duration과 reduced-motion fallback을 유지해야 한다.
- **Decision**: Keyframe을 0%→100%→0% 왕복으로 닫아 첫 frame과 마지막 frame을 동일하게 만든다.
- **Rationale**: 별도 runtime이나 복제 gradient tile 없이 CSS keyframe만으로 iteration seam을 제거하고 기존 component 구조를 보존한다.
- **Trace**:
  - **DOING 전 확정 시점**: 사용자의 반복 seam 수정 요청을 T27로 열고 단방향 keyframe reset을 원인으로 기록했다.
  - **DONE 전 확정 시점**: keyframe의 0%·100%를 같은 position으로 묶고 50%에서 반대 position에 도달하도록 구현했다. Storybook browser에서 0ms·750ms·1500ms 값을 직접 고정해 시작과 종료가 같고 중간만 다른 것을 검증했다.
- **Evidence**: `src/_pages/home/ui/landing-hero.module.css`, `src/_pages/home/ui/landing-page.stories.tsx`
- **Test/Log**: Landing Storybook 4/4, Biome, TypeScript, ESLint 통과
- **Consequences**: 1.5초는 한 방향 이동 시간이 아니라 완전한 왕복 주기가 되며, iteration 경계의 순간 이동은 사라진다. Reduced-motion에서는 기존 정적 50% gradient를 유지한다.

## D024: Official React Bits Gradient Text and scoped Motion runtime (2026-08-12)

- **Context**: 사용자가 구현 승인 대신 변경 요청 `B`를 선택해 CSS로 모사한 Gradient Text를 공식 React Bits source로 교체하고, `motion` 설치를 계기로 기존 수동 motion 구현의 최적화 가능 범위를 함께 조사하도록 요청했다.
- **Constraints**: Landing 전체를 불필요하게 client boundary로 확장하지 않고, accessible H1·word reveal·one-shot viewport reveal·reduced-motion·no-JS 정적 콘텐츠를 유지해야 한다.
- **Options**: 기존 CSS 유지 / Gradient Text만 Motion으로 교체 / Gradient Text와 수동 Hero·Reveal primitive를 Motion으로 통합
- **Decision**: 공식 Gradient Text의 `useAnimationFrame`, MotionValue와 yoyo semantics를 shared component로 소유하고, Hero entry와 공통 RevealContent까지 `motion/react`로 통합한다. Orb shader RAF와 microphone analyser RAF는 각각 WebGL/audio sampling 책임이므로 유지하며 album stack·image hover 같은 단순 interaction은 CSS에 남긴다.
- **Rationale**: 공식 효과의 속도·연속 gradient field를 재현하면서, Motion이 이미 로드되는 Landing에서 중복 observer/state/keyframe 코드를 줄일 수 있다. 반대로 고주파 render loop와 단순 CSS hover까지 추상화하면 성능·복잡도 이득이 없다.
- **Trace**:
  - **T28 DONE 시점**: `motion@13.1.0`을 설치하고 React Bits source의 `useAnimationFrame`·MotionValue·yoyo를 `shared/ui/gradient-text`로 통합했다. `내 목소리`는 하나의 gradient field를 공유하고 조사 `에`만 foreground로 덮으며, 공식 의미대로 편도 1.5초·왕복 3초가 된다.
  - **T29 DONE 시점**: Hero의 CSS keyframe/delay를 Motion entrance primitive로 교체하고 `RevealContent`의 직접 IntersectionObserver·visible state·transition CSS를 `useInView`·`useAnimate` 기반 one-shot sequence로 축소했다. 공식 Gradient Text 안에 중첩 word span을 넣으면 `background-clip:text`가 적용되지 않는 Chromium 결과를 발견해, `내 목소리` direct text를 하나의 branded entrance unit으로 확정했다. 첫 viewport album stack의 LCP 후보 한 장만 eager-load하고 나머지는 lazy로 유지했다.
- **Evidence**: `src/shared/ui/gradient-text`, `src/shared/ui/reveal-content`, `src/_pages/home/ui/landing-hero.tsx`, `src/_pages/home/ui/landing-product-story.tsx`, `package.json`, `pnpm-lock.yaml`
- **Test/Log**: Landing·ProductShell·VoiceOrb Storybook 13/13, Biome, TypeScript, ESLint, architecture 4/4, production build와 Chromium desktop/mobile QA 통과
- **Consequences**: Landing에서는 Motion runtime을 Gradient Text·Hero entry·RevealContent가 공유하며 중복 Observer/state/keyframe이 제거된다. Reduced-motion과 no-JS media fallback은 Motion inline initial state보다 우선하도록 제한적으로 보존한다. Orb/audio RAF와 hover CSS는 기존 책임을 유지한다.

## D025: Inline Gradient Text baseline contract (2026-08-12)

- **Context**: 공식 Gradient Text wrapper를 H1 안의 inline phrase로 사용하면서 text-only mode에도 `overflow-hidden`이 적용되어 inline-block baseline이 하단 margin edge 기준으로 바뀌었고, 조사 `에`보다 gradient phrase가 위로 떠 보였다.
- **Constraints**: Border mode의 clipping, gradient motion과 H1 typography·wrapping을 유지해야 한다.
- **Decision**: Text-only mode는 overflow visible과 explicit baseline alignment·inherited line-height를 사용하고, overflow clipping은 border mode에만 제한한다.
- **Rationale**: Font-size를 보정하는 임시 offset 없이 브라우저 inline formatting baseline을 복원한다.
- **Trace**:
  - **DONE 전 확정 시점**: 첫 수정에서 `inline-block` 두 겹 때문에 desktop 4.8125px·mobile 2.75px 차이가 남는 것을 Storybook assertion으로 발견했다. Text-only mode의 두 wrapper를 실제 inline formatting으로 바꾼 뒤 desktop/mobile 모두 baseline delta 0px를 확인했다.
- **Evidence**: `src/shared/ui/gradient-text/gradient-text.tsx`, `src/_pages/home/ui/landing-page.stories.tsx`
- **Test/Log**: Landing Storybook 4/4, Biome, TypeScript와 Chromium desktop/mobile QA 통과
- **Consequences**: Border mode는 기존 clipping과 radius를 유지하고 text-only mode만 주변 조사·문장과 동일한 baseline을 사용한다.

## D026: Recording Orb 아래 ElevenLabs scrolling waveform (2026-08-12)

- **Context**: 사용자가 녹음 중 Orb 아래에 ElevenLabs UI Waveform 문서의 “Real-time audio visualization with smooth scrolling animation”을 브랜드 gradient로 적용하도록 요청했다.
- **Constraints**: 기존 녹음 stream을 재사용해 microphone 권한을 중복 요청하지 않고, Orb의 강한 audio response·투명 무경계 surface·reduced-motion·cleanup을 유지해야 한다.
- **Source**: `https://github.com/elevenlabs/ui/blob/main/apps/www/registry/elevenlabs-ui/ui/waveform.tsx` (MIT)
- **Decision**: ElevenLabs `ScrollingWaveform`의 canvas bar x-position loop, rounded bar와 destination-out edge fade pattern을 `VoiceSignalCore`에 통합한다. 별도 analyser/component가 아니라 기존 recording analyser가 45ms마다 history height를 추가하고 같은 RAF가 Orb CSS level과 canvas를 갱신한다. Bar fill은 Copy Singer violet→blue→pink linear gradient를 사용한다.
- **Rationale**: 한 AudioContext와 RAF로 Orb·waveform을 함께 구동하면 이중 microphone pipeline 없이 요청한 시각 패턴을 얻고 cleanup 책임도 한 component에 유지할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 녹음 surface는 audio-reactive Orb만 표시하고 있어 시간에 따라 축적되는 입력 rhythm이 없었다. 공식 source의 `ScrollingWaveform`은 x-position history, rounded canvas bar와 edge fade를 제공하지만 자체 microphone 획득을 그대로 사용하면 기존 recorder와 권한·AudioContext가 중복된다.
  - **DONE 전 확정 시점**: recording mode에서만 Orb 아래 64px canvas를 렌더링하고 기존 stream의 한 analyser가 Orb level과 45ms history sample을 함께 만든다. Storybook 14/14, TypeScript, ESLint, architecture boundary와 production build를 통과했으며 browser에서 desktop/mobile의 Orb 하단 배치, brand gradient, overflow 0과 console warning/error 0을 확인했다.
- **Evidence**: `src/shared/ui/voice-signal-core/voice-signal-core.tsx`, `src/shared/ui/voice-signal-core/voice-signal-core.module.css`, `src/_pages/profile/ui/vocal-profile-recorder.tsx`
- **Test/Log**: Profile input·Orb·Creation Funnel Storybook 14/14, TypeScript, ESLint, architecture boundary, Next.js 16.3 production build와 1440px/390px browser QA 통과
- **Consequences**: Idle/requesting/stopping/processing에는 scrolling canvas가 생성되지 않는다. Reduced-motion에서는 analyser·RAF 없이 정적 history만 그리고, recording 종료/unmount에서는 RAF·ResizeObserver·audio graph·AudioContext를 정리한다. D016의 “recording live waveform 제거” 결정은 이 요청에 한해 Orb 아래의 보조 visualization으로 대체되며 Orb 자체는 계속 primary visual이다.

## D027: Recorder progressive state transition (2026-08-12)

- **Context**: 사용자가 녹음 전 `0:00.0`이 의미 없이 보이고, recording 진입 시 Orb 색과 waveform 공간이 즉시 바뀌어 layout shift처럼 느껴진다고 지적했다.
- **Constraints**: 실제 recording 시작 시점과 타이머 의미를 일치시키고, Orb의 고주파 audio response를 느리게 만들지 않으면서 layout·color·waveform entrance만 부드럽게 이어야 한다.
- **Decision**: 경과 시간은 recording이 시작됐거나 elapsed 값이 존재할 때만 렌더링한다. Recorder visual region은 Orb의 상단 위치를 유지하고 idle 높이에서 recording 높이로 transition하며, Orb filter·opacity는 장시간 easing으로 grayscale→color를 전환한다. Waveform은 recording mount 시 opacity entrance를 사용한다.
- **Rationale**: Orb 자체가 위아래로 재배치되지 않은 상태에서 아래 공간만 열리면 주변 copy/control은 하나의 연속된 layout transition으로 밀린다. Filter transition과 waveform entrance를 분리하면 microphone 반응용 120ms transform은 그대로 유지할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: Timer는 모든 state에서 항상 렌더링되고, recorder region은 idle의 center alignment/min-height에서 recording의 start alignment/min-height로 즉시 바뀐다. Orb filter transition은 420ms이며 waveform canvas에는 entrance opacity가 없다.
  - **DONE 전 확정 시점**: Timer는 recording 시작 전 DOM에서 제거하되 고정 높이 slot으로 copy 위치를 보존했다. Recorder region은 top-aligned Orb를 유지하면서 mobile 240→288px, desktop 256→288px로 전환하고 Orb는 900ms filter, waveform은 720ms delayed opacity entrance를 사용한다. `VoiceOrb`는 speed를 ref로 갱신해 idle→recording 전환 중 WebGL canvas를 재생성하지 않는다.
- **Evidence**: `src/_pages/profile/ui/vocal-profile-recorder.tsx`, `src/shared/ui/voice-signal-core/voice-signal-core.module.css`, `src/shared/ui/voice-orb/voice-orb.tsx`, `src/_pages/profile/ui/voice-scan-input.stories.tsx`
- **Test/Log**: Profile input·Orb·Creation Funnel Storybook 15/15, TypeScript, ESLint, architecture boundary, Next.js 16.3 production build와 1440px/390px browser transition QA 통과
- **Consequences**: Recording 전환의 color/layout/opacity는 부드럽지만 microphone amplitude transform은 기존 120ms 응답성을 유지한다. Reduced-motion에서는 영역과 Orb 위치를 즉시 최종 상태로 바꾸고 waveform도 animation 없이 표시한다.

## D028: Landing-to-product visual alignment (2026-08-12)

- **Context**: Landing 재설계 이후 프로젝트 화면을 검토한 결과 Login은 브랜드 연결이 약하고, 제품 page intro의 크기·간격 편차, Account/Admin의 반복 bordered surface, 전체 색상환 artwork와 무거운 segmented stepper가 새 시각 언어와 단절되어 있었다.
- **Constraints**: Landing의 Gradient Text·Bento·scroll reveal을 작업 화면에 복제하지 않고 table/list/form의 구조적 border, 제품 정보 밀도, Server Component와 접근성 계약을 유지해야 한다.
- **Options**: Landing effect를 전체 route로 확산 / 각 route를 개별 수정 / 공통 product-scale intro와 semantic surface 규칙을 만든 뒤 불일치가 큰 화면만 선별 정리
- **Decision**: Server-safe `ProductPageIntro` variant를 공통화하고 Login, Account, Admin, Recommendation과 대표 index/detail 화면의 위계를 맞춘다. 요약 정보의 장식 border는 quiet fill·whitespace로 대체하되 form/table/list border는 유지한다. Profile artwork는 brand hue family로 제한하고 Creation stepper는 lightweight progress rail로 교체한다.
- **Rationale**: Landing과 제품 화면의 연결감은 효과의 반복보다 rail, typography, spacing, color rarity와 surface hierarchy에서 생긴다. 공통 intro가 route별 drift를 막고 작업 화면은 안정적인 layout과 즉시 읽히는 action을 유지할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: Login은 독립 full-width bordered header와 큰 정적 mark를 사용하고, 약 10개 page가 유사한 eyebrow/title/description을 서로 다른 크기와 spacing으로 구현한다. Admin은 네 개 metric card와 form/filter/table을 모두 같은 bordered box로 취급하며 artwork는 `seed % 360` 전 색상환을 사용한다.
- **T33 결과**: Server-safe `ProductPageIntro`의 index/task/detail variant를 만들고 Library, Notifications, Vocal Profiles, Mixing History, Recommendation, Mixing Detail에 적용했다. Login은 공통 scroll glass Header/Footer와 저속 Voice Orb·단일 인증 copy로 재구성했으며 Login 전용 header에서는 중복 auth action만 숨긴다. Storybook 20/20과 TypeScript를 통과했고 Chromium 1440px/390px에서 overflow 없이 Login과 Recommendation의 product-scale density를 확인했다.
- **T34 결과**: Account는 quiet identity surface와 black ticket anchor를 2열로 조합하고 ledger를 전체 rail 아래에 유지했다. Admin은 네 개 독립 border card를 compact stat band로 통합하고 ticket form/filter의 outer border를 quiet fill로 바꾸되 input과 table border는 보존했다. Account/Admin Storybook 4/4와 TypeScript를 통과했고 1440px Account visual에서 요약과 ledger의 desktop 균형을 확인했다.
- **T35 결과**: Vocal profile artwork는 네 개 violet·blue·pink hue family와 seed variation으로 제한하면서 32개 fixture에서 deterministic 다양성을 검증했다. Creation stepper는 segmented background와 vertical border를 제거하고 step 사이 progress rail·state marker로 교체했다. Recommendation은 T33의 compact task intro와 desktop/mobile action assertion을 유지한다. 관련 Storybook 19/19, artwork test 1/1, TypeScript, lint, architecture 4/4와 production build를 통과했고 Chromium 1440px/390px에서 stepper와 profile list palette의 overflow 0을 확인했다.
- **Evidence**: `src/shared/ui/product-page-intro`, `src/_pages/login`, `src/_pages/account`, `src/_pages/admin`, `src/entities/vocal-profile`, `src/widgets/creation-funnel`, `src/_pages/recommendation-detail`
- **Consequences**: Landing 전용 motion은 희소성을 유지하고 제품 route는 공통 정적 primitive 중심으로 정리한다. Admin의 넓은 rail과 table border는 operational density 예외로 유지한다.

## D029: Voice-derived deterministic profile artwork (2026-08-12)

- **Context**: 브랜드 violet·blue·pink family로 제한한 artwork는 화면 일관성은 높였지만 프로필 간 구분이 약했다. 사용자는 제출한 보컬에 따른 규칙과 랜덤 variation을 결합하길 요청했다.
- **Constraints**: Artwork를 DB에 별도 저장하거나 원본 audio를 다시 읽지 않고, 같은 프로필이 Library·Detail·Mixing에서 동일하게 보여야 하며 기존 payload에도 안전해야 한다.
- **Options**: 전체 색상환 ID hash / artwork token DB 저장 / 저장된 분석 지표를 primary seed로 쓰고 ID hash를 보조 variation으로 사용
- **Decision**: Median MIDI를 circular base hue, observed range를 accent spread, pitch stability를 saturation, voiced ratio와 RMS를 light/highlight에 매핑한다. Profile ID hash는 gradient focal position, angle과 작은 hue jitter만 결정한다. Mixing profile projection에도 최소 분석 지표를 포함하고 optional contract로 이전 fixture/API fallback을 유지한다.
- **Rationale**: 색상 차이에 실제 보컬 의미를 부여하면서 같은 분석 결과의 프로필도 seed variation으로 구분할 수 있다. 저장 데이터만 사용하므로 schema migration과 audio 재처리가 없다.
- **Evidence**: `src/entities/vocal-profile/lib/artwork.ts`, `src/entities/vocal-profile/ui/vocal-profile-artwork.tsx`, `src/entities/mixing-job/model/contract.ts`, `src/entities/mixing-job/api/history.ts`
- **Trace**: `ARTWORK_VERSION=2` mapping과 optional analysis fallback을 구현하고 Vocal Profile list/detail, Mixing history/detail에 같은 입력을 연결했다. 8개 가상 보컬 palette Story에서 low/high·narrow/wide·stable/dynamic 조합이 violet, coral, lime, green, cyan, blue 계열로 분리되는 것을 1440px/390px에서 확인했다. 단위 3/3, contract/mixing 16/16, Storybook 7/7, TypeScript, lint, architecture 4/4와 production build를 통과했다.
- **Consequences**: 분석 지표를 가진 새 payload는 voice-derived artwork를 사용하고 누락된 legacy fixture는 ID-only fallback을 사용한다. Mapping version을 코드 상수로 고정해 의도치 않은 seed 변경을 줄인다.

## D030: Layered static grain for Aurora Gradient texture (2026-08-12)

- **Context**: Voice-derived palette는 구분되지만 기존 단일 overlay grain이 작은 썸네일에서 거의 보이지 않아 결과가 매끈한 blurred gradient처럼 느껴졌다. 사용자는 Aurora Gradient Generator와 유사한 grainy surface를 요청했다.
- **Constraints**: 현재 color mapping과 deterministic identity를 유지하고 bitmap 다운로드, canvas runtime, animation과 DB 저장을 추가하지 않아야 한다.
- **Decision**: Monochrome fractal noise data SVG를 fine/coarse scale 두 겹으로 합성한다. Fine grain은 soft-light로 밝고 어두운 영역 모두에 질감을 주고 coarse grain은 낮은 multiply opacity로 깊이를 더하며, 마지막 vignette가 color bloom을 정리한다.
- **Rationale**: 단일 타일의 opacity만 높이면 색 noise와 반복 무늬가 먼저 보인다. 서로 다른 frequency·size·blend의 neutral grain은 Aurora Gradient의 섬세한 noise를 작은/큰 artwork에 함께 유지한다.
- **Source**: `https://auroragradient.com/` — liquid/radial gradient style과 adjustable grain/noise opacity 참고
- **Evidence**: `src/entities/vocal-profile/ui/vocal-profile-artwork.tsx`, `src/entities/vocal-profile/ui/vocal-profile-artwork.stories.tsx`
- **Trace**: Fine noise는 5rem tile·soft-light·35% opacity, coarse noise는 13rem tile·multiply·13% opacity로 적용하고 radial/linear soft-light vignette를 추가했다. Palette·Library·Mixing Detail Storybook 7/7과 TypeScript를 통과했으며 1440px palette와 44px Library thumbnail에서 grain이 색을 덮지 않고 보이는 것을 확인했다.
- **Consequences**: Texture는 purely decorative child이고 artwork 자체는 계속 `aria-hidden`이다. 추가 network request나 animation lifecycle이 없다.

## D031: Aurora preset-derived analogous artwork families (2026-08-12)

- **Context**: 전체 hue circle과 최대 132° spread를 쓰는 voice-derived mapping은 프로필 구분은 강하지만 하나의 artwork에 coral·lime·cyan·violet 같은 원거리 색이 섞여 Aurora preset보다 알록달록하게 보였다.
- **Constraints**: 보컬 분석 기반 결정성과 프로필 간 구분, legacy ID fallback, DB 무변경을 유지하면서 한 표면의 색 복잡도를 줄여야 한다.
- **Source**: `https://auroragradient.com/` — 2026-08-12 확인 결과 preset 공통값은 `style=recursive`, `grainOpacity=25`, `grainColor=200`; restrained 후보는 `Northern Sky`(`#48466d`, `#3d84a8`, `#46cdcf`, `#abedd8`)·`Ocean Blue`(`#0077b6`, `#00b4d8`, `#90e0ef`, `#caf0f8`, `#023e8a`)·`Forest`(`#1b4332`, `#2d6a4f`, `#40916c`, `#52b788`, `#74c69d`)·`Berry`(`#590d22`, `#800f2f`, `#a4133c`, `#c9184a`, `#ff4d6d`)다.
- **Decision**: 중앙음 구간으로 네 analogous family 중 하나를 결정하고 각 family의 preset hue를 anchor로 사용한다. 음역 폭은 family 내부 spread, 안정도는 saturation, 유성음·RMS는 base/highlight lightness만 제한적으로 조절한다. `Purple Dream`·`Cyberpunk`처럼 hue 거리가 큰 조합은 artwork mapping에서 제외하고 neutral grain 합성 강도는 합계 약 25% 수준으로 낮춘다.
- **Rationale**: 여러 프로필은 family·명도·focal layout으로 구분되지만 개별 artwork는 하나의 조화로운 색 덩어리로 읽힌다. 사이트의 실제 preset 구조를 따르므로 단순히 채도를 낮추는 것보다 Aurora 특유의 깊이와 정체성을 보존한다.
- **Evidence**: `src/entities/vocal-profile/lib/artwork.ts`, `src/entities/vocal-profile/ui/vocal-profile-artwork.tsx`, `src/entities/vocal-profile/ui/vocal-profile-artwork.stories.tsx`
- **Trace**: `ARTWORK_VERSION=3`에서 중앙음 quartile을 Berry·Forest·Ocean Blue·Northern Sky family에 매핑하고 range spread를 0.32–1.0으로 제한했다. saturation은 family anchor 기준 34–88%, lightness는 역할별 16–82% 범위에서만 움직이며 profile seed hue jitter는 ±3°다. Fine/coarse grain은 20%/5%로 낮췄다. Unit 4/4, Storybook 7/7, TypeScript와 lint를 통과했고 1440px/390px Palette 및 44px Library에서 단일 family color mass와 overflow 0을 확인했다.
- **Consequences**: 이전 version 2 artwork와 색 배치는 달라지므로 mapping version을 올린다. 저장 데이터와 API shape은 바뀌지 않는다.

## D032: Voice-signature palette distribution (2026-08-12)

- **Context**: 중앙음 quartile을 family에 직접 대응시키자 실제/fixture 중앙음이 50–70 MIDI에 몰리는 제품 특성상 Forest와 Ocean/Northern만 반복되고, Northern도 청록·파랑 계열이라 목록이 사실상 초록·파랑으로 보였다.
- **Constraints**: 같은 프로필의 결정성과 분석 기반 variation, 개별 artwork의 analogous harmony를 유지하면서 목록 수준의 family 다양성을 높여야 한다.
- **Options**: 중앙음 bucket 경계만 재조정 / profile ID만으로 family 선택 / 분석값을 양자화한 voice signature와 profile ID를 함께 hash
- **Decision**: 중앙음·관측 음역·안정도·유성음·RMS를 안정된 단위로 양자화하고 profile ID와 함께 versioned hash해 five-family selector로 사용한다. 기존 네 family에 Aurora Lights의 purple side에서 추출한 restrained `Aurora Violet` family를 추가한다. 분석값은 계속 선택된 family 내부 spread·채도·명도를 제어한다.
- **Rationale**: 흔한 중앙음 분포가 특정 색을 독점하지 않고 같은 분석값의 여러 제출도 ID에 따라 안정적으로 분산된다. 반면 한 artwork 안에서는 하나의 preset family만 사용하므로 이전의 알록달록한 문제는 되살아나지 않는다.
- **Evidence**: `src/entities/vocal-profile/lib/artwork.ts`, `tests/vocal-profile-artwork.test.ts`, `src/entities/vocal-profile/ui/vocal-profile-artwork.stories.tsx`
- **Trace**: `ARTWORK_VERSION=4`에서 median 2 MIDI, range 3 semitone, stability·voiced ratio 0.1, RMS 4dB 단위의 signature와 profile ID를 FNV hash했다. `Aurora Violet`은 hue 264–290 범위로 제한했다. 동일 분석값 profile 40개에서 Berry·Forest·Ocean·Northern·Violet anchor가 모두 나타나고 결과가 재실행 간 동일함을 unit 5/5로 검증했다. Storybook 7/7, TypeScript, lint, architecture 4/4를 통과했으며 동일 분석 fixture 10개의 Library가 1280px/390px에서 violet·blue·green·berry로 분산되고 overflow가 없음을 확인했다.
- **Consequences**: Artwork mapping version을 올려 기존 profile의 시각 색상은 한 번 변경되지만 DB/API schema는 그대로다.

## D033: Branded stored-audio waveform and decode crossfade (2026-08-12)

- **Context**: 녹음 중 waveform은 brand gradient와 entrance transition을 사용하지만 저장 오디오의 공통 WaveSurfer player는 두 개의 보라 단색만 사용하고 decode 전 72px surface가 비어 있다가 실제 파형이 즉시 나타난다.
- **Constraints**: 저장 오디오는 live signal보다 차분해야 하고, loading placeholder가 가짜 amplitude처럼 보이면 안 된다. 기존 seek/segment/error fallback과 고정 높이로 인한 CLS 0 계약을 유지해야 한다.
- **Decision**: Unplayed wave는 muted violet/blue tint로 유지하고 progress wave에만 violet→blue→pink CanvasGradient를 사용한다. Decode 중에는 반복 파형 대신 grain-gradient veil과 loading label을 표시하고 ready에서 skeleton opacity out, waveform opacity 0→1·scaleY 0.94→1로 전환한다. Reduced-motion은 shimmer와 transform을 제거한다.
- **Rationale**: Live waveform과 같은 브랜드 family를 공유하되 진행 구간만 강하게 표현해 저장/재생 UI의 정보 위계를 보존한다. 실제 decoded waveform 자체를 애니메이션으로 생성하지 않아 오디오 데이터를 왜곡하지 않는다.
- **Evidence**: `src/shared/ui/audio-waveform-player/audio-waveform-player.tsx`, CSS Module, Storybook
- **Trace**: WaveSurfer `waveColor`는 quiet violet/blue 배열, `progressColor`는 `#7c3aed → #3b82f6 → #ec4899`, cursor는 semantic strong token으로 설정했다. 72px visual slot에 grain data texture와 abstract radial veil·1.8s sweep를 추가하고 ready에서 waveform 360/420ms opacity·scaleY, skeleton 280ms opacity transition을 연결했다. 실제 amplitude placeholder는 만들지 않았다. Storybook 16/16, unit 3/3, TypeScript, lint, architecture 4/4를 통과했고 Chromium 390px에서 ready/loading 높이 72px·overflow 0과 reduced-motion 정적 preview를 확인했다.
- **Consequences**: 공통 component를 쓰는 Profile, Recommendation, Mixing과 dev surface가 한 번에 갱신되며 native audio fallback은 브라우저 기본 스타일을 유지한다.

## D034: Brand gradient를 연속 signal에만 제한 (2026-08-12)

- **Context**: Landing과 live/stored waveform은 violet→blue→pink를 사용하지만 일부 구현은 raw hex·OKLCH를 반복하고, 제품의 다른 보라색 accent까지 모두 gradient로 바꾸면 상태 의미와 시각 위계가 약해질 수 있다.
- **Constraints**: black primary CTA, semantic status, focus ring, 작은 icon과 reference line의 대비를 유지하고 색만으로 데이터를 구분하지 않아야 한다.
- **Decision**: 전역 signal·soft·chart 역할별 brand color stop을 정의한다. 강한 3색 gradient는 live/stored waveform의 active 구간에 사용하고 연속형 보컬 분석 차트는 restrained chart stop을 사용하며 Landing Gradient Text도 signal stop을 읽는다. 상태·button·badge·icon·border는 기존 단색 semantic token을 유지한다.
- **Rationale**: 색의 반복보다 용도를 일관되게 제한할 때 브랜드가 더 선명해지고, 변화·진행·범위라는 동일한 의미가 화면 사이에서 연결된다.
- **Evidence**: `src/_app/styles/globals.css`, `src/shared/ui/voice-signal-core`, `src/shared/ui/audio-waveform-player`, `src/_pages/home/ui/landing-hero.tsx`, `src/entities/vocal-profile/ui`
- **Trace**: Global light/dark signal·soft·chart stop을 추가하고 Landing Gradient Text, live Canvas waveform, WaveSurfer progress를 같은 signal stop에 연결했다. Vocal range, histogram과 pitch trace는 restrained chart stop을 사용한다. Storybook 23/23, TypeScript, lint, architecture 4/4를 통과했고 Chromium에서 세 chart의 computed stop과 animation 0, overflow 0을 확인했다.
- **Consequences**: 기존 hard-coded brand stop은 제거되고, light/dark 조정은 token 한 곳에서 가능해진다. Profile artwork의 voice-derived analogous family와 semantic 단색 상태는 이 gradient 계약의 적용 대상이 아니다.

## D035: 보컬 차트에서는 neutral context와 restrained signal을 분리 (2026-08-12)

- **Context**: 강한 brand stop을 chart에 그대로 사용하자 실용 음역·histogram이 waveform보다 진하게 보였고, 전체 관측 음역까지 gradient가 적용되면서 일부 환경에서 검은 bar로 렌더됐다. 중앙음은 reference line인데 범례 항목까지 있어 세 번째 bar series처럼 오해됐다.
- **Decision**: 전체 관측 음역은 neutral `muted` bar로 복원하고 중앙음 범례 항목은 제거한다. 실용 음역·histogram·pitch trace만 background와 혼합한 chart 전용 violet→blue→pink stop을 사용하며 중앙음 reference line과 label은 neutral gray로 유지한다.
- **Rationale**: 전체 범위는 context, 실용 음역은 핵심 signal, 중앙음은 기준선이라는 서로 다른 역할을 색과 범례 구조가 그대로 설명한다.
- **Evidence**: `src/_app/styles/globals.css`, `src/entities/vocal-profile/ui/vocal-range-chart.tsx`, `src/entities/vocal-profile/ui/vocal-profile-results.tsx`, Storybook
- **Trace**: Light chart stop을 OKLCH lightness 0.68/0.70/0.72와 낮은 chroma로 분리하고 dark stop도 별도로 정의했다. Observed bar와 legend swatch는 `muted`, 중앙음 reference는 `muted-foreground`로 변경하고 중앙음 legend를 제거했다. Storybook 10/10, TypeScript와 lint를 통과했으며 Chromium에서 observed computed fill `oklch(0.97 0 0)`, legend 2개, 중앙음 legend 0과 overflow 0을 확인했다.

## D036: SVG gradient stop에는 CSS property와 concrete fallback을 함께 사용 (2026-08-12)

- **Context**: 일부 실제 화면에서 `stop-color="var(--brand-chart-*)"` presentation attribute가 해석되지 않거나 token이 아직 로드되지 않아 SVG 기본 stop-color인 검정으로 렌더됐다. 같은 token을 쓰는 legend background도 비어 보였다.
- **Decision**: SVG stop은 inline CSS `stopColor` property에서 `var(--brand-chart-*, <OKLCH fallback>)`를 사용하고 legend gradient에도 완전한 linear-gradient fallback을 제공한다. 정상 환경에서는 semantic token이 우선하며 fallback은 동일한 light restrained palette를 사용한다.
- **Rationale**: token 정본을 유지하면서도 SVG presentation attribute와 stylesheet load 차이에 따른 검정 fallback을 차단한다.
- **Evidence**: `src/entities/vocal-profile/ui/vocal-range-chart.tsx`, `src/entities/vocal-profile/ui/vocal-profile-results.tsx`, Storybook
- **Trace**: Chart fallback을 내부 `chart-brand.ts` 한 곳에 모으고 세 SVG gradient stop을 inline CSS property로 교체했다. Missing-token Story에서 custom property를 `initial`로 리셋해도 three gradient와 legend가 0.68/0.70/0.72 OKLCH fallback으로 렌더되고 black stop이 0임을 Storybook 11/11과 Chromium screenshot으로 확인했다. TypeScript와 lint도 통과했다.

## D037: Gradient token은 재사용 가능한 color stop만 유지 (2026-08-12)

- **Context**: Canvas, WaveSurfer와 SVG는 각 API에서 개별 color stop을 요구하고 CSS background가 필요한 chart legend도 browser fallback을 위해 `chart-brand.ts`에서 조립한다. 그 결과 `brand-gradient-signal/soft/chart` shorthand는 선언만 있고 참조가 없었다.
- **Decision**: 사용되지 않는 세 gradient shorthand의 light/dark 선언을 제거하고 실제 소비되는 signal·soft·chart 개별 color stop만 전역 token으로 유지한다.
- **Rationale**: 사용 API와 맞지 않는 추상화를 제거해 token 목록이 실제 계약을 정확히 반영하게 한다.
- **Evidence**: `src/_app/styles/globals.css`, source-wide `rg` 결과
- **Trace**: Light/dark에서 총 여섯 shorthand 선언을 제거하고 source-wide 검색 결과를 0건으로 만들었다. 개별 stop을 소비하는 chart/audio/live waveform/Landing Storybook 21/21, TypeScript와 lint를 통과했다.
