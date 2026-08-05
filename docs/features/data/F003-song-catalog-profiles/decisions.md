# Decisions Log

## D001: yt-dlp를 명시적 로컬 수집기로 사용 (2026-08-05)

- **Context**: 사용자가 제공한 100개 YouTube URL을 다운로드 후 분석하도록 요청했다.
- **Constraints**: 재현 가능하고 재시작 가능해야 하며 로그인·쿠키·DRM 우회를 기본 동작에 포함하면 안 된다.
- **Options**: 수동 음원 연결, yt-dlp CLI, 애플리케이션 내 임의 URL downloader.
- **Decision**: 고정 카탈로그 URL만 받는 로컬 내부 endpoint에서 yt-dlp를 실행하고, 작업별 OS 임시 디렉터리를 응답 전에 삭제한다. 공개 서비스에는 이 endpoint를 배포하지 않는다.
- **Rationale**: 검증된 출력 템플릿과 FFmpeg post-processing을 사용하면서 웹 공격면과 임의 URL 수집을 피한다.
- **Trace**:
  - **DOING 시작 시점**: 제공 목록이 100행, 순위 연속, video ID 유일임을 확인했다.
  - **DONE 전 확정 시점**: 1위 곡을 실제 처리해 aggregate profile 저장과 임시 디렉터리 삭제를 확인했다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: `38999a3`, `a3902a5`
  - **Test/Log**: `tests/song-catalog.test.ts`, `npm run catalog:verify` (`count=100`, `readyCount=1`)
- **Consequences**: 실행자는 대상 콘텐츠를 다운로드·분석할 권리를 확인해야 하며 원본·stem은 프로젝트, DB, 영구 volume 어디에도 보관하지 않는다.

## D002: Demucs two-stem vocals를 분리 기준으로 사용 (2026-08-05)

- **Context**: 반주가 섞인 원곡을 사용자 무반주 녹음과 비교하려면 보컬 stem이 필요하다.
- **Constraints**: 빠른 MVP, 오픈소스, 로컬 CPU 실행, batch 재현성.
- **Options**: Demucs, SoulX vocal separation 재사용, 분리 없이 pYIN 분석.
- **Decision**: Demucs v4 `htdemucs --two-stems=vocals` 출력을 곡 분석 입력으로 사용한다.
- **Rationale**: 공식 CLI가 vocals/no-vocals 계약을 제공하고 기존 GPU 합성 서비스와 결합하지 않아도 된다.
- **Trace**:
  - **DOING 시작 시점**: Demucs 공식 저장소에서 two-stem CLI와 모델 계약을 확인했다.
  - **DONE 전 확정 시점**: CPU-only Demucs 4.0.1 `htdemucs`로 실제 한 곡 분리를 완료했다. 출력 stem은 분석 후 삭제됐다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: `a3902a5`
  - **Test/Log**: `npm run catalog:analyze -- --rank 1 --resume` 성공 1건
- **Consequences**: CPU 일괄 처리는 오래 걸리고 최초 실행에서 모델 weight 다운로드가 발생한다.

## D003: 곡과 사용자 프로필에 같은 분석기를 사용 (2026-08-05)

- **Context**: F004가 음역 통계를 직접 비교한다.
- **Constraints**: 사용자 분석 API는 짧은 업로드·TTL에 맞춰져 있고 곡은 더 길며, 곡 파일은 영구 저장할 수 없다.
- **Options**: 별도 분석 구현, 기존 upload endpoint 확장, 다운로드부터 분석까지 한 임시 작업 endpoint.
- **Decision**: `librosa-pyin` 분석 코어를 그대로 재사용하고 yt-dlp→Demucs→분석을 하나의 `TemporaryDirectory` 생명주기로 묶는다.
- **Rationale**: metric drift와 큰 multipart proxy를 피하면서 모든 중간 파일의 삭제 경계를 한 프로세스가 책임질 수 있다.
- **Trace**:
  - **DOING 시작 시점**: F002 분석 코어와 저장 계약을 검토했다.
  - **DONE 전 확정 시점**: song endpoint contract, 잘못된 URL 거부, 같은 `librosa-pyin` 출력과 DB transaction을 확인했다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: `a3902a5`
  - **Test/Log**: `services/vocal-profile-api/tests/test_api.py`, `tests/test_song_pipeline.py`

## D004: 곡 음원과 stem을 영구 저장하지 않음 (2026-08-05)

- **Context**: 사용자가 저작권 위험을 줄이기 위해 DB에는 링크와 분석 데이터만 남기고 원본은 즉시 삭제하도록 범위를 변경했다.
- **Constraints**: 삭제는 법적 이용 권한을 대신하지 않으며 강제 종료에서도 잔여 파일을 최소화해야 한다.
- **Options**: 프로젝트 work 폴더, Docker named volume, OS 임시 디렉터리.
- **Decision**: 영구 mount가 없는 OS 임시 디렉터리를 사용하고 정상·오류 경로를 `finally`로 정리한다. 시작 시 잔여 prefix도 청소한다.
- **Rationale**: 프로젝트와 영구 volume에 원본이 남지 않고 생명주기를 테스트할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 실제 음원 다운로드 전에 요구사항을 변경했다.
  - **DONE 전 확정 시점**: 성공·Demucs 실패 모두 temp root가 비고, 실제 한 곡 이후 컨테이너 `/tmp`에 job prefix가 없음을 확인했다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: `a3902a5`
  - **Test/Log**: `services/vocal-profile-api/tests/test_song_pipeline.py` 4 cases PASS

## D005: 곡 분석 profile의 SSOT를 JSON artifact로 전환 (2026-08-05)

- **Context**: 배포 환경마다 동일한 100곡을 다시 분석하거나 개발 DB를 복제하지 않고 같은 추천 입력을 사용해야 한다.
- **Constraints**: 곡 profile은 기준 데이터이며 사용자·추천 실행 같은 런타임 데이터와 생명주기가 다르다.
- **Options**: 개발 PostgreSQL dump 배포, 배포 시 재분석, versioned JSON artifact.
- **Decision**: `data/catalogs/tj-2607-song-profiles.json`을 곡 profile SSOT로 두고 Git/배포 artifact에 포함한다. PostgreSQL에는 곡 분석 VocalProfile/Recording을 저장하지 않는다.
- **Rationale**: 분석 결과와 도구 버전을 코드 버전과 함께 검토·배포할 수 있고 환경별 DB 상태에 의존하지 않는다.
- **Trace**:
  - **DOING 시작 시점**: 사용자 피드백 시점에는 100곡 metadata와 DB profile 1건만 있었다.
  - **DONE 전 확정 시점**: 100곡 artifact와 DB cleanup 검증으로 보강한다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: 구현 커밋 예정
  - **Test/Log**: artifact validation 예정
