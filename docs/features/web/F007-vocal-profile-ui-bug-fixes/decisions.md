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

---

## D002: Sites/vinext를 제거하고 공식 Next.js와 pnpm으로 복원 (2026-08-06)

- **Context**: 사용자는 로컬 Next.js 앱을 요청했지만 최초 scaffold에 Sites/vinext가 포함되어 API가 Cloudflare Worker에서 실행됐다. 실제 HTTP 프로필 저장은 `WebAssembly.Module(): Wasm code generation disallowed by embedder`로 실패했고, 같은 route를 Node에서 호출하면 PostgreSQL 저장에 성공했다.
- **Constraints**: Cloudflare 배포 요구가 없고 기존 App Router UI/API, Prisma PostgreSQL, Modal proxy를 유지해야 한다. 패키지 매니저는 사용자 요청에 따라 pnpm으로 통일한다.
- **Options**: Prisma를 Cloudflare runtime에 맞추기, DB API를 별도 Node 서비스로 분리하기, vinext를 제거하고 공식 Next.js Node 런타임으로 복원하기를 비교했다.
- **Decision**: Sites/vinext/Worker/Vite scaffold를 제거하고 Next.js 16.3.0 Node App Router로 전환한다. pnpm 11.9.0을 고정하고 npm lockfile을 교체한다.
- **Rationale**: 사용자 요구와 기존 Prisma·PostgreSQL·multipart 서버 계약에 직접 맞으며 불필요한 edge 제약과 이중 런타임을 제거한다.
- **Trace**:
  - **DOING 시작 시점**: PostgreSQL/analyzer health는 정상, vinext HTTP는 500, 동일 route의 Node 직접 호출은 201임을 확인했다. 개발용 예외 계측으로 Worker WASM 제한을 특정하고 계측을 원복했다.
  - **DONE 전 확정 시점**: Sites/vinext/Vite/Worker 실행 파일과 전용 의존성을 제거하고 Next.js 16.3.0의 `next dev/build/start`로 교체했다. `pnpm@11.9.0`과 `pnpm-lock.yaml`을 패키지 설치 SSOT로 고정했으며 서버 Route Handler에는 Node runtime을 명시했다. 실제 `next dev` HTTP 요청에서 parameterized WebM 분석과 PostgreSQL 저장이 201로 성공했고 테스트 데이터를 삭제했다.
  - **머지 후 확인**: 병합 후 기록 예정.
- **Evidence**:
  - **Commit**: T-F007-02 태스크 커밋.
  - **PR**: 로컬 workflow로 생성하지 않음.
  - **Test/Log**: 2026-08-06 vinext HTTP 500 대 Node route HTTP 201 비교 및 Worker 예외 캡처. 전환 후 frozen install, Next production build, lint, TypeScript, Python 20 tests, Node 전체 회귀, DB recommendation 3 tests가 통과했으며 `next start` health가 HTTP 200을 반환했다.
- **Consequences**: Sites 배포 설정은 제거되며 추후 배포 대상은 별도 feature에서 명시적으로 선택한다.
