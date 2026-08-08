# 시스템 아키텍처 개요

이 문서는 여러 Feature가 공유하는 현재 시스템 경계와 상위 요청 흐름을 정의한다. Feature별 상세 구현 설계는 해당 Feature의 `plan.md`, 기술 선택 근거는 `decisions.md`를 SSOT로 사용한다.

## 구성요소

| 컴포넌트 | 경로 | 역할 |
| --- | --- | --- |
| Web UI | `app/`, `components/` | 오디오 선택, 설정, 상태 폴링, 결과 재생 |
| Next.js Node API proxy | `app/api/` | 서버 전용 인증, PostgreSQL 접근, 업로드 스트리밍, 응답 프록시 |
| Better Auth | `lib/auth/`, PostgreSQL | Google OAuth 세션, 사용자 소유권과 관리자 allowlist 검증 |
| Mixing worker | `scripts/mixing-worker.ts`, `lib/mixing/` | 영속 작업 claim, target 준비, Modal 제출·추적, 결과 저장과 정리 재시도 |
| Leemage | 외부 REST API | 사용자 reference와 성공한 믹싱 결과 영구 저장 |
| Local vocal analyzer | `services/vocal-profile-api/` | local Docker 개발/회귀용 FastAPI와 Modal이 공유하는 librosa/pYIN 분석 코어 |
| Modal CPU analyzer | `services/vocal-profile-modal/modal_app.py` | 배포용 CPU-only 보컬 프로필 분석, request-scoped 임시 파일과 profile/source/reference ephemeral handoff |
| Modal SVC web function | `services/soulx-singer-svc/modal_app.py` | FastAPI 계약, 파일 저장, 비동기 GPU 작업 관리 |
| Modal GPU worker | `SoulXModel` | SoulX-Singer 모델 로드, 전처리, SVC 추론, 반주 재믹스 |
| Modal storage | Volume + Dict | 모델·작업 파일과 작업 메타데이터 보관 |
| PostgreSQL | Docker Compose | 인증, 사용자 프로필, 추천, 믹싱 큐, 티켓 원장과 파일 메타데이터 영속 저장 |
| Prisma | Next.js server | schema, migration, 타입 안전 DB 접근 |

## 보컬 프로필 분석 요청 흐름

1. 브라우저가 로그인 세션으로 최대 60초 오디오를 `POST /api/vocal-profiles`에 제출한다.
2. Next.js가 `VOCAL_PROFILE_ANALYZER_BACKEND`로 local 또는 Modal adapter를 명시적으로 선택한다. production에서는 backend 미설정을 허용하지 않는다.
3. Modal 경로에서는 Next.js가 multipart 요청과 server-only `X-API-Key`를 CPU analyzer에 전달한다. analyzer는 request-scoped 임시 디렉터리에서 shared analysis core와 `smart-reference-v1`을 실행하고, profile + source + optional synthesis reference bytes를 한 response envelope로 반환한 뒤 임시 파일을 제거한다.
4. Next.js가 analyzer version/capability와 artifact size/hash를 검증한 뒤 source와 smart reference를 Leemage에 저장한다. Modal analyzer에는 Leemage/PostgreSQL credential을 제공하지 않는다.
5. PostgreSQL에는 사용자 소유 보컬 프로필, analyzer version, Leemage asset relation만 저장한다. Leemage 또는 DB 저장 실패 시 생성된 외부 asset을 삭제하거나 cleanup queue에 남긴다.
6. production Modal analyzer 장애 시 local analyzer로 자동 fallback하지 않는다. backend 전환은 운영 설정 변경으로만 수행한다.

현재 Modal CPU baseline은 2 physical cores, 4096 MiB, `min_containers=0`, `max_containers=10`, `scaledown_window=60`, container concurrency 1의 sync HTTP 방식이다.

## SVC 요청 흐름

1. 브라우저가 두 오디오와 advanced settings를 `POST /api/conversions`로 전송한다.
2. Next.js가 multipart boundary를 유지한 채 요청 body를 Modal로 스트리밍한다.
3. Modal web function이 입력 파일을 작업 Volume에 저장하고 GPU FunctionCall을 spawn한다.
4. 브라우저가 Next.js를 통해 상태를 폴링한다.
5. GPU worker가 정규화, 선택적 보컬 분리, F0 추출, SVC 추론과 선택적 반주 믹스를 수행한다.
6. 완료되면 브라우저가 결과 WAV를 Next.js 프록시를 통해 재생하거나 다운로드한다.

## SVC API 계약

| Method | Next.js | Modal | 설명 |
| --- | --- | --- | --- |
| GET | `/api/health` | `/health` | 연결 상태 |
| POST | `/api/conversions` | `/v1/conversions` | 변환 생성 |
| GET | `/api/conversions/{id}` | `/v1/conversions/{id}` | 상태 조회 |
| GET | `/api/conversions/{id}/audio` | `/v1/conversions/{id}/audio` | 결과 WAV |
| DELETE | `/api/conversions/{id}` | `/v1/conversions/{id}` | 취소 및 삭제 |

## 인증·추천·믹싱 파이프라인

1. 사용자가 Google OAuth로 로그인하고 신규 계정에 설정된 가입 티켓을 한 번 지급한다.
2. 브라우저가 테스트 가창을 녹음하거나 업로드한다.
3. CPU 분석기가 보컬 프로필을 계산하고 표준 reference를 Leemage에 옮긴 뒤 임시본을 제거한다.
4. PostgreSQL에는 사용자 소유 프로필, Leemage 파일 ID와 분석 버전만 저장한다.
5. 같은 분석기로 미리 생성한 곡 프로필과 semitone 후보별 적합도를 계산하고 전체 순위를 반환한다.
6. 사용자가 `AI 믹싱`을 누르면 티켓 차감과 PENDING job 생성을 한 DB 트랜잭션에서 수행한다.
7. 별도 worker가 lease로 job을 claim하고 allowlist target을 임시 준비해 Modal에 제출한다.
8. 성공 결과를 Leemage에 confirm한 뒤 job을 SUCCEEDED로 만들며 사용자는 재접속 후 히스토리에서 결과를 듣는다.

## 운영 경계

- 웹 앱은 공식 Next.js Node 런타임의 로컬 실행을 기준으로 하며 프로덕션 배포 대상은 아직 선택하지 않았다.
- SoulX SVC와 보컬 프로필 Modal analyzer는 별도 Modal App으로 배포하며 repo의 Modal Python SDK는 `1.5.3`으로 고정한다.
- 보컬 프로필 production backend는 `VOCAL_PROFILE_ANALYZER_BACKEND=modal`과 `VOCAL_PROFILE_MODAL_URL`을 명시적으로 설정해야 하며, 현재 로컬 환경은 자동 전환하지 않는다.
- Better Auth, Google, Modal과 Leemage secret은 `.env.local`에만 두고 클라이언트로 전달하지 않는다. 보컬 프로필 analyzer는 기존 `MODAL_API_KEY`를 기본 server-only `X-API-Key`로 사용하고 필요 시 `VOCAL_PROFILE_MODAL_API_KEY`로 override한다.
- reference와 결과는 사용자가 삭제할 때까지 Leemage에 저장한다. 원곡과 stem은 작업 임시 디렉터리에서 제거한다.
- `/dev/svc`와 `/api/conversions/*`는 비프로덕션에서 `ENABLE_DEV_SVC=true`일 때만 제공한다.
