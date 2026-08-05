# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D002: user-vocal-profile 결정 (2026-08-05)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: librosa pYIN과 구간별 robust 통계 (2026-08-05)

- **Context**: 추천에 사용할 사용자 음역·테시투라·안정도를 로컬 CPU에서 재현 가능하게 계산해야 한다.
- **Constraints**: 20–25초 입력, 비전문 사용자, 순간 잡음과 octave error, Modal GPU 미사용, 원시 frame DB 미저장
- **Options**: librosa pYIN, torchcrepe, SoulX RMVPE
- **Decision**: MVP는 librosa 0.11.0 pYIN을 사용하고 melody와 glissando 구간을 분리해 robust 분위 통계를 계산한다.
- **Rationale**: CPU 설치와 fixture 검증이 단순하고 ISC 라이선스이며, 후속 대안 비교 전에 필요한 설명 가능한 baseline을 빠르게 제공한다.
- **Trace**:
  - **DOING 시작 시점**: melody p10/p50/p90과 목표 음정/local cents 변화 기반 stability, glissando p02/p98 경계를 별도 계산한다. 최신 NumPy 2.5.1은 현재 librosa의 numba resolver와 충돌해 호환되는 2.3.5로 고정한다.
  - **DONE 전 확정 시점**: Python 3.12에서 합성 guided melody/glissando의 pYIN 통계와 무음·짧은 입력·clipping reason code, 일반 upload 통계를 포함한 5개 테스트가 통과했다.
  - **머지 후 확인**: 실제 결과/영향
- **Evidence**:
  - **Commit**: 첫 번째 태스크 커밋의 Git 이력
  - **PR**: 로컬 워크플로우로 생성하지 않음
  - **Test/Log**: [tasks.md 테스트 실행 기록](./tasks.md#테스트-실행-기록)
- **Consequences**: pYIN 정확도가 실제 녹음에서 부족하면 동일 fixture에 torchcrepe를 추가해 analyzer version별 비교가 필요하다.

## D002: 독립 로컬 CPU analyzer 서비스 (2026-08-05)

- **Context**: librosa와 ffmpeg는 Python/OS 의존성이 있으며 기존 vinext Worker와 Modal GPU 경로에서 분리해야 한다.
- **Constraints**: 로컬 전용, GPU 비용 없음, 25 MiB upload, 원본 24시간 보관, DB Secret 비노출
- **Options**: Next child process, Modal CPU function, Docker Compose FastAPI 서비스
- **Decision**: Python 3.12 + FastAPI analyzer를 Docker Compose의 독립 서비스로 실행하고 Next는 raw multipart stream만 전달한다.
- **Rationale**: Python 분석 의존성을 재현 가능한 이미지로 격리하고, 기존 SVC endpoint와 DB 소유권을 변경하지 않으면서 큰 오디오의 중복 버퍼링을 피한다.
- **Trace**:
  - **DOING 시작 시점**: analyzer는 UUID 기반 디렉터리, 1 MiB chunk, ffmpeg mono 22,050 Hz 변환, health/analyze/delete endpoint를 제공한다.
  - **DONE 전 확정 시점**: Python 3.12/ffmpeg image build, FastAPI unit/API 8건, Compose healthcheck와 writable bind storage가 통과했다. 첫 요청 직전 health starting 상태의 연결 reset은 6초 뒤 healthy 전환으로 해소됐다.
- **Evidence**:
  - **Commit**: 두 번째 태스크 커밋의 Git 이력
  - **PR**: 로컬 워크플로우로 생성하지 않음
  - **Test/Log**: [tasks.md 테스트 실행 기록](./tasks.md#테스트-실행-기록)
