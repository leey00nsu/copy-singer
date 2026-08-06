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
  - **DONE 전 확정 시점**: Sites/vinext/Vite/Worker 실행 파일과 전용 의존성을 제거하고 Next.js 16.3.0의 `next dev/build/start`로 교체했다. `pnpm@11.9.0`과 `pnpm-lock.yaml`을 패키지 설치 SSOT로 고정했으며 서버 Route Handler에는 Node runtime을 명시했다. 실제 `next dev` HTTP 요청에서 parameterized WebM 분석과 PostgreSQL 저장이 201로 성공했고 테스트 데이터를 삭제했다. Next.js 16.3이 `dev`와 `build`에서 서로 다른 generated type 경로로 덮어쓰는 `next-env.d.ts`는 공식 지침대로 Git 추적에서 제외했다.
  - **머지 후 확인**: 병합 후 기록 예정.
- **Evidence**:
  - **Commit**: T-F007-02 태스크 커밋.
  - **PR**: 로컬 workflow로 생성하지 않음.
  - **Test/Log**: 2026-08-06 vinext HTTP 500 대 Node route HTTP 201 비교 및 Worker 예외 캡처. 전환 후 frozen install, Next production build, lint, TypeScript, Python 20 tests, Node 전체 회귀, DB recommendation 3 tests가 통과했으며 `next start` health가 HTTP 200을 반환했다.
- **Consequences**: Sites 배포 설정은 제거되며 추후 배포 대상은 별도 feature에서 명시적으로 선택한다.

---

## D003: F007을 버그 수정과 보컬 프로필 UI 개선 범위로 확장 (2026-08-06)

- **Context**: 사용자는 집계 숫자 중심 결과 대신 첨부 레퍼런스처럼 음역, 분포, 품질과 상세 피치 흐름을 시각적으로 확인하고 F007 안에서 계속 작업하기를 요청했다.
- **Constraints**: 현재 API는 집계 통계만 반환하며 전체 원시 pYIN frame 저장은 PRD에서 제외한다. 기존 프로필과 추천 흐름은 깨지지 않아야 한다.
- **Options**: 집계값만으로 유사 그래프를 추정하기, 전체 raw frame을 저장하기, histogram과 bounded series만 descriptor로 저장하기를 비교했다.
- **Decision**: F007을 버그 수정 및 UI 개선 feature로 유지하고 T03 데이터 계약, T04 UI 순으로 확장한다. 전체 raw frame 대신 반음 histogram과 최대 720개 bucket의 시각화 series를 저장한다.
- **Rationale**: 그래프를 실제 관측 데이터로 표현하면서 개인정보·DB 크기와 응답 크기를 제한하고 별도 migration 없이 기존 JSON descriptor를 재사용한다.
- **Trace**:
  - **요청 시점**: 첨부 UI를 기준으로 분석 데이터를 시각화하고 F007 안에서 진행하도록 사용자 요청.
  - **구현 전 확정 시점**: `pitchHistogram`, `pitchTrack` 계약과 기존 descriptor fallback을 spec/plan/tasks에 반영.
  - **DONE 전 확정 시점**: pYIN frame에서 반음 histogram과 최대 720 bucket의 pitch track을 생성하고 descriptor JSON으로 저장했다. 기존 5.4초 WebM의 실제 Next HTTP 분석에서 histogram 10 bins, track 466 points와 무성 구간을 확인하고 생성된 DB/recording fixture를 삭제했다. React 결과 대시보드에 범위·histogram·pitch trace와 품질 카드를 구현하고 데스크톱 및 375px 모바일에서 실제 분석값과 가로 overflow 부재를 검증했다.
- **Consequences**: 새로 분석한 프로필은 상세 그래프를 제공하고 기존 프로필은 집계값과 재분석 안내를 제공한다. 내보내기와 외부 공유는 실제 제품 계약이 없어 제외한다.

---

## D004: 긴 파일은 클라이언트 확인 후 서버에서 최초 유효 음성 기준으로 trim (2026-08-06)

- **Context**: 60초 초과 파일이 곧바로 `TOO_LONG`으로 거부되어 사용자가 외부 편집기로 직접 잘라야 했다. 사용자는 확인 대화상자에서 동의하면 첫 음부터 60초로 자동 자르기를 요청했다.
- **Constraints**: 브라우저에서 MP3·M4A·WebM·WAV를 공통 재인코딩하기 어렵고, 자동 자른 파일은 분석뿐 아니라 후속 합성 reference와도 일치해야 한다.
- **Options**: 브라우저 Blob byte slice, 브라우저 FFmpeg 번들, 서버 FFmpeg trim을 비교했다.
- **Decision**: 브라우저는 duration 안내와 동의만 담당하고, analyzer가 `-45 dB` 최초 유효 음성부터 최대 60초 mono 22,050Hz WAV를 생성해 분석·보관한다.
- **Rationale**: 압축 포맷의 임의 byte 절단을 피하고 기존 FFmpeg 신뢰 경계에서 모든 형식을 동일하게 처리하며, 저장 reference와 분석 입력을 일치시킨다.
- **Trace**:
  - **요청 시점**: 긴 파일 선택 시 자동 자르기 예/아니오 대화상자와 첫 음부터 60초 처리 요청.
  - **구현 전 확정 시점**: T05와 FR-8/FR-9에 UI·multipart·FFmpeg·storage 계약 반영.
  - **DONE 전 확정 시점**: 브라우저가 HTML media metadata로 70초 MP3를 감지하고 접근 가능한 확인 대화상자를 표시하도록 구현했다. `아니오`는 파일을 반영하지 않았고 `예`는 multipart 동의 플래그와 상태 안내를 적용했다. analyzer는 `silenceremove`의 `-45 dB` 기준과 60초 출력 제한으로 mono 22,050Hz `source.wav`를 생성해 같은 파일을 분석·보관한다. 선행 무음 5초와 유효 음성 65초 fixture 및 실제 Next HTTP 분석에서 결과 길이 60.0초, 저장 WAV metadata와 cleanup을 확인했다.
- **Evidence**:
  - **Commit**: T-F007-05 태스크 커밋.
  - **PR**: 로컬 workflow로 생성하지 않음.
  - **Test/Log**: Python 23 tests, Next production build와 Node 전체 테스트, lint, TypeScript, DB integration 3 tests 통과. 로컬 브라우저에서 70초 MP3 modal 양쪽 경로와 실제 분석 201을 확인하고 검증 데이터를 삭제함 (2026-08-06).
- **Consequences**: 동의한 긴 파일은 원본 컨테이너 대신 trim된 WAV가 보관되며, 거절하면 서버로 전송하지 않는다.

---

## D005: 원키 음색 데모에 맞춰 대칭 적합도와 원키 중심 순위를 사용 (2026-08-06)

- **Context**: 추천 합성은 `auto_pitch_shift=false`, `pitch_shift=0`으로 원곡 피치를 따르지만 Top 3는 최대 조정 점수만으로 정렬했다. 곡 폭 기준 overlap 때문에 100곡 중 가장 좁은 `아크라포빅`이 서로 다른 실제 사용자 profile에서도 반복 1위였다.
- **Constraints**: 현재 aggregate profile과 추천 키 계산, 결정성, 기존 DB 실행 조회를 유지해야 하며 100곡 전체 재분석이나 피치 히스토그램 추가는 이번 수정의 선행 조건으로 만들지 않는다.
- **Options**: `originalKeyScore` 단독 정렬, `아크라포빅` 하드 제외, 대칭 overlap과 원키/조정/shift 복합 selection score를 비교했다.
- **Decision**: `key-fit-v2`에서 Sørensen–Dice 테시투라 overlap을 사용한다. Top 3는 원키 65%, 조정 35%와 shift 0~6의 `0/1/3/7/12/20/30` 감점으로 선택하며 합성 결과를 `원키 음색 데모`로 표시한다.
- **Rationale**: 특정 곡을 임의 차단하지 않고 좁은 구간 편향을 일반적으로 해소하며, 원키 데모와 순위를 정렬하면서 사용자가 노래방에서 활용할 추천 키도 보존한다.
- **Trace**:
  - **변경 요청 시점**: 사용자는 피치 보정 없는 원음 중심 합성과 현재 추천식의 불일치를 지적하고 수정을 요청했다.
  - **구현 전 확인**: `아크라포빅` 테시투라는 4.4반음으로 100곡 최협이며 현재 DB의 비-seed 추천 2건에서 모두 1위였다. 기존 고음 실제 profile은 v2 시뮬레이션에서 원키 적합 곡이 1위로 변경됐다.
  - **DONE 전 확정 시점**: `key-fit-v2` Dice overlap과 원키 65%·조정 35%·단계형 shift 감점 selection score를 구현했다. 실제 저장 고음 profile의 Top 3는 `잊었니` 원키, `붉은 노을` 원키, `천상연` +2키로, 중간·넓은 profile은 `소녀`, `Lemon`, `죽일 놈`으로 분산됐다. Next HTTP 새 실행에 scoring version과 selection score가 저장·조회됐고 합성은 시작하지 않은 채 fixture run을 삭제했다.
- **Evidence**:
  - **Commit**: T-F007-06 태스크 커밋.
  - **PR**: 로컬 workflow로 생성하지 않음.
  - **Test/Log**: key-fit 19, recommendation 18, DB integration 3, Python 23, production build, TypeScript와 lint 통과. 실제 Next HTTP `key-fit-v2` run 생성·조회·cleanup 확인 (2026-08-06).
- **Consequences**: 새 추천 실행은 기존 결과와 다른 순위를 가질 수 있어 scoring version을 올린다. 기존 `key-fit-v1` 실행 조회는 유지한다.
