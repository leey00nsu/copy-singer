# Implementation Plan: song-catalog-audio-format-parity

> 스펙 승인 후 구현합니다.

---

## 개요

- **기능 ID**: F028
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-14
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| --- | --- | --- |
| 공용 계약 | `src/shared/lib/audio` TypeScript 상수/헬퍼 | client `accept`와 server MIME 검증의 단일 SSOT |
| 분석 검증 | Zod file schema + analysis queue | 기존 크기/queue 정책 유지 |
| 카탈로그 검증 | `uploadAdminCatalogTarget` MIME Set | 기존 49MB/WAV/idempotency 정책 유지 |
| UI | `CatalogManager`, `VoiceScanInput` native file input | 브라우저 파일 선택 단계에서 확장자 명시 |
| 검증 | unit/integration + Storybook + type/lint/architecture | 브라우저 accept와 서버 계약 동시 회귀 방지 |

---

## 아키텍처

- `src/shared/lib/audio/upload-formats.ts`에 분석/카탈로그 공용 업로드 포맷을 단일 SSOT로 정의한다.
  - extensions: `.wav`, `.mp3`, `.m4a`, `.webm`
  - MIME: `audio/wav`, `audio/x-wav`, `audio/mpeg`, `audio/mp4`, `audio/aac`, `audio/x-m4a`, `audio/webm`
  - client `accept` 문자열과 `WAV · MP3 · M4A · WEBM` 사용자-visible 안내 문구는 위 집합에서 파생한다.
- `analyze-vocal-profile`과 `manage-song-catalog`은 동일한 MIME/accept 계약을 사용하고 크기 제한 등 feature별 정책만 각 feature에 유지한다.
- `.flac`, `audio/flac`, `audio/*` wildcard는 관리자 카탈로그 업로드 계약에서 제거한다.
- 포맷 허용은 validation 계약 통일이며 transcoding을 새로 수행하지 않는다.

---

## 예상 변경 파일

```text
src/shared/lib/audio/upload-formats.ts
src/shared/lib/audio/index.ts
src/_pages/profile/ui/voice-scan-input.tsx
src/features/analyze-vocal-profile/model/contract.ts
src/features/analyze-vocal-profile/api/analysis-queue.ts
src/features/manage-song-catalog/ui/catalog-manager.tsx
src/features/manage-song-catalog/api/target-assets.ts
src/features/manage-song-catalog/ui/catalog-manager.stories.tsx
tests/*audio-format*.test.ts 또는 관련 기존 테스트
```

---

## 테스트 전략

- shared contract: 공통 확장자/MIME/accept/표시 문구를 단위 검증하고 FLAC이 포함되지 않음을 확인.
- browser UI: `CatalogManager` 세 file input의 동일한 `accept`와 지원 형식 안내, `VoiceScanInput`의 같은 안내를 Storybook에서 검증.
- server: `audio/mp4`, `audio/aac`, `audio/x-m4a` 허용과 unsupported MIME 415 유지 검증.
- regression: 보컬 분석과 카탈로그 모두 `.wav/.mp3/.m4a/.webm`만 허용하고 FLAC을 거절.
- final: `pnpm run typecheck`, `pnpm run lint`, `pnpm run check:architecture`, 관련 테스트 및 Storybook.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
