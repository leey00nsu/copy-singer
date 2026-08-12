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

- [DONE][PRD-FR-046] T-F022-xai-inspired-landing-motion-20 프로필 녹음 Voice Core 통합
  - Date: 2026-08-12
  - Acceptance:
    - 분석 전의 정적 preview bar와 녹음 중 live waveform canvas를 제거하고 idle→recording→processing을 같은 Orb 계열 Voice Core로 연결한다.
    - idle은 WebGL 없는 저채도 정적 poster, recording은 실제 마이크 RMS·peak에 따라 작은 scale·glow만 반응하고 processing은 기존 full Orb를 유지한다.
    - 녹음 시간·5초/10초/60초 안내·진행률·취소/완료 action과 준비된 오디오의 기능성 playback waveform은 유지한다.
  - Checklist:
    - [x] 공통 `VoiceSignalCore`와 recording signal analyser lifecycle을 구현했다.
    - [x] `RecorderSurface` idle/requesting/recording/stopping 및 `ProcessHero` active visual을 Voice Core로 연결하고 기존 bar/canvas를 제거했다.
    - [x] Storybook, typecheck, lint, architecture boundary, build와 reduced-motion/WebGL fallback에서 state·cleanup·overflow를 검증했다.

- [DONE][PRD-FR-046] T-F022-xai-inspired-landing-motion-21 Idle Orb·녹음 반응·오디오 notice 정교화
  - Date: 2026-08-12
  - Acceptance:
    - 분석 전 idle Voice Core도 full Orb shader를 느리게 움직이며 reduced-motion/WebGL 실패에서는 정적 poster로 fallback한다.
    - 녹음 중에는 작은 음량과 peak 변화가 현재보다 명확한 scale·glow 변화로 보이되 layout과 control 위치는 움직이지 않는다.
    - 짧은 오디오 안내는 위아래 hairline panel 대신 둥근 inline notice로 표시하고 valid/invalid tone과 icon을 구분한다.
  - Checklist:
    - [x] Idle의 강제 fallback을 제거하고 저채도 dynamic Orb style을 유지한다.
    - [x] RMS·peak gain, attack/release와 CSS scale·glow 범위를 확대한다.
    - [x] 오디오 상태 notice와 Storybook state를 갱신하고 typecheck·lint·build·browser에서 검증한다.

- [DONE][PRD-FR-046] T-F022-xai-inspired-landing-motion-22 Border hierarchy·공통 Status Notice·neutral idle Orb
  - Date: 2026-08-12
  - Acceptance:
    - 사용자 변경 요청 `B`를 반영해 page/section/status surface의 의미 없는 상·하단 hairline을 제거하되, form control·table/list row·focus·modal boundary처럼 구조를 전달하는 border는 유지한다.
    - Recorder Orb surface는 recording에서도 투명·무경계 상태를 유지하고, VoiceOrb canvas와 fallback은 사각형 배경을 드러내지 않는다.
    - Idle Orb는 움직임을 유지하면서 grayscale에 가까운 neutral tone이며 recording부터만 color와 audio-reactive glow를 사용한다.
    - Inline status/alert card는 shared `StatusNotice`로 공통화하고 icon·한 줄/여러 줄 copy의 수직 정렬, radius, spacing과 tone을 전 프로젝트에서 동일하게 사용한다.
  - Checklist:
    - [x] Border 사용처를 구조적/장식적으로 분류하고 장식용 page·section hairline을 제거했다.
    - [x] Recorder/VoiceOrb의 배경·border·idle grayscale·recording color 전환을 수정했다.
    - [x] Shared `StatusNotice`와 stories를 만들고 기존 card형 status/alert를 마이그레이션했다.
    - [x] Storybook, typecheck, lint, architecture boundary, build와 desktop/mobile browser에서 투명 배경·정렬·overflow를 검증했다.

- [DONE][PRD-FR-046] T-F022-xai-inspired-landing-motion-23 Orb 외곽 gray halo 제거
  - Date: 2026-08-12
  - Acceptance:
    - VoiceOrb의 투명 alpha mask가 shader의 무채색 외곽 halo를 남기지 않고 color Orb 본체 경계에서 자연스럽게 사라진다.
    - Idle grayscale, recording color response, processing과 WebGL fallback은 기존 상태 계약을 유지한다.
  - Checklist:
    - [x] Fragment alpha mask 범위를 Orb 본체 반경에 맞게 조정했다.
    - [x] Storybook과 browser screenshot에서 gray ring·square artifact·overflow가 없음을 검증했다.

- [DONE][PRD-FR-046] T-F022-xai-inspired-landing-motion-24 Orb 본체 gray contour 제거
  - Date: 2026-08-12
  - Acceptance:
    - 확대 화면에서도 Orb 본체 가장자리에 회색 contour가 남지 않고 color edge에서 투명하게 feather된다.
    - Idle grayscale mode는 별도 CSS filter로 유지되고 recording/processing color Orb의 내부 색과 motion은 보존된다.
  - Checklist:
    - [x] Canvas가 기대하는 unpremultiplied RGB와 radial alpha를 출력해 이중 premultiplication을 제거했다.
    - [x] 확대 screenshot과 기본 크기 Storybook에서 contour 제거를 검증했다.

- [DONE][PRD-FR-047] T-F022-xai-inspired-landing-motion-25 Header/Footer rail border와 scroll glass
  - Date: 2026-08-12
  - Acceptance:
    - Header와 Footer의 separator는 viewport 전체가 아니라 공통 최대 content rail 폭에서만 표시된다.
    - Header는 page top에서 border가 없고, scroll threshold를 넘으면 content rail border가 나타난다.
    - Header background는 content가 아주 희미하게 비치는 neutral translucent fill과 backdrop blur를 사용한다.
    - Landing과 authenticated product route가 같은 ProductHeader/ProductFooter 계약을 공유한다.
  - Checklist:
    - [x] ProductHeader에 scroll state와 rail-scoped separator를 구현했다.
    - [x] ProductFooter separator를 rail 내부로 이동했다.
    - [x] Storybook과 browser에서 top/scrolled, desktop/mobile과 footer 폭을 검증했다.

- [DONE][PRD-FR-048] T-F022-xai-inspired-landing-motion-26 Hero 브랜드 Gradient Text
  - Date: 2026-08-12
  - Acceptance:
    - Landing headline의 `내 목소리`만 React Bits Gradient Text 기반 animation을 사용한다.
    - Gradient는 Copy Singer의 violet data accent, blue와 restrained pink 조합이며 animation duration은 1.5초다.
    - 기존 word reveal과 접근 가능한 단일 heading 문구를 유지하고 reduced-motion에서는 정적 gradient로 표시한다.
  - Checklist:
    - [x] `내 목소리` phrase를 기존 word reveal 구조 안에서 별도 gradient span으로 분리했다.
    - [x] 1.5초 gradient animation과 reduced-motion fallback을 구현했다.
    - [x] Storybook과 browser에서 headline 문구·animation duration·overflow를 검증했다.

- [DONE][PRD-FR-048] T-F022-xai-inspired-landing-motion-27 Gradient Text seamless loop
  - Date: 2026-08-12
  - Acceptance:
    - `내 목소리` gradient가 반복 경계에서 100%→0%로 순간 이동하지 않고 0%→100%→0%로 부드럽게 왕복한다.
    - 1.5초 duration, 기존 word reveal과 reduced-motion 정적 gradient를 유지한다.
  - Checklist:
    - [x] Gradient keyframe의 시작·종료 frame을 동일하게 만들었다.
    - [x] Storybook browser에서 duration·iteration·중간/종료 position을 검증했다.

- [DONE][PRD-FR-048] T-F022-xai-inspired-landing-motion-28 공식 React Bits Gradient Text 통합
  - Date: 2026-08-12
  - Acceptance:
    - `motion`을 설치하고 공식 React Bits `GradientText` source의 frame-driven yoyo 동작을 shared client component로 통합한다.
    - `내 목소리` 전체가 하나의 연속 brand gradient를 공유하고 `animationSpeed=1.5`는 편도 1.5초·왕복 3초로 동작한다.
    - 기존 단어 reveal, 단일 accessible H1과 reduced-motion 정적 fallback을 유지한다.
  - Checklist:
    - [x] `motion` dependency와 source attribution을 추가했다.
    - [x] Gradient Text를 shared component로 만들고 Hero에 연결했다.
    - [x] Storybook에서 단일 gradient field, yoyo timing과 reduced-motion 계약을 검증했다.

- [DONE][PRD-FR-048] T-F022-xai-inspired-landing-motion-29 Landing Motion primitive 최적화
  - Date: 2026-08-12
  - Acceptance:
    - Hero의 수동 entry keyframe과 공통 RevealContent의 직접 IntersectionObserver/state/CSS transition을 Motion primitive로 교체한다.
    - section·stagger·line·fade 역할, one-shot viewport 진입, reduced-motion, no-JS content visibility와 기존 문서 순서를 유지한다.
    - Orb WebGL/audio RAF와 단순 hover CSS는 Motion으로 옮기지 않고 책임 경계를 문서화한다.
  - Checklist:
    - [x] Hero word/copy/action entry를 Motion variants로 통합했다.
    - [x] RevealContent를 Motion viewport/selector animation으로 통합했다.
    - [x] Landing Storybook, architecture, build와 responsive browser 회귀를 검증했다.

- [DONE][PRD-FR-048] T-F022-xai-inspired-landing-motion-30 Gradient Text baseline 정렬
  - Date: 2026-08-12
  - Acceptance:
    - `내 목소리`와 조사 `에`가 같은 H1 font-size·line-height·baseline에 정렬된다.
    - Border를 표시하지 않는 Gradient Text는 inline glyph를 불필요하게 clipping하지 않는다.
    - 공식 gradient motion, headline wrapping과 reduced-motion 계약을 유지한다.
  - Checklist:
    - [x] Text-only wrapper의 overflow와 vertical alignment를 수정했다.
    - [x] Storybook과 Chromium desktop/mobile에서 computed size·baseline·overflow를 검증했다.

- [DONE][PRD-FR-048] T-F022-xai-inspired-landing-motion-31 녹음 Orb 하단 실시간 Scrolling Waveform
  - Date: 2026-08-12
  - Acceptance:
    - 녹음 중 Orb를 유지하고 바로 아래에 ElevenLabs UI Waveform의 smooth-scrolling canvas pattern을 표시한다.
    - 기존 microphone stream/analyser lifecycle을 재사용하며 waveform bar는 violet→blue→pink 브랜드 gradient와 edge fade를 사용한다.
    - idle/requesting/stopping/processing에는 scrolling waveform이 없고 reduced-motion에서는 scroll이 정지한 정적 파형을 제공한다.
  - Checklist:
    - [x] 공식 Waveform source·license·적용 범위를 기록했다.
    - [x] VoiceSignalCore의 analyser에서 Orb level과 scrolling history를 함께 갱신했다.
    - [x] Storybook, cleanup, desktop/mobile visual과 overflow를 검증했다.

- [DONE][PRD-FR-048] T-F022-xai-inspired-landing-motion-32 Recorder timer·Orb·Waveform transition 정교화
  - Date: 2026-08-12
  - Acceptance:
    - 녹음 전에는 0:00.0 타이머를 노출하지 않고 recording 시작 후에만 경과 시간을 표시한다.
    - Idle grayscale Orb는 recording 전환 시 색상과 반응 강도가 서서히 이어지며 갑자기 교체되어 보이지 않는다.
    - Waveform 공간은 높이 transition으로 자연스럽게 열리고 canvas는 opacity 0에서 등장해 주변 콘텐츠가 갑자기 밀리지 않는다.
  - Checklist:
    - [x] RecorderSurface의 timer 조건부 노출과 recording layout transition을 구현했다.
    - [x] VoiceSignalCore의 Orb filter와 waveform opacity transition을 구현했다.
    - [x] Storybook, reduced-motion, desktop/mobile layout shift와 회귀를 검증했다.

- [DONE][PRD-FR-047] T-F022-xai-inspired-landing-motion-33 공통 Product Page Intro와 Login 브랜드 연결
  - Date: 2026-08-12
  - Acceptance:
    - 제품 index/detail/task 화면이 공통 page intro의 typography·spacing 계약을 재사용하고 route별 과대·과소 hero 편차를 줄인다.
    - Login은 공통 Product Header/Footer chrome과 절제된 voice visual을 사용하며 하나의 Google 로그인 action과 법적 문구를 유지한다.
    - 공통 intro와 Login은 Server/Client boundary를 불필요하게 확장하지 않고 390px/1440px에서 overflow가 없다.
  - Checklist:
    - [x] Shared ProductPageIntro와 variant/story를 구현한다.
    - [x] Login과 대표 index/detail/task 화면에 공통 intro를 적용한다.
    - [x] Login·대표 화면 Storybook, 접근성, desktop/mobile visual을 검증한다.

- [DONE][PRD-FR-047] T-F022-xai-inspired-landing-motion-34 Account·Admin editorial hierarchy 정리
  - Date: 2026-08-12
  - Acceptance:
    - Account는 identity와 ticket balance를 desktop 요약 composition으로 제공하고 ledger는 전체 폭 작업 surface로 유지한다.
    - Admin metric은 반복 bordered card가 아닌 compact stat band로 표현되며 form·filter·table의 구조적 border는 유지한다.
    - 작은 보조 텍스트의 가독성을 높이고 Admin의 넓은 rail은 명시적인 table-density 예외로 유지한다.
  - Checklist:
    - [x] Account desktop/mobile composition을 정리한다.
    - [x] Admin metric·section hierarchy와 text scale을 정리한다.
    - [x] Account·Admin Storybook과 responsive visual을 검증한다.

- [DONE][PRD-FR-047] T-F022-xai-inspired-landing-motion-35 브랜드 artwork·Creation stepper·Recommendation density 정리
  - Date: 2026-08-12
  - Acceptance:
    - Vocal profile artwork는 deterministic identity를 유지하면서 브랜드 hue family 안에서만 생성된다.
    - Creation stepper는 semantic state를 유지한 가벼운 progress rail로 표현된다.
    - Recommendation desktop은 검색·필터·결과가 더 빠르게 노출되고 mobile 순서와 선택 action 접근성이 유지된다.
  - Checklist:
    - [x] Artwork hue mapping과 관련 테스트를 갱신한다.
    - [x] Creation funnel stepper visual과 Storybook을 갱신한다.
    - [x] Recommendation intro density와 Success story action assertion을 실제 UI 계약에 맞춘다.
    - [x] TypeScript, lint, architecture, Storybook과 desktop/mobile browser QA를 통과한다.

- [DONE][PRD-FR-047] T-F022-xai-inspired-landing-motion-36 보컬 분석 기반 deterministic artwork
  - Date: 2026-08-12
  - Acceptance:
    - Artwork base hue와 색차는 제출 보컬의 중앙음과 음역 폭에 따라 달라지고 안정도·유성음 비율·RMS가 채도·밝기·highlight에 반영된다.
    - Profile ID seed는 위치·각도·미세 편차만 담당하며 동일 입력은 새로고침과 화면 간 이동에서도 동일한 artwork를 생성한다.
    - Library, Profile Detail, Mixing History와 Mixing Detail은 같은 최소 분석 지표를 전달하며 이전 payload에는 안전한 ID fallback을 제공한다.
    - DB artwork 컬럼이나 원본 오디오 재처리를 추가하지 않는다.
  - Checklist:
    - [x] Artwork analysis input·mapping·fallback 계약과 단위 테스트를 구현한다.
    - [x] Vocal Profile과 Mixing payload/call site에 최소 분석 지표를 연결한다.
    - [x] 대표 Storybook, TypeScript, lint, architecture와 browser palette QA를 통과한다.

- [DONE][PRD-FR-047] T-F022-xai-inspired-landing-motion-37 Aurora Gradient형 grain texture 정교화
  - Date: 2026-08-12
  - Acceptance:
    - Voice-derived color mapping 위에 fine/coarse monochrome grain이 겹쳐져 Aurora Gradient 계열의 표면 질감이 보인다.
    - Grain은 28px mixing thumbnail과 44px profile thumbnail에서도 인지되고 큰 detail artwork에서는 반복 타일 경계가 두드러지지 않는다.
    - 정적 CSS/SVG texture만 사용하며 canvas, 네트워크 asset 또는 DB 변경을 추가하지 않는다.
  - Checklist:
    - [x] Fine/coarse grain과 soft vignette layer를 구현한다.
    - [x] Palette·Library·Mixing Storybook에서 크기별 질감을 검증한다.
    - [x] TypeScript, lint, architecture와 desktop/mobile browser QA를 통과한다.

- [DONE][PRD-FR-047] T-F022-xai-inspired-landing-motion-38 Aurora preset 기반 restrained artwork palette
  - Date: 2026-08-12
  - Acceptance:
    - Artwork 하나에는 Aurora Gradient Generator의 `Northern Sky`, `Ocean Blue`, `Forest`, `Berry`처럼 인접한 hue family만 사용하고 원거리 보색이 동시에 섞이지 않는다.
    - 중앙음은 deterministic family를 선택하고 음역·안정도·유성음·RMS는 같은 family 안의 spread·채도·명도만 조절해 보컬 기반 구분을 유지한다.
    - Grain은 사이트 기본값인 25% 수준으로 절제하고 작은/큰 artwork에서 색을 탁하게 덮지 않는다.
    - 기존 payload fallback, 화면 간 결정성, DB 무변경 계약을 유지한다.
  - Checklist:
    - [x] Preset-derived analogous family와 제한된 saturation/lightness mapping을 구현한다.
    - [x] Unit/Storybook assertion으로 결정성과 family 내부 hue 범위를 검증한다.
    - [x] Palette·Library의 desktop/mobile browser QA와 TypeScript/lint를 통과한다.

- [DONE][PRD-FR-047] T-F022-xai-inspired-landing-motion-39 보컬 signature 기반 palette family 분산
  - Date: 2026-08-12
  - Acceptance:
    - 중앙음이 비슷한 일반적인 프로필 목록에서도 Berry·Forest·Ocean·Northern·Violet family가 deterministic하게 분산된다.
    - Family 선택은 저장된 분석 지표와 profile ID를 함께 사용하며 같은 프로필은 새로고침과 화면 이동에서 동일하다.
    - 개별 artwork는 기존처럼 하나의 analogous family 안에 머물고 grain·payload·DB 계약은 바뀌지 않는다.
  - Checklist:
    - [x] Voice signature hash 기반 five-family selector와 Aurora Violet ramp를 구현한다.
    - [x] 동일 분석값을 가진 여러 profile ID에서도 family 분산과 결정성을 단위/Storybook으로 검증한다.
    - [x] Palette·Library desktop/mobile QA와 TypeScript/lint를 통과한다.

- [DONE][PRD-FR-047] T-F022-xai-inspired-landing-motion-40 공통 audio waveform brand/loading transition
  - Date: 2026-08-12
  - Acceptance:
    - 모든 `AudioWaveformPlayer` 사용 화면에서 미재생 파형은 quiet brand tint, 진행 구간은 violet→blue→pink accent로 표현된다.
    - Decode 전 72px 영역이 비어 보이지 않고 추상 skeleton이 표시되며 ready 시 실제 파형과 부드럽게 crossfade한다.
    - Skeleton은 실제 audio amplitude를 암시하지 않고 accessible loading status를 제공하며 reduced-motion에서는 shimmer·transform이 제거된다.
    - 기존 play/pause/seek/mute/segment/error fallback과 layout 높이를 유지한다.
  - Checklist:
    - [x] WaveSurfer brand gradient와 loading/ready surface를 구현한다.
    - [x] Storybook에서 loading, ready, reduced-motion과 기존 controls를 검증한다.
    - [x] Audio player unit, TypeScript, lint, architecture와 browser QA를 통과한다.

- [DONE][PRD-FR-047] T-F022-xai-inspired-landing-motion-41 ready audio waveform 배경 잔상 제거
  - Date: 2026-08-12
  - Acceptance:
    - 파형 decode가 완료되면 loading skeleton과 muted surface 색이 완전히 사라지고 페이지 배경이 그대로 보인다.
    - 실제 파형과 브랜드 progress gradient, 고정 높이, loading transition 계약은 유지한다.
  - Checklist:
    - [x] ready 상태의 visual surface를 투명하게 전환한다.
    - [x] Storybook에서 ready 배경 투명성과 loading surface 유지를 검증한다.

- [DONE][PRD-FR-047] T-F022-xai-inspired-landing-motion-42 브랜드 signal gradient token과 데이터 시각화 통합
  - Date: 2026-08-12
  - Acceptance:
    - violet·blue·pink 브랜드 색은 전역 token에서 관리되고 live/stored waveform과 Landing Gradient Text가 같은 source를 사용한다.
    - 음역 bar, 음정 histogram과 pitch trace는 static brand gradient를 사용하되 label·reference line·상태·button은 단색 semantic color를 유지한다.
    - light/dark에서 정보가 색만으로 전달되지 않고 기존 label, tooltip, range와 status text가 유지된다.
  - Checklist:
    - [x] 공통 signal/soft/chart brand color stop을 추가하고 raw color를 제거한다.
    - [x] 저장/실시간 waveform, Landing Gradient Text와 보컬 분석 차트에 token을 연결한다.
    - [x] Storybook, TypeScript, lint, architecture와 browser QA를 통과한다.

- [DONE][PRD-FR-047] T-F022-xai-inspired-landing-motion-43 보컬 차트 gradient 강도와 범례 정리
  - Date: 2026-08-12
  - Acceptance:
    - 전체 관측 음역 bar는 neutral gray로 표시하고 실용 음역만 절제된 brand gradient를 사용한다.
    - 중앙음은 chart 내부 label이 있는 reference line으로만 설명하며 별도 series처럼 보이는 범례 항목은 제거한다.
    - Histogram과 pitch trace를 포함한 chart gradient는 기존보다 낮은 채도와 대비로 표시된다.
  - Checklist:
    - [x] chart 전용 restrained brand stop을 추가한다.
    - [x] observed range와 중앙음 범례를 정리한다.
    - [x] Storybook, TypeScript와 browser QA를 통과한다.

- [DONE][PRD-FR-047] T-F022-xai-inspired-landing-motion-44 SVG chart gradient browser fallback
  - Date: 2026-08-12
  - Acceptance:
    - SVG presentation attribute에서 CSS custom property를 해석하지 못하거나 신규 token stylesheet가 지연된 환경에서도 chart가 검정으로 fallback되지 않는다.
    - Range, histogram, pitch trace와 legend는 동일한 restrained chart palette를 유지한다.
  - Checklist:
    - [x] SVG stop과 legend에 명시적 CSS color fallback을 추가한다.
    - [x] token 미정의 fixture와 정상 token 환경을 Storybook에서 검증한다.
    - [x] TypeScript, lint와 browser QA를 통과한다.

- [DONE][PRD-FR-047] T-F022-xai-inspired-landing-motion-45 미사용 brand gradient shorthand 제거
  - Date: 2026-08-12
  - Acceptance:
    - `brand-gradient-signal`, `brand-gradient-soft`, `brand-gradient-chart` 선언을 제거한다.
    - 실제 사용 중인 signal·soft·chart 개별 color stop과 모든 렌더 결과는 유지한다.
  - Checklist:
    - [x] light/dark의 미사용 shorthand 여섯 선언을 제거한다.
    - [x] source 검색, Storybook, TypeScript와 lint로 회귀를 검증한다.

- [DONE][PRD-FR-047] T-F022-xai-inspired-landing-motion-46 보컬 chart palette 미세 조정
  - Date: 2026-08-12
  - Acceptance:
    - light/dark chart stop의 명도를 높이고 chroma를 낮춰 signal waveform보다 차분한 시각 위계를 유지한다.
    - CSS token, browser fallback과 Storybook 기대값이 동일하다.
  - Checklist:
    - [x] light/dark chart stop과 fallback을 같은 값으로 조정한다.
    - [x] Storybook 5/5, TypeScript와 browser visual QA를 통과한다.

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [x] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료
- [x] 테스트 실행 및 통과 (아래에 명령어/결과 기록)
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run test:storybook --run src/_pages/home/ui/landing-page.stories.tsx src/widgets/creation-funnel/ui/creation-funnel.stories.tsx src/shared/ui/voice-orb/voice-orb.stories.tsx` | `2026-08-12` | 통과 — landing signed-out/in·mobile·reduced-motion, ProcessHero active/success/failure와 WebGL fallback 10/10 |
| `pnpm run test:storybook --run src/shared/ui/product-page-intro/product-page-intro.stories.tsx src/_pages/login/ui/login-screen.stories.tsx src/_pages/library/ui/library-page.stories.tsx src/_pages/recommendation-detail/ui/recommendation-results.stories.tsx src/_pages/mixing-detail/ui/mixing-detail.stories.tsx` | `2026-08-12` | 통과 — ProductPageIntro 3 variant, Login brand bridge, index/task/detail 대표 화면과 action 회귀 20/20 |
| `pnpm run test:storybook --run src/_pages/account/ui/account-overview.stories.tsx src/_pages/admin/ui/admin-metric-band.stories.tsx` | `2026-08-12` | 통과 — Account summary/ledger와 Admin stat band 회귀 4/4 |
| `pnpm run test:storybook --run src/widgets/creation-funnel/ui/creation-funnel.stories.tsx src/_pages/recommendation-detail/ui/recommendation-results.stories.tsx src/entities/vocal-profile/ui/vocal-profile-summary.stories.tsx src/_pages/library/ui/library-page.stories.tsx` | `2026-08-12` | 통과 — lightweight stepper, Recommendation action/density와 brand artwork 대표 화면 회귀 19/19 |
| `pnpm exec tsx --test tests/vocal-profile-artwork.test.ts` | `2026-08-12` | 통과 — 동일 보컬 결정성, 분석값 변화, analogous family 최대 hue 거리 65° 이하, 일반 voice 40개에서 five-family 분산과 legacy fallback 검증 5/5 |
| `pnpm exec tsx --test tests/api-contracts.test.ts tests/mixing-history-ui.test.tsx tests/mixing-status-presentation.test.ts` | `2026-08-12` | 통과 — optional artwork payload 하위 호환, mixing list와 상태 presentation 회귀 16/16 |
| `pnpm run test:storybook --run src/entities/vocal-profile/ui/vocal-profile-artwork.stories.tsx src/_pages/library/ui/library-page.stories.tsx src/_pages/mixing-detail/ui/mixing-detail.stories.tsx` | `2026-08-12` | 통과 — preset-derived palette 8종, grain opacity 20%/5%, Library와 Mixing Detail artwork 회귀 7/7 |
| `pnpm run test:storybook --run src/shared/ui/audio-waveform-player/audio-waveform-player.stories.tsx src/_pages/profile/ui/voice-scan-input.stories.tsx src/_pages/mixing-detail/ui/mixing-detail.stories.tsx` | `2026-08-12` | 통과 — audio ready/loading/reduced-motion, brand progress gradient와 Profile/Mixing controls 회귀 16/16 |
| `pnpm run test:storybook --run src/shared/ui/audio-waveform-player/audio-waveform-player.stories.tsx` | `2026-08-12` | 통과 — ready surface·waveform 투명, skeleton hidden과 loading/reduced-motion 회귀 3/3 |
| `pnpm run test:storybook --run src/entities/vocal-profile/ui/vocal-profile-results.stories.tsx src/shared/ui/audio-waveform-player/audio-waveform-player.stories.tsx src/_pages/profile/ui/voice-scan-input.stories.tsx src/_pages/home/ui/landing-page.stories.tsx src/_pages/mixing-detail/ui/mixing-detail.stories.tsx` | `2026-08-12` | 통과 — light/dark brand chart stop, live/stored waveform, Landing과 Mixing 회귀 23/23 |
| `pnpm run test:storybook --run src/entities/vocal-profile/ui/vocal-profile-results.stories.tsx src/_pages/home/ui/landing-page.stories.tsx src/_pages/profile/ui/analysis-success.stories.tsx` | `2026-08-12` | 통과 — 정상/missing-token SVG fallback, restrained chart stop, 2-item legend와 실제 profile/Landing 회귀 11/11 |
| `pnpm run test:storybook --run src/entities/vocal-profile/ui/vocal-profile-results.stories.tsx src/shared/ui/audio-waveform-player/audio-waveform-player.stories.tsx src/_pages/profile/ui/voice-scan-input.stories.tsx src/_pages/home/ui/landing-page.stories.tsx` | `2026-08-12` | 통과 — shorthand 제거 후 chart/audio/live waveform/Landing 개별 stop 회귀 21/21 |
| `pnpm exec tsx --test tests/audio-waveform-player.test.ts` | `2026-08-12` | 통과 — playback time/range 계산 회귀 3/3 |
| `pnpm run test:storybook --run src/_pages/home/ui/landing-page.stories.tsx src/entities/vocal-profile/ui/vocal-profile-summary.stories.tsx src/_pages/profile/ui/analysis-success.stories.tsx` | `2026-08-12` | 통과 — Landing Sample Vocal Range Profile과 실제 profile 결과 회귀 8/8 |
| `pnpm run test:storybook --run src/_pages/home/ui/landing-page.stories.tsx` | `2026-08-12` | 통과 — 공식 Motion Gradient Text 단일 field·animationSpeed 1.5·yoyo, signed-out/in·mobile·reduced-motion 콘텐츠와 기존 Landing 회귀 4/4 |
| `pnpm run test:storybook --run src/_pages/profile/ui/voice-scan-input.stories.tsx src/shared/ui/voice-orb/voice-orb.stories.tsx src/widgets/creation-funnel/ui/creation-funnel.stories.tsx` | `2026-08-12` | 통과 — 녹음 전 timer 숨김, WebGL canvas 유지, recorder height·Orb filter·waveform opacity transition과 기존 상태 회귀 15/15 |
| `pnpm run test:storybook --run src/_pages/profile/ui/voice-scan-input.stories.tsx src/shared/ui/status-notice/status-notice.stories.tsx src/shared/ui/state-panel/state-panel.stories.tsx src/widgets/creation-funnel/ui/creation-funnel.stories.tsx src/_pages/recommendation-detail/ui/recommendation-results.stories.tsx src/widgets/library/ui/vocal-profile-library.stories.tsx src/widgets/library/ui/mixing-library.stories.tsx src/_pages/mixing-detail/ui/mixing-detail.stories.tsx` | `2026-08-12` | 통과 — grayscale/recording Voice Core, shared StatusNotice tone·정렬, border hierarchy와 관련 화면 회귀 43/43 |
| `pnpm run test:storybook --run src/widgets/product-shell/ui/product-shell.stories.tsx src/_pages/home/ui/landing-page.stories.tsx` | `2026-08-12` | 통과 — Header top/scrolled separator, Footer rail, authenticated/unauthenticated와 Landing chrome 회귀 11/11 |
| `pnpm run test:storybook --run src/_pages/home/ui/landing-page.stories.tsx src/widgets/product-shell/ui/product-shell.stories.tsx src/shared/ui/voice-orb/voice-orb.stories.tsx` | `2026-08-12` | 통과 — Motion Hero/Reveal, shell과 Orb client island 회귀 13/13, LCP lazy warning 0 |
| `pnpm exec biome check src/_pages/home/ui/landing-page.tsx src/_pages/home/ui/landing-page.stories.tsx` | `2026-08-12` | 통과 — Voice Notes 이미지 markup과 Storybook assertion format/lint 확인 |
| `pnpm exec biome check src/_pages/home/ui/landing-page.tsx src/_pages/home/ui/landing-hero.tsx src/_pages/home/ui/landing-hero.module.css` | `2026-08-12` | 통과 — 3개 landing 파일 format/lint 확인 |
| `pnpm run typecheck` | `2026-08-12` | 통과 — 신규 landing story component 포함 TypeScript 오류 없음 |
| `pnpm run lint` | `2026-08-12` | 통과 — 전체 ESLint 오류 없음 |
| `pnpm run test:architecture-boundaries` | `2026-08-12` | 통과 — FSD, client/server와 root App boundary 4/4 |
| `pnpm run build` | `2026-08-12` | 통과 — Next.js 16.3 production build, TypeScript와 29개 static page 생성 완료 |
| Browser responsive QA | `2026-08-12` | 통과 — scroll 전 section 16px·card 6px·metric opacity 0·hairline scaleX 0·CTA pure fade 상태와 진입 후 최종 상태를 확인; editorial 4단계·metric 3개·Voice Notes 4개 순차 reveal, 390px/1440px overflow 0 |
| Profile Voice Core QA | `2026-08-12` | 통과 — recording에서 Orb 아래 canvas gap 26.6–27.9px, violet→blue→pink scrolling bar·edge fade와 투명 surface 확인; 1440px/390px overflow 0, idle/requesting/stopping에는 canvas 없음, console warning/error 0 |
| Recorder transition QA | `2026-08-12` | 통과 — 녹음 전 timer/waveform 0, mobile visual height 240→288px·desktop 256→288px 연속 전환, 중간 frame의 grayscale·waveform opacity 변화와 최종 color/opacity 1 확인; WebGL canvas identity 유지, overflow·console warning/error 0 |
| Border / StatusNotice QA | `2026-08-12` | 통과 — idle surface background transparent·top/bottom border 0px·Orb grayscale(1)·canvas 1, recording surface tint/hairline 및 Orb 사각 배경 0; invalid notice icon/copy 중앙 정렬과 borderless rounded fill 확인, 390px screenshot overflow 없음 |
| Orb body mask QA | `2026-08-12` | 통과 — recording color Orb와 idle grayscale Orb screenshot에서 gray outer ring·square canvas artifact 0, 본체 feather와 내부 motion 유지 |
| Orb alpha compositing QA | `2026-08-12` | 통과 — 320px 확대 Orb와 실제 recording surface screenshot에서 gray contour 0, pastel edge·transparent canvas·motion 유지 |
| Header/Footer chrome QA | `2026-08-12` | 통과 — 1265px viewport에서 top separator transparent, scrollY 180에서 header data-scrolled true·separator 1152px·footer rail 1152px, backdrop blur(24px) saturate(1.5)와 overflow 0 확인 |
| Hero Gradient Text QA | `2026-08-12` | 통과 — desktop/mobile에서 `내 목소리` 2개 segment, violet→blue→pink background와 duration 1.5s 확인; heading 시각 문구·조사·word reveal 유지, 390px overflow 0 |
| Gradient Text loop QA | `2026-08-12` | 통과 — Storybook browser에서 0ms와 1500ms background-position 동일, 750ms position 상이, linear infinite와 reduced-motion 0s 확인 |
| Official Gradient Text / Motion QA | `2026-08-12` | 통과 — Chromium 1440×1000·390×844에서 `내 목소리` 단일 violet→pink field, 조사 foreground, Hero word/copy reveal과 bento/section one-shot reveal 확인; mobile scrollWidth=clientWidth=390 |
| Gradient Text baseline QA | `2026-08-12` | 통과 — Chromium desktop 70.4px/71.808px, mobile 42.4px/43.248px font-size/line-height 일치; `내 목소리`와 조사 `에`의 baseline delta 0px, overflow 0 |
| Voice Notes / Orb QA | `2026-08-12` | 통과 — 독립 Voice Notes 4개와 Tailwind grain gradient 직접 검토, Grainient canvas 0개·Orb canvas 1개, Orb root transparent·fallback opacity 0, gray half/square artifact와 horizontal overflow 0 확인; 관련 Storybook 10/10 통과 |
| Voice Notes Aurora QA | `2026-08-12` | 통과 — 1440×1000에서 4-up 263×159 crop, 390×844에서 1열 335×203 crop과 밝은 ice→cyan→blue-violet→dark neutral 순서를 직접 확인; desktop/mobile horizontal overflow 0, console warning/error 0 |
| Album Cover Stack QA | `2026-08-12` | 통과 — 1440×1000에서 4개 cover layer와 hover fan-out, 390×844에서 stacked mixing card와 crop 확인; horizontal overflow 0, console warning/error 0, reduced-motion story 통과 |
| Product alignment QA | `2026-08-12` | 통과 — 1440px Login·Recommendation·Account·Library와 1440px/390px Creation stepper 직접 검토; 공통 intro, quiet/dark summary, brand artwork palette와 progress rail overflow 0 확인 |
| Voice-derived artwork QA | `2026-08-12` | 통과 — 중앙음 44–78, 음역 폭 14–28st, 안정도·유성음·RMS가 다른 8개 fixture에서 6개 이상 base hue와 서로 다른 gradient 확인; 1440px 4열·390px 2열 overflow 0 |
| Aurora grain artwork QA | `2026-08-12` | 통과 — fine soft-light와 coarse multiply grain, soft vignette를 1440px palette와 44px Library thumbnail에서 확인; color mapping·radius·overflow 유지 |
| Restrained Aurora preset QA | `2026-08-12` | 통과 — 실제 preset의 recursive·grain 25·gray 200 값을 확인하고 Berry/Forest/Ocean/Northern analogous family로 재구성; desktop/mobile Palette와 44px Library에서 원거리 hue 혼합·overflow 0 확인 |
| Voice-signature palette QA | `2026-08-12` | 통과 — 동일 분석값의 Library 10개가 Violet·Ocean/Northern·Forest·Berry로 분산되고 1280px/390px에서 44px artwork 식별성과 overflow 0 확인; Palette 8개도 단일-family harmony 유지 |
| Branded audio waveform QA | `2026-08-12` | 통과 — ready surface·waveform background `rgba(0, 0, 0, 0)`, skeleton opacity 0·visibility hidden과 72px 높이를 브라우저에서 확인; 브랜드 파형과 loading transition 유지 |
| Brand signal gradient QA | `2026-08-12` | 통과 — Chromium 1265px에서 음역 range·histogram·pitch trace의 violet→blue→pink computed stop, static animation 0과 horizontal overflow 0을 확인 |
| Restrained vocal chart QA | `2026-08-12` | 통과 — Chromium 1265px에서 전체 관측 bar fill `oklch(0.97 0 0)`, 범례 2개·중앙음 범례 0, 최종 chart stop 0.74/0.76/0.78 lightness와 overflow 0을 확인 |
| SVG chart fallback QA | `2026-08-12` | 통과 — chart token을 `initial`로 리셋한 Chromium fixture에서 black stop 0, 세 gradient의 concrete OKLCH fallback과 legend linear-gradient, observed muted fill을 확인 |

<!-- lee-spec-kit:workflow-sync 2026-08-12T11:12:12.000Z -->
