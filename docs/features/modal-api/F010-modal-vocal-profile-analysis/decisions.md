# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D010: modal-vocal-profile-analysis 결정 (2026-08-08)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: transport-neutral 분석 코어와 adapter 경계를 분리 (2026-08-08)

- **Context**: 현재 `services/vocal-profile-api/app/main.py`의 `/v1/analyze` route가 multipart 입력, request directory lifecycle, audio 표준화, pitch 분석, smart reference 생성과 local artifact 보관을 한 함수에서 모두 담당한다. Modal CPU 이전 시 이 route 자체를 복제하면 local/Modal analyzer contract가 다시 분기될 위험이 있다.
- **Constraints**: F009에서 확정된 `AnalyzerProfile`/`smart-reference-v1` 결과와 local FastAPI의 POST → artifact GET → DELETE 계약은 T01에서 회귀 없이 유지해야 한다. shared core에는 DB, Leemage, Modal persistent storage side effect가 없어야 한다.
- **Options**: FastAPI route 전체를 Modal image에 그대로 재사용, Modal 전용 분석 코드를 별도 작성, transport-neutral shared service를 추출하고 local/Modal adapter가 공유하는 방식을 비교한다.
- **Decision**: shared recording analysis service를 추출하고 local FastAPI는 adapter로 남긴다. Modal adapter는 다음 태스크에서 같은 service를 호출한다.
- **Rationale**: 분석 알고리즘과 smart reference 선택 로직의 단일 구현을 유지하면서 HTTP와 artifact lifecycle만 실행 환경별로 바꿀 수 있다.
- **Trace**:
  - **DOING 시작 시점**: `main.py`의 현재 route 흐름을 먼저 고정한 뒤 MIME/segment 검증과 file lifecycle 중 transport-neutral한 부분만 service로 이동한다. T01에서는 local API 표면을 바꾸지 않는다.
  - **DONE 전 확정 시점**: `analysis_service.py`를 추가해 MIME 정규화, segment 계약, audio 표준화, pYIN 분석과 smart reference 생성을 request-scoped service로 분리했다. local `main.py`는 upload size/recording TTL/GET·DELETE lifecycle만 유지하고 service 결과로 기존 `AnalyzerResponse`를 조립한다. 전체 vocal-profile Python suite 28/28과 기존 API/reference 회귀가 통과했다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: `caf2b50`
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `services/vocal-profile-api/.venv/bin/pytest -q services/vocal-profile-api/tests` → PASS (28/28), `git diff --check` → PASS
- **Consequences**: 다음 Modal adapter는 shared service 결과를 persistent filesystem 없이 serialize할 수 있고, local adapter는 기존 TTL artifact lifecycle을 계속 제공할 수 있다.

## D002: 별도 CPU App과 단일 요청 artifact handoff를 사용 (2026-08-08)

- **Context**: local analyzer는 POST 후 같은 서버 filesystem의 `/source`와 `/synthesis-reference`를 후속 GET하는 3단계 계약이다. Modal Web Function에서는 후속 HTTP 요청이 같은 ephemeral container에 도착한다는 보장이 없고, 이를 보장하려 persistent Volume/Dict를 사용하면 사용자 audio를 Modal에 남기지 않는 I007 원칙과 충돌한다.
- **Constraints**: GPU를 요청하지 않아야 하며, `AnalyzerProfile`/`smart-reference-v1` bytes를 Next.js가 Leemage에 저장할 수 있어야 한다. Modal에는 DB/Leemage credential을 주지 않고 request 종료 후 사용자 파일이 남지 않아야 한다.
- **Options**: local 3단계 GET 계약을 persistent Volume으로 재현, Modal이 Leemage에 직접 업로드, 분석 JSON과 source/reference artifact를 한 HTTP response로 반환하는 방식을 비교한다.
- **Decision**: SoulX mixer와 분리된 CPU analyzer App을 만들고, request `TemporaryDirectory`에서 shared service를 실행한 뒤 profile + source + optional reference를 한 ephemeral response envelope로 반환한다. 1차 codec은 제한된 60초/30초 payload에 단순한 base64 JSON을 사용한다.
- **Rationale**: persistent Modal storage와 추가 secret 없이 container affinity 문제를 제거하고 Next.js의 기존 ownership/Leemage 보상 로직을 유지할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: `modal==1.5.3` 프로젝트 환경과 현재 공식 Modal Web Function/timeout/autoscaling 문서를 기준으로 별도 ASGI app, CPU 2.0·4096 MiB, scale-to-zero baseline을 구현한다. 실제 remote deploy는 T05 승인 전에는 하지 않는다.
  - **DONE 전 확정 시점**: `services/vocal-profile-modal`에 CPU-only ASGI app, request `TemporaryDirectory`, `modal-analysis-envelope-v1` transport를 추가했다. source/reference는 base64+SHA-256으로 한 응답에 포함하고 persistent `modal.Volume`을 사용하지 않는다. 인증은 기존 SoulX API와 동일하게 Modal Secret `soulx-api-secret`의 `SOULX_API_KEY`를 주입하고 FastAPI에서 `X-API-Key`를 constant-time 비교한다. health는 analyzer/version, `smart-reference-v1`, transport/resource 정보를 반환한다. transport/cleanup/static contract 9/9와 기존 analyzer suite 28/28이 통과했다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: `2886b0b`
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `cd services/vocal-profile-modal && ../vocal-profile-api/.venv/bin/pytest -q test_transport.py test_runtime.py test_modal_app_source.py` → PASS (9/9), `services/vocal-profile-api/.venv/bin/pytest -q services/vocal-profile-api/tests` → PASS (28/28), `git diff --check` → PASS
- **Consequences**: base64 encoding은 약 33% 전송 overhead가 있으므로 T05 benchmark에서 payload/serialization cost를 측정하고 필요 시 binary multipart codec으로 교체한다.

## D003: Next.js가 analyzer backend와 영구 저장 책임을 소유 (2026-08-08)

- **Context**: 현재 `/api/vocal-profiles` route는 local analyzer URL, multipart proxy, 후속 artifact GET, Leemage upload와 Prisma persistence를 직접 결합한다. Modal backend를 추가하면서 이 분기를 route 안에 넣으면 backend별 file lifecycle과 error mapping이 사용자 API에 섞인다.
- **Constraints**: local 개발 경로는 유지하고 production에서는 backend를 명시적으로 선택해야 한다. Modal 실패 시 local로 조용히 fallback하지 않으며 Leemage/DB credential은 Next.js server에만 둔다.
- **Options**: route 내부 `if local/modal`, analyzer adapter interface + 공통 bytes persistence, Modal이 Leemage에 직접 저장하는 방식을 비교한다.
- **Decision**: server-only analyzer adapter가 local/Modal transport 차이를 흡수하고 공통 `AnalyzedRecording` bytes 결과를 반환한다. `/api/vocal-profiles`는 이 결과를 Leemage/Prisma에 저장하는 책임만 가진다.
- **Rationale**: F009의 ownership/cleanup semantics를 한 곳에 유지하고 backend 전환을 환경 설정으로 제한하며 transport 회귀를 독립 테스트할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 설치된 Next.js 16 Route Handler 문서를 먼저 확인하고 `VOCAL_PROFILE_ANALYZER_BACKEND=local|modal` fail-closed selector, local legacy adapter, Modal envelope decoder, bytes 기반 media primitive 순서로 구현한다.
  - **DONE 전 확정 시점**: `lib/vocal-profile/analyzer`에 local/Modal adapter와 fail-closed backend selector를 추가했다. local adapter는 기존 POST/GET/DELETE 임시 lifecycle을 bytes로 흡수하고 즉시 cleanup하며, Modal adapter는 server-only `X-API-Key` 인증과 envelope hash/size/cleanup contract를 검증한다. `/api/vocal-profiles`와 health route는 backend 세부사항을 제거했고 Leemage는 bytes 입력 primitive로 source/reference를 저장한다. production에서 backend 미설정은 `ANALYZER_NOT_CONFIGURED`로 실패한다. adapter 4/4, media 5/5, 관련 profile/mixing UI 8/8, TypeScript/lint/build가 통과했다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: `5562c42`
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `pnpm run test:vocal-profile-analyzer` → PASS (4/4), `pnpm run test:media` → PASS (5/5), `pnpm exec tsc --noEmit`/`pnpm run lint`/`pnpm run build` → PASS
- **Consequences**: `AnalyzerProfile`의 legacy storagePath/expiry는 local transport 내부 세부사항이 되고, route 이후의 persistence는 source/reference bytes와 profile metadata만 사용한다.

## D004: retry는 외부 side effect 없는 분석 operation에만 허용 (2026-08-08)

- **Context**: Modal 호출은 auth/429/5xx/network/timeout과 사용자 입력 rejection을 구분해야 한다. 분석 함수 자체는 ephemeral filesystem만 사용하지만, Next.js의 Leemage/DB persistence는 외부 side effect를 만든다.
- **Constraints**: 입력/quality 4xx를 재시도해도 결과가 바뀌지 않으며 불필요한 compute만 발생한다. sync HTTP는 120초 client budget을 가지므로 timeout 뒤 동일 요청을 같은 HTTP request 안에서 자동 재실행하면 전체 budget을 초과할 수 있다.
- **Options**: 모든 실패 자동 retry, Modal SDK/HTTP layer에서 1회 자동 retry, analyzer transport는 stable `retryable`만 반환하고 persistence 이전 operation만 사용자/상위 caller가 제한 재시도하는 정책을 비교한다.
- **Decision**: expected analysis 4xx와 auth 실패는 `retryable=false`; 429/5xx/network/timeout은 stable infrastructure reason code와 `retryable=true`로 반환한다. T04에서는 동일 HTTP 요청 안의 자동 재실행은 하지 않는다. 재시도 시에는 새 HTTP request가 같은 source/recording semantics로 analyzer-only 단계를 다시 수행하며, Leemage/DB persistence가 시작된 뒤에는 기존 보상 cleanup을 사용한다.
- **Rationale**: 150초 Modal HTTP 경계와 120초 client budget을 지키면서 중복 영구 asset을 만들지 않고 실패 종류를 명확히 분리한다.
- **Trace**:
  - **DOING 시작 시점**: 10/30/60초 parity와 error mapping을 테스트하고, source/reference/DB 부분 실패에서 영구 resource 정리가 유지되는지 검증한다.
  - **DONE 전 확정 시점**: 10·30·60초 동일 WAV fixture에서 local FastAPI 응답과 Modal serializer profile/source/reference가 일치했고 무음 rejection도 동일 `TOO_SILENT`로 확인됐다. 이 parity test가 Modal serializer가 synthesisReference에 local Pydantic 계약에 없는 `sourceDurationMs`를 노출하던 drift를 발견해 allowlist serializer로 수정했다. auth/expected 4xx는 비재시도, 429/5xx/network/timeout은 stable `retryable=true` infrastructure error로 고정했고 같은 HTTP request 안에서 자동 재실행하지 않는다. 실제 DB 통합 테스트에서 source 저장 실패는 영구 resource 0개, smart-reference 저장 실패는 source profile + fallback 유지, DB 실패는 생성된 Leemage asset 2개 보상 삭제를 확인했다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: `a1dcecb`
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: Python analyzer suite → PASS (32/32; 10/30/60 parity + silent rejection 포함), Modal unit → PASS (9/9), `pnpm run test:vocal-profile-analyzer` → PASS (8/8), `pnpm run test:vocal-profile-persistence` → PASS (3/3), `pnpm run test:media` → PASS (5/5), tsc/lint/build → PASS
- **Consequences**: 자동 retry 횟수/백오프는 실제 remote latency와 429 패턴을 본 뒤 필요하면 T06에서 추가한다.

## D005: 실제 remote benchmark는 고정 CLI와 container identity로 측정 (2026-08-08)

- **Context**: T05는 실제 Modal CPU deployment와 10·30·60초 cold/warm 측정이 필요하며, 이 시점부터 원격 workspace 리소스와 compute usage가 발생한다. 로컬 전역 Modal CLI는 1.2.4이고 Feature에서 검증할 SDK/runtime 기준은 1.5.3이다.
- **Constraints**: 원격 배포와 compute 실행 전 사용자 승인이 필요하다. cold/warm 판단은 단순 wall time 추정이 아니라 실제 container 재사용 여부를 확인해야 하며, 가격은 코드에 영구 상수로 고정하지 않는다. 기존 `soulx-singer-svc` 배포는 변경하지 않는다.
- **Options**: 전역 CLI 사용, 프로젝트 전용 venv 생성, `requirements-local.txt`를 `uv run --with-requirements`로 격리 실행하는 방식을 비교했다. Web 인증은 새 Proxy Token과 기존 SoulX의 `soulx-api-secret`/`X-API-Key` 패턴을 비교했다.
- **Decision**: 세 Modal 서비스의 repo SDK pin을 `modal==1.5.3`으로 통일하고, F010 deploy는 `uv run --with-requirements services/vocal-profile-modal/requirements-local.txt`로 실행한다. 기존 SoulX 배포는 재배포하지 않는다. Web 인증은 기존 SoulX와 동일한 `soulx-api-secret` + `X-API-Key`를 사용한다. analyzer response/health에는 process-level `containerInstanceId`, startup timestamp와 handler timing을 노출하고 benchmark script가 wall/handler/payload/container identity를 기록한다. 비용 단가는 실행 시점 공식 값을 environment input으로 넣는다.
- **Rationale**: 전역 CLI drift를 피하면서 이미 운영 중인 server-only 인증 경계를 재사용하고, cold start와 warm reuse를 실제 container identity로 관찰할 수 있다. 별도 사용자 데이터 저장이나 GPU resource는 추가하지 않는다.
- **Trace**:
  - **DOING 시작 시점**: `modal --version`에서 전역 CLI 1.2.4를 확인했다. `modal:vocal-profile:deploy`, `modal:vocal-profile:benchmark` package script와 benchmark metrics를 로컬에서 준비했고 tsc/lint, Modal unit 9/9가 통과했다. 사용자는 기존 SoulX 배포를 건드리지 않고 Modal SDK 1.5.3으로 F010을 진행하는 원격 실행을 승인했다.
  - **DONE 전 확정 시점**: `copy-singer-vocal-profile-analyzer`를 Modal 1.5.3 CLI 환경으로 배포했다. 잘못된 API key는 401, authenticated health는 `librosa-pyin 0.11.0`, `smart-reference-v1`, CPU 2 cores/4096 MiB/GPU false를 확인했다. 10초 wall 34.074/5.414초, 30초 10.797/39.248초, 60초 17.531/20.821초로 최대 39.248초였다. 60초 response는 약 4.33 MB였고 Modal 공식 문서상 Web Function response body는 unlimited이다. 공식 단가 CPU `$0.0000131/core/sec`, memory `$0.00000222/GiB/sec` 기준 6회 handler 추정 합계 `$0.003617`, wall upper-bound `$0.004486`였다. 별도 remote parity 3회에서 10/30/60초 profile JSON과 source/reference bytes가 local shared analyzer와 exact match했다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: `8474487`
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `pnpm run modal:vocal-profile:deploy` → deployed, `pnpm run modal:vocal-profile:benchmark` → PASS (wrong key 401 + 6 samples), deployed remote parity pytest → PASS (3/3 exact profile/artifact bytes)
- **Consequences**: 실제 최악 wall 39.248초로 T06의 sync 승인 기준 90초보다 충분히 낮다. base64 60초 response 약 4.33 MB도 Modal Web Function response 제한에 걸리지 않으므로 binary transport 전환은 이번 Feature의 필수 조건이 아니다.

## D006: sync HTTP와 scale-to-zero를 최종 운영 기준으로 채택 (2026-08-08)

- **Context**: T05 실측에서 모든 10/30/60초 요청이 120초 client budget과 Modal Web Function 150초 HTTP 경계보다 크게 짧았고, 최대 wall time은 39.248초였다.
- **Constraints**: 프로필 분석은 CPU-only이고 사용자 요청당 compute 비용이 매우 낮다. 별도 async job/polling 모델을 추가하면 DB 상태, 재접속 UX와 failure recovery 복잡도가 늘어난다. warm container는 idle resource 비용을 만든다.
- **Options**: 현재 sync HTTP 유지, 처음부터 async submit/polling 전환, sync 유지 + min container warm pool 추가를 비교한다.
- **Decision**: sync HTTP를 유지한다. Modal Function은 2 physical cores, 4096 MiB, timeout 120초, `min_containers=0`, `max_containers=10`, `scaledown_window=60`으로 고정하고 요청당 container concurrency는 1로 제한한다. Next.js client timeout은 120초를 유지한다. production에서 Modal 장애 시 local analyzer로 자동 fallback하지 않는다.
- **Rationale**: 실측 최악값이 sync 승인 기준 90초보다 약 50초 낮고, 60초 입력도 20.821초 이하로 완료됐다. Modal은 기본적으로 scale-to-zero를 지원하며 warm pool은 비용과 cold-start의 trade-off이므로 현재 evidence에서는 `min_containers>0`가 필요하지 않다.
- **Trace**:
  - **DOING 시작 시점**: T05 결과를 plan 기준과 비교해 async 상태 모델 없이 sync를 유지하는 방향을 기본안으로 잡았다. 공식 Modal 문서에서 Web Function HTTP timeout 150초, 기본 scale-to-zero 및 `min_containers`/`scaledown_window` autoscaler semantics를 재확인했다.
  - **DONE 전 확정 시점**: 최종 resource/autoscaling 설정을 코드에 명시해 재배포했고, health 응답과 로컬 회귀 테스트로 설정 적용을 확인했다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: `3ad7967`
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: T05 benchmark max wall 39.248초; 60초 17.531/20.821초; remote parity 3/3 exact
- **Consequences**: Modal compute transport 자체는 sync로 유지한다. 사용자 요청 lifecycle은 D007에서 Copysinger-owned durable queue로 분리한다.

## D007: Modal sync compute를 PostgreSQL durable queue 뒤에서 실행 (2026-08-08)

- **Context**: T05에서 Modal 분석 자체는 sync로 충분히 빠르다고 확인했지만, `/api/vocal-profiles` HTTP 요청이 외부 분석과 Leemage/DB persistence 전체 시간 동안 열려 있으면 브라우저 이탈·호스팅 timeout·일시 장애 복구를 사용자 요청 lifecycle이 직접 떠안는다. 프로젝트에는 이미 MixingJob lease/idempotency worker 패턴이 있다.
- **Constraints**: 기존 Modal endpoint와 exact parity 계약은 유지하고 Modal 내부 async job 모델을 새로 만들지 않는다. 분석 source는 worker가 나중에 다시 읽을 수 있어야 하며, production에서 local analyzer로 자동 fallback하지 않는다.
- **Options**: 현재 request-bound sync 유지, Modal 자체를 submit/polling으로 변경, 분석 source를 Leemage에 먼저 저장하고 PostgreSQL queue/worker가 기존 sync analyzer를 호출하는 방식을 비교한다.
- **Decision**: Copysinger가 `VocalProfileAnalysisJob` durable queue를 소유한다. 업로드 source를 Leemage에 먼저 저장하고 idempotent job을 생성해 202로 반환하며, 별도 worker가 lease를 claim해 기존 sync analyzer를 호출한다. 성공 시 같은 source asset을 Recording에 연결하고 smart reference/VocalProfile을 저장한다. 브라우저는 job을 polling하고 pending job id를 localStorage에 보관해 재접속 시 복구한다.
- **Rationale**: Modal transport를 검증된 sync primitive로 유지하면서 request timeout, 브라우저 이탈, retry와 worker crash를 DB 상태로 흡수할 수 있다. MixingJob과 동일한 운영 패턴을 재사용하되 도메인 상태와 ticket/refund semantics가 다르므로 별도 job 모델을 사용한다.
- **Trace**:
  - **DOING 시작 시점**: T08 추가 요청으로 implementation approval을 변경 요청으로 되돌렸다. queue source는 최종 Recording이 사용할 `REFERENCE` MediaAsset으로 먼저 저장하고, worker는 analyzer가 돌려준 source bytes가 durable source와 동일한지 검증한 뒤 재업로드 없이 재사용하는 방향으로 구현한다.
  - **DONE 전 확정 시점**: `VocalProfileAnalysisJob` migration과 raw SQL lease claim을 추가하고, source를 enqueue 전에 Leemage `REFERENCE`로 저장해 worker input으로 사용한다. worker는 300초 lease, bounded attempts/backoff로 기존 sync analyzer를 호출하며 source MIME/size/SHA-256이 queued bytes와 일치할 때만 같은 MediaAsset을 Recording에 재사용한다. `/api/vocal-profile-analysis-jobs`는 202 enqueue와 owner-scoped polling을 제공하고 UI는 job ID를 localStorage에 보관해 재접속 후 복구한다. `pnpm dev/start`는 web+mixing+analysis worker를 함께 supervise한다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: T08 task checkpoint commit에서 갱신
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `pnpm run test:vocal-profile-analysis-queue` → PASS (5/5: idempotency/ownership, lease recovery, source reuse success, transient requeue, terminal cleanup), `pnpm test` → PASS, lint/tsc/build/Prisma validate+migrate status → PASS
- **Consequences**: 프로필 생성 API는 즉시 완료된 VocalProfile 대신 durable job을 반환한다. 웹 프로세스와 별도로 analysis worker가 실행되어야 하며 기본 supervisor가 이를 함께 기동한다. 실패한 terminal job의 source는 정리되고 성공한 source만 Recording의 영구 REFERENCE asset으로 남는다.
