# Tasks: xai-inspired-landing-motion

## 태스크 규칙

- **상태**: `[TODO]` → `[DOING]` → `[DONE]`
- **태스크 공유 / 확인**:
  - `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 `tasks.md`에서 상태를 함께 갱신합니다
  - `[DOING] → [DONE]`: 완료 전 결과/검증을 공유하고 같은 수정에서 `Acceptance`와 `Checklist`를 함께 갱신합니다
  - 태스크 상태 변경 전에 승인이 필요한 경우는 문서화된 review checkpoint 또는 원격/파괴적 작업 직전뿐입니다.
  - 워크플로우가 요구하지 않는 standalone `OK` 승인 단계는 만들지 않습니다.
  - 해당 태스크의 `Checklist`에 unchecked 항목이 남아 있으면 `[DONE]`으로 전환하지 않습니다.
- **PRD 매핑(권장)**: 각 태스크 라인에 `[PRD-FR-001]` 또는 `[PRD-SCOPE-V1-DESKTOP-EDITOR]` 같은 기존 PRD 요구사항 ID 태그를 추가하거나, PRD와 무관한 태스크는 `[NON-PRD]`로 표시하세요.
  - 단, `tasks.md`에서 PRD ID를 임의로 만들지 마세요. `docs/prd` 또는 상위 요구사항 문서에 먼저 정의된 ID만 참조해야 합니다.
  - 레거시 문서에 아직 PRD ID가 없다면, 먼저 원문 요구사항 문서에 ID를 backfill한 뒤 `spec.md`의 `PRD Refs`와 태스크 태그를 함께 맞추세요.
  - `[NON-PRD]`는 내부 구현 작업 전용입니다. 사용자 동작, acceptance criteria, 범위가 바뀌는 태스크라면 PRD를 먼저 backfill하고 `[PRD-...]`로 태깅하세요.

---

## 로컬 추적 정보
- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/xai-inspired-landing-motion`
- **대기 중 변경 요청**: -
  - 구현 중 새로 수용한 사용자 요청을 잠시 표시하는 sync marker입니다
  - 요청을 `tasks.md`와 관련 문서에 반영한 뒤 값을 비우세요
  - pre-PR 리뷰 handoff를 시작하면 `Running`, 리뷰 결과 기록까지 끝나면 `Done`으로 변경
  - 형식: `결정: approve|changes_requested|blocked ...` (또는 `decision: ...`)
  - PR 생성 전 최종 통과 기준은 `approve`
  - 기본 베이스라인으로 `agents/skills/create-pr.md`(`Pre-PR 기본 체크리스트`) 기준을 따르세요
- **PR 리뷰**: -
  - PR 리뷰 handoff를 시작하면 `Running`, 팀에서 별도 완료 상태를 추적할 때만 `Done`으로 변경
- **PR 리뷰 Evidence**: -
  - 리뷰 지적사항을 왜/어떻게 반영했는지 `결정: ...`(또는 `decision: ...`) 형식으로 기록

---

## 태스크 엔트리 포맷

```markdown
- [TODO][PRD-FR-001] T-{feature-ref}-01 {태스크 제목}
  - Date: YYYY-MM-DD
  - Acceptance:
    - (검증 조건)
  - Checklist:
    - [ ] (서브 태스크)
```

> 위 예시의 `PRD-FR-001`은 가능한 `PRD-*` key 중 하나일 뿐입니다. 아직 PRD 원문에 정의되지 않았다면 태스크에 먼저 넣지 마세요.
> 처음엔 탐색/내부 작업이었더라도 제품 요구사항 변경으로 이어졌다면, `NON-PRD`로 두지 말고 PRD를 먼저 갱신한 뒤 `[PRD-...]`로 재태깅하세요.

---

## 태스크 목록

> 아래에 태스크를 추가하세요. **최소 1개가 필요**합니다.
> 태스크는 하나의 순차 리스트로 유지하고, 위에서 아래 순서 자체를 실행 우선순위로 취급하세요.
> 새 태스크 append에는 `npx lee-spec-kit task add <feature-ref> --title "..." --ref NON-PRD --acceptance "..." --check "..."` 사용을 우선하세요.
> 새 태스크는 마지막 기존 태스크 아래에 완전한 태스크 블록으로 추가하세요. `PRD-FR-001`이나 `PRD-SCOPE-V1-DESKTOP-EDITOR`처럼 이미 정의된 PRD key를 사용하거나, 내부 작업이면 `[NON-PRD]`를 사용합니다.
> placeholder 상태의 `Acceptance` / `Checklist`를 그대로 두지 마세요. 구체 항목이 아니면 구현을 시작하지 않습니다.
> 수동 편집이 필요하면 현재 태스크 근처가 아니라 `태스크 목록`의 마지막 기존 태스크 block 아래에만 append 하세요.

---

- [DONE][PRD-FR-046] T-F022-xai-inspired-landing-motion-01 중앙형 랜딩 구조와 제품 preview 재구성
  - Date: 2026-08-12
  - Acceptance:
    - 첫 viewport에 중앙 정렬 headline, 설명, 단일 primary CTA와 실제 profile 흐름으로 연결되는 voice preview가 함께 표시된다.
    - 기존 인증별 CTA href, ProductHeader, ProductFooter와 실제 3단계 제품 범위를 유지한다.
  - Checklist:
    - [x] landing page markup을 hero, voice preview와 후속 section 책임으로 정리했다.
    - [x] 가짜 진행률·점수·데이터와 crystal/prism 없이 semantic token으로 구성했다.
    - [x] signed-out과 signed-in CTA 및 공통 shell 회귀를 Storybook에서 확인했다.

- [DONE][PRD-FR-045] T-F022-xai-inspired-landing-motion-02 절제된 waveform·glow·reveal motion 구현
  - Date: 2026-08-12
  - Acceptance:
    - Hero waveform, masked dotted glow와 section reveal이 Copy Singer accent 범위 안에서 동작하며 layout shift를 만들지 않는다.
    - WebGL·GSAP·motion runtime 없이 CSS progressive enhancement로 구현하고 미지원 환경에서 콘텐츠가 정적으로 보인다.
  - Checklist:
    - [x] 기존 waveform/ripple CSS를 진폭·위상·glow 계층으로 확장했다.
    - [x] entry와 view reveal은 작은 opacity/translate 변화로 한 번만 실행되게 했다.
    - [x] dotted glow는 정적으로 유지하고 지속 animation은 첫 Hero의 waveform/ripple로 제한했다.

- [DONE][PRD-FR-046] T-F022-xai-inspired-landing-motion-03 3단계 scroll story와 반응형 fallback 완성
  - Date: 2026-08-12
  - Acceptance:
    - Desktop에서 분석, 추천, 선택형 AI 믹싱이 sticky scroll narrative로 실제 순서대로 연결된다.
    - Mobile 320px 이상에서는 sticky나 scroll-jacking 없이 단일 열로 표시되고 horizontal overflow가 없다.
  - Checklist:
    - [x] 세 단계 preview에 현재 제품 계약에 존재하는 정보만 사용했다.
    - [x] 실제 action은 Hero의 profile Link로 유지하고 story preview는 비상호작용 presentation으로 구분했다.
    - [x] scroll story 뒤에 trust 근거, 마지막 CTA와 footer가 이어지는 문서 순서를 확인했다.

- [DONE][PRD-FR-051] T-F022-xai-inspired-landing-motion-04 접근성·reduced-motion·Storybook 회귀 검증
  - Date: 2026-08-12
  - Acceptance:
    - Keyboard, focus-visible, accessible name, heading/landmark 구조와 WCAG AA 대비 기준을 충족한다.
    - Reduced-motion에서 장식 animation과 큰 transform이 제거돼도 모든 정보와 action이 유지된다.
  - Checklist:
    - [x] signed-out, signed-in, mobile과 reduced-motion Storybook 상태를 추가 또는 보강했다.
    - [x] Storybook browser interaction과 addon a11y 검증을 실행했다.
    - [x] TypeScript, lint와 architecture boundary 검사를 통과했다.

- [DONE][NON-PRD] T-F022-xai-inspired-landing-motion-05 브라우저 시각·성능 검증과 문서 동기화
  - Date: 2026-08-12
  - Acceptance:
    - Desktop/mobile/reduced-motion 브라우저 검증에서 hero, scroll story, CTA/footer가 의도대로 보이며 console 오류가 없다.
    - Production build가 통과하고 신규 animation runtime이나 WebGL dependency가 포함되지 않는다.
  - Checklist:
    - [x] desktop, mobile과 reduced-motion 결과 스크린샷을 생성하고 직접 검토했다.
    - [x] production build 및 관련 전체 검증 명령을 실행했다.
    - [x] product UI 디자인 문서, decisions와 workflow sync evidence를 최종 구현에 맞게 갱신했다.

- [DONE][PRD-FR-046] T-F022-xai-inspired-landing-motion-06 x.ai형 랜딩 정보 구조와 제품 모자이크 재설계
  - Date: 2026-08-12
  - Acceptance:
    - Hero는 x.ai처럼 작은 announcement, 절제된 display copy, 두 개 이하 CTA와 넓은 여백을 사용하고, 바로 아래 비대칭 제품 모자이크가 Copy Singer의 분석·추천·믹싱 흐름을 보여준다.
    - 기존 waveform, dotted glow, ripple과 장문 sticky story를 제거하고 mobile 320px 이상에서 같은 정보 순서를 유지한다.
  - Checklist:
    - [x] LandingHero와 LandingProductStory를 조용한 hero + bento product showcase 구조로 재구성했다.
    - [x] 가짜 점수·진행률·앨범 데이터 없이 실제 제품 개념만 표시했다.
    - [x] 기존 인증별 CTA, ProductHeader와 ProductFooter 계약을 유지했다.

- [DONE][PRD-FR-045] T-F022-xai-inspired-landing-motion-07 React Bits Orb 기반 분석 visual 도입
  - Date: 2026-08-12
  - Acceptance:
    - 목소리 분석의 중앙 효과는 React Bits Orb를 hue 294, rotateOnHover false, hoverIntensity 0으로 렌더링하며 waveform과 dotted motion을 사용하지 않는다.
    - 랜딩의 분석 card와 실제 분석 active ProcessHero는 같은 공통 Orb visual을 사용하고 success/failure 상태는 기존 icon과 의미를 유지한다.
    - Orb는 작은 client island로 격리되고 reduced-motion, WebGL 미지원과 viewport 밖 상태에서 안전한 정적 fallback 또는 정지를 제공한다.
  - Checklist:
    - [x] 공식 React Bits Orb source를 프로젝트 스타일과 TypeScript 규칙에 맞게 통합하고 ogl 의존성·라이선스를 기록했다.
    - [x] Landing product bento와 ProcessHero active tone에 공통 Orb를 적용했다.
    - [x] DPR, ResizeObserver, requestAnimationFrame lifecycle과 WebGL context cleanup을 제한했다.
    - [x] Orb가 action으로 오해되지 않도록 실제 profile CTA와 분리해 접근 가능한 presentation으로 제공했다.

- [DONE][PRD-FR-046] T-F022-xai-inspired-landing-motion-08 Editorial demo·metric band·Voice Notes·2-up CTA 완성
  - Date: 2026-08-12
  - Acceptance:
    - 긴 반복 sticky card 대신 x.ai식 2열 editorial product demo, hairline metric band, 4-up Voice Notes와 서로 다른 실제 목적지의 2-up CTA가 넓은 section whitespace로 구성된다.
    - 5초 최소 분석, 60초 최대 입력, 3단계 흐름처럼 계약상 참인 수치만 표시하고 가짜 뉴스·날짜·링크를 만들지 않는다.
  - Checklist:
    - [x] 분석→추천→믹싱 demo를 Aceternity scroll reveal source pattern으로 구성했다.
    - [x] metric band와 Voice Notes rail을 responsive하게 구현했다.
    - [x] profile 시작과 library 결과 보기 CTA의 목적지·위계를 구분했다.

- [DONE][PRD-FR-051] T-F022-xai-inspired-landing-motion-09 공통 ProcessHero Orb·성능·접근성·시각 parity 검증
  - Date: 2026-08-12
  - Acceptance:
    - 실제 분석 active ProcessHero의 dashed/conic visual을 랜딩과 같은 React Bits Orb로 교체하고 success/failure 상태는 기존 의미와 icon을 유지한다.
    - 360·390·768·1440 viewport, reduced-motion과 WebGL fallback에서 overflow·console 오류 없이 동작하고 x.ai 캡처와 동일 1440 폭 육안 비교에서 구성·여백·리듬이 확인된다.
  - Checklist:
    - [x] ProcessHero active story와 landing signed-out/in, mobile, reduced-motion, WebGL fallback Storybook 상태를 검증했다.
    - [x] axe, keyboard focus, 단일 h1, CTA href, DPR·offscreen RAF·cleanup과 production build를 검증했다.
    - [x] 브라우저 full-page screenshot을 직접 검토하고 feature·product design·decisions·workflow evidence를 동기화했다.

- [DONE][PRD-FR-045] T-F022-xai-inspired-landing-motion-10 Bento 보조 문구 정리와 Voice Notes Grainient 적용
  - Date: 2026-08-12
  - Acceptance:
    - Bento 카드 하단 오른쪽 설명과 bento 아래의 분석에서 믹싱까지 문구를 제거해 product mosaic의 정보 밀도를 낮춘다.
    - Voice Notes 4개 카드 배경은 React Bits Grainient 기반의 단일 shared canvas를 사용하고 Copy Singer violet·blue palette, reduced-motion·WebGL fallback과 offscreen 정지를 제공한다.
  - Checklist:
    - [x] BentoGridItem의 optional description surface와 LandingProductStory의 trailing caption을 제거했다.
    - [x] React Bits Grainient source를 공통 client island로 통합하고 4개 카드군 뒤에 canvas 하나만 사용했다.
    - [x] Storybook, typecheck, lint, build와 browser visual·overflow·canvas count를 검증했다.

- [DONE][PRD-FR-045] T-F022-xai-inspired-landing-motion-11 Voice Notes Tailwind grain gradient 복원과 Orb 배경 정리
  - Date: 2026-08-12
  - Acceptance:
    - Voice Notes는 이전의 독립 visual card와 하단 label·title·description 구조로 복원하고 각 visual 배경만 Tailwind 정적 grain-gradient로 구성한다.
    - VOICE SIGNAL과 Orb Storybook에서 Orb 외곽의 회색 반원 및 사각 배경이 보이지 않고 transparent surface와 정적 fallback이 유지된다.
  - Checklist:
    - [x] Grainient WebGL component와 관련 story·notice를 제거하고 Voice Notes를 Tailwind gradient/noise surface로 복원했다.
    - [x] VoiceOrb canvas가 준비되면 fallback poster를 숨기고 Landing Orb container 및 Storybook decorator를 background token에 맞게 정리했다.
    - [x] Storybook, typecheck, lint, build와 실제 browser screenshot에서 배경 artifact·overflow·canvas count를 검증했다.

- [DONE][PRD-FR-045] T-F022-xai-inspired-landing-motion-12 Voice Notes Aurora 이미지 자산 적용
  - Date: 2026-08-12
  - Acceptance:
    - Voice Notes 네 카드의 상단 visual은 사용자 제공 Aurora WebP를 각각 사용하고 기존 label·title·description 구조를 유지한다.
    - 이미지는 녹음(밝은 ice) → 실용 음역(cyan) → 추천 키(blue-violet) → AI 믹싱(dark neutral) 순으로 배치되며 텍스트를 이미지 위에 겹치지 않는다.
    - `object-cover` crop이 desktop과 mobile에서 빈 영역이나 왜곡 없이 보이고 dark visual은 기존 landing 대비와 조화를 유지한다.
  - Checklist:
    - [x] 사용자 제공 WebP 4장을 landing 전용 정적 자산 경로로 복사하고 의미가 드러나는 파일명으로 정리했다.
    - [x] Tailwind 생성 gradient/noise visual을 `next/image` 기반 visual로 교체하고 빈 alt의 장식 이미지 접근성 계약을 유지했다.
    - [x] Storybook과 browser에서 네 카드의 순서·crop·반응형 표시를 확인하고 관련 정적 검증을 통과했다.

- [DONE][PRD-FR-045] T-F022-xai-inspired-landing-motion-13 AI 믹싱 Album Cover Stack 적용
  - Date: 2026-08-12
  - Acceptance:
    - `선택한 추천곡만 AI 믹싱` 왼쪽의 검은 음표 아이콘 surface를 서로 다른 Pixabay 이미지 4장이 겹친 album-cover stack으로 교체한다.
    - 스택은 작은 회전·offset·layer shadow로 깊이를 만들고 hover/focus에서는 절제되게 펼쳐지며, reduced-motion에서는 전환 없이 같은 정적 구성을 유지한다.
    - 이미지는 Pixabay Content License 대상이며 출처·작가·원본 링크를 저장하고, 가짜 앨범명·아티스트나 실제 추천 결과로 오해할 정보를 표시하지 않는다.
  - Checklist:
    - [x] 식별 가능한 인물·로고가 없는 Pixabay 이미지 4장을 선정하고 landing 전용 정적 자산으로 저장했다.
    - [x] 첨부 gallery prompt의 stack composition을 현재 Tailwind·Server Component 구조에 맞게 구현하고 검은 음표 surface를 제거했다.
    - [x] Storybook, typecheck, lint, build와 desktop/mobile browser에서 layer, crop, overflow와 reduced-motion을 검증했다.

- [DONE][PRD-FR-045] T-F022-xai-inspired-landing-motion-14 Hero word reveal·Bento fade·Count Up motion 보강
  - Date: 2026-08-12
  - Acceptance:
    - Hero headline과 설명은 단어 단위로 순차 등장하고 bento product showcase 전체는 opacity 0에서 1로 천천히 한 번 등장한다.
    - Recommended key 숫자는 React Bits Count Up source pattern으로 애니메이션되고 화면에 보이는 동안 정해진 예시 키 사이를 주기적으로 순환한다.
    - metric band의 `5초+`, `60초`, `3단계`는 viewport 진입 시 0에서 목표값까지 증가하며 reduced-motion에서는 최종값을 즉시 표시한다.
  - Checklist:
    - [x] 접근 가능한 전체 문장을 유지하는 word stagger와 bento 단일 fade를 구현했다.
    - [x] 공통 CountUp client island를 추가하고 추천 키 순환·offscreen/background pause·cleanup을 구현했다.
    - [x] Landing Storybook, reduced-motion, typecheck, lint, build와 실제 browser에서 motion을 검증했다.

- [DONE][PRD-FR-045] T-F022-xai-inspired-landing-motion-15 Hero 설명 reveal·정적 metric·Recommended key visualizer 개선
  - Date: 2026-08-12
  - Acceptance:
    - Hero 설명은 단어별 stagger 없이 `5초 이상 녹음하거나 파일을 올리면 바로 시작할 수 있어요.` 안내처럼 문장 전체가 아래에서 위로 한 번 등장한다.
    - `5초+`, `60초`, `3단계`는 Count Up 없이 최종 문자열을 정적으로 표시한다.
    - Recommended key는 원본 키의 중앙 기준점과 waveform 형태의 scale을 보여주고, 변경된 key delta만 방향별 색으로 표시하며 `낮춤/높임` 문구로 의미를 함께 설명한다.
  - Checklist:
    - [x] Hero description의 word span을 제거하고 block reveal timing을 조정했다.
    - [x] Metric CountUp을 제거하고 Recommended key 전용 visualizer island를 구현했다.
    - [x] Storybook, reduced-motion, typecheck, lint, build와 desktop/mobile browser에서 visualizer 의미·motion·overflow를 검증했다.

- [DONE][PRD-FR-045] T-F022-xai-inspired-landing-motion-16 Hero 초기 숨김과 vertical delta bar 정교화
  - Date: 2026-08-12
  - Acceptance:
    - Hero 설명과 버튼은 animation 시작 전 opacity 0으로 완전히 보이지 않고 지정된 delay 이후 아래에서 위로 등장한다.
    - Recommended key는 상단/좌우 보조 라벨 없이 하단 `원본에서 N키 낮춤/높임` 설명 한 줄만 표시한다.
    - Key 변화는 가로 bar 범위가 아니라 각 세로 bar 내부의 원본 높이 대비 차감·증가 구간에만 방향색으로 표시된다.
  - Checklist:
    - [x] Hero meta entry의 initial opacity를 0으로 고정하고 설명·action timing을 검증했다.
    - [x] Key visualizer label을 정리하고 bar별 vertical delta segment 구조로 교체했다.
    - [x] Storybook, typecheck, lint, build와 desktop/mobile browser에서 초기 visibility·bar segment·overflow를 검증했다.

- [DONE][PRD-FR-045] T-F022-xai-inspired-landing-motion-17 Recommended key를 Sample Vocal Range Profile로 교체
  - Date: 2026-08-12
  - Acceptance:
    - Recommended key animation visualizer를 제거하고 실제 분석 결과가 사용하는 전체 관측 음역·실용 음역·중앙음 차트를 표시한다.
    - 랜딩 차트는 `Sample profile`로 가상 데이터임을 명시하고 실제 점수·사용자 결과로 오해될 상태를 만들지 않는다.
    - 실제 분석 결과와 랜딩 sample은 같은 axis, note formatting, range bar와 median reference line 컴포넌트를 사용한다.
  - Checklist:
    - [x] VocalRangeProfile의 chart를 독립 public component로 분리하고 기존 결과 화면을 회귀 없이 연결했다.
    - [x] Landing KeySurface에 가상 profile chart를 적용하고 Recommended key visualizer와 Count Up notice를 제거했다.
    - [x] Landing·profile Storybook, typecheck, lint, build와 desktop/mobile browser에서 chart layout·overflow를 검증했다.

- [DONE][PRD-FR-045] T-F022-xai-inspired-landing-motion-18 Bento 보조 라벨과 Orb 장식 제거
  - Date: 2026-08-12
  - Acceptance:
    - 보컬 프로필 chart surface에서 `Sample profile`과 `가상 데이터` 텍스트를 제거하고 chart 자체만 표시한다.
    - 하단 Orb surface에서 `VOICE SIGNAL` 텍스트와 Sparkles 아이콘을 제거하고 Orb visual만 유지한다.
    - chart의 accessible range label과 Orb canvas·fallback 계약은 유지한다.
  - Checklist:
    - [x] KeySurface와 OrbPoster의 보조 텍스트·아이콘 markup 및 불필요한 import를 제거했다.
    - [x] Landing Storybook assertion을 새 최소 표현 계약에 맞췄다.
    - [x] Storybook, typecheck, lint와 desktop/mobile browser에서 chart·Orb 정렬과 overflow를 검증했다.

- [DONE][PRD-FR-045] T-F022-xai-inspired-landing-motion-19 하단 섹션 reveal hierarchy 통일
  - Date: 2026-08-12
  - Acceptance:
    - Hero와 Bento 이후 section은 동일 easing을 공유하되 section heading, content group, 반복 card, metric hairline과 final CTA에 역할별 reveal을 사용한다.
    - Editorial은 제목에서 단계 순서로, metric은 hairline 뒤 정적 숫자로, Voice Notes는 heading 뒤 card opacity stagger로 나타나며 final CTA는 이동 없는 단일 fade를 사용한다.
    - 반복되는 일괄 translate-up을 제거하고 animation은 one-shot, reduced-motion과 no-script에서 즉시 최종 상태를 제공한다.
  - Checklist:
    - [x] `RevealContent`에 landing용 section·group·stagger·line·fade variant와 공통 timing token을 추가했다.
    - [x] Editorial, metric, Voice Notes, final CTA markup에 의미별 reveal target과 stagger index를 연결했다.
    - [x] Storybook, typecheck, lint, architecture boundary, build와 실제 desktop/mobile scroll에서 순서·overflow·reduced-motion을 검증했다.

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [x] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료
- [x] 테스트 실행 및 통과 (아래에 명령어/결과 기록)
- [x] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run test:storybook --run src/_pages/home/ui/landing-page.stories.tsx src/widgets/creation-funnel/ui/creation-funnel.stories.tsx src/shared/ui/voice-orb/voice-orb.stories.tsx` | `2026-08-12` | 통과 — landing signed-out/in·mobile·reduced-motion, ProcessHero active/success/failure와 WebGL fallback 10/10 |
| `pnpm run test:storybook --run src/_pages/home/ui/landing-page.stories.tsx src/entities/vocal-profile/ui/vocal-profile-summary.stories.tsx src/_pages/profile/ui/analysis-success.stories.tsx` | `2026-08-12` | 통과 — Landing Sample Vocal Range Profile과 실제 profile 결과 회귀 8/8 |
| `pnpm run test:storybook --run src/_pages/home/ui/landing-page.stories.tsx` | `2026-08-12` | 통과 — section·stagger·line·fade variant와 실제 scroll reveal, signed-out/in·mobile·reduced-motion 4/4 |
| `pnpm exec biome check src/_pages/home/ui/landing-page.tsx src/_pages/home/ui/landing-page.stories.tsx` | `2026-08-12` | 통과 — Voice Notes 이미지 markup과 Storybook assertion format/lint 확인 |
| `pnpm exec biome check src/_pages/home/ui/landing-page.tsx src/_pages/home/ui/landing-hero.tsx src/_pages/home/ui/landing-hero.module.css` | `2026-08-12` | 통과 — 3개 landing 파일 format/lint 확인 |
| `pnpm run typecheck` | `2026-08-12` | 통과 — 신규 landing story component 포함 TypeScript 오류 없음 |
| `pnpm run lint` | `2026-08-12` | 통과 — 전체 ESLint 오류 없음 |
| `pnpm run test:architecture-boundaries` | `2026-08-12` | 통과 — FSD, client/server와 root App boundary 4/4 |
| `pnpm run build` | `2026-08-12` | 통과 — Next.js 16.3 production build, TypeScript와 29개 static page 생성 완료 |
| Browser responsive QA | `2026-08-12` | 통과 — scroll 전 section 16px·card 6px·metric opacity 0·hairline scaleX 0·CTA pure fade 상태와 진입 후 최종 상태를 확인; editorial 4단계·metric 3개·Voice Notes 4개 순차 reveal, 390px/1440px overflow 0 |
| Voice Notes / Orb QA | `2026-08-12` | 통과 — 독립 Voice Notes 4개와 Tailwind grain gradient 직접 검토, Grainient canvas 0개·Orb canvas 1개, Orb root transparent·fallback opacity 0, gray half/square artifact와 horizontal overflow 0 확인; 관련 Storybook 10/10 통과 |
| Voice Notes Aurora QA | `2026-08-12` | 통과 — 1440×1000에서 4-up 263×159 crop, 390×844에서 1열 335×203 crop과 밝은 ice→cyan→blue-violet→dark neutral 순서를 직접 확인; desktop/mobile horizontal overflow 0, console warning/error 0 |
| Album Cover Stack QA | `2026-08-12` | 통과 — 1440×1000에서 4개 cover layer와 hover fan-out, 390×844에서 stacked mixing card와 crop 확인; horizontal overflow 0, console warning/error 0, reduced-motion story 통과 |

<!-- lee-spec-kit:workflow-sync 2026-08-12T05:18:59.000Z -->
