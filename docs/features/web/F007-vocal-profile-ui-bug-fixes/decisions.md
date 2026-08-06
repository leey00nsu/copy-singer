# Decisions Log

기술 결정과 그 이유를 기록합니다.

---

## D001: analyzer 경계에서 parameterized MIME을 정규화 (2026-08-06)

- **Context**: `MediaRecorder`가 생성한 유효한 WebM/Opus 파일의 MIME은 `audio/webm;codecs=opus`지만 analyzer는 `audio/webm`과 완전 일치하는 값만 허용한다.
- **Constraints**: 브라우저별 WebM/MP4 parameter 차이를 수용해야 하며 파일 확장자나 클라이언트 MIME만으로 실제 오디오 유효성을 신뢰하면 안 된다.
- **Options**: 프론트에서 WAV 재인코딩, Next proxy에서 MIME 변경, analyzer 입구에서 base media type 정규화를 비교했다.
- **Decision**: 포맷 정책을 소유한 analyzer가 multipart media type의 parameter를 제거·정규화해 allowlist와 비교하고, 실제 payload는 기존 FFmpeg 단계에서 검증한다.
- **Rationale**: 브라우저 재인코딩 비용 없이 모든 호출 경로에 동일한 정책을 적용하고 기존 디코딩 보안 경계를 유지한다.
- **Trace**:
  - **DOING 시작 시점**: 로컬 analyzer에 `audio/webm;codecs=opus` multipart를 보내 HTTP 415와 `UNSUPPORTED_AUDIO`를 재현했다.
  - **DONE 전 확정 시점**: `Content-Type`을 첫 `;` 기준으로 분리하고 trim/lowercase한 base media type으로 allowlist를 조회하도록 수정했다. 실제 21초 guided WebM/Opus API 테스트와 Docker의 8초 Opus smoke test가 모두 `audio/webm` metadata로 성공했고, 손상 payload와 `text/plain`은 계속 415로 거부됐다.
  - **머지 후 확인**: 병합 후 기록 예정.
- **Evidence**:
  - **Commit**: T-F007-01 태스크 커밋.
  - **PR**: 로컬 workflow로 생성하지 않음.
  - **Test/Log**: 수정 전 `curl` 재현 415; 수정 후 Python 20/20 PASS, Docker analyzer parameterized WebM HTTP 200, Node 전체 테스트·lint·TypeScript PASS (2026-08-06).
- **Consequences**: recording metadata에는 parameter를 제외한 정규화 media type을 저장한다.
