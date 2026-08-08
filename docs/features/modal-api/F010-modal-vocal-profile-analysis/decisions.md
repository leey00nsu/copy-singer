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
  - **Commit**: T01 task checkpoint commit에서 갱신
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
  - **DONE 전 확정 시점**: `services/vocal-profile-modal`에 CPU-only ASGI app, `requires_proxy_auth=True`, request `TemporaryDirectory`, `modal-analysis-envelope-v1` transport를 추가했다. source/reference는 base64+SHA-256으로 한 응답에 포함하고 persistent `modal.Volume`을 사용하지 않는다. health는 analyzer/version, `smart-reference-v1`, transport/resource 정보를 반환한다. transport/cleanup/static contract 9/9와 기존 analyzer suite 28/28이 통과했다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: T02 task checkpoint commit에서 갱신
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
  - **DONE 전 확정 시점**: `lib/vocal-profile/analyzer`에 local/Modal adapter와 fail-closed backend selector를 추가했다. local adapter는 기존 POST/GET/DELETE 임시 lifecycle을 bytes로 흡수하고 즉시 cleanup하며, Modal adapter는 proxy auth와 envelope hash/size/cleanup contract를 검증한다. `/api/vocal-profiles`와 health route는 backend 세부사항을 제거했고 Leemage는 bytes 입력 primitive로 source/reference를 저장한다. production에서 backend 미설정은 `ANALYZER_NOT_CONFIGURED`로 실패한다. adapter 4/4, media 5/5, 관련 profile/mixing UI 8/8, TypeScript/lint/build가 통과했다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: T03 task checkpoint commit에서 갱신
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
  - **Commit**: T04 task checkpoint commit에서 갱신
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: Python analyzer suite → PASS (32/32; 10/30/60 parity + silent rejection 포함), Modal unit → PASS (9/9), `pnpm run test:vocal-profile-analyzer` → PASS (8/8), `pnpm run test:vocal-profile-persistence` → PASS (3/3), `pnpm run test:media` → PASS (5/5), tsc/lint/build → PASS
- **Consequences**: 자동 retry 횟수/백오프는 실제 remote latency와 429 패턴을 본 뒤 필요하면 T06에서 추가한다.
