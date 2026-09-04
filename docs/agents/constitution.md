# Copysinger Constitution

프로젝트에서 쉽게 바뀌지 않아야 하는 기술·아키텍처·품질·보안 원칙을 정의한다. 제품 요구사항은 `docs/prd/`, 진행 중인 변경의 실행 기준은 활성 Feature SDD를 사용한다.

## 프로젝트 미션

사용자의 가창 특성을 설명 가능한 데이터로 분석하고, 맞는 노래와 키를 추천하며, 권한이 있는 데이터로 합성 데모까지 제공한다.

## 기술 기반

| 영역 | 기준 | 역할 |
| ---- | ---- | ---- |
| Web | TypeScript strict, React, Next.js App Router, Tailwind CSS | 제품 UI와 server-side application adapter |
| Data | PostgreSQL, Prisma schema·migration | 관계·상태·소유권의 영속 기준 |
| Analysis | Python, FastAPI, Modal CPU, librosa 기반 공유 core | 보컬 프로필과 곡 카탈로그 분석 |
| Synthesis | Modal GPU, SoulX-Singer | 권한이 있는 reference·target의 음성 합성 |
| Media | Leemage | 사용자·카탈로그·결과 오디오 bytes 저장 |
| Workflow | lee-spec-kit | PRD → Idea → Feature 문서와 검증 checkpoint 관리 |

정확한 package 버전은 root `package.json`, `pnpm-lock.yaml`과 각 Python service의 requirements를 기준으로 한다. 현재 lee-spec-kit 버전은 `npx lee-spec-kit --version`으로 확인하며 이 장기 원칙 문서에 고정하지 않는다.

## 아키텍처 원칙

- `app/`은 Next.js convention adapter로 유지하고 실제 page·API·worker 조립은 `src/_app/`과 `src/_pages/`에 둔다.
- Web 코드는 `_app -> _pages -> widgets -> features -> entities -> shared` 방향과 slice public API를 따른다.
- 브라우저는 Modal·Leemage 또는 DB를 credential과 함께 직접 호출하지 않는다. 인증·소유권·관리자 권한은 server에서 검증한다.
- 요청 시간이 긴 분석·믹싱 작업은 PostgreSQL durable job으로 먼저 기록하고 독립 worker가 lease·bounded retry·backoff로 처리한다.
- PostgreSQL schema는 Prisma migration으로만 변경한다.
- 오디오 bytes는 Leemage에, 관계·상태·소유권·hash와 외부 asset reference는 PostgreSQL에 둔다.
- 보컬 프로필과 추천은 versioned 분석 계약으로 계산한다. 검증되지 않은 local fallback으로 서비스 장애를 숨기지 않는다.
- Feature 작업의 SSOT는 활성 `spec.md`, `plan.md`, `tasks.md`, `decisions.md`다. OpenWiki는 tracked source와 curated docs에서 생성한 탐색 evidence이며 정본이 아니다.

## 코드와 문서 품질

- Web 변경은 변경 위험에 맞는 검증을 수행하고 Feature 완료 전 설정된 전체·post-merge 검사를 통과한다. 기본 정적 검사는 `pnpm run check`, 전체 suite는 `pnpm test`다.
- Modal 변경은 최소 Python compile·unit 검사를 거치고 실제 비용이 드는 검증은 필요한 범위로 제한한다.
- 실제 완료되지 않은 작업을 문서에서 `[DONE]`으로 표시하지 않는다.
- 사용자 동작이나 장기 요구사항이 바뀌면 PRD와 활성 Feature 문서를 같은 변경에서 동기화한다.
- 모든 Feature의 `plan.md`에서 Curated Documentation Impact를 판정한다. `UPDATE` 대상은 실제 task와 acceptance에 연결하고, 영향이 없으면 `NONE`을 명시한다.
- OpenWiki가 활성화된 경우 생성 페이지를 직접 편집하지 않는다. source 또는 curated docs를 고친 뒤 `knowledge sync`와 `knowledge audit`을 수행한다.
- 현재 코드의 역사적 이유는 Git commit의 `F###`를 해당 Feature의 `decisions.md`와 연결해 확인한다.

## 보안과 데이터 원칙

- API key, OAuth credential과 secret은 source, 문서 예시 값, 로그, client bundle에 기록하지 않는다.
- `.env.local`과 사용자 오디오·생성 결과는 Git에 포함하지 않는다.
- 로그는 secret이나 사용자 오디오 내용을 노출하지 않으면서 job과 stable error code를 추적할 수 있어야 한다.
- 사용자·관리자 데이터 접근은 인증과 resource ownership을 검증한다.
- 음성·음원 사용 권한과 사용자-visible 보관 정책을 유지한다.

## 언어와 이력

- 사용자 응답과 제품 문서는 한국어로 작성한다.
- 코드 식별자, 파일명, 환경 변수와 API path는 영어를 유지한다.
- 주석은 영어를 우선한다.
- 커밋은 프로젝트 이력과 lee-spec-kit의 Feature ID 규칙을 따른다.
- 날짜와 시간은 사용자 시스템 시간대를 기준으로 기록한다.
