# Idea: modal-vocal-profile-analysis

---

## 개요

- **Idea ID**: I007
- **Idea Name**: modal-vocal-profile-analysis
- **Created**: 2026-08-07
- **Status**: Featureized
  - 값: Active | Featureized | Dropped
- **Feature**: F010-modal-vocal-profile-analysis
- **PRD Refs**: PRD-US-008, PRD-US-009, PRD-US-018, PRD-FR-002, PRD-FR-003, PRD-FR-004, PRD-FR-021, PRD-FR-022, PRD-FR-027, PRD-FR-042, PRD-DATA-005, PRD-NFR-003, PRD-NFR-004, PRD-NFR-006
- **Component**: web, modal-api

---

## 배경

현재 사용자 보컬 프로필 분석은 로컬 Docker Compose의 `vocal-profile-api`가 담당하고 Modal은 SoulX-Singer GPU 믹싱만 담당한다. 이 구조는 로컬 개발에는 독립적이지만, 실행 중인 analyzer 이미지가 소스보다 오래되어 smart reference 계약이 누락되는 버전 drift가 실제로 발생했다. 향후 Next.js를 배포하면 별도 Python 분석 서버의 운영·스케일링·배포 동기화도 필요하다.

프로필 분석은 librosa/pYIN·FFmpeg 중심의 CPU workload이므로 믹싱용 L4 컨테이너와 합치지 않고 Modal CPU Function으로 이전하는 방안을 검토한다. 목표는 GPU 비용을 만들지 않으면서 분석 실행 환경과 버전을 배포 단위로 고정하고, scale-to-zero와 요청별 임시 파일 정리를 활용하는 것이다.

---

## 대략 범위

- In:
  - 기존 Python 분석 코어와 `AnalyzerProfile`/`smart-reference-v1` 계약을 재사용하는 Modal CPU Function 또는 Web Endpoint
  - 최대 60초 압축 source 업로드, 프로필 통계와 최대 30초 smart reference 생성
  - analyzer capability/version 검증, 요청 idempotency, 제한 시간, 재시도와 오류 계약
  - 사용자 원본·중간 WAV·smart reference 임시 파일의 성공/실패/취소 공통 정리
  - Leemage 저장 책임을 Next.js에 둘지 Modal에 둘지 비교하고 원본 URL을 클라이언트에 노출하지 않는 흐름
  - 로컬 개발용 `.venv` analyzer와 production Modal analyzer의 동일 테스트 fixture/contract suite
  - CPU·메모리·cold start·`scaledown_window`의 실측과 월 $30 무료 크레딧 예산 검증
- Out:
  - 이 Idea 단계에서의 Modal 배포 또는 현재 로컬 analyzer 제거
  - SoulX-Singer 믹싱 함수와 GPU preset 변경
  - 프로필 분석에 GPU 사용
  - 100곡 카탈로그의 yt-dlp/Demucs 분석 파이프라인 재설계
  - Modal Volume에 사용자 오디오를 영구 저장
  - Leemage 또는 PostgreSQL 교체

---

## 조사 및 후보 비교

- 후보:
  1. 로컬/고정 서버 FastAPI 유지
  2. Modal CPU 동기 Web Endpoint로 이전
  3. Modal CPU 비동기 job + polling으로 이전
- 장점:
  - 후보 2는 현재 동기 UI와 계약 변경이 가장 작고, scale-to-zero와 배포 버전 고정이 가능하다.
  - 후보 3은 분석 지연·재시도·재접속에 가장 강하지만 프로필 생성 상태와 영속 job 모델이 추가된다.
  - Modal 공식 단가 기준 2 physical cores·4GiB를 20~30초 사용한다는 단순 가정은 분석 1회 약 `$0.0007~0.0011`이며, 실제 cold start·네트워크·저장 비용을 포함해 계측해야 한다.
- 단점:
  - 네트워크 왕복과 cold start로 로컬 실행보다 첫 분석 latency가 늘 수 있다.
  - 사용자 음성이 외부 compute를 통과하므로 고지·보안·보존 정책이 필요하다.
  - 동기 endpoint는 최종 hosting provider의 요청 제한 시간과 결합될 수 있다.
- 라이선스:
  - 기존 librosa, PyTorch, FFmpeg, Demucs 관련 고지와 Modal/Leemage 서비스 약관을 Feature 승격 시 재검토한다.
- 검증 필요 사항:
  - 실제 10초/30초/60초 fixture별 CPU·메모리·cold/warm latency와 비용
  - Modal request body/response 크기, timeout, region과 Next.js runtime의 streaming 호환성
  - 동일 recording ID 중복 요청, Modal 성공 후 DB/Leemage 실패 시 보상 정리
  - smart reference bytes를 응답으로 반환할지 Modal에서 Leemage로 직접 업로드할지
  - Modal 장애 시 로컬 analyzer fallback을 production에서 허용할지

---

## 설계 초안

- 데이터 계약:
  - 입력: `recordingId`, 최대 60초 압축 audio, MIME, 선택적 분석 preset/segment metadata
  - 출력: 기존 versioned `AnalyzerProfile`, `descriptors.synthesisReference`, source/smart-reference artifact 전달 정보
  - 오류: 기존 `reasonCode/detail/retryable` 형식을 유지하고 capability mismatch·timeout·cleanup failure를 추가 후보로 둔다.
- 예상 컴포넌트:
  - `services/vocal-profile-api`의 순수 분석 모듈
  - `services/modal-api` 또는 별도 Modal app의 CPU analyzer 함수
  - Next.js `/api/vocal-profiles` adapter와 health/capability check
  - 공통 contract fixture와 local/Modal parity 테스트
- 외부 의존성:
  - Modal CPU Functions/Web Endpoints, Secrets와 선택적 observability
  - Leemage private audio storage
  - 공식 참고: `https://modal.com/docs/guide/webhooks`, `https://modal.com/docs/guide/cold-start`, `https://modal.com/pricing`
- 미확정 사항:
  - 동기 endpoint로 시작할지 처음부터 영속 job으로 만들지
  - 최소 warm container를 0으로 둘지 짧은 `scaledown_window`를 적용할지
  - Modal이 Leemage API Key를 보유할지 Next.js가 artifact relay를 담당할지
  - 하나의 Modal app 안에서 CPU analyzer와 L4 mixer를 분리할지 app 자체를 분리할지

---

## Feature 승격 매핑

- `spec.md`로 이동할 내용: 사용자 분석 latency, 오류/재시도, privacy, 계약 호환성과 완료 기준
- `plan.md`로 이동할 내용: CPU Function topology, audio/artifact 흐름, cleanup, local/Modal parity와 migration 단계
- `decisions.md`로 이동할 내용: 동기/비동기 선택, Leemage 업로드 책임, warm policy, app 분리와 fallback 정책
- `tasks.md`로 이동할 내용: benchmark → Modal spike → contract test → web adapter → cleanup/failure test → local analyzer 전환/제거 순서

> 승격 전 초안입니다. Feature 생성 후에는 확정되지 않은 내용을 Candidate 또는 Pending 상태로 옮기고, Idea는 이력으로만 유지합니다.

---

## 승격 메모

- 프로필 분석은 CPU로 실행하고 믹싱 L4와 compute/preset을 분리한다.
- 사용자 오디오는 Modal Volume이나 프로젝트 저장소에 남기지 않고 작업 임시 디렉터리에서 반드시 제거한다.
- 기존 `AnalyzerProfile`과 `smart-reference-v1`을 호환성 경계로 유지하며 버전 drift를 조용히 허용하지 않는다.
- Feature 승격 전에 실제 파일 benchmark와 월간 예상 분석 횟수로 비용·latency를 다시 계산한다.
- privacy 고지, hosting timeout, Leemage 업로드 책임과 장애 보상 흐름이 주요 미해결 항목이다.
