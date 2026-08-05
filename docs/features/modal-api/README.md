# modal-api Feature 목록

이 폴더는 `modal-api` 컴포넌트의 Feature 문서를 보관합니다.

- 새 Feature 생성: `npx lee-spec-kit feature <name> --component modal-api`
- 워크플로우 문서 읽기: `npx lee-spec-kit docs get agents --json`

## 컴포넌트 범위

- `services/soulx-singer-svc/modal_app.py`: Modal App, FastAPI, 비동기 작업과 저장소
- `services/soulx-singer-svc/api/`: SoulX-Singer 실행 설정과 GPU 엔진
- `services/soulx-singer-svc/requirements-*.txt`: 로컬 CLI 및 원격 이미지 의존성

Modal API feature는 HTTP 계약, GPU 추론, 모델/작업 Volume, Secret, 비용 및 작업 수명주기 변경을 관리합니다.
