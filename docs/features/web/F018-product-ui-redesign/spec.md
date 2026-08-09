# Feature Spec: product-ui-redesign

> 기술 스택, 파일 배치와 단계별 구현은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F018
- **기능명**: product-ui-redesign
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-09
- **상태**: Approved

---

## 목적

현재 Copy Singer는 실제 음성 녹음·업로드, durable 분석, 상세 보컬 프로필, 100곡 추천, 티켓 기반 AI 믹싱과 영속 히스토리를 제공하지만 각 기능이 독립된 rounded card와 고정 사용자 메뉴에 나뉘어 있다. 추천 결과는 100개의 큰 카드를 한 열로 표시해 비교가 어렵고, 분석 결과는 핵심 요약과 상세 근거의 위계가 약하다. 로그인 이후 사용자가 현재 위치와 다음 행동을 이해할 수 있는 일관된 제품 navigation도 없다.

이 기능은 사용자가 제공한 네 장의 디자인 보드를 visual source of truth로 삼아, 현재 제품 계약으로 실제 동작하는 핵심 여정을 밝고 절제된 제품 중심 UI로 재설계한다. 기존 shadcn/ui, semantic token, WaveSurfer, TanStack Query와 FSD 구조를 유지하며 새 UI library나 별도 디자인 시스템 package를 도입하지 않는다. 장기적인 사용 규칙은 `docs/designs/design-system.md`, 정확한 token은 `globals.css`, 공통 component 계약은 `src/shared/ui`, 실행 가능한 상태 예시는 Storybook이 소유하도록 문서와 코드를 함께 관리한다.

디자인 보드에는 현재 도메인에 없는 온보딩 선호도, 노래 가창 녹음, 프로젝트, 플레이리스트, 즐겨찾기, 결제 요금제, 앨범 이미지·가사·미리듣기가 포함되어 있다. F018은 이 값을 가짜 데이터로 구현하지 않는다. 현재 계약으로 완성할 수 있는 Landing, Google Login, Voice Scan, Analyzing, Voice Profile, Song Match, Song Detail, 실제 AI Mixing 상태·결과, Library와 Account를 범위로 하고, 새 데이터 모델이 필요한 흐름은 후속 Feature 경계로 남긴다.

---

## 사용자 스토리

### US-1: 제품을 이해하고 시작하는 방문자

**As a** 로그인하지 않은 방문자
**I want** 첫 화면에서 Copy Singer가 제공하는 음성 분석, 노래 추천과 AI 믹싱 데모를 이해하고 싶다.
**So that** 허구의 기능이나 지원하지 않는 로그인 수단에 혼동되지 않고 Google 로그인으로 시작할 수 있다.

**Acceptance Criteria:**

- [x] `/`는 인증 없이 접근 가능한 landing을 제공하고 제품의 실제 세 단계인 음성 분석, 노래 추천과 선택형 AI 믹싱을 설명한다.
- [x] primary CTA는 비로그인 사용자에게 `/login`, 로그인 사용자에게 음성 스캔으로 연결된다.
- [x] 로그인 화면은 Google OAuth만 제공하며 이메일, Apple 또는 magic link가 사용 가능한 것처럼 표시하지 않는다.
- [x] 로그인 실패, 진행 중과 disabled 상태가 현재 인증 동작을 보존하면서 명확히 표현된다.

### US-2: 안심하고 음성을 스캔하는 사용자

**As a** 로그인한 사용자
**I want** 마이크 권한부터 녹음·업로드와 분석 완료까지 현재 상태를 한눈에 이해하고 싶다.
**So that** 마이크가 동작하는지 확인하고 오류가 생겨도 다음 행동을 알 수 있다.

**Acceptance Criteria:**

- [x] 기존 record/upload 두 입력 방식, 서버 최소 유효 길이 5초, 약 10초의 권장 녹음, 최대 60초, 긴 파일 trim 확인과 validation 오류가 보존된다.
- [x] 녹음은 실제 입력 stream의 live waveform, 경과 시간, 시작·중지·취소·재녹음 상태를 제공하고 종료 시 media resource를 정리한다.
- [x] 마이크 권한 요청·거부·device 오류, 분석 준비·대기·처리·retry·실패 상태마다 설명과 가능한 action이 표시된다.
- [x] 분석 UI는 서버가 제공하는 durable job 상태보다 정밀한 단계 또는 진행률을 가장하지 않는다.
- [x] 사용자가 이탈 후 돌아와도 기존 localStorage와 DB 기반 진행 복구가 유지된다.

### US-3: 핵심부터 이해하는 보컬 프로필 사용자

**As a** 분석을 완료한 사용자
**I want** 내 보컬 프로필의 핵심 요약을 먼저 보고 필요할 때 상세 근거를 확인하고 싶다.
**So that** 복잡한 dashboard를 해석하지 않고도 내 음역과 추천의 전제를 이해할 수 있다.

**Acceptance Criteria:**

- [x] 결과 상단은 설명형 vocal type, 전체·실용 음역, 중앙음, 안정도와 데이터에서 도출 가능한 핵심 특성을 우선 표시한다.
- [x] 기존 음정 histogram, pitch trace, 품질 지표, low/mid/high reference band와 전체 reference 재생은 제거되지 않고 세부 영역에서 확인할 수 있다.
- [x] 보컬 타입과 특성은 기존 분석값에서 결정적으로 파생되며 성별, 건강, 장르 적합도처럼 데이터에 없는 의미를 추정하지 않는다.
- [x] 프로필 목록·상세, 삭제, 추천 생성과 진행 중 분석 복구의 기존 기능이 유지된다.

### US-4: 비교하고 이해하는 노래 추천 사용자

**As a** 추천을 받은 사용자
**I want** 100곡을 빠르게 비교하고 관심 있는 곡의 적합도 근거를 상세히 보고 싶다.
**So that** 원키 또는 추천 키를 선택할 이유를 이해하고 원하는 곡에만 AI 믹싱을 요청할 수 있다.

**Acceptance Criteria:**

- [x] 추천 화면은 100개의 큰 카드 대신 desktop table/list와 mobile list를 사용해 곡, 아티스트, 적합도, 추천 키와 믹싱 상태를 비교할 수 있다.
- [x] 검색, 정렬과 필터는 현재 API에 존재하는 title, artist, score, recommended shift와 mix availability/status만 사용한다.
- [x] 적합도는 과도한 정확성을 암시하지 않는 정수 수준 표현과 함께 이유·원키 점수·키 이동 효과를 설명한다.
- [x] 선택한 추천 item은 별도 Song Detail에서 같은 저장 결과의 사용자 음역, 곡 음역, 추천 키, structured reason과 실제 AI 믹싱 CTA를 보여준다.
- [x] 앨범 이미지, genre, difficulty, lyrics와 인앱 preview처럼 현재 계약에 없는 값은 가짜로 만들거나 지원되는 것처럼 표시하지 않는다.

### US-5: 믹싱 상태와 결과를 다시 찾는 사용자

**As a** AI 믹싱을 요청한 사용자
**I want** 실제 작업 진행 상태를 이해하고 나중에 결과를 다시 찾고 싶다.
**So that** 브라우저를 닫아도 작업을 잃지 않고 결과를 재생·다운로드하거나 실패에 대응할 수 있다.

**Acceptance Criteria:**

- [x] pending, preparing, submitted, processing, succeeded, failed와 canceled를 서버 상태에 충실한 사용자 언어와 단계로 표시한다.
- [x] 믹싱 시작의 티켓 비용, 중복 방지, target/reference 준비 오류와 환불 의미가 기존 계약대로 유지된다.
- [x] Library는 사용자 소유 보컬 프로필과 AI 믹싱 이력을 구분해 검색·필터·상태별 조회할 수 있다.
- [x] 믹싱 결과 상세는 곡, 사용 프로필, 상태·시각, 결과 waveform player, 다운로드와 기존 삭제 action을 제공한다.
- [x] 사용자 가창 Recording 모델이 없는 상태에서 Raw/AI Mixed Before & After 또는 프로젝트 편집 기능을 제공하는 것처럼 표시하지 않는다.

### US-6: 어느 화면에서도 일관된 제품을 사용하는 사용자

**As a** desktop, tablet 또는 mobile 사용자
**I want** 일관된 navigation, 시각 위계와 상태 피드백을 사용하고 싶다.
**So that** 화면 크기와 입력 방식에 관계없이 현재 위치와 다음 행동을 알 수 있다.

**Acceptance Criteria:**

- [x] 인증 제품 화면은 Voice Scan, Library와 Account를 연결하는 responsive app shell을 공유하고 현재 route를 명확히 표시한다.
- [x] 기존 warm beige/orange gradient와 과도한 rounded card를 white/warm gray/black token, 낮은 대비 border, 제한된 shadow와 의미 기반 accent로 교체한다.
- [x] `docs/designs/design-system.md`가 color, typography, spacing, shape, component, 상태, responsive, 접근성과 변경 관리 규칙을 정의하고 실제 token·공통 UI·Storybook과 동기화된다.
- [x] desktop, tablet, mobile에서 핵심 content와 CTA가 겹치거나 수평으로 잘리지 않으며 표는 mobile list로 전환된다.
- [x] button label, focus-visible, keyboard interaction, semantic heading, live status와 reduced-motion을 포함한 접근성 기준을 만족한다.
- [x] 포함 화면의 loading, empty, error, disabled, permission denied, recording, processing와 success 상태가 공통 언어로 제공된다.
- [x] 핵심 공통 컴포넌트와 상태 variant를 Storybook에서 독립적으로 확인할 수 있다.

---

## 기능 요구사항

### FR-1: 공통 시각 언어와 app shell

- `docs/designs/product-ui-redesign.md`를 F018의 visual brief와 원본 reference로 사용하고 `docs/designs/design-system.md`를 전 제품의 규범적 시각·상호작용 기준으로 사용한다.
- 현재 semantic token을 white/warm gray/black 중심으로 재정의하고 waveform·분석·success에만 제한적 accent를 사용한다.
- 공통 brand, app navigation, page heading, state panel과 action layout을 재사용 가능한 FSD UI로 제공한다.
- 디자인 시스템의 의미는 문서, 정확한 값은 `globals.css`, component 계약은 `src/shared/ui`, 주요 variant·상태는 Storybook에서 관리하고 같은 변경에서 동기화한다.
- 루트 `app/` adapter는 얇게 유지하고 shell 조립은 `src/_app`, 화면 composition은 `src/_pages`에 둔다.

### FR-2: 공개 entry와 인증

- public landing과 Google-only login을 디자인 보드의 공간감과 정보 위계로 재구성한다.
- 기존 Better Auth callback, session, dev bypass와 private resource 권한을 변경하지 않는다.
- persistent onboarding, 목적 선택과 다른 로그인 공급자는 F018에 포함하지 않는다.

### FR-3: Voice Scan과 분석 상태

- 기존 `VocalProfileRecorder`, upload/trim, durable analysis Query와 error mapping을 재사용한다.
- live waveform과 audio control을 제품 interaction의 중심으로 배치하고 permission·recording·processing state를 명시한다.
- 약 10초를 권장 목표로 안내하되 현재 analyzer가 허용하는 5초 이상 입력은 막지 않고 최대 60초 계약을 유지한다.
- 분석이 끝나면 새로 생성된 profile detail로 이동하고 진행 복구·재시도·취소 동작을 보존한다.

### FR-4: Voice Profile 정보 위계

- profile descriptor를 summary와 detail 두 수준으로 배치하되 저장 descriptor나 분석 API를 축소하지 않는다.
- 결정적인 presentation mapper가 현재 수치에서 vocal type과 핵심 특성을 생성하고 동일 입력에서 같은 문구를 반환한다.
- chart와 audio UI는 현재 shadcn Chart/Recharts와 WaveSurfer 기반을 유지한다.

### FR-5: Song Match와 Song Detail

- 추천 run 목록은 scannable table/list, 검색, 정렬, 실제 필드 기반 필터를 제공한다.
- 기존 recommendation item ID를 사용하는 소유권 보호 Song Detail route를 추가하고 run contract에서 표시 가능한 분석만 사용한다.
- 믹싱 시작·폴링·결과 action은 목록과 상세에서 같은 Query key와 mutation 정책을 사용한다.

### FR-6: Library와 믹싱 결과 상세

- 기존 profile history와 mixing history Query/API를 조합한 Library 진입점을 제공하고 기존 URL은 깨지지 않게 유지하거나 명시적으로 연결한다.
- 개별 mixing job detail은 기존 소유권 검증과 media proxy를 사용해 waveform, download, state와 metadata를 표시한다.
- delete/cancel이 현재 계약에서 제공되는 범위만 노출하고 destructive action은 명시적으로 확인한다.

### FR-7: 상태·반응형·Storybook

- 공통 상태 component와 route별 loading/error/empty UI를 구현한다.
- mobile에서 sidebar/filter는 Sheet 등 현재 shadcn/Base UI 계열 primitive로 전환하고 핵심 control의 touch target을 유지한다.
- recorder, audio player, app shell, recommendation row/detail, mixing progress와 state panel의 주요 variant를 Storybook에 추가한다.

---

## 범위

### 포함

- public landing과 Google-only login redesign
- authenticated responsive app shell
- Voice Scan, Analyzing, Voice Profile list/detail redesign
- Song Match list와 실제 recommendation item 기반 Song Detail
- 실제 AI mixing progress/result presentation
- profile·mixing 기반 Library와 mixing result detail
- Account 화면의 공통 shell·token 적용
- 장기 디자인 규칙과 동기화 정책을 정의하는 `docs/designs/design-system.md`
- loading, empty, error, disabled, permission와 processing states
- 필요한 shadcn/Base UI primitive, Storybook story와 반응형·접근성 회귀

### 제외 및 후속 Feature 후보

- 목적 선택을 저장하는 Onboarding과 사용자 preference
- 반주·가사와 동기화하는 사용자 노래 Recording
- 사용자 원본과 AI 결과를 묶는 Project 및 Raw/AI Before & After
- Playlist, Favorite와 공유 링크
- 앨범 artwork, genre, difficulty, lyrics와 라이선스된 in-app preview metadata
- subscription, pricing, checkout와 entitlement
- Google 이외의 로그인 공급자
- Admin과 개발용 SVC 화면의 전면 redesign
- PostgreSQL migration, Modal/worker 알고리즘, Coolify와 연기된 `quality.yml` 변경

---

## 비기능 요구사항

- **기능 보존**: 기존 auth, record/upload, trim, durable analysis, profile/history/delete, recommendation, ticket, mixing polling/result/download와 account ledger 회귀를 통과해야 한다.
- **성능**: 100곡 목록은 불필요한 waveform/audio instance를 행마다 생성하지 않고, 검색·정렬·필터 interaction에서 전체 페이지 navigation을 요구하지 않아야 한다.
- **접근성**: 핵심 flow는 keyboard만으로 수행 가능하고 상태 변화는 텍스트 또는 live region으로 전달되며 색상만으로 의미를 구분하지 않아야 한다.
- **반응형**: 360px mobile부터 일반 tablet·desktop까지 핵심 CTA, waveform, chart와 list가 viewport 밖으로 잘리지 않아야 한다.
- **보안·개인정보**: session과 owner guard, server-only secret, media Range proxy와 외부 저장소 URL 비노출을 유지한다.
- **구조**: FSD 공개 API, kebab-case 파일명, Client/Server boundary와 얇은 root App adapter 검사를 통과해야 한다.
- **의존성**: 새 UI library나 design-system package를 추가하지 않는다. ElevenLabs UI는 참고 구현으로만 사용한다.
- **디자인 거버넌스**: 공통 token 또는 component 의미가 바뀌면 Design System, `globals.css`, `src/shared/ui`, Storybook과 Feature decision 중 영향을 받는 정본을 같은 task에서 동기화해야 한다.

---

## 관련 문서

- PRD: [copy-singer-prd.md](../../../prd/copy-singer-prd.md)
- Design System: [design-system.md](../../../designs/design-system.md)
- Design: [product-ui-redesign.md](../../../designs/product-ui-redesign.md)
- PRD Refs: `PRD-US-019`, `PRD-US-020`, `PRD-US-021`, `PRD-US-022`, `PRD-US-023`, `PRD-US-024`, `PRD-FR-001`, `PRD-FR-002`, `PRD-FR-017`, `PRD-FR-021`, `PRD-FR-022`, `PRD-FR-023`, `PRD-FR-025`, `PRD-FR-036`, `PRD-FR-037`, `PRD-FR-039`, `PRD-FR-040`, `PRD-FR-041`, `PRD-FR-043`, `PRD-FR-045`, `PRD-FR-046`, `PRD-FR-047`, `PRD-FR-048`, `PRD-FR-049`, `PRD-FR-050`, `PRD-FR-051`
