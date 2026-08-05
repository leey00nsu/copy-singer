# Tasks: song-catalog-profiles

## 로컬 추적 정보

- **문서 상태**: Approved
- **레포**: copy-singer-data
- **브랜치**: `feat/song-catalog-profiles`
- **대기 중 변경 요청**: 결정: changes_requested — 곡 분석 결과를 PostgreSQL이 아닌 배포 가능한 JSON artifact에 저장
- **PR 리뷰**: -
- **PR 리뷰 Evidence**: -

## 태스크 목록

- [DONE][PRD-FR-005][PRD-DATA-004] T-F003-01 100곡 카탈로그 원본과 parser 계약 추가
  - Date: 2026-08-05
  - Acceptance:
    - 100곡과 1~100 연속 순위, 고유 video ID를 검증한다.
    - 제목이 같고 가수가 다른 곡은 별도 곡으로 유지한다.
  - Checklist:
    - [x] 제공 Markdown을 프로젝트 data catalog로 보존
    - [x] parser와 validation 단위 테스트

- [DONE][PRD-FR-005][PRD-DATA-005] T-F003-02 Prisma idempotent catalog import 구현
  - Date: 2026-08-05
  - Acceptance:
    - import를 두 번 실행해도 100곡이며 metadata가 최신 입력과 일치한다.
  - Checklist:
    - [x] import CLI 및 npm script
    - [x] PostgreSQL 통합 검증

- [DONE][PRD-FR-006][PRD-DATA-006][PRD-NFR-003] T-F003-03 일시적 yt-dlp 다운로드와 Demucs 보컬 분리 pipeline 구현
  - Date: 2026-08-05
  - Acceptance:
    - 고정 URL을 OS 임시 디렉터리의 WAV로 받고 vocals stem을 같은 작업 경계에서 생성한다.
    - 개별 실패를 저장하고 READY 결과는 resume 시 건너뛴다.
    - 성공·실패 후 원본과 모든 stem이 제거된다.
  - Checklist:
    - [x] subprocess 인자 배열과 dependency preflight
    - [x] limit/rank/resume 옵션
    - [x] finally cleanup과 시작 시 잔여 임시 디렉터리 정리

- [DONE][PRD-FR-007][PRD-DATA-006][PRD-NFR-004] T-F003-04 곡 분석 endpoint와 SONG profile 저장 구현
  - Date: 2026-08-05
  - Acceptance:
    - vocals stem을 사용자와 동일한 analyzer로 처리해 Recording/VocalProfile/Song을 연결한다.
    - DB에는 링크·집계값·버전만 남고 음원 파일 경로는 남지 않는다.
  - Checklist:
    - [x] analyzer 내부 song endpoint
    - [x] Prisma transaction 및 metadata version 기록
    - [x] Python/TypeScript 회귀 테스트

- [DONE][PRD-FR-005][PRD-FR-006][PRD-FR-007] T-F003-05 소규모 실행 스모크와 로컬 사용 문서화
  - Date: 2026-08-05
  - Acceptance:
    - 최소 1곡의 download→separate→analyze 흐름을 확인하거나 외부 제한 원인을 명시한다.
    - 100곡 batch와 재시작 명령을 README에서 재현할 수 있다.
  - Checklist:
    - [x] 전체 자동 테스트
    - [x] 스모크 로그와 알려진 제약 기록
    - [x] README 실행 절차

- [DOING][PRD-FR-005][PRD-FR-006][PRD-DATA-006] T-F003-06 곡 profile 저장소를 versioned JSON artifact로 전환
  - Date: 2026-08-05
  - Acceptance:
    - artifact는 100개 항목과 schema/tool version을 포함하고 곡별 READY/FAILED/PENDING 상태를 재개할 수 있다.
    - batch 분석은 PostgreSQL에 VocalProfile 또는 Recording을 생성하지 않는다.
    - 기존 로컬 F003 분석 DB 행을 제거하고 JSON artifact만으로 동일한 결과를 검증한다.
  - Checklist:
    - [ ] artifact schema/parser/atomic writer와 테스트
    - [ ] batch CLI의 Prisma 의존 제거
    - [ ] 기존 F003 DB profile 안전 제거
    - [ ] 실제 100곡 artifact 생성 및 검증

## 완료 조건

- [ ] 모든 태스크가 `[DONE]`이며, 각 태스크의 Acceptance 검증 및 Checklist 체크 완료
- [ ] 테스트 실행 및 통과
- [ ] 최종 결과 공유 및 workflow audit 통과

### 테스트 실행 기록

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `npx tsc --noEmit && npm run lint && npm test` | `2026-08-05` | PASS — build, TS contract, SSR 2건, catalog 4건 |
| `services/vocal-profile-api/.venv/bin/python -m pytest services/vocal-profile-api/tests` | `2026-08-05` | PASS — 14 tests, success/failure cleanup 및 allowlist 포함 |
| `DATABASE_URL=... npm run db:validate` | `2026-08-05` | PASS — Prisma schema valid |
| `DATABASE_URL=... npm run catalog:verify` | `2026-08-05` | PASS — 100곡 일치, READY 1곡의 URL/DELETED/cleanupConfirmed 검증 |
| `DATABASE_URL=... npm run catalog:analyze -- --rank 1 --resume` | `2026-08-05` | PASS — 실제 1곡 download→Demucs→pYIN, succeeded=1 |
| `docker compose build vocal-profile-api && curl .../health` | `2026-08-05` | PASS — CPU image, yt-dlp 2026.7.4, Demucs 4.0.1, allowlist 100 |
