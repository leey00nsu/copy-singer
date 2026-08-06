# Feature Spec: vocal-profile-ui-bug-fixes

> 기술 스택과 수정 구조는 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F007
- **기능명**: vocal-profile-ui-bug-fixes
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-06
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

실제 브라우저 UI 검증 중 발견된 보컬 프로필 흐름의 결함을 태스크 단위로 수정한다. 첫 번째 범위는 브라우저 `MediaRecorder`가 생성한 WebM/Opus 테스트 녹음이 UI에서는 정상 재생되지만, 보컬 프로필 분석 요청에서 `UNSUPPORTED_AUDIO`로 거부되는 문제다.

현재 브라우저는 녹음 파일의 multipart MIME을 `audio/webm;codecs=opus`로 전송할 수 있다. 분석기는 허용 목록의 `audio/webm`과 완전 일치하는 MIME만 받아들이므로, 유효한 WebM이 FFmpeg 디코딩 전에 HTTP 415로 거부된다.

이 feature에 후속 UI 버그를 추가할 때는 구현 전에 해당 사용자 동작과 acceptance를 이 문서에 동기화하고 `tasks.md`에 새 태스크로 append한다.

### 포함 범위

- MIME parameter가 붙은 브라우저 녹음의 안전한 media type 정규화
- `audio/webm;codecs=opus` WebM 녹음의 분석 허용
- 지원 MIME의 parameter 유무에 대한 API 회귀 테스트
- 실제 디코딩 불가 파일과 허용하지 않은 media type의 기존 오류 유지
- UI 녹음 → multipart proxy → analyzer 계약 회귀 검증

### 제외 범위

- 브라우저에서 WebM을 WAV로 재인코딩
- 분석 알고리즘·최소 녹음 길이·품질 판정 기준 변경
- 녹음 UI 디자인 변경
- 아직 보고되지 않은 다른 UI 결함의 선제 수정

---

## 사용자 스토리

### US-1: 브라우저 테스트 녹음으로 보컬 프로필 생성

**As a** 브라우저에서 테스트 가창을 녹음한 사용자  
**I want** 미리 듣기가 가능한 녹음을 그대로 분석하고 싶다  
**So that** 별도 WAV 변환이나 파일 재업로드 없이 보컬 프로필을 만들 수 있다

**Acceptance Criteria:**

- [ ] `MediaRecorder`가 만든 `audio/webm;codecs=opus` 파일을 제출하면 MIME 검증 단계에서 거부되지 않는다.
- [ ] 정상 WebM/Opus 입력은 기존 FFmpeg 표준화와 보컬 분석을 거쳐 프로필 생성 흐름으로 이어진다.
- [ ] 저장되는 recording MIME은 지원 여부를 안정적으로 판별할 수 있는 정규화된 media type이다.
- [ ] `text/plain` 등 허용하지 않은 MIME은 계속 `UNSUPPORTED_AUDIO`와 HTTP 415를 반환한다.
- [ ] MIME만 허용 형식으로 위장한 손상 파일은 성공으로 처리하지 않고 안전한 분석 오류를 반환한다.

---

## 기능 요구사항

### FR-1: parameterized audio MIME 정규화

- analyzer는 multipart part의 `Content-Type`에서 media type과 parameter를 분리한다.
- media type은 앞뒤 공백과 대소문자를 정규화한 뒤 기존 allowlist와 비교한다.
- `codecs=opus` 같은 parameter는 컨테이너 허용 여부를 불필요하게 막지 않되, 실제 파일 유효성은 FFmpeg 디코딩으로 검증한다.
- 분석 결과와 PostgreSQL recording metadata에는 정규화된 media type을 사용한다.

### FR-2: 기존 오류 계약 보존

- allowlist 밖의 media type은 파일 저장·분석 전에 `UNSUPPORTED_AUDIO`로 거부한다.
- allowlist 안이지만 디코딩할 수 없는 파일은 기존 안전한 오류 응답을 유지한다.
- payload 크기, 길이, 무음, clipping과 voiced ratio 검증에는 영향을 주지 않는다.

### FR-3: 회귀 테스트

- parameter가 없는 `audio/webm`과 parameter가 있는 `audio/webm;codecs=opus`를 모두 테스트한다.
- 테스트는 MIME 검증 통과뿐 아니라 실제 WebM/Opus fixture가 표준 WAV로 변환되어 분석되는 경로를 포함한다.
- 기존 unsupported MIME 테스트를 유지한다.

---

## 비기능 요구사항

- **호환성**: Chromium 계열 WebM/Opus와 Safari 계열에서 발생 가능한 parameterized `audio/mp4`를 동일한 정규화 규칙으로 처리한다.
- **보안**: 파일 확장자나 클라이언트 MIME만 신뢰해 성공 처리하지 않고 FFmpeg 디코딩 실패를 오류로 처리한다.
- **검증**: Python API 테스트, TypeScript, ESLint와 production build를 통과해야 한다.
- **배포 경계**: 로컬 코드와 Docker analyzer 검증까지만 수행하며 배포하지 않는다.

---

## 재현 증거

- 로컬 analyzer `POST /v1/analyze`
- multipart filename: `recording.webm`
- multipart content type: `audio/webm;codecs=opus`
- 현재 결과: HTTP `415`, `reasonCode=UNSUPPORTED_AUDIO`
- 확인일: 2026-08-06

---

## 관련 문서

- PRD: `../../../prd/copy-singer-prd.md`
- PRD Refs: `PRD-US-001`, `PRD-FR-001`, `PRD-FR-002`, `PRD-FR-004`, `PRD-NFR-005`
- Predecessor: `../F002-user-vocal-profile/spec.md`
