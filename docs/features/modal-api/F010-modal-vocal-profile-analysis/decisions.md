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
