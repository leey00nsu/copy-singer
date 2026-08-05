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
  - **DONE 전 확정 시점**: 100곡 모두 READY인 artifact와 DB cleanup을 검증했다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: `2939344` 및 후속 F003 task commit
  - **Test/Log**: `npm run catalog:verify -- --require-ready` (`count=100`, `READY=100`, `FAILED=0`, `PENDING=0`)

## D006: 일시적 수집 오류를 제한 재시도하고 삭제된 출처를 공식 링크로 교체 (2026-08-05)

- **Context**: 장시간 순차 batch에서 일시적 `fetch failed`와 `YT_DLP_FAILED`가 한 번의 요청만으로 누적됐고, Pretender의 기존 URL은 저작권 요청으로 삭제됐다.
- **Constraints**: 무한 재시도나 검증 실패 재시도는 피하고 고정 100곡 allowlist와 출처 재현성을 유지해야 한다.
- **Options**: 모든 실패를 수동 재실행, 모든 오류를 무제한 재시도, 일시 오류만 제한 재시도.
- **Decision**: 분석기 연결·yt-dlp·pipeline timeout 오류만 최대 3회 간격을 두고 재시도한다. URL/allowlist 검증 오류는 즉시 실패시킨다. 삭제된 Pretender URL은 아티스트 공식 채널의 공식 영상 `TQ8WlA2GXbk`로 교체한다. 11분 42초로 잘못 연결된 어디에도 URL은 사용자가 지정한 5분 32초 영상 `CiF5ikqrnRI`의 정규 watch URL로 교체한다.
- **Rationale**: 일시 장애로 인한 수동 작업과 FAILED 누적을 줄이면서 영구 오류는 명확히 드러낸다.
- **Evidence**:
  - **Test/Log**: `npm run test:catalog` 7 tests PASS, yt-dlp simulate로 공식 영상 availability 확인
- **Consequences**: 영구적인 yt-dlp 실패도 최대 3회 시도될 수 있으나 총 시도 횟수와 대기 시간은 제한된다.

## D007: Modal L4 3곡 벤치마크로 원격 병렬 가속 검증 (2026-08-05)

- **Context**: 로컬 CPU 순차 분석은 곡당 수분이 걸려 남은 카탈로그 처리 시간이 길다.
- **Constraints**: 사용자는 우선 3곡만 시험하도록 요청했고, 원본·stem을 원격 영구 저장소에 남기면 안 된다. 기존 pYIN profile 계약은 유지해야 한다.
- **Options**: 로컬 CPU 계속 실행, 기존 SoulX API에 결합, 별도 비배포형 Modal batch 앱.
- **Decision**: `copy-singer-catalog-analyzer` Modal 앱에서 L4 함수 최대 3개를 `Function.map`으로 호출한다. Modal 데이터센터 IP의 YouTube bot 차단 때문에 yt-dlp는 로컬 `TemporaryDirectory`에서 수행한다. WAV는 이름 없는 `Volume.ephemeral()`로 전달하고 각 함수는 `/tmp`에서 Demucs CUDA→기존 pYIN 코어를 수행한다. aggregate 결과 반환 후 ephemeral Volume 컨텍스트를 닫아 삭제한다. 첫 실행은 정확히 3곡으로 제한한다.
- **Rationale**: 기존 합성 API와 운영 상태를 분리하고, 쿠키 우회나 named 미디어 Volume 없이 실제 벽시계 시간과 비용을 측정할 수 있다.
- **Evidence**: rank 12~14가 모두 READY가 됐다. 3곡 벽시계 199.051초, remote task 합계 457.464초, L4 추정 $0.1016이었다. 곡별 Demucs CUDA는 18.0~18.7초, pYIN은 107.6~153.5초였다. 실행 후 named Volume 목록에 새 항목이 없고 로컬 임시 디렉터리도 남지 않았다.
- **Consequences**: Modal 사용료가 발생하며 병목은 pYIN CPU 단계다. 같은 처리량을 유지하면 남은 86곡은 3개 병렬 기준 약 75~85분, L4 8개 병렬 기준 약 30~35분으로 추정한다. 실제 비용에는 L4 외 CPU·메모리 비용이 추가된다.

## D008: 3곡 실측 후 남은 카탈로그를 L4 8개로 확장 (2026-08-05)

- **Context**: 3곡 L4 실측이 모두 성공했고 사용자가 남은 곡 전체 처리를 요청했다.
- **Constraints**: Starter GPU 동시성 10개 안에서 기존 SoulX 앱 여유를 남기고, 한 URL 다운로드 실패가 전체 batch를 막지 않아야 한다.
- **Options**: L4 3개 유지, L4 8개 확장, 로컬 CPU 복귀.
- **Decision**: 카탈로그 분석 앱의 `max_containers`를 8로 올리고 남은 86곡을 한 번의 명시적 `modal run`으로 처리한다. 로컬 yt-dlp는 제한 동시성으로 실행하고 개별 실패를 JSON에 기록한 뒤 성공 입력만 GPU로 전달한다. 로컬 임시 부모 경로는 `COPY_SINGER_TEMP_ROOT`로 주입하며 전체 실행에는 여유 공간이 1.3TB인 `/Volumes/sn850x/copy-singer-temp`를 사용한다.
- **Rationale**: 3곡 실측에서 Demucs가 약 18초로 확인됐고 pYIN 병렬성이 전체 벽시계 시간을 줄이는 핵심이므로, 계정 한도 내 8개가 비용 증가 없이 처리 시간을 줄인다.
- **Evidence**: 잔여 86곡 batch는 75곡 성공·11곡 다운로드 실패를 서로 격리해 기록했고 벽시계 1185.751초, remote task 합계 7838.304초, L4 추정 $1.7401이었다. 접근 불가능·비공개·403 링크 11개를 실제 다운로드 가능한 대체 원곡 링크로 교체한 재실행은 11곡 모두 성공했고 벽시계 198.059초, remote task 합계 942.619초, L4 추정 $0.2093이었다. 최종 artifact는 READY 100곡이며 `/Volumes/sn850x/copy-singer-temp`는 0B이고 파일 경로 필드가 없다.
- **Consequences**: 두 L4 실행의 GPU 추정 비용 합계는 $1.9494이며 초기 3곡 벤치마크를 포함하면 $2.0510이다. CPU·메모리 비용은 별도다. YouTube 링크 상태는 추후 바뀔 수 있으므로 artifact 재생성 시 다운로드 검증과 대체 링크 관리가 필요하다.
