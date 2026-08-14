# Decisions: song-catalog-audio-format-parity

## 작성 규칙

- 각 결정은 Context / Constraints / Options / Decision / Rationale / Trace / Evidence / Consequences를 기록합니다.
- 구현 전에는 초기 가설을 기록하고, 완료 직전에 실제 검증 결과와 commit/test evidence로 보강합니다.

---

## D028-01: 분석·카탈로그 업로드 포맷을 완전 동일하게 유지 (2026-08-14)

- **Context**: 보컬 분석 input은 `.wav,.mp3,.m4a,.webm`을 명시하지만 관리자 카탈로그의 곡 추가·target 업로드·출처 교체 input은 `audio/*,.flac`만 사용한다. 서버 `uploadAdminCatalogTarget`은 `audio/mp4`와 `audio/aac`을 이미 허용하지만 포맷 계약이 별도로 중복되어 브라우저 file picker와 server validation이 drift할 수 있다.
- **Constraints**: 카탈로그의 49MB 제한, WAV RIFF 검증, SHA-256 idempotency와 Leemage 저장 정책은 유지한다. 사용자는 분석과 카탈로그 양쪽 모두 FLAC을 지원하지 않도록 명시했으며 transcoding은 도입하지 않는다.
- **Options**: (a) CatalogManager input에 `.m4a`만 하드코딩 추가, (b) 분석/카탈로그 각각 별도 상수를 확장, (c) shared 오디오 포맷 계약을 만들고 두 경로가 정확히 같은 집합을 사용.
- **Decision**: (c)를 채택한다. shared 집합은 `.wav/.mp3/.m4a/.webm`과 `audio/wav`, `audio/x-wav`, `audio/mpeg`, `audio/mp4`, `audio/aac`, `audio/x-m4a`, `audio/webm`으로 정의한다. 카탈로그의 기존 `.flac`/`audio/flac`과 `audio/*` wildcard는 제거한다. 같은 shared 계약에서 file input `accept`와 사용자-visible `WAV · MP3 · M4A · WEBM` 안내 문구를 파생한다.
- **Rationale**: 사용자가 요구한 것은 m4a 단일 예외가 아니라 분석 업로드와 카탈로그 업로드의 완전한 포맷 정합성과 사전 안내다. 공용 계약을 두면 UI `accept`, 지원 형식 문구, 서버 MIME 검증이 함께 움직여 이후 drift가 재발하는 것을 줄일 수 있다.
- **Trace**:
  - **초기 확인**: `VoiceScanInput`은 `.wav,.mp3,.m4a,.webm`을 명시하고 `analysisAudioFileSchema`/queue는 wav/mpeg/mp4/aac/webm MIME을 허용한다. `CatalogManager` 세 input은 `audio/*,.flac`, `uploadAdminCatalogTarget`은 wav/mpeg/mp4/aac/webm/flac MIME을 허용하는 것을 확인했다.
  - **구현 완료 전**: `SUPPORTED_AUDIO_UPLOAD_EXTENSIONS/MIME_TYPES/ACCEPT/FORMAT_LABEL`을 shared SSOT로 추가하고 분석 schema/queue와 관리자 target server가 이를 사용하도록 전환했다. `CatalogManager`의 곡 추가·target 업로드·출처 교체 세 input은 동일한 공용 input component를 사용해 `audio/*`/FLAC 없이 같은 accept와 지원 형식 안내를 표시하며, `VoiceScanInput`도 같은 표시 문구를 사용한다.
- **Evidence**:
  - **Commit**: `96d63bf` (`feat(F028): 오디오 업로드 포맷 계약 통일`), `5f5d9b0` (`feat(F028): m4a 선택·서버 검증 회귀 테스트`)
  - **Test/Log**: typecheck·lint PASS, architecture 4/4, 보컬 분석 queue 5/5, song analysis/admin catalog 6/6, 포맷/API 계약 11/11, CatalogManager+VoiceScanInput Storybook 17/17, 전체 Storybook 최종 52 passed + 2 skipped / 154 tests PASS. 전체 Storybook 최초 실행의 기존 VoiceOrb readiness 1건은 해당 story 단독 4/4 PASS 후 재실행에서 전체 green 확인.
- **Consequences**: 분석과 카탈로그는 같은 네 확장자만 지원하고 FLAC은 양쪽에서 거절된다. 모든 관련 file input은 같은 지원 확장자 안내를 표시한다. 포맷 허용 여부와 codec 변환 가능 여부는 별개이며 이 feature는 transcoding을 추가하지 않는다.
