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
  - **머지 후 확인**: 실제 결과/영향
- **Evidence**:
  - **Commit**: `654fd3a` (`feat(F022-xai-inspired-landing-motion): 중앙형 랜딩 구조와 제품 preview 재구성`)
  - **PR**: PR 링크
  - **Test/Log**: `pnpm run test:storybook --run src/_pages/home/ui/landing-page.stories.tsx` 통과 (2/2)
- **Consequences**: 결과 및 영향 (선택사항)

## D002: CSS progressive enhancement motion (2026-08-12)

- **Context**: Hero와 후속 section에 Aceternity/React Bits 계열의 glow·fade·reveal 감각을 적용해야 한다.
- **Constraints**: 기본 콘텐츠는 항상 보여야 하고 reduced-motion, CSS animation 미지원, Server Component와 초기 bundle 기준을 지켜야 한다.
- **Options**: motion 또는 GSAP runtime 도입; IntersectionObserver client island; CSS keyframe과 view timeline progressive enhancement
- **Decision**: 정적 dotted glow, CSS waveform/ripple, 1회 entry와 @supports 안의 view timeline reveal을 사용한다.
- **Rationale**: 새 runtime과 hydration 없이 기본 HTML을 visible 상태로 유지하고, 지원 환경에서만 장식 motion을 더할 수 있다.
- **Trace**:
  - **At DOING start**: CSS만으로 motion을 구성하되 기본 opacity와 문서 흐름은 visible 상태로 유지하는 가설로 시작했다.
  - **Before DONE**: entry 시작 opacity를 0이 아닌 값으로 보정해 첫 animation frame에서도 preview가 접근성 검사에서 visible하도록 했고, Storybook 회귀를 재통과했다.
  - **Post-merge check**: Update this line after merge when applicable.
- **Evidence**:
  - **Commit**: `817aa52` (`feat(F022-xai-inspired-landing-motion): waveform glow와 reveal motion 구현`)
  - **Test/Log**: pnpm run test:storybook --run src/_pages/home/ui/landing-page.stories.tsx 통과 (2/2)
- **Consequences**: 지원하지 않는 browser에서는 section reveal이 생략되지만 정보와 action은 동일하게 유지된다.
