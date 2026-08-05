# Feature Spec: song-catalog-profiles

## 개요

- **기능 ID**: F003
- **기능명**: song-catalog-profiles
- **대상 레포**: copy-singer-data
- **작성일**: 2026-08-05
- **상태**: Approved

## 목적

TJ 2026년 7월 Top 100 목록을 PostgreSQL에 반복 가능하게 등록하고, 로컬 개발 환경에서 각 YouTube URL의 오디오를 작업별 임시 공간에 내려받아 보컬을 분리한 뒤 F002와 동일한 분석 계약으로 곡별 보컬 프로필을 생성한다.

곡 메타데이터 import와 실제 미디어 처리는 분리한다. 100곡은 음원이 없어도 먼저 카탈로그에 등록되며, 다운로드·분리·분석은 재시작 가능한 batch로 순차 처리한다. 원본·표준화 파일·분리 stem은 프로젝트나 영구 볼륨에 기록하지 않고 성공·실패와 관계없이 요청 종료 전에 삭제한다.

## 범위

### 포함

- `tj_2607_top100.md` 100곡의 순위·제목·가수·YouTube URL import
- `(title, artist)` 기준 idempotent upsert와 `catalogOrder` 갱신
- 로컬 개발 전용 `yt-dlp` audio-only 일시 다운로드 및 출처 메타데이터 기록
- Demucs `--two-stems=vocals` 기반 보컬 stem 생성
- librosa-pYIN 기반 곡 보컬 프로필 생성 및 `Song` 연결
- 개별 곡 실패 격리, 재시도, 단계별 상태·오류 기록
- `--limit`, `--rank`, `--resume` 실행 옵션

### 제외

- YouTube 링크의 재배포 또는 다운로드 파일의 Git 포함
- 다운로드 원본·분리 stem·반주 stem의 프로젝트/DB/영구 volume 보관
- 공개 웹 API에서 사용자가 입력한 임의 URL 다운로드
- DRM 우회, 로그인·쿠키 자동 추출, 지역 제한 우회
- TJ 곡 번호·원키 자동 추정
- 100곡 동시 병렬 처리 및 GPU 운영 배포

## 사용자 스토리

### US-1: 대상 100곡 등록

**As a** 로컬 운영자  
**I want** 제공한 Top 100 목록을 반복 실행 가능한 명령으로 DB에 등록하고 싶다  
**So that** 목록 변경이나 DB 초기화 뒤에도 동일한 카탈로그를 재현할 수 있다

**Acceptance Criteria:**

- [x] 문서에서 정확히 100개 항목을 파싱하고 순위 1~100의 연속성을 검증한다.
- [ ] import를 두 번 실행해도 곡이 중복 생성되지 않는다.
- [ ] 순위, 제목, 가수, YouTube URL과 video ID가 저장된다.

### US-2: YouTube 오디오 수집

**As a** 로컬 운영자  
**I want** 카탈로그 URL의 오디오를 yt-dlp로 내려받고 싶다  
**So that** 곡 프로필 분석에 사용할 로컬 입력을 확보할 수 있다

**Acceptance Criteria:**

- [ ] audio-only 형식을 선택하고 작업별 OS 임시 디렉터리에서 FFmpeg로 WAV를 만든다.
- [ ] 작업 종료 시 임시 디렉터리가 성공·실패와 관계없이 비어 있거나 제거된다.
- [ ] 이미 READY인 분석 결과는 기본적으로 다시 처리하지 않는다.
- [ ] 다운로드 실패는 다른 곡 처리를 중단시키지 않고 오류 코드로 저장한다.

### US-3: 곡 보컬 프로필 일괄 생성

**As a** 추천 엔진 개발자  
**I want** 반주가 제거된 보컬 stem을 사용자 프로필과 같은 분석기로 처리하고 싶다  
**So that** F004가 비교 가능한 통계로 원키 적합도와 추천 키를 계산할 수 있다

**Acceptance Criteria:**

- [ ] Demucs two-stem 결과 중 `vocals.wav`만 분석 입력으로 사용한다.
- [ ] `VocalProfile.sourceType=SONG`, `Recording.kind=SONG_SOURCE`로 저장한다.
- [ ] analyzer·analyzerVersion과 separator·separatorVersion을 재현 가능한 메타데이터로 저장한다.
- [ ] 성공 시 `Song.analysisStatus=READY`, 실패 시 `FAILED`가 된다.
- [ ] 재실행 시 READY 곡은 건너뛰고 실패·미완료 곡을 재개할 수 있다.
- [ ] DB에는 source URL과 분석 집계만 남고 원본 또는 stem 경로는 남지 않는다.

## 기능 요구사항

### FR-1: 카탈로그 계약

입력 한 행은 `catalogOrder`, `title`, `artist`, `sourceUrl`, `sourceVideoId`를 가져야 한다. 순위는 1부터 연속적이고 URL/video ID는 유일해야 한다. `originalKey`는 데이터가 제공될 때까지 null을 허용한다.

### FR-2: 다운로드 계약

프로세스는 `yt-dlp --ignore-config --no-playlist -x --audio-format wav`를 `TemporaryDirectory` 내부에서 사용한다. 인증정보나 브라우저 쿠키는 기본 설정으로 읽지 않으며 고정된 100곡 allowlist 외 URL을 받지 않는다. 사용자는 다운로드와 처리 권한이 있는 URL만 실행한다.

### FR-3: 분리 계약

Demucs `htdemucs` 모델과 `--two-stems=vocals`를 사용한다. 모델명과 버전을 결과 metadata에 저장한다. CPU를 기본값으로 하되 실행 옵션으로 장치를 바꿀 수 있다.

### FR-4: 분석 계약

분리된 stem은 같은 프로세스에서 F002 분석 코어로 전달한다. 사용자 프로필과 같은 MIDI 통계·테시투라·품질 지표를 저장하되 전체 곡 길이용 설정을 사용한다. 응답 직전에 원본과 모든 stem을 삭제하며 응답에는 파일 경로를 포함하지 않는다.

### FR-5: 재시작과 관찰 가능성

각 곡은 독립 transaction으로 처리한다. batch는 처리 순서와 성공·건너뜀·실패 수를 출력하고, 실패 원인과 마지막 처리 단계를 `Song.metadata`에 기록한다.

## 비기능 요구사항

- **재현성**: 카탈로그 원본, yt-dlp, Demucs model/version, analyzer/version을 기록한다.
- **비용**: 로컬 CPU 실행을 기본으로 하고 다운로드·분석 동시성은 1이다.
- **저장소**: 미디어는 컨테이너의 OS 임시 디렉터리에서만 처리하고 영구 volume을 연결하지 않는다.
- **안전성**: 다운로드는 명시적 batch 명령에서만 시작하며 웹 요청으로 임의 URL을 받지 않는다.
- **권리**: 다운로드·분석 권한 확인은 실행자의 책임이며 결과 파일은 로컬 분석 목적으로만 다룬다.
- **정리 보장**: 정상 응답, 분석 실패, timeout, 취소 경로 모두 `finally` 정리를 거친다.

## 관련 문서

- PRD: `../../../prd/copy-singer-prd.md`
- PRD Refs: PRD-FR-005, PRD-FR-006, PRD-FR-007, PRD-DATA-004, PRD-DATA-005, PRD-DATA-006, PRD-NFR-003, PRD-NFR-004, PRD-NFR-006
- Idea: `../../../ideas/I003-song-catalog-profiles.md`
