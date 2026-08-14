# Feature Spec: song-catalog-audio-format-parity

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F028
- **기능명**: song-catalog-audio-format-parity
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-14
- **상태**: Approved
  - 값: Draft | Review | Approved
- **PRD Refs**: `PRD-US-028`, `PRD-FR-059`

---

## 목적

관리자 `/admin/songs`의 곡 추가·target 음원 업로드·출처 교체에서 보컬 분석 업로드가 지원하는 오디오 포맷보다 좁은 파일 선택/검증 계약을 사용하지 않도록 통일한다. 현재 보컬 분석 input은 `.wav`, `.mp3`, `.m4a`, `.webm`을 명시적으로 허용하지만 관리자 카탈로그 input은 `audio/*,.flac`만 선언해 일부 브라우저·OS에서 `.m4a`가 파일 선택 단계부터 보이지 않거나 일관되게 처리되지 않을 수 있다. 서버는 `audio/mp4`/`audio/aac`을 허용하지만 MIME 계약도 별도로 중복되어 있어 drift 가능성이 있다.

이 feature는 공용 오디오 업로드 포맷 계약을 두고 **보컬 분석과 관리자 카탈로그 업로드가 정확히 같은 지원 포맷 집합**을 사용하도록 한다. 지원 확장자는 `.wav`, `.mp3`, `.m4a`, `.webm`으로 고정하며 `.flac`은 양쪽 모두 지원하지 않는다. 모든 관련 file input에는 사용자가 선택 전에 확인할 수 있도록 지원 확장자를 항상 표시한다. 별도 transcoding을 추가하는 feature는 아니다.

---

## 사용자 스토리

### US-1: m4a 음원을 등록하는 관리자

**As a** 허용된 관리자
**I want** 보컬 분석에 업로드할 수 있는 m4a 음원을 곡 추가·target 업로드·출처 교체에서도 그대로 선택하고 등록하고 싶다.
**So that** 같은 제품 안에서 업로드 위치에 따라 지원 확장자가 달라지는 문제 없이 카탈로그를 관리할 수 있다.

**Acceptance Criteria:**

- [ ] `/admin/songs`의 곡 추가, 기존 source target 업로드, 출처 교체 input에서 `.wav`, `.mp3`, `.m4a`, `.webm`을 명시적으로 선택할 수 있다.
- [ ] `.m4a` 파일이 `audio/mp4`, `audio/aac`, `audio/x-m4a` 중 일반적인 브라우저 MIME으로 전달되어도 허용된다.
- [ ] `.flac`/`audio/flac`은 보컬 분석과 관리자 카탈로그 업로드 양쪽에서 모두 허용하지 않는다.
- [ ] 모든 관련 file input 주변에 `WAV · MP3 · M4A · WEBM` 지원 형식 안내가 표시된다.
- [ ] 허용하지 않는 MIME은 서버에서 기존처럼 `UNSUPPORTED_AUDIO` 415로 거절한다.

### US-2: 업로드 포맷 계약이 일관된 개발자

**As a** 업로드 경로를 유지보수하는 개발자
**I want** 보컬 분석과 카탈로그 target 업로드가 하나의 동일한 포맷 계약을 참조하고
**So that** 한 경로만 확장자가 추가되어 다시 불일치가 생기지 않게 하고 싶다.

**Acceptance Criteria:**

- [ ] 보컬 분석과 카탈로그 업로드의 공통 확장자/MIME 집합은 shared SSOT에서 관리한다.
- [ ] 보컬 분석의 파일 크기 제한과 카탈로그의 49MB 제한처럼 feature별 정책은 각 feature에 남긴다.
- [ ] UI `accept` 문자열과 서버 MIME 검증이 같은 공용 포맷 집합에서 파생된다.

---

## 기능 요구사항

### FR-1: 공용 최소 오디오 업로드 포맷 계약

- shared audio 영역에 보컬 분석과 카탈로그가 함께 사용하는 단일 확장자/MIME 집합을 정의한다.
- 지원 확장자는 `.wav`, `.mp3`, `.m4a`, `.webm`이다. `.flac`은 포함하지 않는다.
- 지원 MIME은 `audio/wav`, `audio/x-wav`, `audio/mpeg`, `audio/mp4`, `audio/aac`, `audio/x-m4a`, `audio/webm`이다.
- client input `accept` 문자열과 사용자-visible 지원 형식 문구도 이 집합에서 파생한다.

### FR-2: 관리자 카탈로그 업로드 정합성

- `CatalogManager`의 곡 추가·target 업로드·출처 교체 세 file input은 공용 포맷만 명시적으로 허용하고 `audio/*` wildcard와 `.flac`을 제거한다.
- 세 file input 모두 바로 근처에 지원 형식 `WAV · MP3 · M4A · WEBM`을 표시한다.
- `uploadAdminCatalogTarget`은 공용 MIME만 허용하며 `audio/flac`을 거절한다.
- 기존 SHA-256 idempotency, 49MB 제한, WAV RIFF 검증, Leemage 저장/cleanup 정책은 변경하지 않는다.

### FR-3: 보컬 분석 업로드 정합성

- `VoiceScanInput`의 accept 문자열과 `analysisAudioFileSchema`/분석 queue MIME 검증은 같은 공용 포맷 계약을 사용한다.
- 기존 지원 형식 안내도 shared 표시 문구를 사용해 관리자 file input과 동일한 확장자 목록을 보여준다.
- 분석 최대 크기와 60초 trim/prepare 동작은 변경하지 않는다.

### FR-4: 검증

- Storybook 또는 UI 테스트에서 관리자 곡 추가·target 업로드·출처 교체 input이 동일한 accept 계약과 지원 형식 안내를 갖는지 확인한다.
- 단위/통합 테스트에서 `audio/mp4`, `audio/aac`, `audio/x-m4a` m4a MIME 허용, `audio/flac` 및 기타 unsupported MIME 거절을 확인한다.
- `pnpm run typecheck`, `pnpm run lint`, 관련 테스트, `pnpm run check:architecture`를 통과한다.

---

## 범위 제외

- 업로드 파일의 codec transcoding/재인코딩 추가
- FLAC 지원
- 파일 크기 제한 변경
- 카탈로그 분석 pipeline/Modal 자원 정책 변경

---

## 관련 문서

- PRD: `docs/prd/copy-singer-prd.md` (`PRD-US-028`, `PRD-FR-059`)
- 선행 Feature: `docs/features/web/F024-admin-song-catalog-management/`
