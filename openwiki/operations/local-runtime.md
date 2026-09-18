---
type: how-to
title: 로컬 실행과 배포
description: 저장소를 처음 받은 개발자가 의존성을 설치하고 로컬 PostgreSQL과 웹·세 워커를 띄운 다음 Modal 분석 서비스를 배포하고 production으로 실행하는 명령 순서를 정리한 절차 문서예요. 설정 파일 준비와 설정·성능 확인 명령도 함께 다뤄요.
tags: [local-development, deployment, modal, operations, how-to]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-18T12:47:40.181Z
sources:
  - id: openwiki-source-ea70eb6c045047448e446296
    resource: repo://.gitignore
  - id: openwiki-source-b79fbbd921df689b4bbdc82f
    resource: repo://docker-compose.yml
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-2798a6200ef792b731721034
    resource: repo://prisma/schema.prisma
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-942c824aee93d7df97d37854
    resource: repo://scripts/benchmark-vocal-profile-modal.ts
  - id: openwiki-source-3e61fbe0b48f056b7e7ac181
    resource: repo://scripts/verify-feature-config.ts
  - id: openwiki-source-20c124f2512d9dc3f8b17329
    resource: repo://services/song-catalog-analyzer/README.md
  - id: openwiki-source-e815dcdea7ad4ee29fa67eab
    resource: repo://services/vocal-analysis-core/README.md
  - id: openwiki-source-eecc4c0c6948847690f8f665
    resource: repo://services/vocal-profile-modal/modal_app.py
  - id: openwiki-source-7fb404f70377ec59b26f1038
    resource: repo://services/vocal-profile-modal/README.md
  - id: openwiki-source-d703f261e8dcbd7ade287e26
    resource: repo://services/vocal-profile-modal/requirements-local.txt
  - id: openwiki-source-eb3d61d7e6a4647651cc0369
    resource: repo://src/entities/song-catalog/api/catalog-snapshot.ts
  - id: openwiki-source-8b825c1fe06f865eec32c966
    resource: repo://tests/process-scripts.test.ts
generated: { by: "openwiki/0.5.2", at: "2026-09-18T14:16:55.963Z" }
---

아래 여섯 단계를 순서대로 실행하면 `http://localhost:3000`에서 웹이 뜨고, 믹싱·보컬 프로필 분석·곡 분석 워커가 같은 프로세스 묶음으로 함께 돌아요([README.md](repo://README.md#L54-L70)). 다만 두 분석 워커와 믹싱 워커는 로컬 라이브러리가 아니라 배포된 Modal 서비스를 호출하니, 작업을 실제로 처리하려면 [분석 서비스를 배포해요](#분석-서비스를-배포해요) 절에서 URL과 서버 전용 키를 준비하세요. 저장소 전체 구조와 FSD(Feature-Sliced Design) 계층은 [시스템 지도와 경계](../architecture/system-map.md)를 보세요.

## 로컬 실행 여섯 단계

1. `pnpm install --frozen-lockfile` — lockfile에 고정된 의존성을 설치해요. `package.json`의 `engines`가 Node.js 22.13.0 이상을, `packageManager`가 pnpm 11.9.0을 요구해요([package.json](repo://package.json#L5-L8)).
2. 로컬 설정 파일 준비 — `.env.local`을 만들고 아래 [설정 파일에 채울 이름](#설정-파일에-채울-이름)의 값을 넣어요. Prisma CLI와 워커가 이 파일을 읽어요.
3. `docker compose up -d` — 로컬 PostgreSQL 컨테이너를 띄워요.
4. `pnpm run db:migrate:deploy` — `prisma/migrations/`에 추적된 migration을 적용해 스키마를 만들어요([package.json](repo://package.json#L38-L38)).
5. `pnpm run db:generate` — Prisma client를 생성해요. 생성 위치가 커밋 대상이 아니므로 새로 받은 작업 디렉터리에서는 이 단계를 건너뛸 수 없어요.
6. `pnpm dev` — Next.js 개발 서버와 워커 세 개를 함께 시작해요.

저장소 [README.md](repo://README.md#L52-L68)의 Quick Start 블록에도 같은 순서가 있어요. 실행 전에 Node.js 22.13.0 이상, pnpm 11.9.0, Docker, Google OAuth web client, Leemage 프로젝트와 API key, 배포된 Modal 서비스를 준비하고, production에서 결과 오디오를 변환할 때는 FFmpeg도 필요해요([README.md](repo://README.md#L151-L160)).

## 로컬 PostgreSQL 컨테이너

`docker compose up -d`는 `postgres:16-alpine` 이미지의 컨테이너 하나를 띄우고, 데이터는 named volume `postgres_data`에 남겨요. healthcheck는 `pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"`를 5초 간격으로 최대 10회 실행하고, `start_period`는 5초예요([docker-compose.yml](repo://docker-compose.yml#L1-L23)).

| compose 변수 | 기본값 |
| --- | --- |
| `POSTGRES_DB` | `copy_singer` |
| `POSTGRES_USER` | `copy_singer` |
| `POSTGRES_PASSWORD` | compose 파일에 적힌 개발용 기본값 |
| `POSTGRES_PORT` | `5433`(컨테이너의 `5432`에 연결) |

컨테이너 밖에서 접속하는 포트는 기본이 `5433`이므로, `DATABASE_URL`에도 그 포트를 적어야 해요. Prisma CLI와 서버는 [prisma.config.ts](repo://prisma.config.ts#L1-L14)와 [src/shared/db/prisma.ts](repo://src/shared/db/prisma.ts#L11-L17)에서 `DATABASE_URL`을 읽고, 값이 없으면 client 생성이 실패해요.

## 웹과 세 워커가 함께 떠요

`pnpm dev`와 `pnpm start`는 웹과 워커 세 개를 한 묶음으로 감독해요. 두 script 모두 `concurrently --kill-others-on-fail`을 쓰므로, 자식 프로세스 하나가 실패하면 나머지도 SIGTERM으로 함께 종료돼요([package.json](repo://package.json#L10-L21)).

| 실행 이름 | 실행하는 script | entrypoint |
| --- | --- | --- |
| `web` | `dev:web` 또는 `start:web` | Next.js 서버(`next dev` / `next start`) |
| `mixing` | `worker:mixing` | [scripts/mixing-worker.ts](repo://scripts/mixing-worker.ts#L1-L7) |
| `analysis` | `worker:vocal-profile-analysis` | [scripts/vocal-profile-analysis-worker.ts](repo://scripts/vocal-profile-analysis-worker.ts#L1-L9) |
| `songs` | `worker:song-analysis` | [scripts/song-analysis-worker.ts](repo://scripts/song-analysis-worker.ts#L1-L6) |

세 워커 entrypoint는 모두 dotenv로 `.env.local`과 `.env`를 이 순서로 읽은 뒤 `src/_app/background-jobs/**`의 실행 함수를 import해서 시작해요. 작업을 점유하고 lease를 갱신하는 규칙은 [Job 큐와 lease 복구 계약](job-processing.md)이 소유해요.

`--kill-others-on-fail`이 붙어 있어서 운영에서 `pnpm start`를 쓰면 워커 하나가 죽었을 때 웹만 남지 않고 프로세스 전체가 끝나요. 그래서 배포 관리자가 인스턴스를 다시 시작해야 한다는 것이 이 구성의 전제예요([README.md](repo://README.md#L197-L206)). [tests/process-scripts.test.ts](repo://tests/process-scripts.test.ts#L29-L44)가 두 script의 감독 대상과 entrypoint 경로를 고정하고, 같은 파일의 [SIGTERM 검사](repo://tests/process-scripts.test.ts#L46-L81)가 자식 하나가 실패할 때 형제 프로세스가 `Sending SIGTERM to other processes`로 종료되는지 확인해요.

## 설정 파일에 채울 이름

설정은 `.env.local`과 `.env`에서 읽어요. README는 `.env.example`을 `.env.local`로 복사하라고 안내하지만([README.md](repo://README.md#L55-L57)), 이 저장소의 `.env.example`은 `.openwikiignore`의 `.env.*` 제외 규칙 때문에 생성 입력에서 보이지 않았어요. 그래서 이 페이지는 그 파일의 내용을 추정해 옮기지 않고, 추적되는 코드에서 읽히는 변수 이름만 정리해요. 실제 자격 증명 값은 어디에도 적지 마세요.

| 준비할 대상 | 변수 이름 |
| --- | --- |
| DB 접속 | `DATABASE_URL` |
| 인증과 관리자 판정 | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS` |
| 미디어 저장 | `LEEMAGE_API_KEY`, `LEEMAGE_PROJECT_ID` |
| 보컬 프로필 분석 워커 | `VOCAL_PROFILE_MODAL_URL`, `VOCAL_PROFILE_MODAL_API_KEY` |
| 곡 카탈로그 분석 워커 | `SONG_ANALYSIS_MODAL_URL`, `SONG_ANALYSIS_MODAL_API_KEY` |
| 믹싱 워커와 관리자 커스텀 믹싱 | `MODAL_API_URL`, `MODAL_API_KEY` |
| 로컬 인증 우회(선택) | `DEV_AUTH_BYPASS_ENABLED`, `DEV_AUTH_BYPASS_USER_ID` |

각 변수의 기본값, 허용 범위, 전용 키가 없을 때의 대체 규칙은 [환경 변수와 런타임 한도](configuration.md)가 소유해요. 값이 비어 있으면 분석 워커는 호출을 시도하지 않고 설정 오류를 돌려주니, 워커가 시작되더라도 분석이 처리되지 않는다는 점을 기억하세요.

## 분석 서비스를 배포해요

두 분석 워커는 로컬 프로세스가 아니라 배포된 Modal CPU 서비스를 호출해요. 저장소에는 로컬 분석 런타임이 없고, 두 서비스가 `services/vocal-analysis-core/vocal_analysis_core`의 같은 Python 분석 코어를 이미지에 함께 패키징해요([services/vocal-analysis-core/README.md](repo://services/vocal-analysis-core/README.md#L1-L7), [tests/process-scripts.test.ts](repo://tests/process-scripts.test.ts#L8-L27)). 그래서 `pnpm dev`로 워커를 띄우기 전에 각 서비스의 배포 출력 URL을 `VOCAL_PROFILE_MODAL_URL`과 `SONG_ANALYSIS_MODAL_URL`에 넣어야 해요.

| 명령 | 실제로 실행하는 것 |
| --- | --- |
| `pnpm run modal:vocal-profile:deploy` | `uv run --with-requirements services/vocal-profile-modal/requirements-local.txt modal deploy services/vocal-profile-modal/modal_app.py` |
| `pnpm run modal:song-catalog:deploy` | `uv run --with-requirements services/song-catalog-analyzer/requirements-local.txt modal deploy services/song-catalog-analyzer/modal_app.py` |

두 script의 정의는 [package.json](repo://package.json#L43-L44)에 있어요. 두 명령 모두 원격 변경과 비용이 발생해요. 두 서비스 README가 밝히듯 실제 배포는 lee-spec-kit의 원격·비용 승인 경계를 통과한 뒤에만 실행하세요([services/vocal-profile-modal/README.md](repo://services/vocal-profile-modal/README.md#L36-L44), [services/song-catalog-analyzer/README.md](repo://services/song-catalog-analyzer/README.md#L19-L23)). 배포 CLI는 `requirements-local.txt`에 고정한 `modal==1.5.3`을 쓰므로 전역 Modal CLI 버전에 의존하지 않아요([services/vocal-profile-modal/requirements-local.txt](repo://services/vocal-profile-modal/requirements-local.txt#L1-L1)).

분석기 자체를 고칠 때는 배포 대신 로컬 venv에서 개발용 endpoint를 띄울 수 있어요. `.venv/bin/pip install -r requirements-local.txt`로 의존성을 설치하고, `modal token info`로 기존 workspace 인증을 확인한 뒤 `.venv/bin/modal serve modal_app.py`를 실행하면 ephemeral URL이 나와요. 이 URL도 `soulx-api-secret`의 key를 `X-API-Key` header로 요구해요([services/vocal-profile-modal/README.md](repo://services/vocal-profile-modal/README.md#L15-L34)).

믹싱 워커가 쓰는 `soulx-singer-svc`는 `package.json`에 배포 script가 없어요. 그 디렉터리에서 `modal deploy modal_app.py`를 직접 실행하고, 배포 전에 `modal run modal_app.py::setup`으로 모델 가중치를 Volume에 한 번 내려받은 뒤, 배포 출력의 `https://...modal.run` URL을 `MODAL_API_URL`에 설정하세요([services/soulx-singer-svc/README.md](repo://services/soulx-singer-svc/README.md#L39-L57)).

## production에서 실행해요

단일 인스턴스 배포에서는 build 후 기본 start 명령을 사용해요.

```bash
pnpm install --frozen-lockfile
pnpm run db:migrate:deploy
pnpm build
pnpm start
```

`pnpm start`도 `pnpm dev`와 같은 `concurrently --kill-others-on-fail` 묶음이므로, 워커 하나가 실패하면 프로세스 전체가 종료되고 배포 관리자가 인스턴스를 다시 시작해요([package.json](repo://package.json#L17-L17), [README.md](repo://README.md#L197-L206)).

새 PostgreSQL에 배포했다면 migration을 적용한 뒤 `/admin/songs`에서 기존 카탈로그 스냅샷을 가져오세요. 스냅샷에는 분석 결과와 외부 자산 metadata가 들어가지만 원본 음원 bytes는 들어가지 않아요([README.md](repo://README.md#L208-L208)). 내보내기·가져오기 조건과 실패 코드는 [곡 카탈로그 등록과 공개](../workflows/song-catalog-lifecycle.md)가 소유해요.

## 설정과 분석기 성능을 확인해요

로컬 실행이 이상하면 값을 바꾸기 전에 아래 명령으로 어느 단계가 비어 있는지 먼저 확인하세요.

| 명령 | 확인하는 것 |
| --- | --- |
| `pnpm run verify:feature-config` | 필수 변수의 존재만 보고, 비어 있는 이름만 `Missing feature environment variables: ...`로 나열한 뒤 종료 코드 1을 남겨요([scripts/verify-feature-config.ts](repo://scripts/verify-feature-config.ts#L5-L21)) |
| `node --conditions react-server --import tsx scripts/verify-feature-config.ts --leemage` | Leemage 업로드·삭제 스모크 테스트 |
| `pnpm run modal:vocal-profile:benchmark` | 배포된 보컬 프로필 분석기의 cold/warm 지연과 정리 확인 |

`--leemage` 스모크 테스트는 무작위 이름의 임시 텍스트 파일을 Leemage에 올렸다가 같은 파일을 지워요. 그래서 설정이 맞는지 실제 저장소 왕복으로 확인하고, 끝나면 남는 파일이 없어요. `LEEMAGE_` 변수가 비어 있으면 `Configure Leemage variables before running the storage smoke test.` 오류로 멈춰요([scripts/verify-feature-config.ts](repo://scripts/verify-feature-config.ts#L23-L39)). `package.json`의 `verify:feature-config` script는 `--leemage`를 넘기지 않으므로, 스모크 테스트는 위 표의 `node` 명령으로 실행하세요.

벤치마크 script는 `VOCAL_PROFILE_MODAL_URL`과 서버 key(`VOCAL_PROFILE_MODAL_API_KEY`, 없으면 `MODAL_API_KEY`)가 있어야 돌아가요. 기본값으로 10·30·60초짜리 합성 WAV 픽스처를 만들어 각각 cold-candidate 한 번과 warm 한 번을 호출하고, 두 호출이 같은 container를 재사용했는지, 응답이 `cleanupConfirmed`를 참으로 돌려주는지, 잘못된 키가 401이나 403으로 거절되는지 확인해요. `MODAL_BENCHMARK_CPU_USD_PER_CORE_SECOND`와 `MODAL_BENCHMARK_MEMORY_USD_PER_GIB_SECOND`를 함께 주면 handler·wall 시간 기준 비용 추정도 JSON에 붙어요([scripts/benchmark-vocal-profile-modal.ts](repo://scripts/benchmark-vocal-profile-modal.ts#L131-L167)).

## 다음에 볼 문서

- 값의 의미, 기본값, 적용 지점은 [환경 변수와 런타임 한도](configuration.md)에서 찾으세요.
- 워커의 점유·lease·재시도 규칙은 [Job 큐와 lease 복구 계약](job-processing.md)이 설명해요.
- 새 코드를 둘 자리와 런타임 경계는 [시스템 지도와 경계](../architecture/system-map.md)를 보세요.
- 바꾼 범위에 어떤 검사를 돌릴지는 [변경 검증 경로](../testing/verification.md)에서 고르세요.
- 저장소를 처음 여는 전체 독서 순서는 [코드베이스 시작 지도](../quickstart.md)에 있어요.
