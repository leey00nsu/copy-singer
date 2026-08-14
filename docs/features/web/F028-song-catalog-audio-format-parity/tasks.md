# Tasks: song-catalog-audio-format-parity

## 태스크 규칙

- **상태**: `[TODO]` → `[DOING]` → `[DONE]`
- `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 상태를 갱신합니다.
- `[DOING] → [DONE]`: Acceptance와 Checklist를 실제 검증 후 함께 완료합니다.
- 문서화된 review checkpoint와 원격/파괴적 작업 외에는 standalone 승인 단계를 추가하지 않습니다.

---

## 로컬 추적 정보

- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/song-catalog-audio-format-parity`
- **대기 중 변경 요청**: -
- **스펙 승인**: 2026-08-14 사용자 요청 `파일 인풋 모두에 지원하는 확장자 보여줬으면하고 둘다 flac도 지원하지않도록 바꿔 그 후 자동진행`을 반영한 spec을 승인하고 자동 진행
- **구현 승인**: 2026-08-14 같은 사용자 응답의 `그 후 자동진행`을 workflow 승인 옵션 `A`로 기록
- **PR 리뷰**: -
- **PR 리뷰 Evidence**: -

---

## 태스크 목록

- [DONE][PRD-US-028][PRD-FR-059] T-F028-song-catalog-audio-format-parity-01 공용 오디오 업로드 포맷 계약 통일
  - Date: 2026-08-14
  - Acceptance:
    - 보컬 분석과 관리자 카탈로그 업로드가 정확히 같은 `.wav/.mp3/.m4a/.webm` 집합을 공통 SSOT에서 사용한다.
    - m4a의 `audio/mp4`, `audio/aac`, `audio/x-m4a` MIME이 허용된다.
    - `.flac`/`audio/flac`은 양쪽 모두 지원하지 않는다.
    - 모든 관련 file input 주변에 `WAV · MP3 · M4A · WEBM` 지원 형식이 표시된다.
  - Checklist:
    - [x] `src/shared/lib/audio/upload-formats.ts`에 extensions/MIME/accept/표시 문구/normalize·support helper를 추가한다.
    - [x] `VoiceScanInput`, analysis schema/queue의 중복 포맷 상수를 공용 계약으로 교체한다.
    - [x] `CatalogManager` 세 file input을 공통 accept로 통일하고 `audio/*`/FLAC을 제거하며 지원 형식 안내를 표시한다.
    - [x] `VoiceScanInput`의 기존 지원 형식 안내도 shared 표시 문구를 사용한다.
    - [x] `uploadAdminCatalogTarget` MIME 검증을 공통 MIME만 허용하도록 통일하고 FLAC을 거절한다.

- [DONE][PRD-US-028][PRD-FR-059] T-F028-song-catalog-audio-format-parity-02 m4a 선택·서버 검증 회귀 테스트
  - Date: 2026-08-14
  - Acceptance:
    - 관리자 곡 추가·target 업로드·출처 교체 UI가 동일한 accept 계약과 지원 확장자 안내를 가진다.
    - 서버가 m4a MIME 변형을 허용하고 FLAC/미지원 MIME은 기존 415를 유지한다.
    - 보컬 분석과 카탈로그가 같은 네 확장자만 지원한다.
  - Checklist:
    - [x] CatalogManager Storybook에서 곡 추가/교체/target input의 동일 accept와 `WAV · MP3 · M4A · WEBM` 안내를 검증한다.
    - [x] VoiceScanInput Storybook에서 동일 accept와 지원 형식 안내를 검증한다.
    - [x] `audio/mp4`/`audio/aac`/`audio/x-m4a` 허용, FLAC/OGG 거절 unit test와 실제 관리자 target 업로드의 `audio/x-m4a` 허용·FLAC `UNSUPPORTED_AUDIO` 회귀를 추가한다.
    - [x] typecheck, lint, architecture 4/4, 보컬 분석 queue 5/5, song analysis/admin catalog 6/6, 포맷/API 계약 11/11을 통과한다.
    - [x] 타깃 Storybook 17/17 PASS; 전체 Storybook은 기존 VoiceOrb readiness 1건이 최초 실행에서 흔들렸으나 해당 story 단독 4/4 PASS 후 최종 전체 52 passed + 2 skipped / 154 tests PASS.

---

## 완료 조건

- [x] 모든 태스크가 `[DONE]`이며 Acceptance/Checklist가 완료됨
- [x] 테스트 실행 및 통과 기록 완료
- [x] 최종 결과 공유 및 workflow checkpoint 사용자 확인 기록 완료

- 2026-08-14 구현 승인: 사용자 응답 `파일 인풋 모두에 지원하는 확장자 보여줬으면하고 둘다 flac도 지원하지않도록 바꿔 그 후 자동진행`의 `자동진행` 요청을 workflow 승인 옵션 `A`로 기록함.

### 테스트 실행 기록

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run typecheck` | `2026-08-14` | `PASS` |
| `pnpm run lint` | `2026-08-14` | `PASS` |
| `pnpm run check:architecture` | `2026-08-14` | `PASS — Steiger 0 issues, architecture boundary 4/4` |
| `pnpm run test:vocal-profile-analysis-queue` | `2026-08-14` | `PASS — 5/5` |
| `pnpm run test:song-analysis-queue` | `2026-08-14` | `PASS — 6/6, admin m4a/FLAC server regression 포함` |
| 포맷/API 계약 | `2026-08-14` | `PASS — 11/11` |
| 타깃 Storybook | `2026-08-14` | `PASS — CatalogManager + VoiceScanInput 17/17` |
| `pnpm run test:storybook --run` | `2026-08-14` | `PASS — 54 indexed: 52 passed + 2 skipped, 154/154 tests` |

<!-- lee-spec-kit:workflow-sync 2026-08-14T08:09:01.000Z -->
