# web Feature 목록

이 폴더는 `web` 컴포넌트의 Feature 문서를 보관한다.

- 새 Feature 생성: `npx lee-spec-kit feature <name> --component web`
- 워크플로 정책 조회: `npx lee-spec-kit docs get agents --json`
- 현재 코드 탐색: [`../../../openwiki/index.md`](../../../openwiki/index.md)

## 컴포넌트 범위

| 경로 | 책임 |
| ---- | ---- |
| `app/` | Next.js page·Route Handler adapter와 FSD public API re-export |
| `src/_app/` | layout, provider, API handler, background worker orchestration |
| `src/_pages/`, `src/widgets/` | route 화면과 복합 UI 조립 |
| `src/features/` | 사용자 use case와 server action/API service |
| `src/entities/` | 보컬 프로필·추천·카탈로그·믹싱·티켓·알림 domain model |
| `src/shared/` | DB, media, config, 공통 API·UI·library |
| `prisma/` | PostgreSQL schema, migration, seed |
| `scripts/` | web과 함께 실행하는 durable worker entrypoint와 검증 script |
| `services/` | Modal 분석·합성 service와 공유 Python 분석 core |
| `tests/` | unit, integration, UI, API contract와 FSD boundary 검증 |

Web Feature는 화면과 사용자 흐름뿐 아니라 Next.js server API, 인증·소유권, PostgreSQL 작업 큐, worker와 외부 service adapter의 변경도 주 책임에 따라 추적한다. Modal/FastAPI 자체 구현은 `modal-api`, schema 중심 변경은 `data` 컴포넌트에서 관리하며 교차 변경 경로는 주 Feature의 `plan.md`에 기록한다.

## 코드 탐색 규칙

`app/`은 framework 진입점이고 실제 page composition과 Route Handler 구현은 주로 `src/_pages/`와 `src/_app/api-routes/`에 있다. FSD 의존 방향은 `_app -> _pages -> widgets -> features -> entities -> shared`이며 slice 사이에서는 대상 slice의 public API를 사용한다. `steiger.config.ts`와 `tests/fsd-architecture-boundaries.test.ts`가 이 경계를 검증한다.

제품 route의 현재 목록은 `app/**/page.tsx`, API 목록은 `app/api/**/route.ts`, worker 구현은 `src/_app/background-jobs/`에서 찾는다. 더 자세한 현재 구조와 런타임 흐름은 OpenWiki를 탐색하되 중요한 사실은 해당 tracked source와 테스트에서 다시 확인한다.

## 변경의 이유 찾기

OpenWiki는 현재 상태를 설명하지만 개별 결정의 WHY를 복제하지 않는다. 코드의 이유가 필요하면 다음 순서로 찾는다.

```bash
git log --oneline -- path/to/file
git blame path/to/file
```

관련 commit subject의 `F###`를 확인하고 `docs/features/<component>/F###-*/decisions.md`를 읽는다. 활성 변경의 범위와 상태는 같은 Feature의 `spec.md`, `plan.md`, `tasks.md`를 기준으로 한다.
