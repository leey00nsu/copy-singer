# Feature Spec: user-vocal-profile

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F002
- **기능명**: user-vocal-profile
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-05
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

사용자가 브라우저에서 짧은 테스트 가창을 녹음하거나 기존 파일을 선택하면, 입력 품질을 검사하고 설명 가능한 pitch 통계로 보컬 프로필을 생성·저장한다.
이 프로필은 후속 곡 비교와 키 추천의 기준 입력이며, 의료적 진단이나 음색 기반 가수 유사도 평가로 사용하지 않는다.

### 포함 범위

- 브라우저 마이크 녹음 시작·정지·재녹음 및 로컬 파일 업로드
- 선택한 입력의 미리 듣기와 분석 제출
- mono PCM 표준화, 길이·무음·클리핑·voiced ratio 품질 검사
- 사용자 VocalProfile pitch 통계 계산, PostgreSQL 저장 및 단건 조회
- 사용자가 원본 녹음과 연결된 프로필을 명시적으로 삭제하는 기능
- 합성 fixture와 API/UI 테스트

### 제외 범위

- 곡 보컬 프로필 생성과 100곡 카탈로그
- 원키 적합도, 추천 노래방 키 및 상위 3곡 추천
- 음색·화자 embedding과 가수 유사도
- 의료적 발성 진단, 성종 판정 또는 절대적인 가창력 점수
- 사용자 계정과 장기 프로필 이력
- 모바일 브라우저 전체 조합에 대한 최적화

---

## 사용자 스토리

### US-1: 테스트 가창 준비

**As a** 노래 추천을 받고 싶은 사용자
**I want** 안내를 보며 마이크로 테스트 가창을 녹음하거나 기존 오디오 파일을 선택하고 싶다
**So that** 별도 오디오 편집 도구 없이 보컬 분석 입력을 준비할 수 있다

**Acceptance Criteria:**

- [ ] UI가 세 가지 시작 키와 저작권 없는 안내 멜로디, glissando로 구성된 약 20–25초 녹음 순서를 안내한다.
- [ ] 사용자는 낮게(C3–A3), 보통(G3–E4), 높게(C4–A4) 예시를 들어보고 가장 편한 키를 선택할 수 있다.
- [ ] 사용자는 마이크 녹음을 시작·정지하고 결과를 미리 듣거나 지운 뒤 다시 녹음할 수 있다.
- [ ] 사용자는 녹음 대신 WAV, MP3, M4A 또는 WebM 오디오 파일을 선택할 수 있다.
- [ ] 분석 전 선택 파일명·크기와 미리 듣기를 확인할 수 있다.

### US-2: 입력 품질 확인

**As a** 사용자
**I want** 입력이 분석에 적합하지 않을 때 구체적인 이유와 다시 시도할 방법을 알고 싶다
**So that** 신뢰하기 어려운 프로필을 그대로 사용하지 않을 수 있다

**Acceptance Criteria:**

- [ ] 디코딩 실패, 8초 미만 입력, 과도한 무음, 1% 초과 clipping ratio, 25% 미만 voiced ratio는 프로필 생성 전에 거절된다.
- [ ] 품질 실패 응답은 안정적인 reason code와 한국어 안내를 포함한다.
- [ ] 실패한 입력으로 VocalProfile을 생성하지 않는다.
- [ ] 최대 60초 또는 25MB를 초과하는 입력은 분석 전에 거절된다.

### US-3: 보컬 프로필 확인

**As a** 사용자
**I want** 분석된 음역과 안정도 결과를 이해하기 쉬운 형태로 보고 싶다
**So that** 이후 추천의 근거가 되는 내 목소리 특성을 확인할 수 있다

**Acceptance Criteria:**

- [ ] 결과가 glissando 기반 유효 최저·최고 MIDI, 멜로디 기반 p10·p50·p90 MIDI와 tessitura, voiced ratio, pitch stability, clipping ratio와 RMS dB를 포함한다.
- [ ] MIDI 값은 음이름과 octave 표기로 함께 표시한다.
- [ ] 결과에 분석기 이름·버전, 녹음 길이와 생성 시각을 표시한다.
- [ ] 동일한 profile ID를 조회하면 저장된 집계 결과가 반환된다.

### US-4: 데이터 삭제

**As a** 사용자
**I want** 생성한 보컬 프로필과 원본 녹음을 삭제하고 싶다
**So that** 로컬 환경에 내 음성 데이터가 불필요하게 남지 않는다

**Acceptance Criteria:**

- [ ] 삭제 전 확인 UI가 제공된다.
- [ ] 삭제가 완료되면 VocalProfile, Recording row와 저장된 원본 파일이 제거된다.
- [ ] 삭제된 profile ID 조회는 찾을 수 없음 응답을 반환한다.

---

## 기능 요구사항

### FR-1: 녹음 및 업로드 입력

- 브라우저가 지원하면 `MediaRecorder`로 마이크 입력을 녹음한다.
- 마이크 권한 거부나 미지원 상태를 구분해 안내하고 파일 업로드 대안을 유지한다.
- 허용 입력은 WAV, MP3, M4A 및 WebM이며 최대 25MB, 최대 60초다.
- 브라우저는 분석 전 오디오를 자동 업로드하지 않는다.

### FR-2: 테스트 가창 프로토콜

- 녹음 전체 길이는 약 20–25초이며 최소 decoded duration은 8초다.
- 사용자는 같은 상대 멜로디를 낮게(C3–A3), 보통(G3–E4), 높게(C4–A4) 중 가장 편한 키로 선택한다.
- 안내 멜로디는 80 BPM에서 `1–2–3–5 | 6–5–3–2 | 1–3–5–6 | 5–3–2–1`의 상대 음정 패턴을 사용하고 각 음을 `아`로 부른다.
- 멜로디는 녹음 전에 먼저 재생하고, 4박자 count-in 뒤에는 마이크 혼입을 막기 위해 소리 없이 시각 가이드만 표시한다. 안내음을 들으며 동시에 녹음하는 선택지는 이어폰 사용 시에만 제공한다.
- 멜로디 다음에는 `아`로 편한 음→가능한 낮은 음→편한 음→가능한 높은 음→편한 음의 glissando를 약 6–8초 수행한다.
- 반주가 없고 한 명의 목소리가 또렷한 입력을 권장한다.
- 녹음 요청에는 선택 preset과 멜로디·glissando 구간의 상대 timestamp를 함께 전달한다.

### FR-3: 프로필 생성 API

- `POST /api/vocal-profiles`가 multipart `audio` 한 개를 받아 분석하고 저장된 프로필을 반환한다.
- 업로드 body는 서버에서 전체 메모리 버퍼로 만들지 않고 임시 파일로 스트리밍한다.
- 성공 응답은 profile ID, recording metadata, pitch statistics, quality metrics, analyzer 정보를 포함한다.
- 처리 중 UI는 중복 제출을 막고 녹음 저장·분석·저장 단계를 하나의 진행 상태로 표시한다.

### FR-4: 오디오 표준화와 품질 gate

- 입력은 분석 전에 ffmpeg로 mono, 22,050Hz float PCM으로 표준화한다.
- 디코딩 실패, duration 8초 미만 또는 60초 초과, clipping ratio 1% 초과를 거절한다.
- pYIN 분석 후 voiced ratio 25% 미만 또는 voiced frame이 유효 통계 계산에 부족하면 거절한다.
- 실패는 `UNSUPPORTED_AUDIO`, `TOO_SHORT`, `TOO_LONG`, `TOO_SILENT`, `EXCESSIVE_CLIPPING`, `LOW_VOICED_RATIO`, `ANALYSIS_FAILED` 중 하나의 reason code를 사용한다.

### FR-5: pitch 및 품질 통계

- 유효 F0 frame을 MIDI로 변환한다.
- 안내 녹음은 멜로디 구간의 p10, median, p90을 계산하고 tessitura를 해당 p10과 p90으로 정의한다.
- 안내 녹음의 min과 max는 glissando 구간의 robust 최저·최고 분위값으로 계산해 단일 octave 오류와 순간 잡음을 제외한다.
- pitch stability는 멜로디 구간 voiced frame의 목표 음정 주변 cents 오차와 프레임 변화량을 사용해 0–1 범위로 정규화한다.
- 구간 정보가 없는 업로드 파일은 전체 voiced frame에서 통계를 계산하고 결과에 `segmented=false`를 기록한다.
- voiced ratio, clipping ratio, RMS dB와 분석에 사용한 frame 수를 함께 계산한다.
- 원시 frame 배열은 DB에 저장하지 않는다.

### FR-6: 데이터 저장

- 분석 시작 시 `Recording(kind=USER_TEST)`을 생성하고 파일 참조, MIME, 크기, duration, sample rate와 상태를 기록한다.
- 성공 시 `VocalProfile(sourceType=USER)`을 Recording에 연결하고 `analyzer=librosa-pyin` 및 정확한 analyzer version을 저장한다.
- 품질 실패 시 VocalProfile은 생성하지 않고 Recording을 `FAILED`로 표시한 뒤 임시 입력 파일을 제거한다.
- 원본 입력은 Git에서 제외된 로컬 storage에 두며 기본 만료 시각은 생성 후 24시간이다.

### FR-7: 조회 및 삭제 API

- `GET /api/vocal-profiles/{id}`는 저장된 사용자 프로필과 Recording metadata를 반환한다.
- `DELETE /api/vocal-profiles/{id}`는 프로필, 연결된 추천 이력이 없는 USER_TEST Recording과 원본 파일을 삭제한다.
- 존재하지 않는 ID는 일관된 `404` 응답을 반환한다.

### FR-8: 사용자 인터페이스

- 기존 합성 Workbench와 구분되는 보컬 프로필 섹션 또는 화면을 제공한다.
- 입력, 분석 진행, 품질 오류, 결과, 삭제 상태를 명확히 구분한다.
- 결과는 추천 근거용 측정값임을 표시하고 의료적 진단 또는 절대적 가창 평가가 아님을 고지한다.

---

## 비기능 요구사항

- **성능**: 30초 입력의 분석은 로컬 CPU 기준 목표 30초 이내이며, 요청 timeout은 최소 60초를 허용한다.
- **보안·개인정보**: 경로 traversal을 허용하지 않는 서버 생성 파일명만 사용하고, 원본 파일과 DB row를 사용자가 삭제할 수 있어야 한다.
- **재현성**: analyzer 이름·라이브러리 버전·분석 설정을 저장해 동일 fixture 결과를 비교할 수 있어야 한다.
- **비용**: 프로필 분석에는 Modal GPU를 사용하지 않는다.
- **책임 있는 사용**: 사용 권한이 있는 음성만 올리도록 고지하고 결과를 의료적 평가로 표현하지 않는다.
- **호환성**: 기존 SoulX-Singer 변환 API와 UI 흐름을 깨뜨리지 않는다.
- **검증**: 합성 고정음, sine sweep, 무음, clipping fixture와 실제 브라우저 녹음 흐름을 검증한다.

---

## 관련 문서

- PRD: `../../../prd/copy-singer-prd.md`
- PRD Refs: `PRD-US-001`, `PRD-US-002`, `PRD-FR-001`, `PRD-FR-002`, `PRD-FR-003`, `PRD-FR-004`, `PRD-DATA-004`, `PRD-DATA-005`, `PRD-NFR-002`, `PRD-NFR-003`, `PRD-NFR-004`, `PRD-NFR-005`, `PRD-NFR-006`

- Idea: `../../../ideas/I002-user-vocal-profile.md`
