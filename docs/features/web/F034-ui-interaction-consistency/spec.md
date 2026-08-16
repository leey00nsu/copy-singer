# Feature Spec: ui-interaction-consistency

> 기술 스택과 구체 구현 방식은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F034
- **기능명**: ui-interaction-consistency
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-16
- **상태**: Approved
- **스펙 승인**: 2026-08-16 사용자 응답 `자동진행`을 workflow 승인 옵션 `A`로 기록

---

## 목적

목소리 입력, 추천 목록, 알림 목록에서 사용자의 행동과 직접 관계없는 정보 또는 숨은 상호작용을 제거한다. 자동 녹음의 내부 파일명은 숨기고 두 입력 방식의 버튼 크기를 통일하며, 추천 행 전체를 YouTube 미리보기의 발견 가능한 진입점으로 만든다. 헤더 알림은 새로 확인할 항목에 집중시키되 전체 알림 페이지는 이력으로 유지한다.

아이콘은 모든 곳에 장식적으로 색을 추가하지 않는다. 상태·알림 유형·오디오/분석 데이터처럼 색이 의미를 보조하는 위치만 semantic token으로 강조하고, 탐색·일반 action 아이콘은 텍스트 색을 상속하는 기존 중립 표현을 유지한다.

## 현재 구현 조사

- 마이크 녹음 결과도 업로드 파일과 같은 준비 카드에서 `song-verse-vocal-profile.webm` 내부 파일명을 표시한다.
- `녹음 시작`은 `min-w-36` 중앙 버튼이고 `녹음 파일로 분석하기`는 입력 영역 전체 폭이다.
- 추천 행은 이미 제목의 stretched `ResourceRowButton`이 비상호작용 영역을 덮지만 현재는 곡 선택만 수행하며, YouTube facade만 영상 펼침을 수행한다.
- 헤더 Bell은 최신 5개 알림을 읽음 여부와 관계없이 조회한다. 전체 `/notifications` 페이지는 전체 알림 이력과 읽음 상태를 제공한다.
- 알림 유형과 상태 컴포넌트 일부는 이미 semantic color를 사용하지만, 다수의 일반 Lucide icon은 주변 text color를 상속한다.

---

## 사용자 스토리

### US-1: 자동 녹음 결과에서 필요한 정보만 확인한다

**As a** 목소리를 직접 녹음한 사용자
**I want** 자동 생성된 내부 파일명 대신 녹음 길이와 준비 상태만 보고 싶다
**So that** 저장 파일을 직접 관리해야 한다고 오해하지 않는다

**Acceptance Criteria:**

- [ ] 마이크로 자동 생성된 녹음은 준비 카드에서 파일명을 표시하지 않는다.
- [ ] 사용자가 직접 업로드한 파일은 선택 확인을 위해 원래 파일명을 계속 표시한다.
- [ ] 두 경로 모두 파일 크기, 녹음 길이, 준비 상태와 waveform 등 분석에 필요한 정보는 유지한다.

### US-2: 두 입력 방식을 같은 크기의 선택지로 인식한다

**As a** 목소리 분석을 시작하는 사용자
**I want** `녹음 시작`과 `녹음 파일로 분석하기`를 같은 폭으로 보고 싶다
**So that** 두 입력 방식 중 하나를 쉽게 선택할 수 있다

**Acceptance Criteria:**

- [ ] idle/error 상태의 마이크 시작·재시도 버튼과 업로드 버튼은 같은 content rail과 width를 사용한다.
- [ ] 녹음은 primary, 파일 업로드는 secondary 위계를 기존 fill/border 차이로 유지한다.
- [ ] mobile과 desktop 모두에서 두 버튼의 정렬과 touch target이 일관된다.

### US-3: 추천 행을 클릭해 원본 영상을 미리 본다

**As a** 추천 목록 사용자
**I want** 작은 YouTube 커버를 정확히 누르지 않고 추천 행을 눌러 영상을 펼치고 싶다
**So that** 미리보기 기능을 쉽게 발견하고 사용할 수 있다

**Acceptance Criteria:**

- [ ] 추천 행의 비상호작용 영역을 클릭하면 해당 곡의 YouTube 미리보기가 펼쳐진다.
- [ ] 이미 펼쳐진 같은 행을 다시 클릭하면 미리보기가 닫힌다.
- [ ] 다른 행을 클릭하면 기존 미리보기는 닫히고 새 행의 미리보기 하나만 열린다.
- [ ] 행 클릭은 기존 곡 선택도 함께 수행해 선택 panel과 영상이 같은 곡을 가리킨다.
- [ ] YouTube facade, AI 믹싱 등 행 내부의 독립 control은 기존 고유 동작만 수행하며 중복 toggle을 만들지 않는다.
- [ ] 기존 stretched button의 keyboard/focus 동작을 유지하고 `aria-expanded`와 `aria-controls`로 펼침 상태를 전달한다.
- [ ] 실제 YouTube iframe은 펼치기 전 생성하지 않는 click-to-load 계약을 유지한다.

### US-4: 헤더에서는 새 알림만 확인하고 전체 페이지에서는 이력을 본다

**As a** 로그인 사용자
**I want** 헤더 Bell에서는 아직 읽지 않은 알림만 보고 전체 알림 페이지에서는 과거 이력을 다시 보고 싶다
**So that** 새 소식과 기록을 혼동하지 않는다

**Acceptance Criteria:**

- [ ] 헤더 Bell 목록은 읽지 않은 알림만 최신순으로 최대 5개 표시한다.
- [ ] 개별 알림을 열어 읽음 처리하면 Bell 목록에서 제거된다.
- [ ] `모두 읽음` 처리 후 Bell은 `새 알림이 없어요.` empty state를 표시한다.
- [ ] `/notifications` 전체 페이지는 읽은 알림을 삭제하거나 숨기지 않고 전체 이력과 읽음 상태를 유지한다.
- [ ] Bell의 읽지 않은 수 badge와 목록 내용은 같은 unread 기준을 사용한다.

### US-5: 아이콘 색으로 의미를 더 빠르게 구분한다

**As a** 제품 사용자
**I want** 중요한 상태와 데이터 유형의 아이콘만 일관된 색으로 구분하고 싶다
**So that** 화면이 산만해지지 않으면서 상태를 빠르게 파악할 수 있다

**Acceptance Criteria:**

- [ ] 성공·주의·오류 icon은 각각 `success`, `warning`, `destructive` semantic token을 사용한다.
- [ ] 음성·waveform·분석 지표처럼 제품의 오디오/데이터 의미를 나타내는 icon은 제한적으로 `data-accent` 계열을 사용할 수 있다.
- [ ] 알림 유형 badge의 기존 semantic color는 유지한다.
- [ ] navigation, search, chevron, close, reset, upload와 일반 button icon은 별도 장식색을 넣지 않고 control의 foreground를 상속한다.
- [ ] 한 surface에 의미 없는 여러 icon color를 섞지 않으며 색만으로 상태를 전달하지 않는다.
- [ ] 적용 기준을 `docs/designs/design-system.md`와 관련 Storybook에 동기화한다.

### US-6: 오디오를 원하는 속도와 음량으로 확인한다

**As a** 녹음·분석·AI 믹싱 결과를 듣는 사용자
**I want** 공용 waveform player에서 재생속도와 음량을 조절하고 싶다
**So that** 빠른 비교와 세밀한 청취를 같은 player에서 수행할 수 있다

**Acceptance Criteria:**

- [ ] 재생속도는 `0.75×`, `1×`, `1.25×`, `1.5×` preset을 제공하고 기본값은 `1×`다.
- [ ] 속도 변경은 보컬 pitch를 보존하며 현재 재생 위치와 play/pause 상태를 초기화하지 않는다.
- [ ] 음량은 0–100 범위를 keyboard와 pointer로 조절하고 현재 값을 접근 가능한 이름/값으로 제공한다.
- [ ] 속도와 음량은 waveform 아래 별도 행을 차지하지 않고 음소거 왼쪽의 compact icon trigger에서 Popover로 연다.
- [ ] Popover는 trigger와 keyboard focus를 보존하고 바깥 click·Escape로 닫힌다.
- [ ] 음량 slider를 0보다 크게 조절하면 기존 mute 상태가 해제된다.
- [ ] 기존 play/pause, restart, seek, mute, segment playback과 decode fallback을 유지한다.
- [ ] mobile에서도 control이 겹치거나 최소 touch target을 침범하지 않는다.

### US-7: 완료된 믹싱의 정본 상세로 이동한다

**As a** 추천 화면에서 AI 믹싱 완료를 확인한 사용자
**I want** 완료 action으로 저장된 믹싱 상세를 열고 싶다
**So that** 재생·저장·작업 정보를 Library의 일관된 위치에서 확인할 수 있다

**Acceptance Criteria:**

- [ ] 완료된 synthesis에 `jobId`가 있으면 `믹싱 결과 보기` Link를 표시한다.
- [ ] Link는 `/library/mixes/{jobId}`로 이동한다.
- [ ] 추천 화면의 `결과 듣기` toggle, 인라인 waveform player와 중복 download action은 제거된다.
- [ ] 추천 목록의 compact 완료 badge와 믹싱 상세의 재생·download 기능은 유지된다.
- [ ] legacy 또는 불완전 payload처럼 완료 상태에 `jobId`가 없으면 잘못된 상세 URL을 만들지 않는다.

---

## 기능 요구사항

### FR-1: 녹음 출처 구분

Voice Scan은 선택된 오디오가 마이크 자동 녹음인지 사용자 업로드인지 presentation 수준에서 구분해야 한다. 자동 녹음의 내부 `File.name`은 업로드·분석 계약을 위해 유지할 수 있지만 화면에는 표시하지 않는다. 업로드 파일의 원래 이름은 유지한다.

### FR-2: 입력 action 폭 통일

idle/error 상태의 recorder action과 upload action은 동일한 width constraint를 공유한다. 녹음 중 stop/cancel 원형 control은 현재 상태 전용 control이므로 폭 통일 대상이 아니다.

### FR-3: 추천 행의 단일 주 interaction

기존 stretched `ResourceRowButton`을 추천 행의 선택 + 영상 펼침 trigger로 사용한다. 별도 row `onClick`, 중첩 button 또는 interactive `tr`을 새로 만들지 않는다. Thumbnail facade와 Mixing action은 독립 interaction layer로 유지한다.

### FR-4: 알림 조회 범위 분리

알림 list query/API는 `unreadOnly`와 같은 명시적 필터를 지원해야 한다. Header Bell만 unread 필터를 사용하고 전체 알림 페이지의 기본 query는 전체 이력을 반환한다. unread filter에서도 `total`, `pageCount`, `unreadCount` 의미가 모순되지 않아야 한다.

### FR-5: Semantic icon color 규칙

아이콘의 색은 장식이 아니라 상태 또는 도메인 의미를 보조해야 한다. 기존 semantic CSS token을 재사용하고 raw color·새 gradient·새 icon library를 추가하지 않는다. 이 Feature에서는 관련 화면과 공통 상태 컴포넌트를 감사하되 전 제품 아이콘을 일괄 재색칠하지 않는다.

### FR-6: 공용 AudioWaveformPlayer 청취 조절

모든 `AudioWaveformPlayer` 사용처에 같은 재생속도와 음량 Popover control을 제공한다. 두 icon trigger는 음소거 왼쪽의 playback control row에 배치한다. Wavesurfer의 playback rate와 volume API를 사용하고 속도 변경 시 `preservePitch`를 유지한다. 사용자 선택은 player instance 단위이며 새 `src`로 player가 교체되면 기본 `1×`·100%로 초기화한다.

### FR-7: 완료된 추천 synthesis의 상세 이동

추천 화면의 완료 action은 synthesis `jobId`를 사용해 Library 믹싱 상세로 연결한다. action label은 즉시 재생을 암시하는 `결과 듣기`가 아니라 `믹싱 결과 보기`를 사용하며 추천 화면에 공용 audio player와 download UI를 중복 렌더링하지 않는다.

---

## 비기능 요구사항

- **접근성**: 추천 영상 trigger의 키보드 조작, focus-visible, expanded state를 유지하고 색 외의 텍스트/ARIA 상태를 제공한다.
- **성능·개인정보**: 추천 영상은 사용자가 펼치기 전 YouTube iframe이나 추가 embed 요청을 만들지 않는다.
- **호환성**: 자동 녹음의 실제 `File`, MIME, extension과 분석 업로드 계약을 바꾸지 않는다.
- **반응형**: 입력 버튼 폭, 추천 행, 알림 empty state를 mobile/desktop Storybook에서 검증한다.

---

## 관련 문서

- PRD: `docs/prd/copy-singer-prd.md`
- PRD Refs: `PRD-FR-045`, `PRD-FR-047`, `PRD-FR-056`, `PRD-FR-058`, `PRD-FR-062`, `PRD-FR-066`
- Design Refs:
  - Design System: `docs/designs/design-system.md`
  - Visual Brief: -
