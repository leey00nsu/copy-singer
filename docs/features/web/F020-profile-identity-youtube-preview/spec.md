# Feature Spec: profile-identity-youtube-preview

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F020
- **기능명**: profile-identity-youtube-preview
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-11
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

보컬 프로필의 자동 번호 이름과 사용자 이름 변경, 결정적 grainy gradient 커버, 추천 목록·상세의 원본 YouTube 재생 프리뷰를 제공한다.

현재 보컬 프로필은 분석 결과에서 계산한 유형 문구를 제목처럼 재사용하고 모든 목록 항목이 같은 파형 아이콘을 사용한다. 프로필이 쌓이면 개별 분석을 기억하거나 구분하기 어렵고, 이름을 바꿀 수도 없다. 추천은 카탈로그의 원본 YouTube 출처를 저장하고도 별도 링크로만 제공해 목록과 상세의 맥락 안에서 곡을 확인하기 어렵다.

이 feature는 프로필에 안정적인 사용자 소유 이름과 시각 identity를 부여하고, 이미 저장된 `sourceVideoId`를 안전한 YouTube player 계약으로 노출한다. 프로필 이름은 분석 결과의 유형 설명과 분리하며, 영상 재생은 추천 점수·정렬·선택·믹싱 동작을 방해하지 않아야 한다.

---

## 사용자 스토리

### US-1: 기억하고 관리할 수 있는 보컬 프로필

**As a** 여러 번 목소리를 분석한 사용자
**I want** 프로필마다 순서가 있는 기본 이름과 서로 다른 커버를 보고 이름을 바꾸고 싶다.
**So that** 과거 분석을 빠르게 구분하고 내가 이해하기 쉬운 이름으로 관리할 수 있다.

**Acceptance Criteria:**

- [ ] 새 사용자 보컬 프로필은 분석 성공 시 `보컬 프로필 1`, `보컬 프로필 2`처럼 사용자별 단조 증가 번호의 기본 이름을 갖는다.
- [ ] 프로필을 삭제해도 번호는 재사용되지 않고 기존 프로필의 번호나 이름도 바뀌지 않는다.
- [ ] 사용자는 본인 프로필 상세에서 이름 변경을 시작하고, 공백 제거 후 1~40자의 새 이름을 저장하거나 취소할 수 있다.
- [ ] 빈 이름·41자 이상·권한 없는 프로필 수정은 거부되며 저장 중·오류 상태가 명시된다.
- [ ] 목록과 상세의 프로필 제목은 저장된 이름을 사용하고, 분석 결과에서 계산한 보컬 유형·요약은 설명으로 유지한다.
- [ ] 기존 파형 아이콘은 프로필 ID로 결정되는 square grainy gradient 커버로 대체되고 이름 변경·재접속 후에도 동일하다.
- [ ] 분석 대기·진행·실패 항목은 저장된 프로필과 같은 목록 컬럼·간격을 사용하되, 프로필 생성 전에는 비활성 행으로 표시하고 상세 이동을 제공하지 않는다.

### US-2: 추천 맥락 안에서 확인하는 원곡

**As a** 추천 곡을 비교하는 사용자
**I want** 목록과 상세에서 원본 YouTube 영상을 바로 재생하고 싶다.
**So that** 페이지를 오가거나 외부 링크를 열지 않고 곡을 확인할 수 있다.

**Acceptance Criteria:**

- [ ] 추천 응답은 임의 URL이 아니라 검증된 YouTube `sourceVideoId`를 제공한다.
- [ ] 추천 목록의 곡 왼쪽에는 16:9 원본 영상 facade가 album-cover처럼 표시되고, 재생을 누른 항목만 실제 player iframe을 로드한다.
- [ ] player 조작은 행 선택·상세 이동·AI 믹싱 동작을 우발적으로 실행하지 않는다.
- [ ] 곡 상세에서는 제목 위에 원본 영상 player를 표시하고 별도 `외부 출처 열기` button은 제거한다.
- [ ] video ID가 없거나 유효하지 않으면 깨진 iframe 대신 중립 placeholder를 보여주며 추천 조회와 믹싱은 계속 사용할 수 있다.
- [ ] autoplay는 사용하지 않고 privacy-enhanced domain, accessible title, keyboard focus와 fullscreen을 지원한다.

### US-3: 일관된 추천 스냅샷과 믹싱 가능 상태

**As a** 보컬 프로필을 기준으로 추천과 믹싱을 이어가는 사용자
**I want** 같은 프로필의 추천 결과와 믹싱 가능 여부가 화면마다 일관되게 보이길 원한다.
**So that** 중복 결과나 뒤늦은 실패 없이 다음 행동을 이해할 수 있다.

**Acceptance Criteria:**

- [ ] 사용자 보컬 프로필마다 추천 스냅샷은 하나만 존재하며 반복·동시 생성 요청은 같은 결과를 반환한다.
- [ ] 프로필 목록·상세는 `추천 N` 개수와 기존 결과가 있을 때의 `새 추천 만들기` action을 노출하지 않는다.
- [ ] 분석 결과의 저·중앙·고 대표 구간은 항상 세 슬롯으로 표시하고 중앙 구간이 없으면 누락 이유를 명시한다.
- [ ] 믹싱용 중앙 대표 구간이 없는 프로필의 추천 목록·곡 상세는 AI 믹싱 action을 실행 전에 비활성화하고 재분석 경로를 제공한다.
- [ ] 추천 목록에서 AI 믹싱이 완료된 곡은 `완료` chip만 표시하며 별도 `결과 확인` link를 반복하지 않는다.
- [ ] 데스크톱의 선택한 추천곡 카드는 긴 목록을 스크롤하는 동안 공통 header 아래에서 sticky로 유지된다.
- [ ] 완료된 선택 카드의 닫힌 `결과 듣기`는 primary action이며, 플레이어를 연 뒤 `결과 닫기`는 outline action으로 낮아진다.

### US-4: 공통 목록 상태 문법

**As a** 라이브러리에서 보컬 프로필과 AI 믹스를 확인하는 사용자
**I want** 두 목록의 상태를 같은 위치와 표현 방식으로 확인하고 싶다.
**So that** 중복 설명 없이 항목의 현재 사용 가능 여부를 빠르게 비교할 수 있다.

**Acceptance Criteria:**

- [ ] AI 믹스 목록은 중복되는 `결과` 컬럼을 제거하고 `작업 / 아티스트 · 생성일 · 상태` 순서로 표시한다.
- [ ] 결과 파일 확인 중인 성공 job은 `완료`가 아니라 `결과 확인 중` 상태로 구분한다.
- [ ] 보컬 프로필 목록은 `프로필 이름 · 생성일 · 음역 · 안정도 · AI 믹싱 · 상태`의 6-column 구조를 사용한다.
- [ ] 저장 프로필은 `사용 가능`, 분석 job은 대기·진행·재시도·실패 상태를 마지막 컬럼에 표시한다. 미확정 `AI 믹싱` 값은 `—`로 표시한다.
- [ ] 모바일에서는 상태를 identity 영역의 제목 위에 우선 배치하고 나머지 정보를 compact metadata로 제공한다.

---

## 기능 요구사항

### FR-1: 영속 프로필 이름과 순번

- `VocalProfile`의 사용자 표시 이름과 사용자별 기본 이름 순번을 DB에 저장하고 API 응답에 포함한다.
- 사용자별 순번은 동시 생성에서도 중복되지 않는 단조 증가 값이어야 한다. 삭제된 순번은 재사용하지 않는다.
- 기존 USER 프로필은 사용자별 `createdAt`, `id` 오름차순으로 결정적으로 번호와 기본 이름을 backfill한다. SONG 프로필에는 적용하지 않는다.
- PATCH 수정은 인증 사용자 소유권을 검증하고 Unicode 공백을 trim한 1~40자 이름만 허용한다. 사용자 지정 이름의 중복은 허용한다.

### FR-2: 결정적 grainy gradient artwork

- 공통 `VocalProfileArtwork`는 profile ID를 seed로 hue·gradient position을 결정하고 CSS gradient와 noise overlay로 square cover를 그린다.
- artwork는 이름·분석 점수·목록 순서에 의존하지 않으며 별도 bitmap이나 사용자 입력을 저장하지 않는다.
- 목록에서는 파형 icon 영역을 cover로 교체하고, 상세 제목 영역에서도 같은 artwork를 재사용한다.
- 아직 profile ID가 없는 분석 job 행은 같은 크기의 중립 loading cover를 사용하고 `aria-busy` 상태를 제공한다. 생성일 외 미확정 분석 값은 `—`로 표시한다.

### FR-3: 검증된 YouTube source contract

- catalog metadata의 `sourceVideoId`를 server serializer에서 엄격한 video ID 형식으로 검증해 nullable 응답 필드로 제공한다.
- client는 원본 `sourceUrl`을 embed URL로 직접 변환하지 않고 `sourceVideoId`로만 `https://www.youtube-nocookie.com/embed/{id}` URL을 구성한다.
- `autoplay=0`, controls와 fullscreen을 유지하며 iframe에는 곡·아티스트를 포함한 title과 제한된 `allow` 정책을 지정한다.

### FR-4: 목록 facade와 상세 player 배치

- 추천 목록은 곡 정보 왼쪽에 16:9 facade를 두고 사용자가 재생하기 전 iframe과 YouTube 연결을 만들지 않는다.
- facade의 재생 control은 별도 interactive target이며 기존 clickable row overlay와 이벤트·focus가 충돌하지 않는다.
- 한 목록에서 새 영상을 재생하면 기존 inline player를 닫아 동시에 하나만 활성화한다.
- 상세 player는 곡 제목 위의 full-width media 영역에 배치하고 기존 `외부 출처 열기` action과 관련 icon import를 제거한다.
- 데스크톱 선택 요약 aside 자체를 sticky container로 만들고 공통 header를 가리지 않는 top offset을 사용한다. 모바일 bottom sheet 동작은 유지한다.

### FR-5: 프로필별 단일 추천 스냅샷

- `RecommendationRun.userVocalProfileId`는 DB에서 unique invariant로 보호하고 기존 중복 데이터는 최신 `createdAt`, `id` 순으로 한 건만 유지한다.
- 추천 생성 API는 기존 스냅샷을 우선 반환하며 동시 생성 경합에서도 unique violation을 기존 결과 조회로 복구한다.
- 프로필 목록과 상세는 추천 개수를 표시하지 않고 기존 결과가 있으면 해당 결과로 이동하는 action만 제공한다.

### FR-6: 중앙 대표 구간과 믹싱 가능 상태

- 대표 구간 UI는 low·mid·high 슬롯을 고정 표시하고 실제 segment가 없는 mid 슬롯에는 `중앙 영역을 충분히 찾지 못했어요` 안내를 표시한다.
- 추천 응답은 해당 프로필로 실제 믹싱 reference를 선택할 수 있는지와 불가 사유를 제공한다.
- 믹싱 reference가 없는 경우 추천 목록·선택·곡 상세는 요청을 보내는 button 대신 명시적 불가 상태와 `/profile` 재분석 link를 표시한다.
- server의 기존 `MIXING_REFERENCE_UNAVAILABLE` 방어와 티켓 미차감 동작은 유지한다.
- 추천 목록의 compact 완료 상태는 `완료` chip만 노출한다. 결과 재생·저장과 상세 이동은 선택 카드 및 상세 화면에서 제공한다.
- 완료된 선택 카드에서 재생 전 `결과 듣기`는 primary button, 재생 후 `결과 닫기`와 `결과 저장`은 outline button으로 표시한다.

### FR-7: 라이브러리 상태 컬럼 공통화

- AI 믹스 목록의 `statusDescription` 결과 컬럼을 제거하되 상세 화면의 진행 설명과 실패 사유는 유지한다.
- AI 믹스 status presentation은 `resultReady=false`인 succeeded job을 `결과 확인 중`으로 표시하고 상태를 맨 오른쪽 컬럼에 배치한다.
- 보컬 프로필 목록은 AI 믹싱 횟수와 상태를 별도 컬럼으로 유지하며 저장 profile과 분석 job이 같은 6-column template을 공유한다.
- 데스크톱에서는 상태를 마지막 column, 모바일에서는 identity block 상단에 배치한다. 완료 전 분석 job은 계속 non-interactive로 유지한다.

### 제외 범위

- YouTube Data API 검색, 추천 영상 자동 탐색 또는 thumbnail 영구 저장
- 영상 autoplay, background 재생, 재생 위치 동기화와 custom YouTube controls
- 프로필 cover 업로드·직접 색상 선택·이미지 편집
- 프로필 이름을 추천 실행 또는 기존 믹싱 snapshot에 복제 저장
- 기존 추천 결과를 강제로 다시 계산하거나 추천 이력을 여러 버전으로 보존하는 기능

---

## 비기능 요구사항

- **성능**: 목록 초기 렌더는 YouTube iframe을 0개 로드하고 facade 이미지는 lazy loading한다. 동시에 활성화되는 목록 player는 최대 1개다.
- **보안·개인정보**: server가 검증한 video ID만 embed 경로에 사용하며 privacy-enhanced domain을 사용한다. 프로필 이름 PATCH는 인증과 소유권을 server에서 확인한다.
- **접근성**: facade는 곡명을 포함한 재생 이름을 제공하고 keyboard로 활성화할 수 있다. iframe title, focus-visible, 저장 상태와 validation 오류를 제공한다.
- **반응형**: 목록 media는 mobile에서도 곡 제목·적합도·키·믹싱 action을 밀어내거나 horizontal overflow를 만들지 않는다. player는 16:9를 기본으로 하되 좁은 화면에서는 YouTube 최소 200px 높이를 우선한다.

---

## 관련 문서

- PRD: `../../prd/`
- PRD Refs: `PRD-US-015`, `PRD-US-022`, `PRD-US-023`, `PRD-US-025`, `PRD-US-026`, `PRD-FR-024`, `PRD-FR-036`, `PRD-FR-039`, `PRD-FR-049`, `PRD-FR-050`, `PRD-FR-054`, `PRD-FR-055`, `PRD-FR-056`, `PRD-FR-057`, `PRD-DATA-011`, `PRD-NFR-005`, `PRD-NFR-009`
  - 이미 원문 요구사항 문서에 정의된 ID만 적으세요. `spec.md`나 `tasks.md`에서 임의로 PRD ID를 만들지 않습니다.
  - 레거시 요구사항 문서에 아직 PRD ID가 없다면, 먼저 원문에 ID를 backfill한 뒤 이 필드와 `tasks.md` 태스크 태그를 함께 갱신하세요.
  - 요구사항/스코프 변경 시 PRD 문서 + 이 필드 + `tasks.md` 태스크 태그를 함께 갱신하세요.
  - 구현 중 더 나은 사용자 동작이 발견되어 최종 요구사항이 바뀌었다면, 이를 영구적인 `[NON-PRD]` 예외로 두지 말고 PRD 업데이트로 취급하세요.
