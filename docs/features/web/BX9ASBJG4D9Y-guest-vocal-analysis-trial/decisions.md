# Decisions Log

## D001: 단일 웹 프로세스의 메모리 일일 총량 (2026-10-29)

- **Context**: 로그인 부담을 줄이는 최초 1회 분석 체험이 필요하다. 사용자는 서버가 단일 인스턴스이며 재시작으로 하루 제한이 초기화되는 것을 허용한다고 명시했다.
- **Constraints**: 전체 체험 한도와 방문자별 최초 1회는 별개다. 웹과 worker는 독립 프로세스이며 작업 자체의 내구성은 유지한다.
- **Options**: DB의 영속 일일 집계, 별도 Redis 카운터, 웹 프로세스 메모리 예약 카운터.
- **Decision**: 웹 프로세스 메모리에서 Asia/Seoul 날짜별 기본 10건을 관리한다. 환경변수로 한도를 조정하고 0으로 신규 체험을 중지한다. 개인 성공 사용 기록과 분석 job은 영속 상태를 사용한다.
- **Rationale**: 사용자 운영 전제에 맞추어 별도 인프라와 일일 집계 스키마를 도입하지 않는다. 개인 체험까지 재시작으로 복구되는 의미로 확대 해석하지 않는다.
- **Trace**:
  - 요구사항 작성: 사용자가 비로그인 사용자당 최초 1회 분석을 요청하고 재시작 시 전체 제한 초기화를 수용했다.
  - 한도 결정: 사용자 질문 응답 `하루 10건`을 반영했다.
  - 접수 기준: 영속 job 생성 전 실패만 예약을 반환한다. 접수 이후 실패는 개인 기회만 복구하고 일일 전체 수량을 유지한다.
  - 시간 경계: 이전 날짜의 예약 해제가 새 날짜의 사용량을 감소시키지 않도록 요구사항에 포함했다.
- **Evidence**:
  - **Commit**: `9dbddd5` — Feature 등록 seed.
  - **Test/Log**: 요구사항 단계이며 구현 검증은 미실행. 사용자 요청과 한도 선택은 이 대화에 기록되어 있다.
- **Consequences**: 다중 웹 프로세스 전환 시 별도 집계 설계가 필요하며 재시작 전후 합산 10건은 보장하지 않는다. worker retry는 별도 job 한도 내에서 실행되므로 10건이 외부 호출 10회 또는 고정 금액을 의미하지 않는다.

## D002: 익명 기능을 명시적으로 제한하고 본인 결과만 이전 (2026-10-29)

- **Context**: 현재 공통 API admission과 화면은 세션 존재를 로그인 권한으로 판단하며, 계정 생성 훅은 가입 티켓을 지급한다. 분석 job과 미디어는 User 소유를 전제로 한다.
- **Constraints**: 익명 세션 도입이 기존 회원 기능과 가입 혜택을 개방하면 안 된다. 기존 회원 계정으로도 결과를 저장할 수 있어야 한다.
- **Options**: 별도 guest 도메인과 job pipeline, 기존 사용자 소유권 체계의 제한된 익명 세션.
- **Decision**: 요구사항은 익명 소유권과 회원 권한을 구분한다. 초기 체험은 분석·결과 열람만 제공하고 추천과 믹싱은 정식 로그인 이후 제공한다. 진행 중 job은 완료 후에만 이전하며 이전 실패 시 원본을 보존한다. 구체적인 인증 adapter와 migration은 Spec 승인 후 Plan에서 확정한다.
- **Rationale**: 현재 durable analysis와 결과 UI를 재사용하면서 권한 상승·가입 이용권 오지급·계정 이전 중 자료 유실을 방지한다.
- **Trace**:
  - 현재 코드 근거: `src/_app/api-routes/admission.ts`, `src/features/authentication/api/auth.ts`, `src/features/analyze-vocal-profile/api/analysis-queue.ts`, `prisma/schema.prisma`.
  - 익명 자료는 terminal 이후 24시간만 제공하고 계정 이전 이후에는 기존 회원 보관 정책을 적용한다. 쿠키 삭제·기기 변경 우회는 수용한다.
  - 향후 Curated Documentation Impact: PRD·시스템 아키텍처와 약관·개인정보 안내를 실제 최종 동작에 맞춘다. 기존 architecture의 추천 snapshot 설명은 현재 코드·PRD-FR-057과 불일치하므로 추천 경계를 수정하는 task에서 함께 정정할 대상으로 Plan에 연결한다.
- **Evidence**:
  - **Commit**: `9dbddd5` — Feature 등록 seed.
  - **Test/Log**: Spec 승인 대기. 테스트와 구현은 아직 수행하지 않았다.

## 진행 상태

- Feature ID: BX9ASBJG4D9Y
- 현재 단계: 구현·검증 완료, 구현 승인 checkpoint 대기. 2026-10-29 사용자 `진행해줘`를 명세 승인으로 기록했다.
- 구현 코드 변경: 체험 기반, queue/worker/이전/만료, 입력/결과/저장 UI를 구현하고 task별 checkpoint로 커밋했다.

## 문서 검증 기록

- `git diff --check`: PASS (2026-10-29). 구현 코드는 변경하지 않았다.
- `npx lee-spec-kit workflow-stage BX9ASBJG4D9Y --json`: `spec_approve`, `approvalRequired: true`, `implementationAllowed: false`. 기본 옵션 A(명세 승인 후 Plan 진행), B(명세 수정).
- `npx lee-spec-kit docs-audit --json --enforce`: BLOCKED. 기존 디자인 문서의 kind 누락과 공용 문서의 Feature 참조 등 13건이다. 기준 main에서 `docs-audit --json`을 실행해 같은 경로·참조·위반 코드가 존재함을 확인했다. 이번 명세에서 새 위반을 추가하지 않았다.
- `npx lee-spec-kit workflow-audit --json`: `needs_sync`, `FEATURE_REFERENCE_IN_SHARED_DOC`. 기존 공용 문서 위반 때문에 `expectedWorkflowSyncMarker`를 반환하지 않았으므로 marker를 임의로 만들지 않았다. 구현 후 문서 동기화 시 재검사한다.
- 이 검증 결과는 기존 문서 정책 부채이며 Spec 승인 checkpoint와 구분한다. README 수정은 요청받지 않았고 변경하지 않았다. 기준 문서 정리 범위와 필요한 task 연결은 승인 후 Plan에서 명시한다.

## D003: 정식 인증과 분리한 체험 cookie 및 명시적 저장 (2026-10-29)

- **Context**: 기존 회원도 비로그인 체험 결과를 자신의 계정에 저장해야 한다. 기존 인증 helper의 세션 존재 여부가 회원 기능의 경계로 쓰인다.
- **Decision**: Better Auth anonymous plugin 대신 별도 난수 cookie와 guest 소유권 row를 사용한다. 기존 정식 회원 helper를 유지하고 분석 actor helper만 허용 경로에서 사용한다. Google callback 후 명시적 claim POST로 같은 계정에 한 번만 저장한다.
- **Rationale**: 익명 세션이 기존 회원 권한을 통과하는 회귀와 자동 계정 삭제 cascade를 피하고, 로그인 취소·저장 실패에도 결과를 보존한다. 사용자가 확인한 결과 UI와 기존 회원 저장 의미는 동일하다.
- **Trace**: `session.ts`, `admission.ts`, 가입 지급 훅, User/MediaAsset/job의 필수 소유자 관계를 확인했다. Next.js 설치 문서의 비동기 cookie·Route Handler 규칙을 확인했다.
- **Evidence**: Feature 등록 commit `9dbddd5`; 현재 Plan의 아키텍처·Verification Contract.

## 구현 기록: 체험 기반

- 첫 task에서 guest schema migration·독립 token cookie·분석 actor·시작 API·단일 프로세스 quota를 구현했다.
- quota 3건과 DB/API 2건 검증 및 tsc를 통과했다. 회원 API는 기존 인증 helper를 유지하여 체험 cookie로 접근할 수 없다.
- localhost DB에 Prisma migration을 적용했다. 기존 User에 기본 false 컬럼을 추가하고 새 테이블만 생성한다.
- PRD의 기존 Feature 번호 참조를 durable 시각 요구사항으로 정규화했다. 기존 디자인 문서 감사 위반은 마지막 task에서 정리한다.

## 구현 기록: 분석·저장·만료

- queue 접수는 guest 자격을 row lock 아래 확인하고 ticketCost=0으로 처리한다. worker terminal transaction은 개인 소비 이력·24시간 만료를 함께 기록한다.
- 기존 회원 저장은 trial lock 아래 프로필 번호 배정·job·미디어 소유권을 이전하고 같은 요청은 같은 결과를 반환한다. 기존 회원 wallet·ledger는 변경하지 않는다.
- 공개 policy만 비인증 GET을 허용하고 결과·오디오는 소유자 및 만료를 확인한다. 만료 정리는 media deletion intent를 예약하고 소비 기록을 남긴다.
- 마지막 1개 자리의 multipart 접수·잘못된 업로드의 예약 반환·한도 소진 후 동일 job 재전송을 실제 route로 검증했다. quota 3 + guest 통합 7, 기존 회원 분석 queue 8, FSD boundary 4 및 tsc 통과.
- Steiger가 App route/worker 소비자를 slice reference로 세지 않아 기존 예외 패턴에 guest-analysis만 추가했다.

## 구현 기록: 체험 UI

- 랜딩 CTA에서 공개 /profile로 진입하고 체험 상태를 확인한 뒤 녹음·업로드를 제공한다. 무료 1회·24시간·음성 사용 권한과 약관/개인정보 안내를 표시한다.
- guest 입력은 ticket 확인 모달을 열지 않는다. used/full은 녹음·업로드를 숨기고 기존 결과 또는 로그인으로 연결한다. 서버 오류는 정책을 다시 확인할 수 있다.
- 결과의 기존 차트·오디오는 그대로 제공하고 하단에 계정 저장 CTA를 배치한다. 로그인 후 /profile/save-trial의 명시적 claim POST가 성공하면 같은 profile ID로 복귀한다. 실패는 재시도 경로를 유지한다.
- 로그인 직후 아직 저장하지 않은 체험 결과는 회원 세션과 본인 체험 cookie로 열람·삭제할 수 있다. 명시적인 resource actor helper로만 이 예외를 허용한다. 회원/guest policy query key를 분리하여 로그인 전환 시 기존 이용권 policy가 섞이지 않는다.
- 약관·개인정보 안내를 실제 체험 cookie·보관·저장 동작에 맞춰 갱신했다.
- focused Storybook 25개·guest quota/UI/API 14개·인증 navigation 8개·lint·tsc·FSD 검사가 통과했다. Google 제공자에 대한 실제 OAuth 로그인은 자동 실행하지 않았다.

## 공용 문서 감사 정리

- Plan과 task 04에 지정한 디자인 문서는 시각 규칙을 바꾸지 않고 과거 Feature 추적 문구·역링크와 kind metadata만 정규화했다.
- `docs/designs/README.md:9`에는 기존 Feature 번호 참조가 남아 있다. 사용자에게 README 수정 요청을 받지 않아 저장소 보호 정책에 따라 미수정한다. 이 영역의 onboarding entrypoint 영향은 NONE이며 해당 불일치가 해결됐다고 주장하지 않는다. 별도 README 수정 승인이나 후속 Feature 생성을 완료 조건으로 추가하지 않는다.
- 시스템 아키텍처의 추천 snapshot 저장 설명은 기존 코드와 PRD-FR-057에 맞게 요청 시 계산 계약으로 정정했다.

## 최종 검증과 알려진 한계

- 최초 `pnpm test`는 build와 분석·인증 등 선행 suite를 통과한 후 기존 DB 환경변수 미로딩 문제로 `tests/leemage-client.test.ts` 시작 시 실패했다. 전체 실패 출력은 `/tmp/copy-singer-guest-full-test.log`에 보존했다.
- 같은 `.env.local`을 dotenv로 부모 프로세스에 로드한 뒤 `pnpm test`를 실행하여 전체 suite가 exit 0으로 완료됐다. 별도 제품 변경 없이 환경을 맞춘 재검사이며 최초 실패를 통과로 덮어쓰지 않는다.
- 전체 검사는 production build, 기존 unit/DB/API/worker/오디오/권한 suite, Storybook 182개, guest quota/UI 6개 + DB/API 8개, readiness 13개 + Python 4개를 포함한다. 기존 Storybook 파일 2개는 suite 기본 skip 상태이며 새로 skip하지 않았다.
- 최종 `pnpm run lint`, `pnpm exec tsc --noEmit`, `git diff --check`, `workflow-audit`, `feature-audit --enforce` 통과.
- Google OAuth 제공자의 실제 로그인·취소는 자동 실행하지 않았다. 기존 회원 세션 fixture·신규 회원 가입 지급 fixture로 저장/중복/번호/원장 보존과 로그인 직후 임시 오디오 접근을 검증했다.
- 임시 자료는 만료 즉시 조회를 거부하고 외부 bytes 삭제는 기존 durable cleanup의 재시도 정책을 따른다. cookie 삭제·다른 기기 우회와 웹 재시작에 따른 총량 초기화는 승인된 운영 제약이다.
- 문서 감사의 남은 1건은 보호된 `docs/designs/README.md:9`의 기존 Feature 참조다. 수정 요청이 없어 보류하며, workflow-audit는 보호 README 정책에 따라 정상 통과한다.
- 원격 배포·push·merge는 수행하지 않았다. 구현 승인을 받은 뒤 정확한 local verify / 별도 merge 승인 / local merge / cleanup 절차를 이어간다.

## D004: 체험 범위를 추천과 곡별 적합도까지 확장 (2026-10-29)

- **Context**: 사용자는 분석 후 추천까지 제공해도 괜찮은지 문의하고, 현재 추천이 저장 데이터 비교 계산이며 외부 AI/GPU 호출을 만들지 않는다는 설명과 로그인 복귀 흐름을 확인한 뒤 `진행해줘`로 승인했다.
- **Decision**: 같은 Feature에 새 task로 추천 목록·검색/정렬/필터·곡별 상세를 개방한다. 본인 guest cookie와 24시간 만료 검증은 유지하고 AI 믹싱은 로그인·저장 후 선택곡 상세에서 기존 비용 확인을 거쳐 실행한다.
- **Rationale**: 기존 추천 계산과 UI를 재사용하여 제품의 실제 효용을 체험하게 하며, 비싼 외부 합성과 이용권 권한은 기존 회원 경계를 유지한다.
- **Trace**: recommendation-service.ts는 DB와 로컬 scoring으로 계산하며 신규 job·외부 fetch를 만들지 않는다. 기존 DONE task 01~04는 다시 쓰지 않고 후속 task 05로 실행한다. 이번 요청은 최종 구현 승인이나 병합 승인으로 기록하지 않는다.
- **Evidence**: 기존 checkpoint `5acf6ee`, `2002c10`; 사용자 제안 승인 대화와 갱신한 Spec FR-6 / Plan 후속 범위.

## 후속 구현 기록: 추천 체험

- task 05에서 추천 GET/POST·추천 목록·곡 상세에 resource actor를 연결했다. getRecommendationResult는 guest 소유 프로필에 대해 만료/체험 연결을 확인하여 페이지 최초 렌더와 API 재조회 모두 같은 권한을 적용한다.
- 체험 추천의 전체 목록·검색·정렬·키/이유와 곡 상세를 제공한다. 추천 조회는 카탈로그/프로필 계산만 수행하고 외부 AI·분석 접수·티켓 원장·믹싱 job을 생성하지 않는다. 일일 신규 분석을 0으로 중지한 상태에서도 기존 체험의 추천이 열리는 것을 검증했다.
- guest action은 회원 mutation 대신 로그인·저장 링크다. callback은 선택 곡을 보존하고 저장 이후 저장한 profile의 추천 목록/UUID 곡 상세만 허용한다. 외부·다른 profile·재귀·encoded 경로와 제어 문자는 fallback 처리한다. 저장 retry도 같은 next를 유지하며 자동 믹싱하지 않는다.
- 추천 cache는 guest/member audience를 분리하고 저장 완료 시 이전 추천 cache를 제거한다. 기존 회원의 ticket 확인/믹싱 실행 계약은 유지한다. 믹싱 reference가 없는 체험에는 제한 사유를 표시한다.
- focused Storybook 28개가 통과했으며 저장 성공 복귀·실패 후 retry·잘못된 외부 next와 guest 믹싱 클릭의 무작업 동작을 포함한다. guest quota/복귀/UI 9개 + DB/API 9개가 통과했다.
- 첫 전체 build에서 곡 상세 파일의 use-client 선언이 import 뒤로 이동한 오류를 발견해 수정했다. 전체 실패 출력은 `/tmp/copy-singer-guest-recommendation-full-test.log`에 보존했다. 수정 후 lint·tsc·architecture 4개는 통과했고 전체 suite를 재실행 중이다.

- 기존 `recommendation-song-detail`의 회원 세션 변수명을 고정한 소스 단언을 새 resource actor 계약으로 갱신했다. 최초 재검사의 전체 출력은 `/tmp/copy-singer-guest-recommendation-full-retry.log`에 보존했고, 해당 suite 6개가 통과한 뒤 전체 suite를 다시 실행했다. 실제 제품 권한/만료는 guest API 통합 검사로 보호한다.

## 추천 확장 검증 완료

- `.env.local`을 dotenv로 로드한 `pnpm test` 전체가 exit 0으로 완료됐다. production build, 모든 기존 unit/DB/API/권한/worker suite, Storybook 189개, guest 18개, readiness 13개 + Python 4개가 통과했다. 전체 출력은 `/tmp/copy-singer-guest-recommendation-verified.log`에 보존했다. 기존 skipped Storybook 2개는 유지했다.
- 최종 runtime 수정 이후 lint·tsc·architecture·git diff --check가 통과했다. 추가 source assertion 수정은 권한 계약에 맞춘 테스트 갱신이며 제품 변경이 아니다.
- 본인 체험 추천과 곡 상세, 무쿠키/타인/만료 차단, 일일 마감 중 기존 추천 열람, 외부 호출 없음, job/티켓 불변, 선택곡 callback·안전한 복귀·retry·guest action 무작업을 검증했다. 실제 Google OAuth와 유료 Modal 믹싱은 실행하지 않았다.
- user scope 승인과 별개로 확장된 구현 결과의 최종 승인 및 local merge 승인은 아직 대기한다. main 병합·원격 push·배포는 수행하지 않았다.

## D005: L4 공급 부족에 A10만 대체 허용 (2026-10-29)

- **Context**: Modal L4 요청이 0 GPU runner·Pending·Waiting for a container 상태에 머물렀다. Modal Community의 담당자 답변에서 L4 공급 부족과 A10 대체 성공을 확인했고 사용자는 `대체로 A10만 추가할 수 있을까?`라고 요청했다.
- **Decision**: 기존 Feature의 task 06으로 합성 GPU에 기본 L4 우선·A10 대체만 추가한다. L4 이외의 SOULX_GPU 단일 지정은 보존한다. T4·L40S나 다른 GPU를 자동 추가하지 않는다.
- **Scope/authority**: 이 요청은 후속 수정 승인이다. 이전 체험 구현의 최종 승인·main 병합·원격 배포 승인으로 해석하지 않는다. 실제 배포는 검증 결과와 변경 범위를 공유한 뒤 별도 승인을 받는다.
- **Curated docs**: PRD-NFR-GPU-FALLBACK과 system-architecture.md에 기본 가용성 정책을 반영한다. services/soulx-singer-svc/README.md의 기본 L4 안내는 대체 설정 설명이 없어지지만 사용자 README 수정 요청이 없어 보류한다. `.env.example`은 새 변수가 없어 변경하지 않는다.
- **Verification**: 변경은 Modal 설정 경계로 한정한다. 새 영구 테스트 없이 Python compile·기존 unit/제출 계약·실제 SDK의 로컬 함수 정의를 검증하고 실제 GPU 합성 호출은 하지 않는다. 실제 A10 추론 품질·완료 시간은 배포 후 별도 관찰 대상이다.

### A10 대체 구현 검증

- `GPU_OPTIONS`를 기본 및 명시 L4에서만 `['L4', 'A10']`으로 만들고 실제 SoulXModel decorator의 gpu에 전달했다. 기존 SOULX_GPU override와 health gpu 문자열, max_containers·접수·변환 본문은 유지했다.
- Python compile, 기존 mix-balance unittest 2개, modal-submission-contract 4개가 통과했다. 원격 함수 호출이나 이미지 build는 하지 않았다.
- 고정 SDK 1.5.3의 실제 App.cls 및 함수 spec에서 default/L4는 순서 있는 두 후보, 명시 A10/T4는 기존 단일 문자열이고 max_containers 기본 1·명시 3이 유지됨을 확인했다. SDK가 단일 GPU를 문자열로 보존하므로 초기 임시 검사에서 배열로 기대한 단언을 바로잡은 뒤 4개 case가 통과했다. 새 영구 테스트는 추가하지 않았다.
- 현재 배포 v6의 commit 2b92e0e와 수정 전 HEAD 사이에서 services/soulx-singer-svc의 차이는 없었다. 따라서 이 서비스의 배포 범위는 GPU 선택을 바꾸는 2개 hunk뿐이다. 기존 endpoint·workspace·모델·job volume을 유지하는 재배포를 준비했으며 실제 원격 배포는 아직 하지 않았다.
- 배포 v6에 사용된 전역 CLI의 SDK 1.2.4에서도 실제 App.cls가 default/L4의 두 후보와 A10/T4의 기존 단일 지정을 수용하고 max_containers=1을 유지함을 확인했다. SDK 업그레이드 없이 배포할 수 있다.
- 준비한 배포 명령은 services/soulx-singer-svc에서 `MODAL_PROFILE=dbstndla1212 SOULX_GPU=L4 SOULX_MAX_CONTAINERS=1 SOULX_SCALEDOWN_WINDOW=60 modal deploy modal_app.py`다. 실제 GPU 추론은 실행하지 않았으므로 A10의 처리 시간·품질·비용은 실측값으로 보고하지 않는다.

### 승인된 Modal 재배포와 반영 확인 (2026-10-29)

- 사용자는 `우선 modal 재배포해봐. 그리고 내가 직접 테스트해볼게`라고 지시했다. 이 승인은 이번 Modal 배포에 한정하며 Feature 전체의 구현 최종 승인·local merge 승인으로 기록하지 않는다.
- 준비한 명령으로 dbstndla1212 workspace의 soulx-singer-svc를 재배포했다. CLI exit 0, 배포 이력 v7, 2026-10-29 13:21:54 KST, client 1.2.4, commit 4a9536e를 확인했다. 기존 endpoint `https://dbstndla1212--soulx-singer-svc-web.modal.run`을 유지했다.
- 배포 후 실제 SoulXModel의 Details에서 `GPUs L4 or A10G`, `Max containers 1`, `Scaledown window 60 secs`를 확인했다. 새 설정이 실제 serving function에 적용됐다.
- 기존 endpoint의 GET /health는 HTTP 200, status ok를 반환했다. 기존 gpu 필드의 L4는 우선 설정이며 GPU 실행 상태나 실제 할당 기종을 뜻하지 않는다.
- 배포 전 GPU backlog 0·runner 0을 확인했고, 배포 검증 중 새 합성 요청은 생성하지 않았다. 실제 A10 합성·완료·오디오 품질 검증은 사용자 수동 테스트 대기다. Next.js 배포·Git push·main 통합은 수행하지 않았다.


## D006: 관리자 메뉴·조회·티켓 조정을 작업 단위로 분리 (2026-10-29)

- **Approval**: 사용자는 비교 시안의 나머지를 반영하고 기존 운영 설명 문구를 유지하도록 명시했다. 진행 중 Feature의 새 task 07/08로 구현하며 기존 DONE 작업은 수정하지 않는다.
- **Decision**: 네 개 공통 메뉴, 회원/체험 Tabs, 선택한 테이블 하나, 독립 검색·필터·페이지, 고정 회원의 티켓 Sheet를 제공한다. DB의 체험/회원 구조는 유지하고 isGuest와 GuestAnalysisTrial의 실제 저장 관계로 관리자 조회·집계를 구분한다.
- **Scope**: 기존 음원 관리·custom mixing의 기능/경로와 관리자 서버 권한·티켓 원장·멱등성·알림·오디오 비노출을 보존한다. 운영 문구는 정확히 “서비스 사용 현황과 티켓, 작업 상태를 확인하고 관리할 수 있어요.”다. schema/env와 원격 배포는 변경하지 않는다.
- **Reference**: 승인 시안은 docs/designs/admin-navigation.md와 repo 내부 reference PNG에 고정한다. 개인 경로의 HTML 시안은 구현 의존성으로 사용하지 않는다. global 디자인 token·primitive 변경이 없어 design-system.md는 재사용한다.

### 관리자 조회 분리 구현

- 회원/체험 집계와 조회를 분리하고 결과 저장 관계를 최소 select로 제공했다. 상태별 만료 조건과 검색을 함께 적용하며 page/pageSize를 유한하고 유효한 범위로 정규화한다.
- guest 대상 조정은 wallet/ledger 생성 전에 서버에서 거부한다. 기존 정식 회원의 멱등 지급·사유·알림·잔액 제한은 DB 통합에서 보존됐다.
- 관리자 DB 통합 2개·tsc·변경 파일 ESLint 통과. UI는 다음 task에서 연결한다.

### 관리자 UI 구현과 1차 검증

- 공통 네 메뉴와 회원/체험 Tabs, 선택 목록 하나, 독립 URL 검색/필터/페이지, 저장회원 링크와 고정 회원 Ticket Sheet를 연결했다. 운영 설명은 원문을 유지한다.
- 변경 관리 UI/URL 8개·신규 Storybook 8개와 기존 관리자 DB 통합 2개, tsc·lint·architecture/Steiger가 통과했다. 최초 신규 Storybook의 Sheet 등장 직후 opacity assertion은 transition 완료 대기로 정정했고 SSR fixture에는 기존 AppRouter provider 패턴을 적용했다. 최초 출력은 /tmp/copy-singer-admin-focused-storybook.log, 수정 후 통과는 /tmp/copy-singer-admin-focused-storybook-retry.log에 보관한다.
- 별도 브라우저에서 실제 UI 컴포넌트의 회원/체험/믹싱 목록·원문 caption, 390px page/Sheet의 가로 넘침 없음·Escape 닫기를 확인했다. QA 이미지는 /tmp/copy-singer-admin-*.png이며 runtime/public 또는 Feature reference로 추가하지 않는다.
- 전체 pnpm test의 production build와 앞선 unit/DB/API suite는 통과했으나 기존 녹음 전환(WebGL lazy import 1초 대기)과 custom mixing 성공(비동기 응답 전 즉시 단언)에서 실패했다. 전체 출력은 /tmp/copy-singer-admin-full-test.log에 보존한다. 해당 기존 assertion은 유지하고 실제 async 완료를 기다리도록 대기 방식만 정정한 뒤 재검증한다. 제품 합성·녹음 동작은 수정하지 않는다.

- 두 번째 전체 검사는 build·선행 suite·Storybook 197개를 통과한 뒤 guest 저장 검사에서 실패했다(/tmp/copy-singer-admin-full-test-verified.log). 정리 함수의 반환값은 DB 전체 만료 후보 존재 여부인데 기존 단언은 다른 만료 데이터가 없다고 가정했다. 단언을 해당 저장 프로필의 회원 소유권·존속으로 바꿔 실제 계약을 검증한다. 관리자 변경으로 체험 저장 동작이 바뀐 것은 아니다.

- 세 번째 전체 검사는 신규 티켓 retry Storybook에서 Sheet의 등장 전환이 끝나기 전 visible을 단언해 실패했다(/tmp/copy-singer-admin-full-test-final.log). 공통 review helper도 transition 완료를 기다리도록 정정했다. 첫 focused 검사 이후 전체 병렬 실행에서 관찰된 테스트 동기화 문제이며, 제품 Sheet의 동작을 바꾸거나 assertion/테스트를 제외하지 않았다.

### 관리자 화면 변경 검증 완료

- 최종 dotenv 선로드 pnpm test가 exit 0으로 완료됐다. production build·모든 unit/DB/API suite·Storybook 197개·guest 18개·readiness 13개와 Python 4개가 통과했다. 전체 출력은 /tmp/copy-singer-admin-complete-test.log에 보존한다. 기존 skipped Storybook 두 파일은 그대로이며 검사를 새로 제외하지 않았다.
- 최종 tsc·lint·Steiger 및 FSD 4개·diff 검사가 통과했다. Biome의 import 정렬 세 곳을 적용했고 기존 guest test의 non-null 경고는 runtime 수정을 하지 않고 유지했다.
- 원문 운영 설명·네 메뉴·단일 목록·독립 검색과 페이지·결과 저장 회원 관계·확인 전 무요청·재시도 멱등 키·회원/체험 집계와 서버 조정 대상 검증을 확인했다. 음원·커스텀 믹싱의 기존 기능/경로·원장·알림·권한은 보존했다.
- 로컬 개발 서버는 http://localhost:3001 에서 계속 실행 중이다. 비인증 /admin의 권한 차단을 확인했고 실제 관리자 OAuth 로그인은 사용자의 확인 대상으로 남긴다. 실제 유료 GPU 요청·Next.js 배포·원격 push·main 병합은 실행하지 않았다. 구현 최종 승인 및 별도 local merge 승인은 대기한다.

## D007: 관리자 하위 로딩 화면의 공통 메뉴 누락 보완

사용자의 스켈레톤 정합성 확인 요청에서 메인 화면은 갱신됐지만 음원·커스텀 하위 loading에는 메뉴가 빠져 있고 커스텀에는 제거한 뒤로가기 자리가 남아 있음을 확인했다. 기존 범위의 누락 보완을 새 task 09로 기록하고 공유 메뉴 skeleton으로 세 화면을 맞춘다. 최종 구현/병합 승인으로 해석하지 않는다.

- 구현: AdminNavigationLoading을 세 loading에서 공유하고 메뉴 뒤 컨텐츠 간격과 음원 검색/필터 영역을 현재 화면에 맞췄다. 로딩은 Next.js 계약상 searchParams를 받지 않아 /admin의 단일 목록 공통 fallback을 유지한다.
- 검증: 일회성 SSR 3화면 및 공유 메뉴 4자리, 관리자 UI/URL 8개, tsc·변경 파일 lint/Biome·Steiger/FSD 4개·diff 검사 통과. 새 영구 테스트를 추가하지 않았고 이미 성공한 전체 suite를 반복하지 않았다. 이번 변경은 정적 placeholder에 한정되며 데이터 조회·권한·설명 문구·route adapter는 바꾸지 않았다.

## D008: 완료 후 다시 재생 버튼을 맨 왼쪽 하나로 유지

사용자가 첨부한 파형 플레이어에서 완료 시 좌측 버튼이 RotateCcw로 바뀌고 우측에 같은 버튼이 추가되어 control이 넘치는 원인을 확인했다. 기존 좌측 togglePlayback의 finished 분기를 사용하고 우측 완료 전용 버튼과 restart callback을 제거한다. 새 디자인이나 재생 정책 변경 없이 요청한 중복 제거에 한정하며, 최종 구현/병합 승인은 별도다.

- 구현/검증: 오른쪽 조건부 replay와 restart callback을 제거하고 왼쪽 완료 라벨을 처음부터 재생으로 맞췄다. 기존 단위 3·Storybook 3·tsc·lint/Biome·Steiger/FSD 4·diff가 통과했다. 실제 Chromium에서 일반/구간 완료 후 replay 한 개·좌측 첫 위치와 재시작 0초를 확인했고 폭 320px에서 overflow가 없었다. QA는 합성한 로컬 WAV fixture만 사용했다. 사용자 음성이나 외부 GPU/DB mutation은 사용하지 않았다.
