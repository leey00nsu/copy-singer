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

### FR-3: 검증된 YouTube source contract

- catalog metadata의 `sourceVideoId`를 server serializer에서 엄격한 video ID 형식으로 검증해 nullable 응답 필드로 제공한다.
- client는 원본 `sourceUrl`을 embed URL로 직접 변환하지 않고 `sourceVideoId`로만 `https://www.youtube-nocookie.com/embed/{id}` URL을 구성한다.
- `autoplay=0`, controls와 fullscreen을 유지하며 iframe에는 곡·아티스트를 포함한 title과 제한된 `allow` 정책을 지정한다.

### FR-4: 목록 facade와 상세 player 배치

- 추천 목록은 곡 정보 왼쪽에 16:9 facade를 두고 사용자가 재생하기 전 iframe과 YouTube 연결을 만들지 않는다.
- facade의 재생 control은 별도 interactive target이며 기존 clickable row overlay와 이벤트·focus가 충돌하지 않는다.
- 한 목록에서 새 영상을 재생하면 기존 inline player를 닫아 동시에 하나만 활성화한다.
- 상세 player는 곡 제목 위의 full-width media 영역에 배치하고 기존 `외부 출처 열기` action과 관련 icon import를 제거한다.

### 제외 범위

- YouTube Data API 검색, 추천 영상 자동 탐색 또는 thumbnail 영구 저장
- 영상 autoplay, background 재생, 재생 위치 동기화와 custom YouTube controls
- 프로필 cover 업로드·직접 색상 선택·이미지 편집
- 프로필 이름을 추천 실행 또는 기존 믹싱 snapshot에 복제 저장

---

## 비기능 요구사항

- **성능**: 목록 초기 렌더는 YouTube iframe을 0개 로드하고 facade 이미지는 lazy loading한다. 동시에 활성화되는 목록 player는 최대 1개다.
- **보안·개인정보**: server가 검증한 video ID만 embed 경로에 사용하며 privacy-enhanced domain을 사용한다. 프로필 이름 PATCH는 인증과 소유권을 server에서 확인한다.
- **접근성**: facade는 곡명을 포함한 재생 이름을 제공하고 keyboard로 활성화할 수 있다. iframe title, focus-visible, 저장 상태와 validation 오류를 제공한다.
- **반응형**: 목록 media는 mobile에서도 곡 제목·적합도·키·믹싱 action을 밀어내거나 horizontal overflow를 만들지 않는다. player는 16:9를 기본으로 하되 좁은 화면에서는 YouTube 최소 200px 높이를 우선한다.

---

## 관련 문서

- PRD: `../../prd/`
- PRD Refs: `PRD-US-015`, `PRD-US-022`, `PRD-US-025`, `PRD-US-026`, `PRD-FR-024`, `PRD-FR-039`, `PRD-FR-049`, `PRD-FR-054`, `PRD-FR-055`, `PRD-FR-056`, `PRD-DATA-011`, `PRD-NFR-005`, `PRD-NFR-009`
  - 이미 원문 요구사항 문서에 정의된 ID만 적으세요. `spec.md`나 `tasks.md`에서 임의로 PRD ID를 만들지 않습니다.
  - 레거시 요구사항 문서에 아직 PRD ID가 없다면, 먼저 원문에 ID를 backfill한 뒤 이 필드와 `tasks.md` 태스크 태그를 함께 갱신하세요.
  - 요구사항/스코프 변경 시 PRD 문서 + 이 필드 + `tasks.md` 태스크 태그를 함께 갱신하세요.
  - 구현 중 더 나은 사용자 동작이 발견되어 최종 요구사항이 바뀌었다면, 이를 영구적인 `[NON-PRD]` 예외로 두지 말고 PRD 업데이트로 취급하세요.
