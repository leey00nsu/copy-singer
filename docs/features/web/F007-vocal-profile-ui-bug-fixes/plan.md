# Implementation Plan: vocal-profile-ui-bug-fixes

> 승인된 spec.md를 구현 SSOT로 사용합니다.

---

## 개요

- **기능 ID**: F007
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-06
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| --- | --- | --- |
| MIME 정규화 | Python 문자열 media type canonicalization | 외부 의존성 없이 `Content-Type` parameter를 분리하고 기존 allowlist를 재사용 |
| 컨테이너 검증 | 기존 FFmpeg `standardize_audio` | 클라이언트 MIME을 신뢰하지 않고 실제 WebM/Opus 디코딩 가능 여부를 검증 |
| API 회귀 테스트 | FastAPI TestClient + FFmpeg 생성 fixture | 브라우저와 같은 multipart MIME 및 실제 Opus payload를 analyzer 경계에서 검증 |
| 전체 회귀 | pytest, TypeScript, ESLint, production build | 기존 보컬 프로필·추천·합성 흐름에 영향이 없는지 확인 |
| 웹 런타임 | Next.js 16.3.0 Node.js App Router | 사용자가 요청한 공식 Next.js로 복원하고 Prisma/PostgreSQL의 Node 계약 유지 |
| 패키지 관리 | pnpm 11.9.0 | 단일 lockfile과 빠른 재현 가능한 설치 사용 |
| 시각화 descriptor | pYIN MIDI histogram + bounded time series | 전체 원시 frame을 저장하지 않고 그래프 재현에 필요한 정보만 보존 |
| 결과 그래프 | React + 반응형 SVG | 새 차트 의존성 없이 SSR·접근성·디자인 제어 유지 |

---

## 원인과 수정 경계

```text
MediaRecorder
  -> File.type = audio/webm;codecs=opus
  -> browser FormData multipart part Content-Type 유지
  -> Next route body/content-type streaming proxy
  -> FastAPI UploadFile.content_type
  -> 현재: ALLOWED_MIME_TYPES.get(full string) => None => HTTP 415
  -> 수정: base media type 정규화 => audio/webm => allowlist
  -> FFmpeg 실제 디코딩
  -> librosa 분석 및 recording metadata 저장
```

Next route는 multipart body를 그대로 analyzer에 전달하므로 브라우저 MIME 정보가 사라지는 문제가 아니다. 수정 책임은 지원 형식을 판별하는 analyzer 입구에 둔다. `UploadFile.content_type`을 소문자화한 뒤 첫 `;` 앞의 base media type을 trim해 allowlist와 비교하고, 응답/DB metadata에도 정규화된 값을 사용한다.

확장자만으로 허용하지 않는다. MIME이 허용되더라도 `standardize_audio`의 FFmpeg 디코딩이 실패하면 기존 `UNSUPPORTED_AUDIO` 오류를 유지한다.

두 번째 결함은 UI/API 코드를 Next.js 규약으로 작성했지만 실행기는 Sites starter의 vinext와 Cloudflare Worker였던 런타임 불일치다. `package.json`을 공식 Next.js 명령으로 전환하고 Sites/Worker/Vite 파일을 제거한다. Prisma Client는 기존 Node용 generator와 PostgreSQL adapter를 유지하며, Prisma 및 대용량 오디오 Route Handler에 `runtime = "nodejs"`를 명시한다. pnpm을 유일한 package manager로 설정하고 npm lockfile을 pnpm lockfile로 대체한다.

시각화는 `analyze_audio`가 이미 계산한 pYIN frame을 재사용한다. 유효 MIDI를 가장 가까운 반음 bin으로 집계하고 전체 유효 frame 대비 비율을 저장한다. 시간별 series는 원본 길이와 관계없이 최대 720개 bucket으로 축약하며 각 bucket에서 유효 pitch 중앙값을 사용하고 무성 bucket은 `midi: null`로 남겨 그래프 단절을 보존한다. 이 descriptor는 기존 `VocalProfile.descriptors` JSON에 저장하므로 Prisma migration은 필요하지 않다.

웹은 결과 영역을 별도 컴포넌트로 분리한다. 범위 그래프, histogram, 요약 카드, 품질 카드와 접이식 피치 trace를 순수 SVG로 렌더링하고 descriptor가 없는 기존 row에는 그래프 대신 재분석 안내를 표시한다.

---

## 파일 구조

```text
services/vocal-profile-api/
├── app/main.py              # upload MIME 정규화 후 allowlist/metadata 적용
└── tests/test_api.py        # parameterized WebM/Opus 및 손상 payload 회귀 테스트
docs/features/web/F007-vocal-profile-ui-bug-fixes/
├── spec.md
├── plan.md
├── tasks.md
└── decisions.md
package.json                         # Next scripts/dependencies, pnpm packageManager
pnpm-lock.yaml                       # dependency SSOT
tsconfig.json                        # standard Next.js compiler settings
next.config.ts                       # Node Next 설정과 upload ceiling
app/api/**/route.ts                  # server-only route의 Node runtime 선언
components/vocal-profile-results.tsx # 반응형 결과 대시보드
lib/vocal-profile/visualization.ts   # descriptor parsing, MIDI axis/chart helpers
```

제거 대상은 `.openai/hosting.json`, `vite.config.ts`, `build/sites-vite-plugin.ts`, `worker/index.ts`, `package-lock.json`과 vinext/Cloudflare/Vite/Wrangler 전용 의존성이다.
Next.js 16.3이 실행 모드별 경로로 다시 생성하는 `next-env.d.ts`는 공식 지침에 따라 Git 추적에서 제외하고 `.gitignore`로 관리한다.

---

## 테스트 전략

- **재현 테스트**: `audio/webm;codecs=opus` multipart가 수정 전 HTTP 415임을 확인한다.
- **API 통합 테스트**: 기존 guided WAV fixture를 FFmpeg로 WebM/Opus로 변환하고 parameterized MIME으로 `/v1/analyze`에 제출해 200과 정규화된 `audio/webm` metadata를 확인한다.
- **보안·오류 회귀**: `text/plain`은 415, 허용 MIME을 사용한 손상 payload는 성공하지 않는지 확인한다.
- **전체 회귀**: `services/vocal-profile-api/.venv/bin/python -m pytest services/vocal-profile-api/tests`, `pnpm exec tsc --noEmit`, `pnpm run lint`, `pnpm test`를 실행한다.
- **로컬 UI 확인**: Docker analyzer 재빌드 후 브라우저 MediaRecorder 파일로 보컬 프로필 생성이 성공하는지 확인한다. 자동 테스트가 통과해도 사용자 수동 확인이 필요한 경우 구현 완료 결과에 명시한다.
- **런타임 E2E**: 실제 `next dev`를 빈 포트에서 시작하고 parameterized WebM을 `/api/vocal-profiles`로 제출해 HTTP 201, DB row와 삭제 cleanup을 확인한다.
- **패키지 재현성**: `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit`을 검증한다.
- **분석 단위 테스트**: histogram 합계, pitch track 최대 720개, 무성 bucket 보존과 기존 통계 불변을 Python 테스트로 검증한다.
- **UI 단위 테스트**: descriptor parser와 MIDI axis helper를 Node 테스트로 검증하고 descriptor 누락 fallback을 확인한다.
- **브라우저 시각 검증**: 실제 분석 fixture로 데스크톱·모바일 결과 화면을 캡처해 그래프 overflow, 레이블과 카드 재배치를 확인한다.

---

## 위험과 대응

- Content-Type parameter를 무시하면 위장 파일도 allowlist를 통과할 수 있지만, 성공 여부는 기존 FFmpeg 디코딩이 다시 검증한다.
- parameter 전체를 DB에 저장하지 않아 codec 정보는 사라지지만 현재 계약은 컨테이너 MIME만 사용하며 원본 파일은 그대로 보존한다.
- 테스트 fixture 생성은 서비스의 필수 런타임인 FFmpeg를 사용하므로 테스트 환경에서 FFmpeg 부재 시 명확히 실패하게 한다.
- 이번 feature에서는 로컬 Docker 코드만 변경하며 배포하지 않는다.
- Next.js 전환 중 기존 실행 서버는 종료하고 검증 서버는 테스트 종료 후 정리한다.
- 다운샘플링은 원본 frame을 그대로 재현하지 않으므로 UI에 상세 추적이 시각화용 요약임을 명시한다.
- 구간이 매우 좁을 때에도 MIDI 축에 최소 폭을 두어 범위와 histogram이 겹치지 않게 한다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
