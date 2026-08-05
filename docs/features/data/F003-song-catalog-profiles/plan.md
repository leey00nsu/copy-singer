# Implementation Plan: song-catalog-profiles

## 개요

- **기능 ID**: F003
- **대상 레포**: copy-singer-data
- **작성일**: 2026-08-05
- **상태**: Approved

## 기술 스택

| 구분 | 선택 | 이유 |
| --- | --- | --- |
| 카탈로그 import | TypeScript + Prisma | 현재 DB 접근 계약과 transaction을 재사용 |
| 다운로드 | yt-dlp + FFmpeg | audio-only 수집, archive와 오류 코드 지원 |
| 보컬 분리 | Demucs v4 `htdemucs`, two stems | 검증된 오픈소스 모델과 단순한 vocals 출력 계약 |
| 음정 분석 | 기존 FastAPI `librosa-pyin` | 사용자·곡 프로필의 비교 가능성 유지 |
| 실행 | 로컬 CLI + 내부 FastAPI, concurrency 1 | 임시 파일 생명주기 집중 관리와 재시작 지원 |

## 아키텍처

```text
data/catalogs/tj-2607-top100.md
  -> catalog parser/validator
  -> Prisma Song upsert
  -> batch runner (URL allowlist)
       -> vocal-profile-api /v1/analyze-song-url
            -> TemporaryDirectory
            -> yt-dlp (source.wav)
            -> Demucs (vocals.wav)
            -> librosa-pyin
            -> finally: TemporaryDirectory 삭제
       -> Recording(DELETED) + VocalProfile + Song transaction
```

다운로드·분리·분석은 기존 analyzer 컨테이너의 내부 endpoint 한 곳에서 수행한다. endpoint는 YouTube watch URL과 예상 video ID를 함께 받아 일치 여부를 확인하고, OS `TemporaryDirectory`만 사용한다. subprocess 인자는 배열로 전달해 shell interpolation을 사용하지 않는다. 해당 서비스에는 song job용 영구 volume을 연결하지 않는다.

## 데이터 계약

- `Song.metadata.catalog`: source name, issue, source URL/video ID
- `Song.metadata.pipeline`: stage, yt-dlp version, separator/model/version, analyzer/version, error code/detail, timestamps
- `Recording.storagePath`: 원본 파일 경로가 아니라 카탈로그 `sourceUrl`
- `Recording.status`: 분석 완료 후에도 원본이 남지 않음을 나타내는 `DELETED`
- 원본 mix·vocals·no_vocals: DB 응답과 프로젝트 파일 시스템에 경로를 남기지 않음

기존 schema는 상태와 확장 metadata를 이미 수용하므로 F003에서는 migration을 추가하지 않는다.

## 파일 구조

```text
data/catalogs/tj-2607-top100.md
lib/song-catalog/catalog.ts
lib/song-catalog/pipeline.ts
scripts/import-song-catalog.ts
scripts/analyze-song-catalog.ts
services/vocal-profile-api/app/main.py
tests/song-catalog.test.ts
```

## 실행 명령

```bash
npm run catalog:import
npm run catalog:analyze -- --limit 1
npm run catalog:analyze -- --resume
```

`catalog:analyze`는 analyzer health에서 yt-dlp·FFmpeg·Demucs 준비 상태를 검사한다. 기본 실행은 PENDING/FAILED 곡을 순위순으로 처리하고 READY 곡은 건너뛴다.

## 테스트 전략

- **단위 테스트**: 100곡 파싱, 순위·URL 유일성, CLI 옵션, metadata merge
- **통합 테스트**: PostgreSQL에 import 두 번 후 100곡 유지, fixture analyzer 응답 저장
- **실행 스모크**: mock fixture로 다운로드→분리→분석→삭제를 확인하고, 권한이 확인된 URL에 한해 `--limit 1` 실제 실행
- **회귀 테스트**: TypeScript, ESLint, 기존 Next build/test, Python analyzer tests

## 운영·리스크

- YouTube extractor 변경은 개별 실패로 남기고 yt-dlp 버전 갱신 후 재시도한다.
- 프로세스 강제 종료 시 `finally`가 실행되지 않을 수 있으므로 컨테이너 재시작 시 `copy-singer-song-*` 잔여 임시 디렉터리를 청소한다.
- CPU에서 100곡 분리는 장시간 걸릴 수 있으므로 순차·resume이 필수다.
- 링크가 가사 영상이어도 오디오 트랙을 분석하므로 영상 프레임은 저장하지 않는다.
- yt-dlp 경로는 로컬 개발 전용이며 공개 서비스 배포 범위에서 제외한다.

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
