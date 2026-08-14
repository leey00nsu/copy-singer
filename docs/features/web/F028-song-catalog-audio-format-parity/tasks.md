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
- **PR 리뷰**: -
- **PR 리뷰 Evidence**: -

---

## 태스크 목록

- [DOING][PRD-US-028][PRD-FR-059] T-F028-song-catalog-audio-format-parity-01 공용 오디오 업로드 포맷 계약 통일
  - Date: 2026-08-14
  - Acceptance:
    - 보컬 분석과 관리자 카탈로그 업로드가 정확히 같은 `.wav/.mp3/.m4a/.webm` 집합을 공통 SSOT에서 사용한다.
    - m4a의 `audio/mp4`, `audio/aac`, `audio/x-m4a` MIME이 허용된다.
    - `.flac`/`audio/flac`은 양쪽 모두 지원하지 않는다.
    - 모든 관련 file input 주변에 `WAV · MP3 · M4A · WEBM` 지원 형식이 표시된다.
  - Checklist:
    - [ ] shared audio에 공통 extensions/MIME/accept helper를 추가한다.
    - [ ] `VoiceScanInput`, analysis schema/queue의 중복 포맷 상수를 공용 계약으로 교체한다.
    - [ ] `CatalogManager` 세 file input을 공통 accept로 통일하고 `audio/*`/FLAC을 제거하며 지원 형식 안내를 표시한다.
    - [ ] `VoiceScanInput`의 기존 지원 형식 안내도 shared 표시 문구를 사용한다.
    - [ ] `uploadAdminCatalogTarget` MIME 검증을 공통 MIME만 허용하도록 통일하고 FLAC을 거절한다.

- [TODO][PRD-US-028][PRD-FR-059] T-F028-song-catalog-audio-format-parity-02 m4a 선택·서버 검증 회귀 테스트
  - Date: 2026-08-14
  - Acceptance:
    - 관리자 곡 추가·target 업로드·출처 교체 UI가 동일한 accept 계약과 지원 확장자 안내를 가진다.
    - 서버가 m4a MIME 변형을 허용하고 FLAC/미지원 MIME은 기존 415를 유지한다.
    - 보컬 분석과 카탈로그가 같은 네 확장자만 지원한다.
  - Checklist:
    - [ ] CatalogManager Storybook에서 곡 추가/교체/target input의 accept와 지원 형식 문구를 검증한다.
    - [ ] VoiceScanInput Storybook에서 동일 지원 형식 문구를 검증한다.
    - [ ] m4a MIME 변형, FLAC 거절, 기타 unsupported MIME 단위/통합 테스트를 추가한다.
    - [ ] 관련 테스트, `pnpm run typecheck`, `pnpm run lint`, `pnpm run check:architecture`를 통과한다.
    - [ ] 필요 시 전체 Storybook 회귀를 실행하고 결과를 기록한다.

---

## 완료 조건

- [ ] 모든 태스크가 `[DONE]`이며 Acceptance/Checklist가 완료됨
- [ ] 테스트 실행 및 통과 기록 완료
- [ ] 최종 결과 공유 및 workflow checkpoint 사용자 확인 기록 완료

### 테스트 실행 기록

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run typecheck` | - | - |
| `pnpm run lint` | - | - |
| `pnpm run check:architecture` | - | - |
| 관련 unit/integration/Storybook | - | - |
