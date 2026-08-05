# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D005: top-three-recommendations 결정 (2026-08-06)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: 분석 artifact와 실행 결과의 책임 분리 (2026-08-06)

- **Context**: 100곡 분석 수치는 모든 환경에 동일하게 배포해야 하지만 추천 실행은 특정 사용자 profile과 계산 version을 추적해야 한다.
- **Constraints**: 원본 음원은 프로젝트와 DB에 저장하지 않으며, F003 JSON artifact가 곡 분석의 SSOT이다. PostgreSQL/Prisma schema에는 이미 Song과 RecommendationRun/Item 관계가 있다.
- **Options**: 모든 곡 profile을 DB에 복제, 추천 결과도 JSON 파일에 저장, 분석 artifact는 JSON으로 유지하고 추천 실행만 DB에 저장.
- **Decision**: F003 JSON의 READY 100곡 수치를 서버에서 읽고 DB Song metadata와 strict 결합한 뒤, 사용자별 RecommendationRun과 top 3 item만 Prisma transaction으로 저장한다.
- **Rationale**: 배포 간 정적 분석 데이터를 재현하면서도 사용자 실행의 삭제·재조회·version trace와 관계 무결성을 확보한다.
- **Trace**:
  - **DOING 시작 시점**: JSON/DB 두 소스를 catalogOrder만으로 느슨하게 연결하면 오래된 데이터가 섞일 수 있으므로 제목·가수·상태까지 preflight하는 접근을 계획했다.
  - **DONE 전 확정 시점**: scorer 출력의 반올림된 공개 점수로 명세 순서대로 정렬하고 입력 배열을 복사한 뒤 상위 3개만 rank로 보강한다. artifact가 READY 100곡의 분석 SSOT이며 DB는 catalogOrder 1~100의 식별자·메타데이터를 제목/가수까지 대조한 뒤 사용자 실행만 저장한다.
  - **머지 후 확인**: 미실행.
- **Evidence**:
  - **Commit**: 구현 태스크 커밋 후 기록.
  - **PR**: 로컬 workflow로 생성하지 않음.
  - **Test/Log**: `npm run test:recommendation` PASS — 7 tests, 실제 READY 100곡 결정성·DB metadata drift 포함. `npm run test:recommendation:db` PASS — PostgreSQL 생성·조회·cascade 삭제.
- **Consequences**: DB 초기화 후에는 카탈로그 import가 필요하고 artifact와 DB가 불일치하면 추천 전체가 `CATALOG_NOT_READY`로 거절된다.

## D002: 추천 shift와 SVC pitch shift 분리 (2026-08-06)

- **Context**: 추천 키는 사용자가 노래방에서 부르기 편한 시작 key이고 SVC `pitch_shift`는 변환 모델 입력/출력 음정 처리 설정이다.
- **Constraints**: 같은 semitone 숫자로 보여도 의미와 적용 대상이 다르며 기존 Modal multipart 계약을 깨뜨리면 안 된다.
- **Options**: 추천 shift를 변환 폼에 자동 적용, query 표시값으로만 전달, run/item ID로 서버 검증 후 안내 context만 표시.
- **Decision**: run/item 식별자만 query로 전달하고 저장된 관계를 API로 확인해 안내 context를 표시하되 변환 설정에는 자동 적용하지 않는다.
- **Rationale**: 추천 의미를 보존하고 조작된 query 표시값을 신뢰하지 않으며 기존 검증된 SVC 흐름을 그대로 유지한다.
- **Trace**:
  - **DOING 시작 시점**: handoff를 선택 context와 실제 변환 입력 사이의 명시적 경계로 설계했다.
  - **DONE 전 확정 시점**: 구현 후 보강 예정.
  - **머지 후 확인**: 미실행.
- **Evidence**:
  - **Commit**: handoff 태스크 커밋 후 기록.
  - **PR**: 로컬 workflow로 생성하지 않음.
  - **Test/Log**: SSR 및 전체 회귀 결과를 태스크 완료 시 기록.
- **Consequences**: 사용자는 target 파일과 advanced settings를 직접 확인해야 하며 자동 합성 데모는 후속 기능으로 남는다.

## D003: 결과 페이지의 DB 접근을 API 경계로 제한 (2026-08-06)

- **Context**: vinext 동적 RSC 페이지에서 Prisma 서버 모듈을 직접 import하면 개발 hydration 과정에서 Prisma query compiler WebAssembly가 client rendering 경로에 노출될 수 있었다.
- **Constraints**: Prisma는 서버 전용이어야 하고 추천 결과는 loading/not-found/failed 상태를 명확히 보여야 한다.
- **Options**: RSC에서 DB 직접 조회, client에 초기 JSON을 주입, client가 저장된 run을 GET API로 조회.
- **Decision**: route page는 run ID만 client component에 전달하고, component가 `GET /api/recommendations/{id}`로 직렬화된 응답을 로드한다.
- **Rationale**: Prisma와 artifact를 Route Handler 뒤에 확실히 격리하면서 로딩·재조회·404 상태를 한 경계에서 처리한다.
- **Trace**:
  - **DOING 시작 시점**: 초기 RSC 직접 조회를 구현했다.
  - **DONE 전 확정 시점**: 개발 브라우저에서 WebAssembly client 유입 오류를 관찰해 API fetch 구조로 바꿨고 production 브라우저에서 정상 카드 렌더링을 확인했다.
  - **머지 후 확인**: 미실행.
- **Evidence**:
  - **Commit**: UI 태스크 커밋 후 기록.
  - **PR**: 로컬 workflow로 생성하지 않음.
  - **Test/Log**: `npm run test:recommendation` 9 tests PASS, `npm run build` PASS, production local DOM·full-page visual 확인.
- **Consequences**: 첫 화면은 짧은 loading 상태를 거치지만 DB 코드가 client bundle/hydration 경계에 들어가지 않는다.
