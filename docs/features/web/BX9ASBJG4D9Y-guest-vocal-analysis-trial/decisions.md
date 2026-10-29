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
