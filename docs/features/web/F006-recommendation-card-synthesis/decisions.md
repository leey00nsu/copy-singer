# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D006: recommendation-card-synthesis 결정 (2026-08-06)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: RecommendationItem을 합성 idempotency 경계로 사용 (2026-08-06)

- **Context**: 추천 결과 화면의 재실행·새로고침과 동시 요청이 같은 곡의 Modal GPU job을 중복 생성할 수 있다.
- **Constraints**: 추천 run당 대상은 정확히 3개이며 외부 job 생성과 PostgreSQL transaction을 하나의 원자 작업으로 묶을 수 없다.
- **Options**: 별도 queue 테이블, 메모리 lock, RecommendationItem의 nullable 상태를 conditional update하는 방식을 검토한다.
- **Decision**: 초기 null 상태의 RecommendationItem을 conditional update로 `PREPARING` 전환한 요청만 외부 작업을 시작하게 하고 상태·job ID·retry history를 item에 저장한다. 상태 전이는 별도 순수 함수의 allowlist로 제한한다.
- **Rationale**: 기존 3개 item이 자연스러운 멱등성 key이며 프로세스 재시작과 여러 Next instance에서도 PostgreSQL의 조건부 갱신이 유지된다.
- **Trace**:
  - **DOING 시작 시점**: `updateMany(where: { id, synthesisStatus: null })`의 affected row를 시작 소유권으로 사용하고 허용 transition을 별도 helper로 제한한다.
  - **DONE 전 확정 시점**: Prisma enum과 nullable 초기 상태를 적용했다. migration 적용 후 실제 PostgreSQL의 추천 run 생성·직렬화·cascade 삭제가 기존 동작과 함께 통과했다.
  - **머지 후 확인**: 2026-08-06 로컬 `main` fast-forward 병합 완료. RecommendationItem 기반 합성 상태와 멱등성 계약이 main에 반영됐다.
- **Evidence**:
  - **Commit**: 커밋 해시 또는 링크
  - **PR**: PR 링크
  - **Test/Log**: `npm run test:recommendation` 14/14 PASS, `npm run test:recommendation:db` 1/1 PASS, `npx tsc --noEmit` PASS (2026-08-06)
- **Consequences**: 결과 및 영향 (선택사항)

---

## D003: 세 카드 순차 제출과 단일 run polling (2026-08-06)

- **Context**: 세 곡 target WAV를 동시에 준비하면 로컬 메모리와 network peak가 커지며 Modal L4도 현재 한 작업씩 처리한다.
- **Constraints**: 사용자는 결과 화면 진입 즉시 세 카드가 모두 진행 중임을 알아야 하고, 한 카드 실패가 나머지를 막으면 안 된다.
- **Options**: 세 POST 병렬 실행, 사용자 클릭 실행, client 순차 POST와 run 단위 polling을 비교했다.
- **Decision**: UI에는 세 카드를 즉시 “믹싱 중이에요”로 표시하되 start POST는 rank 순서로 제출한다. 이후 한 개의 run GET polling으로 세 상태를 조정하고 실패 retry만 item POST를 사용한다.
- **Rationale**: 자동 흐름을 유지하면서 대용량 WAV buffering peak를 한 곡으로 제한하고 요청·polling 수를 줄인다.
- **Trace**:
  - **DOING 시작 시점**: client ref와 DB conditional claim을 함께 사용해 React effect 재실행에도 GPU job 중복을 막는다.
  - **DONE 전 확정 시점**: 제품 홈을 profile로 변경하고 Workbench를 `/dev/svc`로 분리했다. loading/failed/succeeded 카드와 audio/download를 SSR 및 production build로 확인했다.
  - **머지 후 확인**: 2026-08-06 로컬 `main` fast-forward 병합 완료. 추천 카드의 세 작업 순차 제출과 단일 run polling 흐름이 main에 반영됐다.
- **Evidence**:
  - **Commit**: 구현 커밋에서 기록
  - **PR**: 로컬-only, 생성하지 않음
  - **Test/Log**: `npm test` PASS — SSR 3, catalog 7, key-fit 18, recommendation 15; production routes에 `/dev/svc`와 synthesis endpoints 포함 (2026-08-06)

---

## D002: 기존 Modal multipart API 앞에 임시 media broker 배치 (2026-08-06)

- **Context**: 자동 추천 흐름은 브라우저 파일 선택 없이 analyzer에 보존된 reference와 catalog URL의 target을 기존 Modal API에 전달해야 한다.
- **Constraints**: 원곡을 프로젝트/DB에 저장할 수 없고 이번 feature에서 Modal 신규 배포는 하지 않는다. 현재 Modal create endpoint는 multipart 파일만 받는다.
- **Options**: Next에서 `yt-dlp` 실행, Modal에 URL 입력 endpoint 추가 후 재배포, 기존 analyzer에 내부 media endpoint를 추가하는 방식을 검토한다.
- **Decision**: `yt-dlp`가 이미 설치된 analyzer가 allowlist target을 임시 WAV로 내려받아 streaming response로 제공하고 `finally`에서 삭제한다. Next server orchestration은 reference/target을 받아 기존 Modal multipart API를 호출한다.
- **Rationale**: 기존 배포 계약을 유지하면서 다운로드 정책과 임시 파일 cleanup을 F003의 검증된 Python 경계에 집중할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: analyzer의 UUID recording source와 allowlist target만 서버 간에 노출하고 브라우저 route는 만들지 않는다. 세 곡 준비는 메모리 peak를 줄이기 위해 순차 시작한다.
  - **DONE 전 확정 시점**: analyzer streaming response의 `finally` cleanup, UUID recording source 조회, Next conditional claim과 기존 Modal create/status/audio/delete proxy를 구현했다. target은 reference preflight가 성공한 뒤에만 다운로드한다.
  - **머지 후 확인**: 2026-08-06 로컬 `main` fast-forward 병합 완료. analyzer 임시 media broker와 기존 Modal API orchestration이 main에 반영됐다.
- **Evidence**:
  - **Commit**: 구현 커밋에서 기록
  - **PR**: 로컬-only, 생성하지 않음
  - **Test/Log**: Python 18/18 PASS, orchestration DB integration 3/3 PASS, local analyzer health 및 두 media path OpenAPI 확인 (2026-08-06)

---

## D004: 실제 Modal 검증은 추천 3건 전부 실행 후 즉시 cleanup (2026-08-06)

- **Context**: mock 계약만으로는 대용량 target 전달, Modal L4 실행과 결과 audio proxy가 실제 배포에서 동작하는지 증명할 수 없다.
- **Constraints**: 실제 호출은 Modal credit을 소비하고 프로젝트/DB에 원곡을 보존할 수 없으며 신규 배포는 범위 밖이다.
- **Options**: mock만 검증, 실제 1건과 3-card mock 결합, 실제 추천 3건 전부 실행을 비교했다.
- **Decision**: 사용자 예시 `vocal1.wav`의 추천 3곡을 현재 배포에 모두 순차 제출하고 세 결과가 각각 `succeeded`와 재생 가능한 WAV임을 확인한 후 외부 job과 fixture를 즉시 삭제한다.
- **Rationale**: 제품의 핵심 acceptance가 “세 카드 모두 합성”이므로 실제 1건만으로 완료를 판단하지 않고 analyzer → PostgreSQL → recommendation → allowlist download → Modal → status → audio → cleanup의 전체 경로를 세 item 모두에서 증명한다.
- **Trace**:
  - **DOING 시작 시점**: 먼저 health와 7.152초 입력 유효성을 확인한 뒤 profile/run을 생성했다.
  - **DONE 전 확정 시점**: 최초 1건 smoke test 후 사용자 변경 요청으로 완료 판단을 철회하고 세 건을 다시 실행했다. `아크라포빅`, `모든 날, 모든 순간`, `바다의 왕자`가 모두 succeeded했다. 결과는 각각 133.944초/6,429,372 bytes, 210.721초/10,114,658 bytes, 242.629초/11,646,212 bytes였고 모두 PCM s16le 24kHz mono이며 서로 다른 SHA-256이었다. analyzer temp dir 0, run/profile/recording DB 0, 세 Modal job status 404를 확인했다.
  - **머지 후 확인**: 2026-08-06 로컬 `main` fast-forward 병합 완료. 실제 추천 3곡 성공 및 cleanup 검증 결과를 최종 기준으로 유지한다.
- **Evidence**:
  - **Commit**: 구현 커밋에서 기록
  - **PR**: 로컬-only, 생성하지 않음
  - **Test/Log**: `/tmp/copy-singer-f006-rank1.wav`, `/tmp/copy-singer-f006-rank2.wav`, `/tmp/copy-singer-f006-rank3.wav`; final `npm test`, DB integration 3/3, Python 18/18, lint, TypeScript, Prisma validate PASS (2026-08-06)
- **Consequences**: 실제 결과 샘플 세 개만 프로젝트 밖 `/tmp`에 남기고 원곡과 서버 측 fixture는 제거했다. 세 곡 전체 실호출의 총 wall time은 제출 시작부터 약 5분 27초였다.
