---
lee-spec-kit:
  kind: design-system
  scope: project
---

# Copy Singer Design System

- **상태**: Approved
- **버전**: 0.5
- **최초 적용 Feature**: F018 product-ui-redesign
- **적용 범위**: 사용자용 Web UI

Copy Singer의 화면이 Feature와 route가 늘어나도 하나의 제품처럼 보이고 동작하도록 만드는 장기 규칙이다. 이 문서는 시각·상호작용의 의도와 사용 기준을 정의한다. 정확한 CSS 값, 실제 컴포넌트 계약과 렌더 결과를 복제해서 문서에 고정하지 않고 각각의 실행 가능한 소스와 함께 관리한다.

## 정본과 책임

| 정본 | 책임 | 변경 시 함께 확인할 대상 |
| --- | --- | --- |
| `docs/designs/design-system.md` | 전 제품에 적용되는 시각·상호작용 규칙 | PRD, Feature spec/plan/decisions |
| `docs/designs/product-ui-redesign.md` | F018 디자인 보드와 화면별 경험 방향 | 원본 이미지 자산, F018 acceptance |
| `src/_app/styles/globals.css` | semantic color, radius 등 실제 CSS token 값 | Design System의 의미와 대비 기준 |
| `src/shared/ui` | 공통 primitive와 제품 UI component 계약 | public API, accessibility, Storybook |
| Storybook | variant, 상태와 responsive 조합의 실행 가능한 예시 | 컴포넌트 구현, interaction/browser test |
| Feature `decisions.md` | 디자인 시스템을 변경하거나 예외를 둔 이유 | Design System 반영 여부 |

문서와 코드가 다르면 이를 의도된 예외로 간주하지 않는다. 실제 코드를 먼저 확인하고 같은 변경에서 문서, Storybook 또는 decision을 동기화한다.

Visual reference는 `docs/designs/references/copy-singer/`만 정본으로 사용한다. 과거 current screenshot, generated concept/contact sheet와 legacy reference를 working tree의 디자인 기준으로 유지하지 않으며, 일회성 visual QA 이미지는 `/tmp` 또는 gitignored artifact 경로에서 생성한다. production `public/`에는 runtime에서 실제 참조되는 asset만 둔다.

## 제품 원칙

1. **제품 상호작용이 중심이다**: 녹음, waveform, 분석 결과, 추천 근거와 오디오 재생이 장식보다 먼저 보인다.
2. **위계로 구분한다**: 영역을 Card로 감싸기 전에 grid, whitespace, typography와 separator를 사용한다.
3. **데이터에 정직하다**: API나 저장 모델에 없는 앨범 이미지, 장르, 난이도, 가사, 진행 단계 또는 정밀도를 생성하지 않는다.
4. **한 화면에 하나의 primary action을 둔다**: 같은 위계의 검은 버튼을 여러 개 경쟁시키지 않는다.
5. **상태는 숨기지 않는다**: permission, loading, recording, retry, processing, success와 error를 텍스트와 시각 신호로 함께 설명한다.
6. **접근성이 variant보다 우선한다**: 색상, animation이나 아이콘만으로 의미를 전달하지 않는다.

## Foundations

### Color

정확한 OKLCH 값은 `src/_app/styles/globals.css`가 소유한다. 컴포넌트는 가능한 한 Tailwind semantic token을 사용하고 임의의 raw color를 직접 추가하지 않는다.

| 역할 | Token 계열 | 사용 기준 |
| --- | --- | --- |
| Canvas | `background`, `foreground` | neutral white 배경과 black에 가까운 본문; beige/cream/yellow chroma 금지 |
| Surface | `card`, `popover` | 입력 그룹, overlay 또는 실제 경계가 필요한 surface |
| Quiet surface | `muted`, `muted-foreground` | 보조 설명, 비선택 navigation, skeleton |
| Structure | `border`, `input` | 낮은 대비의 1px 경계와 form control |
| Primary action | `primary`, `primary-foreground` | 검은 primary CTA와 선택된 핵심 action |
| Secondary action | `secondary`, `accent` | 낮은 위계 action, hover와 선택 배경 |
| Focus | `ring` | 모든 interactive control의 focus-visible |
| Destructive | `destructive` | 삭제, 취소처럼 복구가 어렵거나 손실을 만드는 action |
| Positive state | `success`, `success-foreground` | 완료, ready와 긍정적인 상태의 제한된 강조 |
| Caution state | `warning`, `warning-foreground` | 대기, retry와 사용자의 주의가 필요한 상태 |
| Audio/data accent | `data-accent`, `data-accent-foreground` | waveform의 active 구간과 핵심 분석 포인트 |
| Brand signal | `brand-violet`, `brand-blue`, `brand-pink`, `brand-gradient-*` | waveform·연속형 분석 차트·processing처럼 변화 또는 흐름이 있는 시각화 |
| Data visualization | `chart-1`~`chart-5` | pitch, range와 waveform의 구분 가능한 series |
| App navigation | `sidebar-*` | 기존 token 이름을 유지하는 header·mobile navigation의 semantic 상태 |

Accent 사용 규칙:

- lavender·blue: waveform, pitch trace와 분석 강조
- green: 성공과 ready 상태에만 사용하며 적합도 강도에는 사용하지 않는다.
- 추천 적합도 숫자는 0%의 `foreground`에서 100%의 `data-accent-foreground`까지 OKLab으로 연속 보간한다. 색상은 보조 표현이며 정수 percentage label을 항상 함께 제공한다.
- amber: 대기, retry와 주의
- red: destructive action과 복구가 필요한 error
- 한 surface에 의미 없는 accent를 두 가지 이상 섞지 않는다.
- 본문 문장이나 넓은 배경을 accent로 채우지 않는다.
- Brand gradient는 연속 데이터와 active signal에만 사용한다. Primary button, badge, 작은 icon, status 의미, focus ring과 border에는 gradient 대신 기존 semantic 단색을 유지한다.

Light theme가 현재 디자인 정본이다. 기존 dark token을 깨뜨리지 않되 F018에서 새 theme toggle이나 독립적인 dark visual language를 만들지 않는다. Dark mode를 제품 기능으로 제공할 때 별도 Feature에서 동일한 대비·상태 기준을 검증한다.

Light canvas는 `#FFFFFF`에 가까운 무채색을 사용한다. quiet surface와 sidebar도 neutral gray scale 안에서만 명도를 달리하며, 넓은 배경에 hue 75–80 계열의 warm chroma를 넣지 않는다. 원본 보드의 미세한 촬영·압축 색은 제품 token으로 해석하지 않는다.

### Typography

제품 UI의 기본 sans는 **Pretendard Variable**을 사용한다. 숫자·시간처럼 고정폭 표현이 필요한 경우에만 기존 monospace stack을 제한적으로 사용한다. 페이지별로 별도 sans font를 도입하지 않는다.

| 역할 | 권장 크기/행간 | Weight | 사용 |
| --- | --- | --- | --- |
| Display | `clamp(2.5rem, 6vw, 4.75rem)` / `0.98–1.05` | 600 | Landing의 단일 핵심 문장 |
| Page title | `2.25rem` / `1.15` | 600 | route당 한 번 |
| Section title | `1.5rem` / `1.3` | 600 | 큰 정보 구획 |
| Component title | `1.125rem` / `1.4` | 600 | list/detail block 제목 |
| Body | `0.9375–1rem` / `1.6` | 400 | 설명과 본문 |
| Label | `0.8125rem` / `1.4` | 500 | form, metric, table heading |
| Caption | `0.75rem` / `1.5` | 400–500 | metadata와 보조 상태 |

- 한 화면에서 Display와 Page title을 동시에 사용하지 않는다.
- 대문자와 넓은 letter spacing은 짧은 영문 eyebrow에만 사용한다.
- 한국어 본문에 과도한 음수 letter spacing을 적용하지 않는다.
- 수치 비교 표에서는 필요할 때 tabular number를 사용한다.
- heading level은 시각 크기가 아니라 문서 구조를 따른다.

### Spacing and layout

- 4px 기반 spacing scale을 사용하고 주요 간격은 `4, 8, 12, 16, 24, 32, 48, 64, 96px` 범위에서 선택한다.
- 관련 control 사이는 8–12px, component 내부는 16–24px, section 사이는 48–64px을 기본으로 한다.
- 제품 app의 content rail은 최대 1200px 안에서 읽기 가능한 폭을 유지한다.
- page gutter는 mobile 20px, tablet 32px, desktop 48px 이상을 기준으로 viewport에 맞게 조정한다.
- 긴 본문은 약 65–75자 폭을 넘기지 않는다.
- 두 열 이상 레이아웃은 좁아질 때 정보 우선순위에 따라 한 열로 재배치하고 단순 비율 축소로 해결하지 않는다.

### Shape, border and elevation

- Border는 form control, table/list row, focus, overlay처럼 구조·상호작용 경계를 설명할 때만 낮은 대비의 1px로 사용한다.
- Page heading, 일반 section, empty/status/recording surface를 습관적인 `border-y`·`border-t`·`border-b` hairline으로 구획하지 않는다. 먼저 whitespace, typography, radius와 quiet surface를 사용한다.
- 작은 control은 6–8px, 주요 surface와 overlay는 10–12px 수준의 radius를 기준으로 한다.
- 완전한 pill은 status, tag, avatar group 또는 짧은 segmented control에만 사용한다.
- 기본 Card와 page section에는 shadow를 사용하지 않는다.
- Dropdown, Dialog, Sheet와 실제로 떠 있는 control만 얕은 elevation을 사용할 수 있다.
- 중첩된 rounded Card 안에 다시 rounded Card를 반복하지 않는다.

## Layout patterns

### Public entry

- Landing은 넓은 whitespace, 한 개의 Display 문장과 한 개의 primary CTA를 중심으로 한다.
- Hero의 제품 visual이 버튼처럼 보이면 실제 primary flow로 이동하는 Link/Button이어야 하며, mobile 첫 viewport 안에 copy·CTA·핵심 visual을 함께 노출한다.
- 시연용 waveform은 서로 다른 진폭과 위상으로 움직일 수 있고 microphone ring은 바깥으로 확산할 수 있지만, 가짜 입력·진행률로 오해될 값은 표시하지 않는다.
- 기능 설명은 실제 제품 흐름인 분석 → 추천 → 선택형 AI 믹싱 순서와 일치한다.
- 인증 화면은 한 열로 유지하며 사용할 수 없는 provider를 placeholder로 표시하지 않는다.
- Landing 마지막에는 한 개의 primary action과 짧은 설명으로 구성한 CTA를 두고, 그 아래에 brand·제품/계정 link·copyright가 있는 실제 site footer를 둔다.
- crystal/prism 이미지는 제품 UI에서 사용하지 않는다. CTA의 색감이 필요하면 낮은 채도의 pastel violet/blue 계열 surface를 제한적으로 사용한다.

### Authenticated app shell

- desktop 제품 화면은 persistent sidebar를 사용하지 않고 64px top header에 brand, 중앙 primary navigation과 우측 compact account menu를 둔다.
- 공통 Header/Footer separator는 viewport 전체가 아니라 최대 72rem content rail 안에서만 표시한다. Header는 page top에서 separator 없이 시작하고 8px 이상 scroll된 뒤에만 rail border를 표시하며, neutral translucent background와 backdrop blur로 뒤 content를 아주 희미하게 비춘다.
- mobile navigation은 같은 header의 menu trigger와 오른쪽 Sheet로 전환한다.
- 현재 route, 사용자 메뉴와 ticket balance가 서로 경쟁하지 않게 위계를 분리한다.
- content의 page heading, primary action와 filter 영역 위치를 route마다 임의로 바꾸지 않는다.

### List and detail

- desktop의 비교 데이터는 table 또는 정렬된 평면 list를 우선한다.
- mobile에서는 중요한 2–3개 값과 action을 남긴 stacked row로 전환한다.
- 긴 목록은 제목·핵심 비교값·상태와 한 개의 다음 action을 우선하고, 반복되는 근거·waveform·download·delete는 상세 화면으로 이동한다.
- 하나의 resource 행이 하나의 상세 목적지만 가지면 제목의 실제 Link를 행 전체로 확장하고 별도 chevron·`상세 보기` 같은 중복 action을 두지 않는다. hover와 focus-visible은 행 전체에 표시한다.
- 행 안에 선택·재생·믹싱처럼 독립 interaction이 있거나 모든 항목에 상세 목적지가 없으면 행 전체를 상세 Link로 만들지 않는다. Link를 포함한 행을 `onClick` navigation이나 중첩 anchor로 구현하지 않는다.
- 비교 목록의 primary interaction이 현재 항목 선택이면 제목의 실제 button을 행 전체로 확장할 수 있다. 행 안의 AI 믹싱 같은 독립 action은 별도 상호작용 층으로 분리하고, 행 button 안에 다른 button이나 Link를 중첩하지 않는다.

### Creation funnel

- 목소리 분석, 노래 추천과 AI 믹싱 생성은 `목소리 분석 → 노래 추천 → AI 믹싱`의 세 단계 사용자 여정을 공유한다.
- 상단 journey stepper는 사용자의 현재 위치만 설명하며 backend 진행률을 의미하지 않는다. 각 분석·믹싱 job의 실제 상태는 별도 timeline과 status copy로 표시한다.
- Voice Scan 입력 화면은 상단 journey stepper와 같은 단계 의미를 반복하는 `Step 1`·단계명·health chip을 추가하지 않는다. 실제 연결 오류는 분석 action의 상태와 오류 UI에서 전달한다.
- Voice Scan 입력 본문은 journey stepper 아래에서 mobile 32px·desktop 48px 이상 분리하고 `VOICE ANALYSIS` eyebrow → 작업 중심 제목 → 설명 순서를 사용한다. Library·Account의 제품 문법은 공유하되 작업 hero의 제목 크기와 2열 composition은 유지한다.
- processing 화면은 Mixing Detail의 중앙 집중형 제목, 넓은 whitespace, restrained violet process visual과 실제 상태 설명을 기준으로 한다.
- desktop 추천 선택은 목록 옆 보조 panel, mobile은 Sheet를 사용하며 primary action은 선택한 곡 하나에만 제공한다.
- 추천 선택 UI는 `lg` 이상에서 sticky 보조 panel을, 그 미만에서는 화면 하단 action과 bottom Sheet를 사용한다. 하단 action이 목록의 마지막 행을 가리지 않도록 mobile content에 여유 공간을 둔다.
- Recommendation page header도 journey stepper 아래에서 mobile 32px·desktop 48px 이상 분리한다.
- 추천 비교 목록은 저장된 rank를 정렬 계약으로 유지하되 별도 순위 열이나 mobile 순위 badge를 노출하지 않고 곡·적합도·추천 키·믹싱 상태를 우선한다.
- 선택 카드에 순위를 표시할 때는 저장 종합 rank 대신 사용자가 보고 있는 주 지표와 같은 전체 추천 적합도 순위를 `추천 적합도 N위`로 명시한다.
- Profile Detail과 Song Detail은 전체 근거를 보는 선택 경로다. 생성 퍼널은 해당 상세 route를 필수 단계로 요구하지 않는다.
- Song Detail은 추천 적합도 비교, 보컬 프로필과 같은 visual language의 전체 관측·실용 음역 graph와 사용자에게 유효한 추천 이유만 보여준다. recommendation snapshot에 없는 중앙음은 추정하지 않는다.
- 키 조정 전후 점수 변화, 고·저음 부담 감소·잔존처럼 선택에 의미가 낮은 technical reason은 저장 계약을 유지하되 사용자 표시 projection에서 제외한다. 별도 SONG RANGE와 score breakdown 근거도 노출하지 않는다.
- process visual의 animation은 상태를 보조할 뿐이며 `prefers-reduced-motion`에서 정지해도 title, status와 timeline만으로 의미가 유지돼야 한다.
- 상세 화면은 Summary → 근거/분석 → 관련 action 순서를 유지한다.
- 직접 URL로 진입할 수 있는 상세 화면은 제목 위에 고정 상위 resource link를 최대 1개 제공한다. 같은 목적의 목록 복귀 action을 본문·실패 section에서 반복하지 않고, 전역 Header navigation으로 충분한 Admin 같은 화면에는 별도 복귀 button을 두지 않는다.
- Mixing Detail의 terminal header는 eyebrow → 상태 chip → 곡명 → 아티스트 순서로 세로 위계를 구성해 상태가 긴 곡명과 같은 행에서 경쟁하지 않게 한다.
- filter는 실제 query/data field만 제공하고 결과 개수와 초기화 action을 함께 보여준다.

## Component rules

### Actions

- `Button`의 기본 variant는 현재 화면의 가장 자연스러운 다음 action 하나에 사용한다.
- `outline`은 관련 결과 생성·다른 resource 확인 같은 secondary action에 neutral 1px border로 사용하고, `ghost`는 삭제 trigger와 낮은 위계 navigation처럼 border가 없어야 하는 action에 사용한다.
- destructive 색은 되돌릴 수 없는 action의 확인 Dialog 안 최종 실행 button에 사용하고, header의 삭제 trigger는 ghost로 유지한다.
- icon-only button은 접근 가능한 이름과 최소 44px touch target을 제공한다.
- destructive action은 결과를 명확히 설명하고 필요한 경우 Dialog로 확인한다.
- 비동기 action은 중복 실행을 막고 label 또는 인접 status로 진행 중임을 알린다.

### Inputs and filters

- 입력 label은 placeholder로 대체하지 않는다.
- validation은 문제, 원인과 다음 action을 가능한 짧게 설명한다.
- desktop의 보조 filter rail은 tablet/mobile에서 Sheet로 이동할 수 있다. 제품 전체 navigation sidebar로 사용하지 않는다.
- DropdownMenu는 action 묶음, Select는 값 선택에 사용해 의미를 섞지 않는다.

### Surfaces

- `Card`는 독립적으로 선택·이동하거나 경계가 필요한 한 단위에만 사용한다.
- 페이지 전체, 모든 metric과 모든 section을 Card로 만들지 않는다.
- `Separator`, whitespace와 muted surface로 먼저 정보 그룹을 만든다.
- Dialog는 집중이 필요한 짧은 결정, Sheet는 mobile navigation/filter와 보조 작업에 사용한다.
- Inline 안내·성공·주의·오류 카드는 shared `StatusNotice`의 neutral/success/warning/destructive tone을 사용한다. Icon과 copy는 수직 중앙 정렬하고 상태 의미는 title·description·ARIA role로도 전달한다.

### Audio and recording

- Waveform은 장식이 아니라 시간·진행·seek가 가능한 제품 control이다.
- idle, permission, recording, paused, processing, ready와 error 상태를 명시적인 state model로 관리한다.
- 분석 전에는 움직이는 grayscale Voice Core, 녹음 중에는 실제 microphone level에 반응하는 color Voice Core를 사용하고 경과 시간과 stop action을 가장 높은 위계로 둔다. Core surface는 transparent·borderless이며 녹음 시작만으로 넓은 accent 배경을 만들지 않는다.
- play/pause, seek, 현재/전체 시간과 오류 fallback을 공통 `AudioWaveformPlayer` 계약으로 유지한다.
- waveform accent는 active/played 영역에 집중하고 inactive 영역은 낮은 대비로 유지한다.
- media stream, AudioContext와 Blob URL 정리는 화면 이탈·취소·완료 경로 모두에서 수행한다.

### Data visualization

- 차트는 shadcn `ChartContainer`와 Recharts 기반을 유지한다.
- 색상만으로 series를 구분하지 않고 label, tooltip 또는 pattern을 함께 제공한다.
- pitch의 null gap을 실제 무음처럼 보존하고 연결선으로 데이터를 만들어내지 않는다.
- 적합도는 정수 수준으로 표현하고 원키 점수, 키 이동과 추천 이유를 함께 제공한다.
- decorative chart와 의미 없는 dashboard metric을 추가하지 않는다.

## State language

| 상태 | 표현 | 필수 요소 |
| --- | --- | --- |
| Loading | skeleton 또는 최소 spinner | 무엇을 불러오는지, layout shift 최소화 |
| Empty | 조용한 icon/illustration과 짧은 설명 | 첫 행동 또는 탐색으로 돌아가는 CTA |
| Permission denied | microphone icon과 원인 | browser 설정 안내와 upload 대안 |
| Recording | audio-reactive Voice Core와 경과 시간 | 명시적인 stop/cancel, screen reader status |
| Processing | 실제 backend state 기반 단계 | 이탈 가능 여부, 재접속 시 복구 의미 |
| Retry waiting | amber status | 다음 재시도 또는 수동 action |
| Error | 문제를 나타내는 title과 설명 | retry 가능 여부와 안전한 다음 action |
| Disabled | 낮은 시각 위계 | 가능한 경우 비활성 이유 |
| Success | green을 제한적으로 사용 | 결과와 다음 primary action |

- 성공과 오류를 색상만으로 구분하지 않는다.
- 알 수 없는 진행률을 퍼센트로 표시하지 않는다.
- 기술 오류 코드 전체, Zod issue 또는 외부 storage URL을 사용자에게 노출하지 않는다.

## Responsive behavior

### Mobile: 320–767px

- 한 열을 기본으로 하며 page gutter는 최소 20px을 유지한다.
- table은 stacked row로, navigation/filter는 Sheet로 전환한다.
- 녹음·재생 primary control과 현재 상태가 첫 viewport에 들어오도록 우선한다.
- horizontal scroll은 waveform이나 명시적 data visualization 외에는 사용하지 않는다.

### Tablet: 768–1023px

- 두 열의 중요도가 비슷할 때만 유지하고 보조 detail은 아래로 이동한다.
- 긴 filter와 navigation은 compact 또는 Sheet 패턴을 사용한다.
- touch target과 keyboard focus를 동시에 유지한다.

### Desktop: 1024px 이상

- app navigation과 최대 1200px content rail을 사용한다.
- 추천 비교와 Library는 가용 폭을 활용한 table/list를 우선한다.
- 과도하게 넓은 text line이나 빈 화면을 채우기 위한 불필요한 Card를 만들지 않는다.

반응형 검증은 특정 기기 이름이 아니라 최소 360px mobile, 대표 tablet과 일반 desktop viewport에서 수행한다.

## Accessibility and motion

- 모든 핵심 flow는 keyboard만으로 수행할 수 있어야 한다.
- `focus-visible` ring을 제거하지 않고 background와 충분히 구분한다.
- icon-only action, audio control과 상태 indicator는 accessible name을 제공한다.
- async 상태 변화는 적절한 live region을 사용하되 반복 polling마다 과도하게 알리지 않는다.
- text/background와 control boundary는 WCAG AA 대비를 목표로 한다.
- `prefers-reduced-motion`에서는 장식 animation, pulse와 큰 이동을 제거한다.
- waveform 변화처럼 핵심 기능 animation도 정보가 유지되는 정적 대안을 제공한다.
- Landing의 시연용 waveform·ripple도 reduced-motion에서 정지하며, microphone action의 이름·focus·목적지는 그대로 유지한다.

## Content voice

- 짧고 직접적인 한국어를 기본으로 한다.
- 사용자가 다음에 무엇을 할 수 있는지 먼저 말한다.
- AI의 능력이나 적합도 정확성을 과장하지 않는다.
- 오류 문구는 사용자를 탓하지 않고 문제와 가능한 해결 방법을 설명한다.
- 같은 상태와 action에는 route가 달라도 같은 용어를 사용한다.
- `AI 믹싱`, `보컬 프로필`, `추천 키`, `실용 음역`을 제품 표준 용어로 사용한다.

## 금지 패턴

- 전역 orange/purple radial gradient와 의미 없는 glassmorphism
- page의 모든 section과 metric을 감싸는 중첩 rounded Card
- 같은 위계의 primary button 여러 개
- API에 없는 album art, genre, difficulty, lyrics, preview와 진행률 mock
- raw hex/OKLCH 값을 page component에 직접 작성하는 방식
- route마다 새 spacing, radius와 상태 문구를 독자적으로 정의하는 방식
- 색상이나 animation만으로 상태를 전달하는 방식
- 접근 가능한 이름 없는 icon button

## 변경 관리

### Design System을 변경하는 경우

다음 중 하나라도 바뀌면 같은 Feature에서 이 문서를 갱신한다.

- semantic token의 의미 또는 새 token 계열
- typography, spacing, layout, radius나 elevation 규칙
- 공통 component variant 또는 interaction state
- responsive breakpoint behavior
- 접근성, motion 또는 표준 제품 용어

### 동기화 규칙

1. Feature `spec.md`에서 사용자 영향과 acceptance를 정의한다.
2. `plan.md`에서 token/component/story 변경 경계를 정한다.
3. 의미가 바뀌면 이 문서를, 정확한 값이 바뀌면 `globals.css`를 갱신한다.
4. 공통 component를 바꾸면 `src/shared/ui` public API와 Storybook story를 함께 갱신한다.
5. 기존 규칙의 예외가 필요하면 Feature `decisions.md`에 이유, 범위와 제거 조건을 기록한다.
6. 코드 변경 후 visual/browser·accessibility 회귀와 lee-spec-kit workflow sync를 확인한다.

단순 문구 오타나 기존 token을 사용하는 page composition은 이 문서를 매번 수정하지 않는다.

## Design 변경 완료 조건

- [x] 디자인 보드와 이 문서 중 어떤 정본을 적용했는지 Feature 문서에 연결했다.
- [x] 임의 raw color, spacing과 page 전용 primitive를 불필요하게 추가하지 않았다.
- [x] 추가·변경된 공통 component의 주요 state와 responsive 조합이 Storybook에 있다.
- [x] loading, empty, error, disabled와 async 상태가 실제 backend 계약과 일치한다.
- [x] keyboard, focus-visible, accessible name, contrast와 reduced motion을 확인했다.
- [x] mobile, tablet과 desktop에서 핵심 flow를 검증했다.
- [x] 문서·CSS token·공통 UI·Storybook 사이의 차이를 동기화하거나 decision에 기록했다.

## 관련 문서

- [Product UI Redesign](./product-ui-redesign.md)
- [F018 Spec](../features/web/F018-product-ui-redesign/spec.md)
- [Copy Singer PRD](../prd/copy-singer-prd.md)
- [Visual references](./references/copy-singer/README.md)
