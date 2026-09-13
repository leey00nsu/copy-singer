# Decisions Log

## D001: 감사의 핵심 5개를 하나의 Feature로 묶음 (2026-09-13)

- **Context**: 사용자가 Production Readiness Audit의 마지막 5개 개선을 하나의 Feature로 진행하도록 요청했다.
- **Constraints**: 토이 프로젝트 규모, PostgreSQL·Next.js·Modal 유지, 현재 spec 승인 필요, 원격 배포 전 결과 준비.
- **Options**: 5개 독립 Feature 또는 하나의 cross-component Feature.
- **Decision**: JCXFBTGYM8R3 하나로 관리하며 web 주 책임 아래 data·modal-api 변경을 포함한다. 구현 plan/tasks는 spec 승인 후 작성한다.
- **Rationale**: lease·외부 timeout·파일 정리는 동일한 실패 구간을 공유하고, 접수 제한·가입 지급도 티켓 transaction과 연결된다. 별도 구현 시 중간 상태의 계약 충돌이 생기기 쉽다.
- **Trace**: main b333d64의 읽기 전용 감사에서 현재 timeout/lease/파일/세션 경로를 확인했다. 이전 턴의 기존 비외부 테스트 26개 통과는 이번 Feature 구현 검증으로 계산하지 않는다. 이번 요청을 구체 spec 승인 또는 merge 승인으로 간주하지 않는다.
- **Evidence**:
  - **Commit**: b333d64 (감사 기준)
  - **Code**: `src/_app/background-jobs/mixing/worker.ts`, `src/shared/media/media-service.ts`, `src/features/authentication/api/session.ts`
  - **Workflow**: `npx lee-spec-kit workflow-stage JCXFBTGYM8R3 --json` → spec_write, implementationAllowed=false.
- **Consequences**: 승인 전에는 spec과 PRD를 구체화한다. 전체 감사의 나머지 이슈는 이번 완료 판정에 포함하지 않는다.


## D002: 서브에이전트 스펙 리뷰의 정책 공백 3개 보완 (2026-09-13)

- **Context**: 사용자가 요청한 읽기 전용 spec 리뷰에서 changes_requested 판정과 P1 2개, P2 1개가 반환됐고 사용자가 맞게 수정하도록 요청했다.
- **Constraints**: spec 승인 전 문서 수정만 수행하며, 분석·믹싱의 서로 다른 기존 환불 계약을 보존한다. Leemage의 확인되지 않은 기능을 전제로 삼지 않는다.
- **Options**: 불명 작업 무한 대기 또는 제한된 자동 복구 후 운영자 확인; 외부 파일 전 구간 자동 삭제 보장 또는 확인된 provider 계약 범위 보장; 과거 미지급분 현재 환경값 적용 또는 운영자 명시 금액.
- **Decision**: FR-1 상태/환불 표와 AC-16, FR-4 provider 확인·보장 한계와 AC-17, FR-5 운영자 CLI/지급 의도 정책과 AC-18을 추가하고 PRD-NFR-013/016/017을 동기화했다.
- **Rationale**: 사용자 슬롯은 제한 시간 내 반환하고 불명 외부 비용은 추적한다. 식별 불가능한 외부 예약의 제거를 과장하지 않는다. 과거 정책을 추측하지 않으면서 신규 가입 금액은 재시도 중 변하지 않게 한다.
- **Trace**: reviewer /root/spec_review의 읽기 전용 결과 3개를 반영했다. 이는 사용자 요청 spec 리뷰이며 workflow Plan 리뷰가 아니다. 수정 후 재리뷰 승인이나 사용자 spec 승인으로 기록하지 않는다.
- **Evidence**:
  - **Review**: 현재 작업의 /root/spec_review terminal 응답 — changes_requested; 외부 접수 불명 종료(P1), presign 응답 유실(P1), 과거 가입 누락 금액(P2).
  - **Documents**: spec.md의 FR-1/FR-4/FR-5 및 AC-16~18, docs/prd/copy-singer-prd.md의 PRD-NFR-013/016/017.
- **Consequences**: provider 계약 확인은 plan 확정의 선행 조건이다. 확인 불가 구간은 명시된 운영자 추적 기준으로 완료 여부를 판단하며 모든 외부 파일의 자동 제거를 완료 조건으로 주장하지 않는다.

## D003: 수정 스펙 승인 (2026-09-13)

- **Context**: 정상 동작 보존 및 과부하·장애 시 변경 사항을 설명한 뒤 사용자가 “진행 ㄱㄱ”로 진행을 승인했다.
- **Decision**: 수정 spec을 Approved로 전환하고 plan/tasks를 작성한다.
- **Rationale**: 구체 스펙과 변경 동작에 대한 사용자 승인이다. 구현 결과 승인과 local merge 승인은 별도 경계로 유지한다.
- **Trace/Evidence**: 현재 대화의 사용자 승인 메시지 및 workflow-stage spec_approve.

## D004: T01 공통 기반 검증

- DB pool/연결·쿼리 예산, HTTP 전체/개별 deadline, FFmpeg SIGKILL 후 close 대기와 stderr 상한을 구현했다.
- additive schema는 기존 23 migration을 적용한 격리 PostgreSQL에 적용했다. 기존 사용자 데이터는 접근하지 않았다.
- Leemage 미확인 POST 재시도는 제거하고 DELETE 재시도/404 성공을 유지했다. Modal 및 runner deadline 연결은 T04 범위다.
- runtime 4 tests, media/FFmpeg 포함 10 tests 및 typecheck 통과. 공급자 계약 근거와 자동 정리 한계는 plan에 기록했다.

<!-- lee-spec-kit:workflow-sync sha256:3d1a0eb8a0548f13a517fbf052c9470dcc9f7f2f41cdc16ba40661ec6dd6c8dc -->

## D005: 가입 지급과 세션 분리

- getRequestSession에서 가입 지급 호출을 제거했다. 신규 hook은 양쪽 금액 intent를 먼저 기록하고 사용자 row lock 아래 종류별 지급한다. 기존 가입 원장을 덮어쓰지 않는다.
- tickets:recover-signup CLI는 user/kind/amount/operator/reason 필수, 기본 dry-run, --apply만 지급한다. intent/원장 금액 충돌을 거부한다.
- 격리 DB에서 정책 변경 후 세션·원장 불변, 동시 signup/복구, legacy 부분 지급, dry-run 무변경을 검증했다. 테스트의 bypass 변수 오타를 고친 뒤 통과했다.

## D006: 미디어 영속 intent와 선행 DB 삭제

- 사용자 asset·관리자/CLI catalog upload 모두 intent를 생성하고 identity를 PUT 전에 기록한다. 저장 후 연결 crash는 15분 뒤 참조 검사로 처리한다.
- domain 삭제와 독립 cleanup 기록을 transaction으로 확정한다. 참조 중 삭제는 거부하며 프로필 DELETE와 믹싱 접수는 같은 profile lock을 사용한다. 기존 cleanup은 새 operation으로 변환한다.
- cleanup은 최대 10회 재시도하고 미해결 상태/운영자 CLI를 제공한다. DB 중단 때문에 실패 기록 갱신도 실패하면 최초 UPLOADING intent가 만료 후 회수된다.
- 격리 미디어 회귀 6개 통과. catalog 테스트는 초기 fixture 누락으로 실패한 뒤 localhost 전용 합성 seed를 추가해 재검증했다. 기존 내부 테스트의 DELETE_PENDING asset 기대값은 domain row 삭제+독립 RECOVER intent로 갱신했다. 정상 API 응답 shape는 유지한다. 전체 프로필/믹싱 race 검증은 T06까지 추적한다.

## D007: worker와 외부 실행의 실패 경계

- 세 worker claim은 소진된 마지막 시도도 회수하고 deadline을 영속한다. 주기 heartbeat·시작 시 소유권 검사·transaction 내부 fencing을 적용했다. 보컬 profile와 성공 알림은 같은 transaction에서 확정한다.
- 환불은 terminal 결정 이후 row lock과 ledger 변경을 같은 transaction에 둔다. 소스 삭제는 실패 transaction 안에서 예약한다. 접수 불명 또는 환불 대기 믹싱은 확인 완료 전 기록 삭제를 409로 보류한다(신규 작업 슬롯은 해제).
- Modal 조건부 metadata claim이 동시 spawn을 막는다. 보컬 동기 결과를 Dict에 캐시하면 음성 보관 정책이 변하므로 metadata claim만 사용한다. 동일 recording 재전송은 재연산 없이 실패로 수렴/분석 환불하고 새 사용자 요청은 새 recording identity를 사용한다. 기존 정상 성공 경로는 유지한다.
- 알려진 외부 identity는 stale 응답 후에도 별도 reconciliation에 남기고 terminal 이후 정리를 시도한다. 정리 실패는 운영자가 jobs:reconcile CLI의 dry-run/apply와 근거로 처리한다. 실제 Modal은 배포하지 않았다.
- 격리 큐 회귀 12 tests, Python 실제 song 제출 route+두 claim 계약 2 tests, 세 service compile, typecheck 통과. 테스트가 공유 catalog를 오염시키는 문제를 전용 recovery source fixture로 수정했다. SoulX 전체 HTTP 런타임과 vocal claim end-to-end는 로컬 계약 테스트의 잔여 확인 범위다.

## D008: API·큐 admission과 명시적 관리자 재시도

- 사용자/비용별 bounded token bucket, upload slot, 모든 제품 API의 조립 wrapper를 추가했다. 공개 health는 인증 요구를 추가하지 않고 익명 limiter를 적용했다. 인증은 같은 Request에서만 memoize하여 중복 session 조회를 피한다.
- 보컬 2개 접수 API는 key/기존 job/잔액/활성 작업을 body 전에 검사한다. multipart와 JSON에 읽기 시간·크기 한도를 두고 취소 시 slot을 반환한다.
- 큐 advisory lock 아래 count/idempotency/생성/차감을 처리한다. mixing/vocal SERIALIZABLE conflict retry를 유지하고 관리자 READ COMMITTED transaction도 같은 lock을 사용한다. enum status index를 활용할 수 있는 조건을 사용한다.
- 곡 분석의 명시적 retry에서 이전 외부 키 재사용을 발견해 externalRequestId additive migration을 추가했다. DB job identity는 유지하고 retry 요청만 외부 identity/deadline을 갱신한다. 동시 관리자 retry 2개는 하나만 성공한다.
- admission/multipart 7 tests, 추가 DB 3 tests, 기존 큐/관리자 회귀 13 tests와 typecheck 통과. 카탈로그 revision을 바꾸는 테스트는 동시 파일 실행 시 정상 stale 방어에 걸려 기존 suite와 같이 순차 검증했다.


## D009: 통합 검증과 운영 인계

- 실제 프로필 DELETE와 enqueueMixingJob을 격리 DB에서 경쟁시켰다. 삭제가 먼저 확정되면 job/차감 없이 독립 삭제 intent 2개가 남고, 믹싱이 먼저 확정되면 DELETE 409와 참조 파일 2개 보존을 확인했다. route의 schema import는 runtime-neutral public API로 정리했다.
- 기존 worker가 profile 저장 후 성공 상태 기록 전에 종료했던 데이터를 고려해, 살아 있는 새 lease 소유자가 이미 저장된 결과만 복구할 수 있게 했다. 처리 예산이 소진되어도 재연산/재업로드하지 않으며 terminal job은 재활성화하지 않는다.
- 외부 reconciliation은 active job을 LIMIT 전에 제외한다. 오래된 active record 20개가 있어도 뒤 terminal 기록이 처리되는 DB 회귀를 추가했다. 실제 분석 접수 URL의 limiter 분류와 오디오 client abort/실패 body 정리도 보완했다.
- Python 검증은 세 서비스의 실제 route/claim 함수를 AST로 추출하여 실행한다. Modal/model runtime과 I/O를 fake로 대체하며 SoulX·곡 분석의 동시 20개 요청/입력 충돌/spawn 응답 유실, 보컬의 동시 claim/입력 충돌을 확인했다. 4개 통과. 실제 provider 런타임/원격 배포 검증으로 간주하지 않는다.
- 기존 23 migration을 별도 schema에 적용하고 가입 원장·잔액 5·PROCESSING 분석 fixture를 넣은 뒤 신규 2 migration을 적용했다. 원장 JSON 동일, 잔액/상태 불변, 신규 기본값 및 기존 partial unique index 존속을 확인하고 검증 transaction을 rollback했다. 운영 DB는 접근하지 않았다.
- README에 지급 복구 CLI, migration→Modal→웹/worker 적용 순서, 구 worker drain, rollback 시 새 intent 처리 제약, 제한 정책과 부하 시나리오를 명시했다.
- k6 실행기가 없어 실측 부하는 수행하지 않았다. localhost opt-in, 10/50/100 RPS 및 100 VU로 총 500개 요청 시나리오를 작성했다. Node mock runtime으로 네 설정/요청과 원격 주소 거부를 확인했다. API별 200/429/503 비율과 latency를 함께 해석해야 하며 임계값 통과만으로 GPU/전체 서비스 처리량을 보장하지 않는다.
- pnpm run check는 baseline b333d64에서도 동일한, 변경하지 않은 6개 파일의 Biome 포맷/정렬 오류로 실패한다. 대상: src/_pages/account/index.ts, src/_pages/recommendation-detail/index.ts, src/entities/mixing-job/api/client.ts, src/entities/recommendation/api/client.ts, src/shared/ui/skeleton/skeletons.stories.tsx, steiger.config.ts. 각 파일 원문 동일성과 baseline stdin Biome exit 1을 확인했다. Feature 변경 파일 Biome, lint, typecheck 및 architecture 검사는 통과했다. 관련 없는 UI 포맷 변경은 이 Feature에 포함하지 않았다.
- 정상 동작은 기존 회귀 assertion으로 검증한다. 과부하 429/503, 접수 불명 작업 삭제 409, deadline 실패/환불 정책은 승인한 의도적 변경이다. 이번 5개 구현이 전체 감사의 미포함 보안/백업 항목까지 해결했다는 의미는 아니다.

- 최종 pnpm test exit 0: production build, 기존 API/권한/티켓/큐 회귀, Storybook 176, readiness 13 + Python 4 통과. spec AC01–18은 이 로컬 검증 범위와 명시된 provider 한계 안에서 확인했다. 구현 승인과 local merge 승인은 아직 받지 않았다.


## D010: 사용자 요청으로 README 변경 제거

- 사용자가 이번 Feature의 README 수정 제거를 요청했다. 루트 README.md를 Feature 분기 기준 내용으로 복원했다.
- plan의 onboarding 변경 판정과 tasks의 README 문서 대상을 정정했다. D006/D009의 README 작성 기록은 당시 이력이며 최종 결과에서는 철회됐다.
- 구현 코드와 테스트, migration, 부하 스크립트는 변경하지 않았다. README가 기준 브랜치와 동일한지 및 문서 diff를 검증하며, 문서만 변경되어 전체 테스트는 반복하지 않는다.


## D011: 사용자가 승인한 핵심 브라우저 회귀 확장

- 사용자가 제안한 핵심 E2E 추가를 진행하도록 요청했으며 이전 코드에서 먼저 작성한 동일 테스트를 변경 코드에 실행하는 방식을 질문했다. 정상 계약의 차등 회귀로 적용하고 100% 전체 동등성 주장과 구분한다.
- 기존 Feature 안의 추가 검증 태스크로 수행한다. 구현 승인/병합 승인은 보류 상태를 유지한다. 로그인은 Google 외부 동의/콜백이 아닌 실제 서명 세션·로그아웃·권한 경계부터 검증한다.


## D012: 동일 브라우저 suite의 변경 전후 검증

- 실제 Chromium, Next production build/server, Vocal/Mixing worker, 임시 PostgreSQL 및 로컬 HTTP provider로 E2E를 추가했다. 기존 playwright 의존성을 재사용했다. 앱 API는 mock하지 않으며 Google 외부 동의/콜백 대신 DB 서명 session fixture를 준비하고 실제 session 검증·로그아웃·권한을 확인한다.
- 정상 연속 흐름: 비로그인 401/로그인 화면 → 업로드·확인창·분석 job → 프로필·차감 1장 → 이름 변경·새로고침 → 타인 조회/수정/삭제 404 → 추천·믹싱 접수 → 실제 FFmpeg 결과 저장 → Range 206/100 bytes 및 브라우저 재생 → 라이브러리 유지 → 믹싱/프로필 삭제 → 로그아웃 후 401을 검증했다.
- 실패 흐름: 로컬 provider의 명시적 분석 거부 → 오류 안내 → 기존 잔액으로 환불 → 새로고침에도 잔액 불변 → 새 업로드 성공·차감 1장을 검증했다. 장애/과부하의 의도적 새 정책은 기존 코드와 같아야 하는 조건에 포함하지 않는다.
- baseline b333d64b7f769c093ffde424ea406f9e89b315ef는 git archive source snapshot에서 자기 migration 23개/lockfile로 실행했다. candidate 7a415cbfe3d1ae6014b114db6fd826621849d051의 앱 코드에 같은 suite를 실행했고 신규 migration 2개도 적용했다. 두 실행 사이 test/provider/seed/config/HTTP guard 소스 해시를 재검사한다.
- 최종 `pnpm run test:e2e:compare b333d64` exit 0: baseline 2/2 (20.5초), candidate 2/2 (21.5초), skipped/flaky 0. 공통 suite SHA-256은 4fa6bf23a322c929f66b18a804fa182926366e2c4a5f7f2a856458af6593093d다. 실행 시간은 성능 벤치마크가 아니다. 선정한 assertion에서 차이를 관찰하지 않았다는 의미이며 전체 시스템의 100% 동등성 증명은 아니다.
- E2E 작성 중 provider의 필수 sourceRanges/원본 MIME/analyzerVersion 누락과 SSR hydration 이전 파일 이벤트, 실제 믹싱 접수 후 상세 이동을 반영하지 않은 테스트 기대값을 수정했다. baseline 앱 코드를 테스트 통과용으로 수정하지 않았고, E2E 추가 과정에서 production 코드는 변경하지 않았다.
- `test:e2e`, `test:e2e:compare`와 PR용 Browser E2E workflow를 추가했다. 실행 안내는 tests/e2e/TESTING.md이며 루트 README는 변경하지 않았다. 실제 GitHub CI 실행과 required check 설정은 미수행이다.
- artifacts/e2e의 JSON/로그/실패 trace는 무시 대상이다. 종료/실패 시 이번 runner가 만든 worker/웹·DB 컨테이너 및 임시 baseline snapshot을 정리한다. 최종 실행 후 E2E 컨테이너가 남지 않음을 확인했다.

- E2E 추가 후 전체 pnpm test도 exit 0으로 재통과했다(build/기존 회귀/Storybook 176/readiness 13/Python 4). lint·tsc와 새 E2E 파일 Biome도 통과했다. 기존 전역 Biome 6개 오류는 D009와 동일한 별도 잔여 항목이다.

## D013: 사용자 요청 E2E 보강

- 사용자의 “ㅇㅇ 보강해봐”는 제안한 다섯 경계 테스트 추가 요청이다. 완료한 T07은 유지하고 T08로 추적한다. 구현 수락 또는 병합 승인으로 간주하지 않는다. README는 유지한다.

- T08은 production 소스를 바꾸지 않고 E2E suite/fixture만 보강한다. 최초 baseline 실행에서 5개 통과 후 관리자 select의 exact label 탐색이 실패했다. 기존 label은 option 텍스트를 포함하므로 명시적인 form field name으로 선택자를 고쳤다. 앱 권한/티켓 동작 실패로 분류하지 않는다. 최종 비교 실행 결과는 아래에 별도 기록한다.

- 비교 2차 실행: baseline 6/6, candidate 5/6. 분석 1회+믹싱 1회+재전송 2회가 동일 사용자 submission bucket(분당 6, burst 3)을 공유하여 candidate의 마지막 재전송이 RATE_LIMITED/429였다. 이는 T05의 승인된 제한 정책이며 기존 normal 성공 응답 회귀가 아니다. 테스트에서 429 코드와 Retry-After(1–10초)를 엄격히 확인하고 한 번 재시도해 같은 job/차감 불변을 검증한다. 해당 실행은 JSON annotation으로 구분한다. 완료된 믹싱의 소유자 오디오 200 대비 타인 상세/오디오/삭제 404도 추가해 진행 상태 때문의 404와 구분한다.

- 최종 비교 exit 0: baseline b333d64b7f769c093ffde424ea406f9e89b315ef 6/6 (54.1초), candidate 앱 코드 78cf6e6e89af32c09195e9dae24179dad7e89b6d 6/6 (60.5초). suite SHA-256 ce73cbae9126a8629b09406a544bfb47b50aa872975d84525ad68e3d736a0534, skipped/flaky/unexpected 0. candidate는 429/Retry-After=6초 annotation을 남겼고 재전송 성공·외부 변환 한 번·잔액 4를 확인했다. 이는 정책 차이를 포함한 계약 검증이며 모든 HTTP 응답 동일성을 주장하지 않는다.
- production build/typecheck는 양쪽 runner에서 통과했고 pnpm run lint, 별도 tsc --noEmit, diff check도 통과했다. 제품 소스 변경이 없어 이전 T07 전체 pnpm test 통과를 재사용하며 이번에 전체 단위 suite를 재실행한 것으로 기록하지 않는다. 루트 README는 main과 동일하다. 실제 Google/원격 GPU·스토리지/다중 브라우저·모바일, 관리자 카탈로그 전체 동작은 미검증이다.

- 최종 commit 검사에서 Biome check --write가 만든 method chain 줄바꿈을 재검사 formatter가 다르게 요구했다. 커밋에 필요한 공백 포맷만 정리했다. 동작 변경은 없으며 전체 비교 당시 suite hash는 위 값을 그대로 보존한다. T09에서 최종 포맷 검사를 별도로 닫는다.

- T09 최종 pnpm exec biome check tests/e2e exit 0, 커밋 hook 검사도 통과했다. 기존 경고 2개·info 1개는 남으며 formatter 오류는 해소됐다. 최종 비교 이후 변경은 method chain 공백뿐이라 브라우저 비교를 반복하지 않는다.

## D014: 사용자 요청 리뷰 지적 수정

- reviewer /root/e2e_review가 feb113d에 대해 changes_requested(P2 2개)를 반환했다. provider presign의 선행 WAV 생성 및 관리자 검색 결과 assertion 누락을 확인했으며 사용자가 “ㅇㅇ 수정”으로 보완을 요청했다. 정식 Feature review gate나 구현/병합 승인으로 기록하지 않는다.
- 완료 태스크는 유지하고 T10으로 테스트 공백만 보완한다. 기존 E2E 6/6은 해당 공백까지 검증했다는 의미가 아니며 개선한 suite로 다시 비교한다.

- fixture의 예약 Set과 실제 파일 Map을 분리했다. 일회성 HTTP 검증에서 미업로드 confirm 409/GET 404, 잘못된 ID PUT 404, 빈 PUT 400, 정상 업로드 원문·MIME 반환, 삭제 후 confirm/GET 404를 확인했다. 외부 provider의 미지원 기능을 가정하지 않고 기존 presign→PUT→confirm의 테스트 계약만 강제한다.
- 관리자 E2E는 검색 전 owner 사용자 존재, 실제 검색 입력·제출 후 표의 행 1개/empty 표시/owner 제외, API total=1 및 정확한 사용자 ID를 검사한다. lint·tsc와 변경 파일 Biome는 통과했다.

- 수정 후 pnpm run test:e2e:compare b333d64 exit 0: baseline b333d64 6/6 (54.5초), candidate 앱 코드 91cafca 6/6 (58.9초), skipped/flaky/unexpected 0. 동일 suite hash a1854fc256ec4e8606ea0e563111e32711f0809877492da8c049d0d5d24825ee. 양쪽 production build 포함. 제품 코드 변경 없이 tests/e2e 두 파일과 검증 문서만 수정했으며 README는 main과 동일하다. 기존 전체 pnpm test는 제품 변경이 없어 반복하지 않았다.
