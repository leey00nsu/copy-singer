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

## D003: Next streaming proxy와 Prisma 저장 소유권 (2026-08-05)

- **Context**: 브라우저가 analyzer와 DB에 직접 접근하지 않으면서 분석 결과를 F001 schema에 저장해야 한다.
- **Constraints**: 25 MiB multipart, 기존 413 회귀 방지, analyzer 고아 파일 정리, BigInt JSON 비호환
- **Options**: 브라우저→analyzer 직접 호출, analyzer가 PostgreSQL 저장, Next same-origin proxy가 Prisma 저장
- **Decision**: Next route가 multipart body를 그대로 analyzer에 stream하고 성공 aggregate만 Prisma transaction으로 저장한다.
- **Rationale**: Secret과 내부 서비스 주소를 숨기고 DB schema 소유권을 TypeScript/Prisma에 유지하며 업로드 재버퍼링을 피한다.
- **Trace**:
  - **DOING 시작 시점**: Next가 recording UUID를 생성해 header로 전달하고, DB 실패 시 analyzer delete를 호출한다. API JSON의 BigInt는 number로 정규화한다.
  - **DONE 전 확정 시점**: vinext production route에서 guided WAV를 streaming 분석해 profile `201`, 조회 `200`, 삭제 `200`, 재조회 `404`를 확인했다. 삭제 후 PostgreSQL Recording/VocalProfile row와 bind storage 파일이 모두 제거됐다.
- **Evidence**:
  - **Commit**: 세 번째 태스크 커밋의 Git 이력
  - **PR**: 로컬 워크플로우로 생성하지 않음
  - **Test/Log**: [tasks.md 테스트 실행 기록](./tasks.md#테스트-실행-기록)

## D004: 세 preset의 listen-then-repeat 녹음 UX (2026-08-05)

- **Context**: 고정 절대 키는 사용자 음역에 따라 불리하고, 녹음 중 speaker guide는 pYIN 입력에 섞일 수 있다.
- **Constraints**: 저작권 없는 패턴, 브라우저 기본 API, 비전문 사용자, segment timestamp 재현
- **Options**: 유명곡 한 소절, 단일 절대 키, 세 시작 키의 동일 상대 패턴과 무음 visual guide
- **Decision**: low/medium/high preview 중 편한 키를 고르고, 4박 count-in 뒤 guide 소리 없이 21초 visual timeline을 따라 녹음한다.
- **Rationale**: 범위를 먼저 맞춘 뒤 동일한 과제를 제시하면서 안내음 혼입을 기본적으로 차단하고 segment 경계를 analyzer에 전달할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: Web Audio oscillator preview와 MediaRecorder lifecycle, MIME fallback, object URL cleanup을 분리한다.
  - **DONE 전 확정 시점**: `/profile`에서 low/medium/high preset 선택과 12초 Web Audio preview의 재생 중 잠금·자동 복귀를 실제 브라우저로 확인했다. 녹음은 4박 준비, 12초 melody, 1.5초 전환, 7.5초 glissando로 자동 종료하며 파일 업로드와 재녹음 대안을 함께 제공한다.
- **Evidence**:
  - **Commit**: 네 번째 태스크 커밋의 Git 이력
  - **PR**: 로컬 워크플로우로 생성하지 않음
  - **Test/Log**: [tasks.md 테스트 실행 기록](./tasks.md#테스트-실행-기록)

## D005: 한 화면의 분석 상태와 설명 가능한 품질 피드백 (2026-08-05)

- **Context**: 비전문 사용자가 분석 실패를 단순 서버 오류로 오해하지 않고 재녹음 방법과 추천에 쓰일 측정치를 이해해야 한다.
- **Constraints**: analyzer reason code 유지, MIDI 숫자와 음이름 병기, 원본 24시간 보관, 삭제 전 사용자 확인
- **Options**: 원시 JSON 출력, 별도 결과 페이지, 녹음 화면 안의 단계별 결과 패널
- **Decision**: 녹음 화면에서 health·업로드·분석 상태를 이어서 보여주고, reason code별 한국어 행동 지침과 MIDI/음이름 결과 카드를 제공한다.
- **Rationale**: 테스트 반복 흐름을 끊지 않으며 analyzer 계약을 감추지 않고 설명 가능한 추천 입력을 제시할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 선택한 Blob/File을 same-origin POST로 전송하고 성공 결과는 즉시 표시한다. 실패는 구조화된 code를 보존해 재시도 방법을 안내하며, 삭제는 확인 대화상자 후 API 성공 시에만 화면에서 제거한다.
  - **DONE 전 확정 시점**: 실제 guided WAV로 측정 음역 D♯3–F♯4, 편한 음역 F3–E4, 중심 음 B3 및 quality metadata가 표시되는 것을 확인했다. 4초 WAV는 `TOO_SHORT`를 보존하면서 8초 이상 재녹음 안내를 보여줬고, 테스트 profile은 DELETE 후 DB/file 모두 제거됐다.
- **Evidence**:
  - **Commit**: 다섯 번째 태스크 커밋의 Git 이력
  - **PR**: 로컬 워크플로우로 생성하지 않음
  - **Test/Log**: [tasks.md 테스트 실행 기록](./tasks.md#테스트-실행-기록)

## D006: 재현 가능한 로컬 통합 경계 (2026-08-05)

- **Context**: F002를 다음 곡 프로필·추천 기능의 안정적인 입력 기반으로 넘기려면 개발자가 동일한 DB/analyzer/API/UI 검증을 재현할 수 있어야 한다.
- **Constraints**: 배포 없음, 로컬 Docker Compose, 기존 3000 개발 서버 유지, Modal GPU 비용 사용 금지
- **Options**: 수동 UI 확인만 기록, mock 기반 테스트만 추가, 실제 Compose 서비스와 fixture를 함께 검증
- **Decision**: README에 Compose·Prisma·analyzer test 절차를 고정하고, 합성 fixture의 실제 POST→GET→DELETE와 SSR/guide contract/browser 검증을 함께 통과시킨다.
- **Rationale**: 분석 알고리즘, 저장 경계, 사용자 화면 중 하나만 검증해서는 추천 입력의 완결성을 보장할 수 없으며 모두 로컬에서 비용 없이 재현 가능하다.
- **Trace**:
  - **DOING 시작 시점**: 기존 3000 서버와 분리한 production 3100 서버에서 통합 검증하고 종료한다. 테스트 데이터는 검증 직후 API로 삭제한다.
  - **DONE 전 확정 시점**: Python 8건, TypeScript/lint/build, guide/음이름 2건, SSR 2건, Prisma validate/status/verify, guided API 201→200→200→404와 브라우저 결과/오류 화면이 통과했다. vinext의 RSC prefetch console 오류는 직접 탐색·API·화면 갱신에 영향을 주지 않는 beta runtime 이슈로 남았다.
- **Evidence**:
  - **Commit**: 여섯 번째 태스크 커밋의 Git 이력
  - **PR**: 로컬 워크플로우로 생성하지 않음
  - **Test/Log**: [tasks.md 테스트 실행 기록](./tasks.md#테스트-실행-기록)

## D007: OmniVoice 허밍 timbre와 결정적 pitch guide의 혼합 (2026-08-05)

- **Context**: oscillator 안내음은 음정은 정확하지만 사용자가 따라 부를 보컬 예시로는 기계적으로 들린다.
- **Constraints**: OmniVoice API는 MIDI/F0 contour를 받지 않음, 80 BPM/12초 타임라인 고정, 세 preset 음정 정확도 유지, 런타임 모델 의존 금지
- **Options**: 전체 멜로디를 TTS로 생성, oscillator 유지, 지속 허밍 seed를 DSP로 보정해 oscillator와 혼합
- **Decision**: OmniVoice에서 고정 seed의 dry sustained humming을 생성하고 실제 F0를 측정한 뒤, preset별 목표 MIDI에 맞춘 허밍 80%와 sine 20% 정적 WAV를 생성한다.
- **Rationale**: 사람 목소리의 자연스러운 timbre를 얻으면서 TTS가 보장하지 못하는 음정·박자 정확도를 DSP와 oscillator 기준음으로 보완한다.
- **Trace**:
  - **DOING 시작 시점**: 생성 자산과 재생용 manifest를 커밋하고 브라우저는 정적 WAV를 우선 사용하되 로드 실패 시 기존 oscillator로 fallback한다.
  - **DONE 전 확정 시점**: OmniVoice 0.4.2가 생성한 seed 중 450ms 구간 pitch spread가 각각 0.49/0.50/0.70 semitone인 입력만 채택했다. 최종 12초 자산은 low 47.8–57.1, medium 54.8–64.0, high 60.0–69.0 MIDI로 목표 오차 0.5 이내이며, 실제 브라우저에서 재생 중 잠금과 종료 후 복귀를 확인했다.
  - **후속 변경**: T08의 자유곡 간소화 결정으로 허밍 자산, 생성 스크립트와 preview UI를 모두 제거했다.
- **Evidence**:
  - **Commit**: 일곱 번째 태스크 커밋의 Git 이력
  - **PR**: 로컬 워크플로우로 생성하지 않음
  - **Test/Log**: [tasks.md 테스트 실행 기록](./tasks.md#테스트-실행-기록)

## D008: 익숙한 노래 한 소절 기반의 간소화 측정 과제 (2026-08-05)

- **Context**: 안내음·preset·발성 과제는 측정 통제력은 높지만 첫 사용자가 녹음을 시작하기 전에 이해해야 할 내용과 실패 가능성을 늘린다.
- **Constraints**: 별도 훈련 없이 즉시 수행, 실제 노래 발성, 최소 8초 분석 gate, 반주 없는 단일 보컬, 전체 음역으로 과대 해석하지 않기
- **Options**: Major 5th 고정 과제, 자유곡과 보조 glissando, 익숙한 노래 한 소절만 녹음
- **Decision**: “가볍게 노래 한 소절을 불러주세요. 애국가, 생일축하 노래 등 상관없어요”를 핵심 안내로 사용하고 10–30초 권장, 수동 정지, 30초 자동 종료의 자유 가창을 unsegmented 분석한다.
- **Rationale**: 사용자가 이미 아는 멜로디를 평소 발성으로 부르게 해 진입 장벽을 최소화하고, 결과 문구를 “이번 소절에서 관찰된 음역”으로 제한해 곡 선택에 따른 편향을 투명하게 드러낸다.
- **Trace**:
  - **DOING 시작 시점**: 모든 guide 자산과 preview를 제거하고 브라우저는 audio 파일만 전송해 analyzer의 전체 voiced frame 통계를 사용한다.
  - **DONE 전 확정 시점**: `/profile`에서 핵심 문구, 10–30초·반주 없음·편안한 키 안내와 30초 자동 종료 설명을 확인했다. 24초 fixture를 segment field 없이 제출해 “이번 소절 음역” 결과가 생성됐고 테스트 profile의 DB row와 원본 파일을 삭제했다.
- **Evidence**:
  - **Commit**: 여덟 번째 태스크 커밋의 Git 이력
  - **PR**: 로컬 워크플로우로 생성하지 않음
  - **Test/Log**: [tasks.md 테스트 실행 기록](./tasks.md#테스트-실행-기록)

## D009: 최소 분석 길이를 5초로 완화 (2026-08-06)

- **Context**: 실제 검증용 `vocal1.wav`가 7.152초로 기존 8초 gate에서 분석 전에 거절됐다.
- **Constraints**: 짧은 입력도 최소 voiced frame과 기존 무음·clipping·voiced ratio 품질 gate를 통과해야 하며 10–30초 권장 안내는 유지한다.
- **Options**: 8초 유지, 검증 파일을 인위적으로 늘림, 최소 gate를 5초로 낮춤.
- **Decision**: decoded duration 최소값을 5초로 낮추고 `TOO_SHORT` 상세 문구와 UI 재시도 안내를 같은 기준으로 맞춘다.
- **Rationale**: 5초 입력도 pYIN에 충분한 frame을 제공하며 다른 품질 gate가 신뢰하기 어려운 입력을 계속 차단한다.
- **Trace**:
  - **DOING 시작 시점**: 7.152초 파일이 오직 `TOO_SHORT`에서 거절됨을 확인했다.
  - **DONE 전 확정 시점**: 5초 tone fixture가 분석되고 4초 fixture는 계속 거절되며 실제 파일은 voiced ratio 0.8412로 profile 생성에 성공했다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: F004 T-F004-05 후속 변경 커밋
  - **PR**: 로컬 workflow로 생성하지 않음
  - **Test/Log**: `.venv/bin/python -m pytest tests/test_analysis.py` 6 tests PASS
- **Consequences**: 5~10초 입력은 선택한 한 소절에 더 민감하므로 UI의 10–30초 권장은 유지한다.
