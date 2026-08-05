# web Feature 목록

이 폴더는 `web` 컴포넌트의 Feature 문서를 보관합니다.

- 새 Feature 생성: `npx lee-spec-kit feature <name> --component web`
- 워크플로우 문서 읽기: `npx lee-spec-kit docs get agents --json`

## 컴포넌트 범위

- `app/`: App Router 페이지와 Modal proxy API routes
- `components/`: 업로드, waveform, advanced settings, 상태 및 결과 UI
- `public/`: 제품 메타데이터와 정적 자산
- `tests/`: 렌더링 및 웹 회귀 검증

웹 feature는 사용자 흐름, 브라우저 검증, API proxy 계약, 접근성 변경을 관리합니다.
