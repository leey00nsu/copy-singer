# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `DNNN: readme-project-showcase 결정 (2026-08-16)`
> 결정 ID는 Feature별로 독립된 번호를 사용하며 Feature ID와 관계없이 `D001`부터 시작합니다.

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.
- 디자인 시스템 변경이나 예외를 기록할 때는 영향 받는 규칙과 범위, 예외 이유, 제거 조건, 실행 가능한 정본의 동기화 영향을 함께 남깁니다.

---

## D001: Leemage의 정보 구조를 Copysinger 내용으로 재구성 (2026-08-16)

- **Context**: 기존 README는 긴 영문 운영 설명부터 시작해 제품 가치와 실제 UI를 빠르게 파악하기 어렵고, 실행 정보가 여러 영역에 중복돼 일부 legacy 문구가 남아 있다.
- **Constraints**: 사용자가 제공한 PNG 두 장을 그대로 사용하고, 애플리케이션 UI·제품 동작·외부 배포 상태는 변경하지 않는다. Leemage README의 문구를 복제하지 않는다.
- **Options**: 기존 README 앞에 이미지만 추가, Leemage README를 거의 복제, 시각적 정보 구조만 참고해 전체 내용을 Copysinger 계약으로 재작성.
- **Decision**: 중앙 브랜드 hero·badge·anchor·screenshot·목차라는 Leemage의 정보 구조를 참고하되 본문은 Copysinger의 제품 흐름과 현재 코드 기준으로 재작성한다.
- **Rationale**: 저장소 첫 화면의 제품 이해도를 높이면서 실제 운영 계약과 상세 개발 정보를 하나의 문서에서 유지할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: reference raw README를 확인해 상단 logo, centered title/tagline, badges, anchor navigation, 800px 제품 capture, 목차 순서를 채택 후보로 정했다.
  - **DONE 전 확정 시점**: Copysinger mark, 제품명·소개, 사실 기반 badge, 6개 상단 바로가기, 제공된 홈·보컬 분석 화면, 목차와 제품 중심 본문을 구성했다. 존재하지 않는 license·demo URL은 만들지 않았고 현재 route와 세 worker 구조를 반영했다.
  - **머지 후 확인**: 실제 결과/영향
- **Evidence**:
  - **Commit**: `aae9693` (`feat(F036): README 쇼케이스와 제공 이미지 구성`)
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: Reference `https://github.com/leey00nsu/leemage`; 제공 PNG 2644×1854, 2572×1850 및 각각 1 MiB 이하; README anchor·asset·script 누락 0건, legacy 문구 검색 0건
- **Consequences**: README 변경 범위가 커지지만 제품 소개와 운영 문서의 중복·오래된 정보를 함께 정리할 수 있다.

## D002: 환경변수 설명은 `.env.example` 한 곳에서 유지 (2026-08-16)

- **Context**: README와 `.env.example`이 환경변수 목록을 각각 보유하면 변수 분리·추가 시 쉽게 어긋난다.
- **Constraints**: Quick Start는 복사 가능한 명령을 유지해야 하며 실제 credential은 문서에 포함할 수 없다.
- **Options**: README에 전체 목록 유지, README와 example 모두 상세 설명, README에는 복사 명령만 두고 example에 설명 집중.
- **Decision**: README는 `.env.example` 복사 명령만 제공하고 변수별 역할·필수성·기본값·fallback은 `.env.example` 주석으로 관리한다.
- **Rationale**: 실행 가능한 환경 파일과 설명을 같은 위치에 두어 코드와 대조하기 쉽고 문서 중복을 줄인다.
- **Trace**:
  - **DOING 시작 시점**: `server-env.ts`, auth/analyzer/media adapter와 package worker script를 환경 계약의 근거로 사용한다.
  - **DONE 전 확정 시점**: README에는 `.env.example` 복사 명령과 정본 링크만 남기고 개별 변수명은 0건으로 정리했다. example은 39개 key를 로컬 DB, 분석 backend, 인증, 저장소, 티켓과 세 worker 영역으로 나누고 선택 조건·기본값·공용 key fallback을 주석으로 설명한다.
  - **머지 후 확인**: local merge 후 기록.
- **Evidence**:
  - **Commit**: `62aaf61` (`feat(F036): 환경 설정 정본과 문서 회귀 검증`)
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `.env.example` key 중복·필수 목록 누락·legacy 0건; source runtime/operational env 참조 문서 누락 0건; README 개별 변수명 0건; Prisma validate PASS
- **Consequences**: README가 간결해지고 새 변수 추가 시 `.env.example`만 우선 갱신하면 된다.

## D003: 보컬 프로필 분석 backend를 Modal CPU로 단일화 (2026-08-16)

- **Context**: 운영과 현재 `.env.local`은 이미 Modal을 사용하지만 README·example·TypeScript selector·Docker Compose에는 local analyzer 경로가 남아 있어 실제 지원 경계가 모호했다. Modal app도 `services/vocal-profile-api/app`을 공유 코어처럼 패키징해 local HTTP runtime과 알고리즘 경계가 결합돼 있다.
- **Constraints**: 보컬 분석 descriptor, smart reference와 곡 분석 결과는 유지해야 한다. 두 Modal app이 공유하는 Python 알고리즘을 삭제하면 안 되며 원격 Modal 배포 자체는 별도 승인 범위다.
- **Options**: 문서만 Modal로 변경, local adapter만 제거하고 Python service 경로 유지, local runtime을 제거하고 공유 코어를 중립 경로로 이동.
- **Decision**: TypeScript는 Modal adapter를 직접 사용하고 local selector·artifact API helper를 제거한다. FastAPI local service와 Docker service는 삭제하며 공유 알고리즘과 테스트는 `services/vocal-analysis-core`로 이동해 두 Modal app이 패키징한다.
- **Rationale**: 지원하지 않는 runtime을 실제 코드와 배포 구성에서 제거하면서 분석 알고리즘의 단일 구현과 회귀 검증은 유지한다.
- **Trace**:
  - **DOING 시작 시점**: 현재 Modal apps가 local service의 `app` package를 import하는 결합을 확인해 단순 디렉터리 삭제가 아니라 neutral core 이동이 필요하다고 판단했다.
  - **DONE 전 확정 시점**: 구현 후 기록.
  - **머지 후 확인**: local merge 후 기록.
- **Evidence**:
  - **Commit**: 구현 commit 후 기록
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: 구현 후 기록
- **Consequences**: 로컬 오프라인 분석 서버는 더 이상 제공하지 않으며 개발·production 모두 배포된 Modal CPU analyzer와 server-only key가 필요하다.
