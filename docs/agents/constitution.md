# Vocal Loom Constitution

프로젝트의 핵심 원칙과 기술 결정 가이드라인입니다.
모든 개발 결정은 이 문서를 기준으로 합니다.

> **📌 문서 범위**
>
> - **이 문서**: 기술 스택, 아키텍처 원칙, 코드 품질, 보안 원칙
> - **PRD**: 제품 요구사항, 비즈니스 로직, 사용자 스토리 → `prd/*.md`

---

## 프로젝트 미션

권한이 있는 가창 데이터를 이용한 singing voice conversion을 안전하고 비용 예측 가능한 로컬 워크벤치로 제공한다.

---

## 기술 스택

### Backend

| 기술         | 버전   | 이유        |
| ------------ | ------ | ----------- |
| Python | 3.10+ | SoulX-Singer 및 Modal 런타임 호환 |
| FastAPI | 0.116.1 | multipart API와 비동기 작업 엔드포인트 |
| Modal | CLI 1.x | serverless L4 GPU, Volume, Dict, FunctionCall |
| SoulX-Singer | pinned commit | 재현 가능한 SVC 추론 |

### Frontend

| 기술        | 버전   | 이유        |
| ----------- | ------ | ----------- |
| React | 19.2 | UI 런타임 |
| Next-compatible App Router | 16.x surface | same-origin 서버 프록시와 UI 라우팅 |
| vinext | 1.0 beta | 로컬 및 Cloudflare Worker 호환 빌드 |
| Tailwind CSS | 4.x | 스타일 시스템 |
| shadcn/ui | 4.x | 접근 가능한 UI 기반 컴포넌트 |

### 공통

| 기술              | 버전   | 이유        |
| ----------------- | ------ | ----------- |
| TypeScript        | strict | 타입 안전성 |
| ESLint            | 9.x    | 코드 품질   |
| npm               | lockfile | 의존성 재현성 |
| lee-spec-kit      | 0.8.8  | PRD → idea → feature 문서 추적 |

---

## 아키텍처 원칙

- 브라우저는 Modal을 직접 호출하지 않고 Next.js API proxy만 호출한다.
- Next.js proxy는 오디오를 재파싱·버퍼링하지 않고 multipart body를 스트리밍한다.
- CPU web function은 접수와 상태 관리를, GPU worker는 모델 추론을 담당한다.
- 모델과 작업 파일은 서로 다른 Modal Volume 관심사로 분리한다.
- 기능 작업의 SSOT는 활성 lee-spec-kit feature의 `spec.md`, `plan.md`, `tasks.md`, `decisions.md`다.

---

## 코드 품질 기준

- Web 변경은 `npx tsc --noEmit`, `npm run lint`, `npm run build`를 통과한다.
- Modal 변경은 최소 Python compile 검사와 실제 health/작업 상태 검증을 수행한다.
- 실제 완료되지 않은 작업을 문서에서 `[DONE]`으로 표시하지 않는다.
- 요구사항 또는 사용자-visible 동작이 바뀌면 PRD 및 활성 feature 문서를 같은 변경에서 동기화한다.

---

## 보안 원칙

- `MODAL_API_KEY`와 `SOULX_API_KEY`는 소스, 문서 예시 값, 클라이언트 번들에 기록하지 않는다.
- `.env.local`은 Git에 포함하지 않는다.
- 로그에 Secret이나 사용자 오디오 내용을 출력하지 않는다.
- 공개 서비스 전 사용자 인증, rate limit, 동의 및 악용 대응을 별도 feature로 구현한다.

---

## 언어/코드 규칙

- **답변**: 한국어
- **코드/파일명**: 영어
- **주석**: 영어 우선
- **커밋**: 프로젝트 기존 이력과 lee-spec-kit 규칙을 따른다
- **날짜/시간**: 사용자 PC 시스템 시간 기준 (예: `2026-08-05`)
