---
lee-spec-kit:
  kind: visual-reference
  scope: project
---

# Copy Singer Product UI Redesign

F018과 후속 제품 UI Feature가 공유하는 화면 디자인 정본이다.

## Visual source of truth

최종 visual source는 `docs/designs/references/copy-singer/` 하나로 제한한다.

우선순위:

1. `docs/designs/references/copy-singer/`의 최종 사용자 승인 reference
2. `docs/designs/design-system.md`
3. 이 문서의 화면별 해석
4. 현재 구현은 기능·데이터·상태 계약 확인용으로만 사용

`docs/designs/assets/product-ui-redesign/`, `docs/designs/generated/page-redesigns/`, 과거 current capture와 generated concept는 모두 legacy다. 신규 구현이나 visual QA에서 참조하지 않는다. 과거 방향이 필요하면 Git history를 사용한다.

최종 reference set은 다음 다섯 역할로 구성한다.

- `01-landing-voice-scan.*`: Landing + Voice Scan
- `02-library.*`: Library Vocal Profile + AI Mix
- `03-analysis-account.*`: Analysis Detail + Account
- `04-admin.*`: Admin
- `05-mixing-progress.*`: `/library/mixes/[id]` 진행 중 상태

최종 4보드의 외곽 번호·설명과 presentation frame은 제품 UI가 아니다. **보드 안의 Copy Singer app frame만 구현 대상으로 본다.**

F022 이후 `01-landing-voice-scan.*`의 오른쪽 Voice Scan frame은 계속 유효하지만, 왼쪽 Landing frame의 좌우 분할 Hero와 crystal CTA는 아래 `Landing` 계약으로 대체한다. Landing의 최신 검증 surface는 `Pages/Landing` Storybook의 signed-out, signed-in, mobile과 reduced-motion 상태다.

## 공통 화면 언어

- Landing, authenticated product route, Admin은 같은 Header/Footer 구현을 사용한다.
- 브랜드 로고는 모든 화면에서 `/`로 이동한다.
- desktop header는 약 64px 높이, brand + 중앙 primary navigation + 우측 account menu 구성을 사용한다.
- active navigation은 큰 pill이 아니라 얇은 underline과 typography 차이로 표시한다.
- admin 사용자에게는 primary navigation에 `Admin`을 노출한다.
- 로그인 사용자는 Landing에서도 다른 제품 화면과 동일한 실제 profile image와 UserMenu를 사용한다.
- content rail은 desktop에서 약 72rem을 기준으로 하고, 화면마다 임의로 폭을 바꾸지 않는다.
- footer도 public/product/Admin에서 같은 component와 간격을 사용한다.

## 시각 원칙

- neutral white, neutral gray, black을 기본으로 하고 black을 primary action에 사용한다.
- 넓은 canvas에 beige/cream/yellow chroma를 넣지 않는다.
- border는 얇고 낮은 대비로 사용하고 shadow는 overlay 등 실제 elevation이 필요한 경우에만 사용한다.
- 모든 영역을 rounded Card로 감싸지 않고 grid, spacing, separator, typography로 먼저 구분한다.
- 큰 제목과 작은 보조 설명의 대비를 사용하되 실제 사용성을 해칠 정도로 본문·표 글자를 축소하지 않는다.
- pastel violet을 waveform, 분석 시각화, active status와 mixing progress의 제품 accent로 사용한다.
- success는 green, failure/destructive는 red처럼 의미가 있는 상태에만 별도 색을 사용한다.
- crystal/prism 이미지는 production UI에서 사용하지 않는다.
- 전역 purple gradient와 전형적인 AI SaaS 장식은 사용하지 않는다.

## Landing + Voice Scan

### Landing

- 첫 viewport는 넓은 whitespace 안의 중앙 정렬 display copy, 실제 voice-analysis primary CTA와 아래에서 이어지는 넓은 voice preview를 중심으로 구성한다.
- Hero의 작은 announcement, 절제된 headline, 설명, primary/secondary action과 넓은 여백은 x.ai의 정보 위계를 참고하되 Copy Singer semantic token과 한국어 제품 문구를 유지한다.
- Hero 아래에는 x.ai식 비대칭 product bento를 두고 `목소리 분석`, `노래와 키 추천`, `선택형 AI 믹싱`을 서로 다른 mini-product surface로 보여준다. preview 안의 분석 항목은 값을 가장하지 않고 `관찰 음역`, `실용 음역`, `음정 안정성`처럼 실제로 제공하는 결과 종류만 예고한다.
- 분석 → 노래/키 추천 → 선택형 AI 믹싱의 실제 3단계는 desktop에서 sticky 설명과 연속 preview panel로, mobile에서 같은 DOM 순서의 한 열로 설명한다. scroll-jacking, horizontal carousel과 JavaScript active-step state는 사용하지 않는다.
- Aceternity UI의 Bento Grid·Glowing Effect source pattern과 React Bits의 Orb·Animated Content를 실제로 통합한다. Orb는 `hue=294`, `rotateOnHover=false`, `hoverIntensity=0`으로 분석 카드와 실제 분석 진행 중앙 visual에 사용하며, 기존 랜딩 waveform·dotted glow·ripple과 dashed ring은 제거한다.
- Hero headline은 단어 단위 CSS stagger로 순차 등장하고 설명은 문장 전체가 아래에서 위로 한 번 나타난다. 설명과 action은 animation 시작 전 opacity 0으로 완전히 숨긴다. Bento는 카드별 분절 없이 전체 wrapper가 opacity 0에서 1로 천천히 한 번 나타난다. Heading은 하나의 접근 가능한 전체 문장을 유지한다.
- Bento 이후는 동일한 translate-up을 반복하지 않는다. 공통 easing 아래 editorial은 heading→단계, metric band는 hairline→정적 숫자, Voice Notes는 heading→카드 opacity stagger, 마지막 2-up CTA는 이동 없는 단일 fade를 사용한다. Stagger 간격은 70ms, 이동 거리는 heading 16px·card 6px 이하로 제한한다.
- 추천 preview는 Recommended key 숫자 animation 대신 실제 분석 결과와 같은 Vocal Range Profile chart를 사용한다. 회색 전체 관측 음역, violet 실용 음역, 점선 중앙음과 note axis만 표시하고 별도 `Sample profile`·`가상 데이터` header는 두지 않는다. 실제 결과와 landing sample은 같은 entity chart component를 사용한다. Orb surface도 `VOICE SIGNAL`과 장식 아이콘 없이 Orb만 표시한다. Metric band의 `5초+`, `60초`, `3단계`는 animation 없는 정적 사실로 유지한다.
- 후속 section은 긴 반복 sticky card 대신 2열 editorial demo, 정직한 metric band, 분석 결과 rail과 2-up 시작 CTA로 구성한다.
- AI 믹싱 bento의 `선택한 추천곡만 AI 믹싱` 왼쪽 visual은 단색 음표 아이콘 대신 Pixabay의 추상·자연·도시 이미지 4장을 겹친 album-cover stack으로 구성한다. cover는 장식이며 실제 추천 앨범이나 아티스트 데이터로 표현하지 않는다.
- Voice Notes의 4개 editorial card는 각각 독립된 visual과 하단 label·title·description을 유지하고, visual에는 사용자 제공 Aurora WebP를 녹음(밝은 ice) → 실용 음역(cyan) → 추천 키(blue-violet) → AI 믹싱(dark neutral) 순으로 사용한다. 이미지는 장식으로 처리하고 제목이나 설명을 이미지 위에 겹치지 않으며 이 section에는 WebGL canvas를 사용하지 않는다.
- WebGL/GSAP/motion runtime, custom cursor, magnetic button, 3D tilt, 무한 marquee와 전역 animated gradient를 Landing에 추가하지 않는다.
- `prefers-reduced-motion`에서는 entry와 section reveal을 제거하고 Orb를 정지 또는 정적 fallback으로 대체하며 동일한 heading, 설명, CTA와 preview를 유지한다.
- 하단 CTA는 neutral surface와 restrained pastel accent를 사용할 수 있지만 crystal 이미지는 사용하지 않는다.
- Header/Footer/UserMenu는 authenticated route와 같은 component를 사용한다.

### Voice Scan

- 설명 영역과 실제 voice input surface가 desktop에서 균형 잡힌 2열로 보이고 mobile에서 한 열로 재배치된다.
- 녹음 중에는 실제 microphone `MediaStream`을 Web Audio `AnalyserNode`로 읽어 live waveform을 왼쪽에서 오른쪽으로 연속 표시한다.
- 5초부터 분석 가능, 약 10초 권장, 최대 60초 계약을 그대로 보여준다.
- microphone permission, error, cancel, stop, ready, upload 대안을 명확하게 구분한다.
- 녹음 waveform은 pastel violet을 사용하고 다른 화면의 audio/data accent와 색을 통일한다.

## Library

### Vocal Profile tab

- 큰 카드 모음 대신 flat table/list를 사용한다.
- profile name, 생성일시, 실제 음역, 안정도, 관련 활동과 상세 진입을 한 행에서 비교할 수 있게 한다.
- 생성일은 날짜뿐 아니라 시간을 함께 표시한다.
- desktop row는 약 56–72px 범위의 compact density를 유지하고 mobile에서는 stacked row로 전환한다.

### AI Mix tab

- 상태 · 작업/아티스트 · 생성일시 · 결과 · 상세 진입을 핵심 열로 둔다.
- search input, 상태 Select, 검색 button은 같은 높이를 사용한다.
- Recommendation과 같은 공통 mixing status chip을 사용한다.
- 진행 중은 pastel violet, 완료는 black, 실패는 red 계열의 동일한 semantic UI를 사용한다.
- waveform/download/delete는 목록에서 반복하지 않고 detail로 이동한다.

## Analysis Detail

정보 순서는 다음을 우선한다.

1. 제목·요약·핵심 action
2. 제출 보컬 waveform/player
3. 보컬 프로필/음정 분포 2열 분석
4. 분석 품질/상세 pitch tracking
5. 저음·중앙·고음 대표 구간 player

- analyzer version 같은 내부 metadata는 사용자-facing 분석 품질 UI에 표시하지 않는다.
- 차트와 waveform은 pastel violet data accent를 중심으로 사용한다.
- 현재 descriptor에서 설명할 수 없는 성별, 건강, 장르 적합도 등은 만들지 않는다.

## Account

- 계정 정보, 로그인 provider, ticket balance와 ticket ledger만 현재 계약에 맞게 보여준다.
- `Library`, `새 목소리 분석`, `Admin` shortcut button을 Account 본문에 별도로 반복하지 않는다.
- 생성·변경 기록은 날짜와 시간을 함께 보여준다.
- Header navigation이 제품 이동을 담당하므로 Account 본문에 중복 navigation을 만들지 않는다.

## Admin

- 일반 product와 같은 Header/Footer를 사용한다.
- 큰 운영 제목 → 4개 metric → ticket adjustment → search/status filter → 사용자/믹싱 table 순서를 유지한다.
- table은 compact density를 사용하고 큰 데이터는 pagination한다.
- mobile에서 ticket adjustment form 때문에 horizontal overflow가 생기지 않게 `min-width`를 강제하지 않는다.

## Mixing Progress

`05-mixing-progress.*`를 진행 중 `/library/mixes/[id]`의 별도 reference로 사용한다.

- 화면 중앙에 pastel violet/blue/pink 계열의 부드러운 animated gradient orb를 둔다.
- orb 주변에는 낮은 대비 concentric ring을 사용해 처리 중임을 보여준다.
- 실제 backend 상태만 단계 timeline에 매핑한다.
- 존재하지 않는 정확한 percentage나 세부 처리 단계를 생성하지 않는다.
- 사용자가 페이지를 나가도 서버 작업이 계속되는 현재 durable job 의미를 설명한다.
- reduced-motion 환경에서는 gradient/ring animation을 줄이고 텍스트 상태는 유지한다.

## Recommendation / Song Detail

- 추천 목록은 100개의 큰 카드 대신 compact table/list를 사용한다.
- 곡/아티스트, 적합도, 추천 키, mixing status를 빠르게 비교할 수 있게 한다.
- 사용자에게 노래방 상호명이나 카탈로그/TJ 번호를 노출하지 않는다.
- 완료된 mixing 상태의 `결과 확인`은 실제 mixing job ID가 있을 때 `/library/mixes/[id]`로 이동한다.
- Album art, genre, difficulty, lyrics, licensed in-app preview처럼 현재 계약에 없는 값은 만들지 않는다.

## 데이터 정직성

디자인 reference에 보이더라도 현재 제품 계약에 없는 정보는 production mock data로 채우지 않는다.

| 디자인 요소 | 현재 처리 | 후속 조건 |
| --- | --- | --- |
| 앨범 이미지, 장르, 난이도, 가사, 인앱 곡 미리듣기 | 미노출 또는 중립 상태 | Song metadata/API와 사용 권한 확장 |
| 플레이리스트, 즐겨찾기 | 미노출 | 사용자 소유 저장 모델과 API |
| 노래 가창 녹음과 프로젝트 | 미노출 | Recording/Project 도메인 |
| Raw/AI Mixed Before & After | 미노출 | 사용자 가창 원본과 결과 연결 모델 |
| 구독 요금제와 결제 | 미노출 | 상품·결제·권한 정책 |
| 이메일·Apple 로그인 | 미노출 | 인증 PRD 변경 |

## 구현 원칙

- 현재 shadcn/ui 및 semantic token을 재사용하고 별도 UI library를 추가하지 않는다.
- production layout/spacing은 Tailwind utility와 semantic token을 우선하고, 반복되는 의미가 없는 global component CSS helper를 새로 만들지 않는다.
- `AudioWaveformPlayer`는 저장된 오디오 재생에 WaveSurfer를 사용하고 recorder live waveform은 실제 microphone MediaStream + Web Audio API를 사용한다.
- 아이콘은 현재 Lucide 체계를 유지한다.
- 폰트는 Pretendard를 기본 sans로 사용한다.

## 반응형·상태

- desktop: 약 64px header, 최대 약 72rem content rail, flat table/list 우선
- tablet: 보조 열을 아래로 재배치하고 긴 filter/navigation은 compact하게 전환
- mobile: 한 열, Sheet navigation/filter, table → stacked row, horizontal overflow 금지
- loading, empty, error, disabled, permission denied, recording, processing, success를 텍스트와 시각 신호로 함께 구분한다.

## 외부 참고

- ElevenLabs UI repository: `https://github.com/elevenlabs/ui`
- ElevenLabs Waveform / Live Waveform / Mic Selector / Voice Button의 interaction pattern은 참고할 수 있지만 Copy Singer의 shadcn/FSD 구조와 실제 데이터 계약을 우선한다.
